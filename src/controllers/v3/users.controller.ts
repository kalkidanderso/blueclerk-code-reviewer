import {Controller, Request, Post, Route, Tags, Body} from "tsoa";
import {Prisma, PrismaClient} from '@prisma/client';
import {Messages, Role, Status, AccountTypes} from '../../common/constants';
import {Request as RequestExpress} from 'express';

import {IUserRegister, ILoginInput, ILoginReturn} from '../../types/v3/users.types';
import {UserServices} from '../../services/v3/users.services';
import {sendEmail, sendEmployeeEmail} from '../../services/aws';
import {CompanyTypes} from '../../models/Company';

interface IRes {
    status: number;
    message: string;
}

@Tags("Users")
@Route("users")
export class UsersController extends Controller {

    @Post("login")
    public async login(
        @Request() req: RequestExpress,
        @Body() body: ILoginInput,
    ): Promise<ILoginReturn> {
        const prisma = new PrismaClient();
        const userServices = new UserServices(prisma.user);

        try {
            let company: any;

            const user = await prisma.user.findFirst({
                where: {auth: {email: {equals: body.email, mode: 'insensitive'}}},
                include: {auth: true, employee: true, companyAdmin: true}
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
                        where: {id: user.id}
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
                        where: {id: user.id}
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
                        where: {id: user.id}
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


    @Post("signup")
    public async signup(
        @Request() req: RequestExpress,
        @Body() body: IUserRegister
    ): Promise<any> {
        const prisma = new PrismaClient();
        const userServices = new UserServices(prisma.user);
        try {
            const emailExist = await userServices.checkEmailExists(req.body)
            if (!emailExist) {
                return {status: 'good', data: emailExist}
            }
            const params = req.body;
            const passwordRegex = new RegExp(/(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z])[!@#$%^&*0-9a-zA-Z]{8,}/);
            if (!passwordRegex.test(params.password)) {
                return {
                    status: Status.Error,
                    message: 'Your password must be have at least: 8 characters long, 1 uppercase, 1 number, & 1 special character'
                }
            }
            const userEntry: any = {
                auth: {
                    email: params.email,
                    password: params.password
                },
                profile: {
                    firstName: params.firstName,
                    lastName: params.lastName,
                    displayName: `${params.firstName} ${params.lastName}`,
                    imageUrl: '',
                },
                address: {
                    street: params.street,
                    unit: params.unit,
                    city: params.city,
                    state: params.state,
                    zipCode: params.zipCode,
                },
                contact: {
                    phone: params.phone,
                    fax: params.fax,
                },
                permissions: {},
                contactName: params.contactName,
                vendorId: params.vendorId,
                contacts: params.contacts,
                info: params.email,
            }
            switch (params.accountType) {
                case AccountTypes.SERVICE_PROVIDER.toString():
                    if (!params.companyId) {
                        return {status: Status.Error, message: 'companyId is required for Service Provider accountType'}
                    }
                    const company = await prisma.company.findFirst({
                        where: {id: params.companyId},
                    });

                    if (!company) {
                        return {status: Status.Error, message: 'Company not found'}
                    }
                    const companyInfo = await prisma.companyInfo.findFirst({
                        where: {id: company.companyInfoId},
                    });
                    req.company = company;
                    const roles = ['OfficeAdmin', 'Technician', 'Manager', '', 'Admin'];
                    const role = roles.indexOf(params.role);
                    const noOfUsers = await userServices.checkNoOfUsers(req, role > 0 ? role : Role.ADMIN_EMPLOYEE)
                    if (noOfUsers) {
                        userEntry.permissions.role = role > 0 ? role : Role.ADMIN_EMPLOYEE;
                        userEntry.accountType = AccountTypes.SERVICE_PROVIDER;
                        userEntry.company = params.companyId;
                        const hashedPassword = await userServices.hashPassword(params.password);
                        const userAuth = await prisma.userAuth.create({
                            data: {
                                email: params.email,
                                password: hashedPassword as string,
                            },
                        })
                        const user = await prisma.user.create({
                            data: {
                                userAuthId: userAuth.id,
                                profile: {
                                    firstName: params.firstName,
                                    lastName: params.lastName,
                                    displayName: `${params.firstName} ${params.lastName}`,
                                    imageUrl: '',
                                },
                                accountType: AccountTypes.CONTRACTOR,
                                address: {
                                    street: '',
                                    city: '',
                                    state: '',
                                    zipCode: '',
                                },
                                contact: {
                                    phone: params.phone,
                                },
                                permissions: userEntry.permissions,
                                firebaseTokens: []
                            },
                        });
                        const updateCompany = await prisma.company.update({
                            where: {
                                id: company.id
                            },
                            data: {
                                employeeId: user.id
                            }
                        })
                        const permissionRole = user.permissions as { role: string };
                        sendEmployeeEmail({
                            to: params.email,
                            company: companyInfo.companyName,
                            replyTo: companyInfo.companyEmail,
                            role: roles[userEntry.permissions.role],
                            password: params.password
                        });
                        // TODO:
                        // login(req, res, sio);
                    }
                    break;
                case AccountTypes.BUILDER.toString():
                    if (!params.customerId) {
                        return {status: Status.Error, message: 'customerId is required for Builder accountType'};
                    }
                    const customer = await prisma.customer.findUnique({
                        where: {
                            id: params.customerId,
                        },
                    });
                    if (!customer) {
                        return {status: Status.Error, message: 'Customer not found'}
                    }
                    userEntry.customer = customer;
                    userEntry.accountType = AccountTypes.BUILDER;
                    userEntry.permissions.role = Role.CUSTOMER_CONTACT;
                    const customerContact = await prisma.customerContract.create({
                        data: {
                            contactName: userEntry.contactName,
                            info: userEntry.info,
                            customerId: customer.id
                        }
                    })
                    const hashedPassword = await userServices.hashPassword(params.password);
                    const createUserAuth = await prisma.userAuth.create({
                        data: {
                            email: params.email,
                            password: hashedPassword as string,
                        },
                    })
                    const newUser = await prisma.user.create({
                        data: {
                            profile: {
                                firstName: params.firstName,
                                lastName: params.lastName,
                                displayName: `${params.firstName} ${params.lastName}`,
                                imageUrl: '',
                            },
                            accountType: AccountTypes.CONTRACTOR,
                            address: {
                                street: '',
                                city: '',
                                state: '',
                                zipCode: '',
                            },
                            contact: {
                                phone: params.phone,
                            },
                            permissions: {
                                role: Role.CUSTOMER_CONTACT,
                                extra: [],
                            },
                            firebaseTokens:[]
                        },
                    });
                    sendEmail({to: params?.email});
                    return {
                        status: Status.Success,
                        userType: Role.CUSTOMER_CONTACT,
                        accountType: newUser.accountType,
                        user: newUser,
                    };
                case AccountTypes.CONTRACTOR.toString():
                    // const { BC_COMPANY_ID } = process.env;
                    // const bcCompany = await Company.findById(BC_COMPANY_ID);
                    // if (!bcCompany) {
                    //     return res.json({ status: Status.Error, message: 'Generic company not found, please contact our team' });
                    // }
                    // userEntry.company = bcCompany;
                    // userEntry.permissions.role = Role.CONTRACTOR;
                    // userEntry.accountType = AccountTypes.CONTRACTOR;
                    // const independentContractor = await new IndependentContractor(userEntry).save();
                    // bcCompany.employees.push(independentContractor._id);
                    // await bcCompany.save();
                    // sendEmail({ to: params?.email });
                    // return res.json({
                    //     status: Status.Success,
                    //     userType: independentContractor.permissions.role,
                    //     accountType: independentContractor.accountType,
                    //     user: independentContractor,
                    // });
                    const individualContractor = await userServices.createIndividualContractor(req, CompanyTypes.CONTRACTOR)
                    return individualContractor
                case AccountTypes.SUPPLIER.toString():
                    if (!params.supplierName) {
                        return {status: Status.Error, message: 'supplierName is required for Supplier Signup.'};
                    }
                    // update as of 26 January 2023. Windows Supplier / Manufacturer is also a Company with type=2 (Windows Supplier)
                    const newSupplierCompany = await userServices.createCompany(req, CompanyTypes.SUPPLIER);
                    return newSupplierCompany
                case AccountTypes.COMPANY.toString():
                default:
                    if (!params.companyName) {
                        return {status: Status.Error, message: 'companyName is required for Company Signup.'};
                    }
                    const newCompany = await userServices.createCompany(req, CompanyTypes.COMPANY);
                    return newCompany
            }
        } catch (error) {
            return {status: error.message, message: Messages.GenericError};
        }
    }

}

