import { Request, Response, NextFunction } from 'express'
import { IUser } from '../../models/User'
import { Role } from '../../common/constants'
import { Company, ICompany } from '../../models/Company'
import { Status, Messages } from '../../common/constants'
// import { ICompanyAdmin } from '../../models/CompanyAdmin'
import { ICompanyAdmin, IEmployee } from '../../types/v3/users.types'
import { PrismaClient, Prisma } from '@prisma/client'
import { CompanyAdmin } from 'src/models/CompanyAdmin'

const prisma = new PrismaClient()

export const getCompanyId = () => {

    return async (req: Request, res: Response, next: NextFunction) => {

        const user = <IUser>req.user
        req.otherCompanyId = undefined

        // check if contractor or organization is making the request
        if ((req.body.companyId != undefined) || (req.body.companyId !== "")) {
            req.otherCompanyId = req.body.companyId
        }

        if (user.permissions.role == Role.COMPANY_ADMIN || user.permissions.role == Role.ADMIN_EMPLOYEE) {
            const comapnyAdmin = <ICompanyAdmin>req.user

            try {
                const company = await prisma.company.findUnique({
                    where: {
                        id: comapnyAdmin.company,
                    },
                })

                req.company = company
                req.v3.companyId = company?.id
                next()
                return
            } catch (error) {
                return res.json({ 'status': Status.Error, 'message': "Unable to find your company. Contact BlueClerk admin for more." })
            }

        } else if (user.permissions.role != Role.GLOBAL_ADMIN) {
            const employee = <IEmployee>req.user

            try {
                const company = await prisma.company.findUnique({
                    where: {
                        id: employee.company,
                    },
                })

                req.company = company
                req.v3.companyId = company?.id
                next()
                return
            } catch (error) {
                return res.json({ 'status': Status.Error, 'message': "Unable to find your company. Contact BlueClerk admin for more." })
            }
        } else {
            next()
            return
        }

    }

}