import bcrypt from "bcrypt-nodejs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

import { AccountTypes, Messages, Role, Status, UserPermissions } from '../../common/constants';
import { ICompany, CompanyTypes  } from '../../models/Company';
import { Request as RequestExpress } from "express";
import { _getProRatedAmount } from '../../controllers/vendor';
import { createStripeInvoiceItem } from '../../services/stripe';
import { NotificationTypes } from '../../models/Notification';
import { sendEmail } from '../../services/aws';
import passwordValidator from "password-validator";

const Hubspot = require('hubspot');
const prisma = new PrismaClient();
export class UserServices {
    constructor(private readonly prisma: PrismaClient['user']) {
    }

    async comparePassword (password: string, passwordHash: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            bcrypt.compare(password, passwordHash, (err: Error, isMatch: boolean) => {
                resolve(isMatch);
            });
        })
    }

    jwt(userId: number, sessionID: string) : string {
        const token = jwt.sign(
            {
                iss: "http://api.blueclerk.com",
                id: userId,
                sessionID: sessionID
            }, process.env.jwt_encryption,
            {
                expiresIn: parseInt(process.env.jwt_expiration)
            }
        );
        
        return `Bearer ${token}`;
    }


    async hashPassword(password: string) {
        const saltRounds = 12;
        return new Promise((resolve, reject) => {
            bcrypt.genSalt(saltRounds, (err, salt) => {
                if (err) {
                    reject({ 'status': Status.Error, 'message': Messages.GenericError });
                }
                bcrypt.hash(password, salt, undefined, (err, hash) => {
                    if (err) {
                        reject({ 'status': Status.Error, 'message': Messages.GenericError });
                    }
                    resolve(hash);
                });
            });
        });
    }
    async checkEmailExists(req: any) {
        const params = req;
        const schema = new passwordValidator();
        console.log(params)
        schema
            .is().min(8)                                    // Minimum length 8
            .is().max(30)                                   // Maximum length 30
            .has().uppercase()                              // Must have uppercase letters
            .has().lowercase()                              // Must have lowercase letters
            .has().digits()                                 // Must have digits
            .has().not().spaces()                           // Should not have spaces
            .is().not().oneOf(['Passw0rd', 'Password123']);
        if (params.password && !schema.validate(params.password)) {
            return { status: "error", message: Messages.PasswordNotStrong };
        }
        try {
            const existingUser = await prisma.user.findFirst({
                where: {
                    auth: {
                        email: {
                            contains: params.email, // You can use 'contains' or 'equals' depending on your needs
                            mode: 'insensitive',    // Case-insensitive search
                        },
                    },
                },
            });
            if (existingUser) {
                return { status: "error", message: Messages.DuplicateEmail };
            }
            return true;
        } catch (err) {
            return { status: "error", message: Messages.GenericError };
        }
    }
    async checkNoOfUsers(req: any, role: Role) {
        const company = <ICompany>req.company;
        if (company.paid == false && new Date() > company.chargeDate) {
            return { 'status': Status.Error, 'message': 'To add employees please upgrade your account.' };
        }
        var dataToUpdate = {
            maxOfficeAdmins: company.maxOfficeAdmins,
            maxManagers: company.maxManagers,
            maxTechnicians: company.maxTechnicians,
            maxAdmins: company.maxAdmins
        }
        if (!company.maxManagers) {
            dataToUpdate.maxManagers = 0
        }
        if (!company.maxTechnicians) {
            dataToUpdate.maxTechnicians = 0
        }
        if (!company.maxOfficeAdmins) {
            dataToUpdate.maxOfficeAdmins = 0
        }
        if (!company.maxAdmins) {
            dataToUpdate.maxAdmins = 0
        }
        try {
            if (!company.maxManagers || !company.maxTechnicians || !company.maxOfficeAdmins || !company.maxAdmins) {
                await prisma.company.update({
                    where: { id: company.id },
                    data: dataToUpdate,
                });
                switch (role) {
                    case 0:
                        if (company.maxOfficeAdmins == 0) {
                            return { 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add office admin.' }
                        }
                        // no company field in the user table, no need to add it in the query here
                        const userCount = await prisma.$queryRaw`
                        SELECT COUNT(*)
                        FROM "User"
                        WHERE "status" = 1 AND "permissions"->>'role' = '0';
                        `;
                        if (userCount as number >= company.maxOfficeAdmins) {
                            return { 'status': Status.Error, 'message': 'Maximum No. of office admins already added, please buy more subscription to add more.' };
                        }
                        return true;
                    case 1:
                        if (company.maxTechnicians == 0) {
                            return { 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add technician.' };
                        }
                        // no company field in the user table, no need to add it in the query here
                        const techniciansCount = await prisma.$queryRaw`
                        SELECT COUNT(*)
                        FROM "User"
                        WHERE "status" = 1 AND "permissions"->>'role' = '1';
                        `;
                        if (techniciansCount as number >= company.maxTechnicians) {
                            return { 'status': Status.Error, 'message': 'Maximum No. of technicians already added please buy more subscription to add more.' };
                        }
                        return true;
                    case 2:
                        if (company.maxManagers == 0) {
                            return { 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add manager.' };
                        }
                        // no company field in the user table, no need to add it in the query here
                        const managersCount = await prisma.$queryRaw`
                        SELECT COUNT(*)
                        FROM "User"
                        WHERE "status" = 1 AND "permissions"->>'role' = '2';
                        `;
                        if (managersCount as number >= company.maxManagers) {
                            return { 'status': Status.Error, 'message': 'Maximum No. of managers already added please buy more subscription to add more.' };
                        }
                        return true
                    case 4:
                        if (company.maxAdmins == 0) {
                            return { 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add admins.' };
                        }
                        // no company field in the user table, no need to add it in the query here
                        const adminsCount = await prisma.$queryRaw`
                        SELECT COUNT(*)
                        FROM "User"
                        WHERE "status" = 1 AND "permissions"->>'role' = '4';
                        `;
                        if (adminsCount as number >= company.maxAdmins) {
                            return { 'status': Status.Error, 'message': 'Maximum Nb. of admins already exceeded please buy more subscription to add more.' };
                        }
                        return true;
                    default:
                        break;
                }
            } else {
                switch (role) {
                    case 0:
                        if (company.maxOfficeAdmins == 0) {
                            return { 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add office admin.' };
                        }
                        // no company field in the user table, no need to add it in the query here
                        const userCount = await prisma.$queryRaw`
                        SELECT COUNT(*)
                        FROM "User"
                        WHERE "status" = 1 AND "permissions"->>'role' = '0';
                        `;
                        if (userCount as number >= company.maxOfficeAdmins) {
                            return { 'status': Status.Error, 'message': 'Maximum No. of office admins already added, please buy more subscription to add more.' };
                        }
                        return true;
                    case 1:
                        if (company.maxTechnicians == 0) {
                            return { 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add technician.' };
                        }
                        // no company field in the user table, no need to add it in the query here
                        const techniciansCount = await prisma.$queryRaw`
                        SELECT COUNT(*)
                        FROM "User"
                        WHERE "status" = 1 AND "permissions"->>'role' = '1';
                        `;
                        if (techniciansCount as number >= company.maxTechnicians) {
                            return { 'status': Status.Error, 'message': 'Maximum No. of technicians already added please buy more subscription to add more.' };
                        }
                        return true
                    case 2:
                        if (company.maxManagers == 0) {
                            return { 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add manager.' };
                        }
                        // no company field in the user table, no need to add it in the query here
                        const managersCount = await prisma.$queryRaw`
                        SELECT COUNT(*)
                        FROM "User"
                        WHERE "status" = 1 AND "permissions"->>'role' = '2';
                        `;
                        if (managersCount as number >= company.maxManagers) {
                            return { 'status': Status.Error, 'message': 'Maximum No. of managers already added please buy more subscription to add more.' };
                        }
                        return true
                    case 4:
                        if (company.maxAdmins == 0) {
                            return { 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add admins.' };
                        }
                        // no company field in the user table, no need to add it in the query here
                        const adminsCount = await prisma.$queryRaw`
                        SELECT COUNT(*)
                        FROM "User"
                        WHERE "status" = 1 AND "permissions"->>'role' = '4';
                        `;
                        if (adminsCount as number >= company.maxAdmins) {
                            return { 'status': Status.Error, 'message': 'Maximum Nb. of admins already exceeded please buy more subscription to add more.' };
                        }
                        return true
                    default:
                        break;
                }
            }
        } catch (error) {
            return { 'status': Status.Error, 'message': Messages.GenericError };
        }
    }
    async createIndividualContractor(req: any, companyType: CompanyTypes) {
        const params = req.body
        try {
            const company = await prisma.companyInfo.findFirst({
                where: {
                    companyEmail: params.email,
                },
            });
            if (company) {
                return { status: Status.Error, message: Messages.CompanyDuplicateEmail };
            }
            const user = await prisma.userAuth.findFirst({
                where: {
                    email: {
                        contains: params.email,
                        mode: 'insensitive',
                    },
                },
            });
            if (user) {
                return { status: Status.Error, message: Messages.DuplicateEmail };
            }
            var chargeDate = new Date();
            chargeDate.setDate(chargeDate.getDate() + 30);
            const passwordRegex = new RegExp(/(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z])[!@#$%^&*0-9a-zA-Z]{8,}/);
            if (!passwordRegex.test(params.password)) {
                return { status: Status.Error, message: 'Your password must be have at least: 8 characters long, 1 uppercase, 1 number, & 1 special character' };
            }
            const createCompanyInfo = await prisma.companyInfo.create({
                data: {
                    companyName: `${params.firstName} ${params.lastName}`,
                    logoUrl: '',
                    companyEmail: params.email,
                },
            })
            const newCompany = await prisma.company.create({
                data: {
                    companyInfoId: createCompanyInfo.id,
                    address: {
                        street: '',
                        city: '',
                        state: '',
                        zipCode: '',
                    },
                    contact: {
                        phone: params.phone,
                    },
                    userPermissions: UserPermissions,
                    chargeDate: chargeDate,
                    maxTechnicians: 0,
                    maxAdmins: 1,
                    maxManagers: 0,
                    maxOfficeAdmins: 0,
                    type: CompanyTypes.CONTRACTOR
                },
            });
            const hashedPassword = await this.hashPassword(params.password);
            const createUserAuth = await prisma.userAuth.create({
                data: {
                    email: params.email,
                    password: hashedPassword  as string,
                },
            })
            const createUser = await prisma.user.create({
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
                        role: Role.CONTRACTOR,
                        extra: [],
                    },
                    firebaseTokens: []
                },
            });
            const companyAdmin = await prisma.companyadmin.create({
                data: {
                    companyId: newCompany.id,
                    userId: createUser.id
                },
            });
            await prisma.company.update({
                where: {
                    id: newCompany.id,
                },
                data: {
                    adminId: companyAdmin.id
                },
            });
            const isContractInvitation = params.isci === 'false' || params.isci === 'undefined' || params.isci === 'null' || params.isci === '0'
                ? false
                : !!params.isci;
            if (isContractInvitation) {
                const hiringCompany = await prisma.company.findUnique({
                    where: {
                        id: params.cid, // Replace with the appropriate value for params.cid
                    },
                });
                if (hiringCompany) {
                    // TODO: CONTRACT SCHEMA
                    // let contract = await Contract.findOne({
                    //     company: hiringCompany._id,
                    //     contractorEmail: company.info?.companyEmail,
                    //     status: ContractStatus.ACCOUNT_NOT_CREATED
                    // });
                    // if (!contract) {
                    //     // Start contract
                    //     contract = new Contract({ company: hiringCompany._id });
                    // }
                    // contract.contractor = company._id;
                    // contract.contractorEmail = null;
                    // contract.status = ContractStatus.ACCEPTED;
                    // await contract.save();
                }
            }
            sendEmail({ to: params?.email });
            return {
                status: Status.Success,
                userType: Role.CONTRACTOR,
                accountType: AccountTypes.CONTRACTOR,
                user: companyAdmin
            };
        } catch (error) {
            return { status: error.message, message: Messages.GenericError };
        }
    }
    async createCompany(req: RequestExpress, companyType: CompanyTypes) {
        const params = req.body
        try {
            const companyCheck = await prisma.companyInfo.findFirst({
                where: {
                    companyEmail: params.email,
                },
            });
            if (companyCheck) {
                return { status: Status.Error, message: Messages.CompanyDuplicateEmail };
            }
            const userCheck = await prisma.userAuth.findFirst({
                where: {
                    email: {
                        contains: params.email,
                        mode: 'insensitive',
                    },
                },
            });
            if (userCheck) {
                return { status: Status.Error, message: Messages.DuplicateEmail };
            }
            var chargeDate = new Date();
            chargeDate.setDate(chargeDate.getDate() + 30);
            const passwordRegex = new RegExp(/(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z])[!@#$%^&*0-9a-zA-Z]{8,}/);
            if (!passwordRegex.test(params.password)) {
                return { status: Status.Error, message: 'Your password must be have at least: 8 characters long, 1 uppercase, 1 number, & 1 special character' };
            }
            const industryCheck = await prisma.industry.findFirst({
                where: {
                    id: params.industryId
                },
            });
            if (!industryCheck) {
                return { status: Status.Error, message: 'No industry found.' };
            }
            const industry = params.industryId && industryCheck;
            const companyInfo = await prisma.companyInfo.create({
                data: {
                    companyName: `${params.firstName} ${params.lastName}`,
                    industryId: 1,
                    logoUrl: '',
                    companyEmail: params.email,
                },
            })
            const company = await prisma.company.create({
                data: {
                    companyInfoId: companyInfo.id,
                    address: {
                        street: '',
                        city: '',
                        state: '',
                        zipCode: '',
                    },
                    contact: {
                        phone: params.phone,
                    },
                    userPermissions: UserPermissions,
                    chargeDate: chargeDate,
                    maxTechnicians: 2,
                    maxAdmins: 1,
                    maxManagers: 1,
                    maxOfficeAdmins: 1,
                    type: companyType
                },
            });
            const hashedPassword = await this.hashPassword(params.password);
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
                    permissions: {
                        role: Role.CONTRACTOR,
                        extra: [],
                    },
                    firebaseTokens: []
                },
            });
            const createdCompanyAdmin = await prisma.companyadmin.create({
                data: {
                    companyId: company.id,
                    userId: user.id
                },
            });
            const updateCompany = await prisma.company.update({
                where: {
                    id: company.id
                },
                data: {
                    adminId: createdCompanyAdmin.id
                }
            })
            const isContractInvitation = params.isci === 'false' || params.isci === 'undefined' || params.isci === 'null' || params.isci === '0'
                ? false
                : !!params.isci;
            if (isContractInvitation) {
                const hiringCompany = await prisma.company.findUnique({
                    where: {
                        id: params.cid,
                    },
                });
                if (hiringCompany) {
                    // TODO: NO CONTRACT PRISMA
                    // let contract = await prisma.contract.findFirst({
                    //     where: {
                    //         company: hiringCompany._id,
                    //         contractorEmail: company.info?.companyEmail,
                    //         status: ContractStatus.ACCOUNT_NOT_CREATED
                    //     },
                    //   });
                    // if (!contract) {
                    //     // Start contract
                    //     contract = await prisma.contract.create({
                    //         data: {
                    //             company: {
                    //                 connect: {
                    //                     id: hiringCompany.id,
                    //                 },
                    //             },
                    //             contractor: {
                    //                 connect: {
                    //                     id: company.id,
                    //                 },
                    //             },
                    //             contractorEmail: null,
                    //             status: 'ACCEPTED', // Replace with the appropriate value for status
                    //         },
                    //     });
                    // }
                    if (
                        (hiringCompany.paid &&
                            new Date() < hiringCompany.chargeDate) ||
                        hiringCompany.stripeId
                    ) {
                        // Charge the hiring company here
                        // Get the pro-rated charge
                        const { amount, tax } = await _getProRatedAmount();
                        // Create a pending invoice item to Stripe
                        const invoiceItem = await createStripeInvoiceItem(
                            hiringCompany.stripeId,
                            amount + tax,
                            companyInfo?.companyName
                        );
                        let companyInvoice = await prisma.companyinvoice.findFirst({
                            where: {
                                companyId: hiringCompany.id,
                                isDraft: true,
                            },
                        });
                        if (!companyInvoice) {
                            companyInvoice = await prisma.companyinvoice.create({
                                data: {
                                    technicians: 0,
                                    managers: 0,
                                    officeAdmins: 0,
                                    admins: 0,
                                    contractors: 0,
                                    charges: 0,
                                    tax: 0,
                                    total: 0,
                                    isDraft: true,
                                    company: {
                                        connect: {
                                            id: hiringCompany.id,
                                        },
                                    },
                                },
                            });
                        }
                        // Update company invoice data
                        companyInvoice.contractors += 1;
                        companyInvoice.charges += amount;
                        companyInvoice.tax += tax;
                        companyInvoice.total += invoiceItem.amount / 100;
                        companyInvoice.companyId = hiringCompany.id
                        await prisma.companyinvoice.update({
                            where: {
                                id: companyInvoice.id,
                            },
                            data: companyInvoice,
                        });
                        const hiringCompanyInfo = await prisma.companyInfo.findUnique({
                            where: {
                                id: hiringCompany.id
                            },
                        });
                        // Construct notification entry to be saved
                        const notificationEntry = await prisma.notification.create({
                            data: {
                                companyId: company.id,
                                notificationType: NotificationTypes.CONTRACT_INVITATION,
                                message: {
                                    title: 'New vendor contract received',
                                    body: `Company ${hiringCompanyInfo?.companyName} has added you to be a vendor`,
                                },
                            },
                        });
                    }
                }
            }
            const hubspot = new Hubspot({
                apiKey: '163d5d65-83c0-4d5f-9dcf-55b052f9ef4d'
            })
            const isIndustry = await prisma.industry.findFirst({
                where: {
                    id: companyInfo?.industryId
                }
            })
            const companyIndustry = companyInfo?.industryId && isIndustry;
            const profile = user.profile as { firstName: string, lastName: string };
            const contact = user.profile as { phone: string };
            const contactObj = {
                "properties": [
                    { "property": 'email', "value": companyInfo.companyEmail },
                    { "property": 'firstname', "value": profile.firstName },
                    { "property": 'lastname', "value": profile.lastName },
                    { "property": 'company', "value": companyInfo.companyName },
                    { "property": 'phone', "value": contact.phone },
                    { "property": 'industry', "value": industry?.title },
                    { "property": 'lifecyclestage', "value": 'customer' },
                    { "property": 'customer_type', "value": 'Free' },
                ]
            };
            hubspot.contacts.create(contactObj)
            sendEmail({ to: params.email });
            // TODO:
            // login(req, res, sio);
        } catch (error) {
            return { err: error.message }
        }
    }

}