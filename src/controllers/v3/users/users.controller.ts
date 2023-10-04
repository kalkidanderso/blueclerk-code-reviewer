import {Controller, Request, Tags, Route, Body, Post} from 'tsoa'
import { ILoginInput, ILoginReturn } from './users.types';
import { Prisma, PrismaClient } from '@prisma/client';
import { AccountTypes, Messages, Role, Status } from '../../../common/constants';
import { UserServices } from './users.services';
import {Request as RequestExpress} from 'express';


@Tags("Users")
@Route("users")
export class UsersController extends Controller {

    @Post("login")
    public async login(
        @Request() req: RequestExpress,
        @Body() body: ILoginInput,
    ) : Promise<ILoginReturn> {
        const prisma = new PrismaClient();
        const userServices = new UserServices(prisma.user);

        try {
            let company: any;

            const user = await prisma.user.findFirst({
                where: { auth: { email: { equals: body.email, mode: 'insensitive' } } },
                include: { auth: true, employee: true, companyAdmin: true }
            });

            if (!user) {
                throw new Error(Messages.InvalidEmailPassword)
            }


            const permissions = user.permissions as Prisma.JsonObject

            if (
                [AccountTypes.BUILDER].includes(Number(user.accountType))
                || [Role.CUSTOMER, Role.CUSTOMER_CONTACT].includes(Number(permissions))
            ) {
                return {
                    status: Status.Unauthorized,
                    message: 'Your account type does not have web access',
                    userType: permissions.role as number,
                    accountType: user.accountType,
                    user: null
                };
            }


            if (
                permissions.role != Role.COMPANY_ADMIN &&
                permissions.role != Role.SUPPLIER_ADMIN &&
                permissions.role != Role.ADMIN_EMPLOYEE &&
                permissions.role != Role.GLOBAL_ADMIN &&
                permissions.role != Role.CUSTOMER_CONTACT &&
                permissions.role != Role.CONTRACTOR
            ) {
                const employee = user.employee;

                company = await prisma.company.findUnique({where: {id: employee.companyId}});
                if (company.paid == false && new Date() > company.chargeDate) {
                    throw new Error('You can\'t login please contact your Company.')
                }
                if (employee.status == 0) {
                    throw new Error(Messages.AccountDeleted)
                }

                const isMatch = await userServices.comparePassword(body.password, user.auth.password)
                if (!isMatch) {
                    throw new Error(Messages.InvalidEmailPassword);
                }

                if (body?.fbToken) {
                    let firebaseTokens: Prisma.JsonArray;
                    const userFirebaseObject = {
                        token: body.fbToken,
                        createdAt: new Date().toDateString(),
                        updatedAt: new Date().toDateString(),
                    } as Prisma.JsonValue;

                    if (user.firebaseTokens) {
                        firebaseTokens = user.firebaseTokens as Prisma.JsonArray;
                        firebaseTokens.filter((res: any) => res.token != body.fbToken);
                        firebaseTokens.push(userFirebaseObject);
                    } else {
                        firebaseTokens = [userFirebaseObject]
                    }

                    await prisma.user.update({
                        data: {
                            firebaseTokens: firebaseTokens
                        },
                        where: { id: user.id }
                    });
                }

                const admin = user.companyAdmin;
                company = await prisma.company.findFirst({
                    where: {id: admin.companyId},
                    include: {employees: true, customers: true}
                });
                company.userPermissions = undefined
                company.employees = undefined
                company.customers = undefined
                company.paid = undefined
                company.type = undefined
                company.plan = undefined
                company.maxTechnicians = undefined
                company.maxAdmins = undefined
                company.maxManagers = undefined
                company.maxOfficeAdmins = undefined
                company.qbAccessToken = undefined
                company.qbRefreshToken = undefined
                company.socketId = undefined
                company.realmId = undefined

                // TODO: req.session.save();

                return {
                    status: Status.Success,
                    token: userServices.jwt(user.id, req.sessionID),
                    userType: permissions.role as number,
                    accountType: user.accountType,
                    user,
                    company
                };

            } else if (
                permissions.role == Role.GLOBAL_ADMIN ||
                permissions.role == Role.COMPANY_ADMIN ||
                permissions.role == Role.ADMIN_EMPLOYEE || 
                permissions.role == Role.CONTRACTOR
            ) {
                const isMatch = await userServices.comparePassword(body.password, user.auth.password)

                if (!isMatch) {
                    throw new Error(Messages.InvalidEmailPassword);
                }

                if (body?.fbToken) {
                    let firebaseTokens: Prisma.JsonArray;
                    const userFirebaseObject = {
                        token: body.fbToken,
                        createdAt: new Date().toDateString(),
                        updatedAt: new Date().toDateString(),
                    } as Prisma.JsonValue;

                    if (user.firebaseTokens) {
                        firebaseTokens = user.firebaseTokens as Prisma.JsonArray;
                        firebaseTokens.filter((res: any) => res.token != body.fbToken);
                        firebaseTokens.push(userFirebaseObject);
                    } else {
                        firebaseTokens = [userFirebaseObject]
                    }

                    await prisma.user.update({
                        data: {
                            firebaseTokens: firebaseTokens
                        },
                        where: { id: user.id }
                    });

                }
                
                // TODO: req.session.save();

                return {
                    status: Status.Success,
                    token: userServices.jwt(user.id, req.sessionID),
                    userType: permissions.role as number,
                    accountType: user.accountType,
                    user,
                };
            } else {
                const isMatch = await userServices.comparePassword(body.password, user.auth.password)
                if (!isMatch) {
                    throw new Error(Messages.InvalidEmailPassword);
                }

                if (body?.fbToken) {
                    let firebaseTokens: Prisma.JsonArray;
                    const userFirebaseObject = {
                        token: body.fbToken,
                        createdAt: new Date().toDateString(),
                        updatedAt: new Date().toDateString(),
                    } as Prisma.JsonValue;

                    if (user.firebaseTokens) {
                        firebaseTokens = user.firebaseTokens as Prisma.JsonArray;
                        firebaseTokens.filter((res: any) => res.token != body.fbToken);
                        firebaseTokens.push(userFirebaseObject);
                    } else {
                        firebaseTokens = [userFirebaseObject]
                    }

                    await prisma.user.update({
                        data: {
                            firebaseTokens: firebaseTokens
                        },
                        where: { id: user.id }
                    });

                }
                // TODO: req.session.save();

                return {
                    status: Status.Success,
                    token: userServices.jwt(user.id, req.sessionID),
                    userType: permissions.role as number,
                    accountType: user.accountType,
                    user,
                };
            }
        } catch (err: any) {
            throw new Error(Messages.GenericError)
        }

        

    }

}

