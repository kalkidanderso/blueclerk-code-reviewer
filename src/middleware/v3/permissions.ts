import { Prisma, PrismaClient } from "@prisma/client"
import { Request, Response, NextFunction } from "express"
import * as Sentry from '@sentry/node';
import { Messages, Role, Status } from "../../common/constants"
import { IUser } from "../../types/v3/users.types"

export const checkPermissions = (minAuth: Role, req: Request, res: Response, next: NextFunction) => {
        const user = <IUser>req.user

        if (user.permissions.role < minAuth) {
            throw new Error(Messages.UnAuthorized)
        }

        next()
}

export const checkSpecificPermissions = (minAuth: Role[], req: Request, res: Response, next: NextFunction) => {

        const user = <IUser>req.user

        if (!minAuth.includes(user.permissions.role)) {
            console.log('not there' , minAuth, user.permissions.role);
            throw new Error(Messages.UnAuthorized);
        }

        next()
}

export const checkUserScanPermissions = async (req: Request, res: Response, next: NextFunction) => {
    const prisma = new PrismaClient();
    const user = <IUser>req.user
    const company =req.v3.company;
    const tag = req.body.nfcTag;
    
    const checkTag = await prisma.tag.findFirst({
        where: {
            info: {
                path: ['nfcTag'],
                equals: tag
            }
        }
    });

    if(!checkTag) {
        return res.json({ 'status': Status.Success, 'tagStatus': Status.TagNotAssociated, 'message': 'Tag Not In System' })
    }

    let check = false;
    if (user.permissions.role == Role.GLOBAL_ADMIN) {
        check = true;
        next();
        return ;
    }

    // Take the Company ID from the tag either location or equipment
    const companyOfTag =
        checkTag && checkTag.companyId
            ? checkTag.companyId
            : undefined;

    // check if it's the company owner
    if((user.permissions.role == Role.COMPANY_ADMIN || user.permissions.role == Role.ADMIN_EMPLOYEE) && JSON.stringify(company.id) == JSON.stringify(companyOfTag)) {
        check = true;
        // check if it's an employee
    } else if (JSON.stringify(company.id) == JSON.stringify(companyOfTag) && (user.permissions.role != Role.COMPANY_ADMIN && user.permissions.role != Role.ADMIN_EMPLOYEE)) {
        if (
            user.permissions.role == Role.MANAGER ||
            user.permissions.role == Role.TECHNICIAN
        ) {
            check = true;
        }
    } else {
        // This is a contractor
        // if (company.type == 1) {
            // verify if there's a contract with it
            try {
                let contract =
                    await prisma.contract.findFirst({
                        where: {companyId: companyOfTag, contractorId: company.id, status: 1}
                    });
                if (contract) {
                    check = true;
                }

            }catch (err) {
                Sentry.captureException(err);
                return res.json({"status": Status.Error, "message": err.message});
            }
        // }
    }
    if(!check) {
        return res.json({"status": Status.Error, "message": Messages.UnAuthorized});
    } else {
        next();
        return ;
    }

}

