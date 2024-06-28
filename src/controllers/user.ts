import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment-timezone';

import { CompanyType, ContractStatus, Messages, Role, Status, UserPermissions, AccountTypes } from '../common/constants';
import { sendEmail, sendEmployeeEmail, sendPasswordEmail, uploadImageInS3 } from '../services/aws';
import { chargeSubscription, createStripeInvoiceItem } from '../services/stripe';

import { Company, CompanyTypes, ICompany } from '../models/Company';
import { IUser, User } from '../models/User';
import { Employee, IEmployee } from '../models/Employee';
import { Contract } from '../models/Contract';
import { CompanyAdmin, ICompanyAdmin } from '../models/CompanyAdmin';
import { IIndustry, Industry } from '../models/Industry';
import { NotificationTypes } from '../models/Notification';
import { NotificationContract, INotificationContract } from '../models/NotificationDiscriminator';
import { CompanyInvoice } from '../models/CompanyInvoice';
import { _getProRatedAmount } from '../controllers/vendor';
import { CustomerContact } from '../models/CustomerContact';
import { Customer } from '../models/Customer';
import { IndependentContractor } from '../models/IndependentContractor';
import { ISession, Session } from '../models/Session';
import { CompanyLocation } from '../models/CompanyLocation';
import * as Sentry from '@sentry/node';

const generator = require('generate-password');
const passwordValidator = require('password-validator');
const Hubspot = require('hubspot');

export const login = (req: Request, res: Response, sio: any) => {
    const params = req.body;
    User.findOne(
        { 'auth.email': { $regex: params.email, $options: 'i' } },
        (err: any, user: IUser) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (!user) {
                return res.json({ 'status': Status.Error, 'message': Messages.InvalidEmailPassword });
            }

            if (
                [AccountTypes.BUILDER].includes(Number(user.accountType))
                || [Role.CUSTOMER, Role.CUSTOMER_CONTACT].includes(Number(user.permissions.role))
            ) {
                return res.json({
                    status: Status.Unauthorized,
                    message: 'Your account type does not have web access',
                    userType: user.permissions.role,
                    accountType: user.accountType,
                    user: null
                });
            }

            if (
                user.permissions.role != Role.COMPANY_ADMIN &&
                user.permissions.role != Role.SUPPLIER_ADMIN &&
                user.permissions.role != Role.ADMIN_EMPLOYEE &&
                user.permissions.role != Role.GLOBAL_ADMIN &&
                user.permissions.role != Role.CUSTOMER_CONTACT &&
                user.permissions.role != Role.CONTRACTOR
            ) {
                const employee = <IEmployee>user;

                Company.findById(employee.company,
                    (err: any, company: ICompany) => {

                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                        }

                        if (company.paid == false && new Date() > company.chargeDate) {
                            return res.json({ 'status': Status.Error, 'message': 'You can\'t login please contact your Company.' });
                        }
                        if (employee.status == 0) {
                            return res.json({ 'status': Status.Error, 'message': Messages.AccountDeleted });
                        }

                        user.comparePassword(params.password, (isMatching: boolean) => {

                            if (!isMatching) {
                                return res.json({ 'status': Status.Error, 'message': Messages.InvalidEmailPassword });
                            }

                            // Save the firebase registration token to send notification
                            user.firebaseTokens = user.firebaseTokens.length ? user.firebaseTokens : [];
                            // Handle firebase registration token is provided
                            if (params.fbToken) {
                                // Find if the token is existing for the user
                                const tokenFound = user.firebaseTokens?.find((fbt: any) => fbt.token === params.fbToken);

                                if (tokenFound) {
                                    /**
                                     * Token found, just update the timestamp,
                                     * to make sure we know that token is active.
                                     * TODO: To clean up any stale tokens
                                     */
                                    tokenFound.updatedAt = new Date();
                                } else {
                                    /**
                                     * Registration token is new,
                                     * add it to the user
                                     */
                                    user.firebaseTokens.push({
                                        token: params.fbToken,
                                        createdAt: new Date(),
                                        updatedAt: new Date()
                                    });
                                }
                                user.save();
                            }

                            req.session.save();

                            return res.json({
                                status: Status.Success,
                                token: user.jwt(req),
                                userType: user.permissions.role,
                                accountType: user.accountType,
                                user,
                            });
                        });
                    });

            } else if (
                user.permissions.role == Role.GLOBAL_ADMIN ||
                user.permissions.role == Role.COMPANY_ADMIN ||
                user.permissions.role == Role.ADMIN_EMPLOYEE || 
                user.permissions.role == Role.CONTRACTOR
            ) {

                user.comparePassword(params.password, (isMatching: boolean) => {

                    if (!isMatching) {
                        return res.json({ 'status': Status.Error, 'message': Messages.InvalidEmailPassword });
                    }
                    
                    // Save the firebase registration token to send notification
                    user.firebaseTokens = user.firebaseTokens.length ? user.firebaseTokens : [];
                    // Handle firebase registration token is provided
                    if (params.fbToken) {
                        // Find if the token is existing for the user
                        const tokenFound = user.firebaseTokens?.find((fbt: any) => fbt.token === params.fbToken);

                        if (tokenFound) {
                            /**
                             * Token found, just update the timestamp,
                             * to make sure we know that token is active.
                             * TODO: To clean up any stale tokens
                             */
                            tokenFound.updatedAt = new Date();
                        } else {
                            /**
                             * Registration token is new,
                             * add it to the user
                             */
                            user.firebaseTokens.push({
                                token: params.fbToken,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            });
                        }
                        user.save();
                    }

                    const admin = <ICompanyAdmin>user;
                    Company.findById(admin.company,
                        (err: any, company: ICompany) => {
                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                            }
                            company.userPermissions = undefined;
                            company.employees = undefined;
                            company.customers = undefined;
                            company.paid = undefined;
                            company.type = undefined;
                            company.plan = undefined;
                            company.maxTechnicians = undefined;
                            company.maxAdmins = undefined;
                            company.maxManagers = undefined;
                            company.maxOfficeAdmins = undefined;
                            company.qbAccessToken = undefined;
                            company.qbRefreshToken = undefined;
                            company.socketId = undefined;
                            company.realmId = undefined;

                            req.session.save();

                            return res.json({
                                status: Status.Success,
                                token: user.jwt(req),
                                userType: user.permissions.role,
                                accountType: user.accountType,
                                user, company
                            });
                        }
                    );


                });
            } else {
                user.comparePassword(params.password, (isMatching: boolean) => {

                    if (!isMatching) {
                        return res.json({ 'status': Status.Error, 'message': Messages.InvalidEmailPassword });
                    }

                    // Save the firebase registration token to send notification
                    user.firebaseTokens = user.firebaseTokens.length ? user.firebaseTokens : [];
                    // Handle firebase registration token is provided
                    if (params.fbToken) {
                        // Find if the token is existing for the user
                        const tokenFound = user.firebaseTokens?.find((fbt: any) => fbt.token === params.fbToken);

                        if (tokenFound) {
                            /**
                             * Token found, just update the timestamp,
                             * to make sure we know that token is active.
                             * TODO: To clean up any stale tokens
                             */
                            tokenFound.updatedAt = new Date();
                        } else {
                            /**
                             * Registration token is new,
                             * add it to the user
                             */
                            user.firebaseTokens.push({
                                token: params.fbToken,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            });
                        }
                        user.save();
                    }

                    req.session.save();

                    return res.json({
                        status: Status.Success,
                        token: user.jwt(req),
                        userType: user.permissions.role,
                        accountType: user.accountType,
                        user,
                    });
                });
            }
        }
    );

};

export const logout = async (req: Request, res: Response) => {
    const session = <ISession>req.userSession;
    try {
        await Session.findByIdAndRemove(session._id);
        return res.json({ status: Status.Success, message: 'Logout Successfully' });
    } catch (err) {
        Sentry.captureException(err);
        return res.json({ status: Status.Error, message: Messages.GenericError });
    }
};

export const createGlobalAdmin = (req: Request, res: Response, sio: any) => {

    checkEmailExists(req, res, (req: Request, res: Response) => {

        const params = req.body;

        const user = new User(
            {
                auth: {
                    email: params.email,
                    password: params.password,
                },
                profile: {
                    firstName: params.firstName,
                    lastName: params.lastName,
                    displayName: `${params.firstName} ${params.lastName}`,
                    imageUrl: '',
                },
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
                    role: Role.GLOBAL_ADMIN,
                    extra: [],
                },
            }
        );

        user.save((err: any) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            login(req, res, sio);

        });

    });

};

export const signup = async (req: Request, res: Response, sio: any) => {
    checkEmailExists(req, res, async (req: Request, res: Response) => {
        const params = req.body;
        const passwordRegex = new RegExp(/(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z])[!@#$%^&*0-9a-zA-Z]{8,}/);

        if (!passwordRegex.test(params.password)) {
            return res.json({ status: Status.Error, message: 'Your password must be have at least: 8 characters long, 1 uppercase, 1 number, & 1 special character' });
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
        };

        switch (params.accountType) {
        case AccountTypes.SERVICE_PROVIDER: {
            const chargeDate = new Date();   
            chargeDate.setDate(chargeDate.getDate() + 30);
            const company = !params.companyId 
                ? new Company({
                    info: {
                        companyName: params.companyName || `${params.firstName} ${params.lastName}`,  
                        industry: null,
                        logoUrl: '',
                        companyEmail: params.email, 
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
                    userPermissions: UserPermissions,
                    chargeDate: chargeDate,
                    maxTechnicians: 0,
                    maxAdmins: 1,
                    maxManagers: 0,
                    maxOfficeAdmins: 0,
                    type: CompanyTypes.SERVICE_PROVIDER
                })
                : await Company.findById(params.companyId);
            if (!company) {
                return res.json({ status: Status.Error, message: 'Company not found or could not be created' });
            }

            req.company = company;
            const roles = ['OfficeAdmin', 'Technician', 'Manager', '', 'Admin'];
            const role = roles.indexOf(params.role);

            checkNoOfUsers(req, res, role > 0 ? role : Role.ADMIN_EMPLOYEE, async (req: Request, res: Response) => {
                userEntry.permissions.role = role > 0 ? role : Role.ADMIN_EMPLOYEE;
                userEntry.accountType = AccountTypes.SERVICE_PROVIDER;
                userEntry.company = company._id;
                const companyEmployee = await new Employee(userEntry).save();
                company.employees.push(companyEmployee._id);
                company.save();

                sendEmployeeEmail({
                    to: params.email,
                    company: company.info.companyName,
                    replyTo: company.info.companyEmail,
                    role: roles[companyEmployee.permissions.role],
                    password: params.password
                });
                login(req, res, sio);
            });
            break;
        }
        case AccountTypes.BUILDER: {
            if (!params.customerId) {
                return res.json({ status: Status.Error, message: 'customerId is required for Builder accountType' });
            }

            const customer = await Customer.findById(params.customerId);
            if (!customer) {
                return res.json({ status: Status.Error, message: 'Customer not found' });
            }

            userEntry.customer = customer;
            userEntry.accountType = AccountTypes.BUILDER;
            userEntry.permissions.role = Role.CUSTOMER_CONTACT;

            const customerContact = await new CustomerContact(userEntry).save();
            customer.contacts.push(customerContact._id);
            await customer.save();

            sendEmail({ to: params?.email });
            return res.json({
                status: Status.Success,
                userType: customerContact.permissions.role,
                accountType: customerContact.accountType,
                user: customerContact,
            });
        }
        case AccountTypes.CONTRACTOR:
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
            cerateIndividualContractor(req, res, sio, CompanyTypes.CONTRACTOR);
            break;
        case AccountTypes.SUPPLIER:
            if (!params.supplierName) {
                return res.json({ status: Status.Error, message: 'supplierName is required for Supplier Signup.' });
            }
            // update as of 26 January 2023. Windows Supplier / Manufacturer is also a Company with type=2 (Windows Supplier)
            createCompany(req, res, sio, CompanyTypes.SUPPLIER);
            break;

        case AccountTypes.COMPANY:
        default:
            if (!params.companyName) {
                return res.json({ status: Status.Error, message: 'companyName is required for Company Signup.' });
            }
            createCompany(req, res, sio, CompanyTypes.COMPANY);
            break;
        }

    });
};

export const createCompany = (req: Request, res: Response, sio: any, companyType: CompanyTypes) => {

    checkCompanyEmailExists(req, res, async (req: Request, res: Response) => {

        const params = req.body;
        const chargeDate = new Date();
        chargeDate.setDate(chargeDate.getDate() + 30);
        const passwordRegex = new RegExp(/(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z])[!@#$%^&*0-9a-zA-Z]{8,}/);

        if (!passwordRegex.test(params.password)) {
            return res.json({ status: Status.Error, message: 'Your password must be have at least: 8 characters long, 1 uppercase, 1 number, & 1 special character' });
        }

        const industry = params.industryId && await Industry.findById(params.industryId);

        const company = new Company(
            {
                info: {
                    companyName: params.companyName,
                    industry: industry?._id,
                    logoUrl: '',
                    companyEmail: params.email,
                },
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
            }
        );

        company.save((err: any) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': err.message });
            }

            const companyAdmin = new CompanyAdmin(
                {
                    auth: {
                        email: params.email,
                        password: params.password,
                    },
                    profile: {
                        firstName: params.firstName,
                        lastName: params.lastName,
                        displayName: `${params.firstName} ${params.lastName}`,
                        imageUrl: '',
                    },
                    accountType: AccountTypes.COMPANY,
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
                        role: Role.COMPANY_ADMIN,
                        extra: [],
                    },
                    company: company._id
                }
            );

            companyAdmin.save((err: any) => {

                if (err) {
                    return res.json({ 'status': Status.Error, 'message': err.message });
                }

                company.updateOne({
                    'admin': companyAdmin._id
                }, async (err: any, raq: any) => {

                    const isContractInvitation = params.isci === 'false' || params.isci === 'undefined' || params.isci === 'null' || params.isci === '0'
                        ? false
                        : !!params.isci;

                    if (isContractInvitation) {
                        const hiringCompany = await Company.findById(params.cid);

                        if (hiringCompany) {
                            let contract = await Contract.findOne({
                                company: hiringCompany._id,
                                contractorEmail: company.info?.companyEmail,
                                status: ContractStatus.ACCOUNT_NOT_CREATED
                            });

                            if (!contract) {
                                // Start contract
                                contract = new Contract({ company: hiringCompany._id });
                            }
                            contract.contractor = company._id;
                            contract.contractorEmail = null;
                            contract.status = ContractStatus.ACCEPTED;
                            await contract.save();

                            if (
                                (hiringCompany.paid
                                    && new Date() < hiringCompany.chargeDate)
                                || hiringCompany.stripeId
                            ) {
                                // Charge the hiring company here
                                // Get the pro-rated charge
                                const { amount, tax } = await _getProRatedAmount();

                                // Create a pending invoice items to Stripe
                                const invoiceItem = await createStripeInvoiceItem(hiringCompany.stripeId, amount + tax, company.info?.companyName);

                                // Find existing company invoice
                                let companyInvoice = await CompanyInvoice.findOne({
                                    company: hiringCompany._id,
                                    isDraft: true
                                });

                                // No company invoice, create new
                                if (!companyInvoice) {
                                    companyInvoice = new CompanyInvoice({
                                        technicians: 0,
                                        managers: 0,
                                        officeAdmins: 0,
                                        admins: 0,
                                        contractors: 0,
                                        charges: 0,
                                        tax: 0,
                                        total: 0,
                                        isDraft: true,
                                        company: hiringCompany._id
                                    });
                                    await companyInvoice.save();
                                }

                                // Update company invoice data
                                companyInvoice.contractors += 1;
                                companyInvoice.charges += amount;
                                companyInvoice.tax += tax;
                                companyInvoice.total += invoiceItem.amount / 100;
                                await companyInvoice.save();

                                // Add the company invoice
                                hiringCompany.companyInvoices = hiringCompany.companyInvoices ?? [];
                                const existCompanyInvoice = hiringCompany.companyInvoices.find(
                                    inv => inv.toString() === companyInvoice._id.toString()
                                );
                                if (!existCompanyInvoice) {
                                    hiringCompany.companyInvoices.push(companyInvoice);
                                    await hiringCompany.save();
                                }
                            }

                            // Construct notification entry to be saved
                            const notificationEntry: INotificationContract = new NotificationContract({
                                company: company._id,
                                notificationType: NotificationTypes.CONTRACT_INVITATION,
                                message: {
                                    title: 'New vendor contract received',
                                    body: `Company ${hiringCompany.info?.companyName} has added you to be a vendor`
                                },
                                metadata: contract._id
                            });
                            await notificationEntry.save();
                        }
                    }

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': err.message });
                    }
                    _createHubSpotContact(company, companyAdmin);
                    sendEmail({ to: params.email });
                    login(req, res, sio);
                });

            });

        });

    });

};

export const cerateIndividualContractor =  (req: Request, res: Response, sio: any, companyType: CompanyTypes) => {
    checkCompanyEmailExists(req, res, async (req: Request, res: Response) => {
        const params = req.body;
        const chargeDate = new Date();
        chargeDate.setDate(chargeDate.getDate() + 30);
        const passwordRegex = new RegExp(/(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z])[!@#$%^&*0-9a-zA-Z]{8,}/);

        if (!passwordRegex.test(params.password)) {
            return res.json({ status: Status.Error, message: 'Your password must be have at least: 8 characters long, 1 uppercase, 1 number, & 1 special character' });
        }

        const company = new Company(
            {
                info: {
                    companyName: `${params.firstName} ${params.lastName}`,
                    industry: null,
                    logoUrl: '',
                    companyEmail: params.email,
                },
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
            }
        );

        company.save((err: any) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': err.message });
            }

            const companyAdmin = new CompanyAdmin(
                {
                    auth: {
                        email: params.email,
                        password: params.password,
                    },
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
                    company: company._id
                }
            );

            companyAdmin.save(async (err: any) => {
                if (err) {
                    return res.json({ 'status': Status.Error, 'message': err.message });
                }
                company.updateOne({
                    'admin': companyAdmin._id
                }, async (err: any, raq: any) => {
                    const isContractInvitation = params.isci === 'false' || params.isci === 'undefined' || params.isci === 'null' || params.isci === '0'
                        ? false
                        : !!params.isci;
    
                    if (isContractInvitation) {
                        const hiringCompany = await Company.findById(params.cid);
    
                        if (hiringCompany) {
                            let contract = await Contract.findOne({
                                company: hiringCompany._id,
                                contractorEmail: company.info?.companyEmail,
                                status: ContractStatus.ACCOUNT_NOT_CREATED
                            });
    
                            if (!contract) {
                                // Start contract
                                contract = new Contract({ company: hiringCompany._id });
                            }
                            contract.contractor = company._id;
                            contract.contractorEmail = null;
                            contract.status = ContractStatus.ACCEPTED;
                            await contract.save();
                        }
                    }
    
                    sendEmail({ to: params?.email });
                    return res.json({
                        status: Status.Success,
                        userType:  Role.CONTRACTOR,
                        accountType: AccountTypes.CONTRACTOR,
                        user: companyAdmin
                    });
                });
            });
        });
    });
};

export const getCompanyProfile = (req: Request, res: Response) => {
    const { companyId } = req.params;
    Company.findById(companyId)
        .populate({ path: 'itemTier.list.tier', select: '-companyId -__v' })
        .populate({ path: 'paymentTerm', select: '-company -__v' })
        .exec((err: any, company: ICompany) => {
            if (err) {
                return res.status(500).json({ 'status': Status.Error, 'message': 'something went wrong' });
            }
            if (!company) {
                return res.status(404).json({ 'status': Status.Error, 'message': 'company not found' });
            }
            return res.status(200).json({ 'status': Status.Success, 'company': company });
        });
};

export const getAssignedCompanyLocations = (req: Request, res: Response) => {
    const {companyId, userId} = req.query;
   
    CompanyLocation.aggregate([
        {
            $match: { company: new ObjectId(companyId) },
        },
        {
            $project: {
                assignedEmployees: {
                    $filter: {
                        input: '$assignedEmployees',
                        as: 'ae',
                        cond: {
                            $eq: [ '$$ae.employeeId', new ObjectId(userId) ]
                        }
                    }
                },
                _id: 0,
                name: 1,
                company: 1
            }
        },
    ])
        .exec((err: any, companyLocatons: any[]) => {
            if (err) {
                return res.status(500).json({ 'status': Status.Error, 'message': 'something went wrong' });
            }
            return res.status(200).json({ 'status': Status.Success, 'company': companyLocatons });
        });
};

export const updateEmployeeRole = (req: Request, res: Response) => {

    const company = <ICompany>req.company;
    const params = req.body;
    const newRole = Number.isInteger(params.newRole) ? params.newRole : Number(params.newRole);

    if (params.employeeId && !ObjectId.isValid(params.employeeId)) {
        return res.json({ status: Status.Error, message: Messages.WrongId });
    }
    if (params.newRole && ![0, 1, 2, 3, 4].includes(newRole)) {
        return res.json({ status: Status.Error, message: 'newRole is invalid' });
    }

    User.findOneAndUpdate({ _id: params.employeeId, company: company._id }, { 'permissions.role': newRole }).then((employee: IEmployee) => {
        if (employee) {
            return res.json({ 'status': Status.Success, 'message': 'Employee Role Has Been Updated Successfully!' });
        }
        return res.json({ 'status': Status.Error, 'message': 'Employee was not found' });
    }).catch((err) => {
        Sentry.captureException(err);
        return res.json({ 'status': Status.Error, 'message': err.message });
    });

};

export const updateEmployeeLocPermission = (req: Request, res: Response) => {
    const company = <ICompany>req.company;
    const params = req.body;

    Employee.findOneAndUpdate({ _id: params.employeeId, company: company._id }, { 'canAccessAllLocations': params.canAccessAllLocations }).then((employee: IEmployee) => {
        if (employee) {
            return res.json({ 'status': Status.Success, 'message': 'Employee Permission Has Been Updated Successfully!' });
        }
        return res.json({ 'status': Status.Error, 'message': 'Employee was not found' });
    }).catch((err) => {
        return res.json({ 'status': Status.Error, 'message': err.message });
    });
};

export const _createHubSpotContact = async (company: ICompany, companyAdmin: ICompanyAdmin) => {

    const hubspot = new Hubspot({
        apiKey: '163d5d65-83c0-4d5f-9dcf-55b052f9ef4d'
    });

    const industry = company?.info?.industry && await Industry.findById(company?.info?.industry);

    const contactObj = {
        'properties': [
            { 'property': 'email', 'value': company.info.companyEmail },
            { 'property': 'firstname', 'value': companyAdmin.profile.firstName },
            { 'property': 'lastname', 'value': companyAdmin.profile.lastName },
            { 'property': 'company', 'value': company.info.companyName },
            { 'property': 'phone', 'value': company.contact.phone },
            { 'property': 'industry', 'value': industry?.title },
            { 'property': 'lifecyclestage', 'value': 'customer' },
            { 'property': 'customer_type', 'value': 'Free' },
        ]
    };

    hubspot.contacts.create(contactObj);
};

export const createManager = (req: Request, res: Response) => {
    createEmployee(req, res, Role.MANAGER);
};

export const createTechnician = (req: Request, res: Response) => {
    createEmployee(req, res, Role.TECHNICIAN);
};

export const createOfficeAdmin = (req: Request, res: Response) => {
    createEmployee(req, res, Role.OFFICE_ADMIN);
};

// This is an employee admin (won't be able to delete company profile)
export const createAdminEmployee = (req: Request, res: Response) => {
    createEmployee(req, res, Role.ADMIN_EMPLOYEE);
};

export const getManagersList = (req: Request, res: Response) => {
    getEmployeesList(req, res, Role.MANAGER);
};

export const getTechniciansList = (req: Request, res: Response) => {
    getEmployeesList(req, res, Role.TECHNICIAN);
};

export const getOfficeAdminsList = (req: Request, res: Response) => {
    getEmployeesList(req, res, Role.OFFICE_ADMIN);
};

export const updateProfile = (req: Request, res: Response) => {
    uploadImageInS3(req, res, (err: any, imageUrl?: string) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
        }
        const params = req.body;
        const user = <IUser>req.user;
        if (!params.firstName || !params.lastName) {
            return res.json({ 'status': Status.Error, 'message': Messages.MissingParams });
        }
        const userImage = imageUrl ? imageUrl : user.profile.imageUrl;
        user.updateOne(
            {
                'profile.firstName': params.firstName,
                'profile.lastName': params.lastName,
                'profile.imageUrl': userImage,
                'profile.displayName': `${params.firstName} ${params.lastName}`,
                'address.street': params.street,
                'address.city': params.city,
                'address.state': params.state,
                'address.zipCode': params.zipCode,
                'contact.phone': params.phone,
                'auth.email': user.auth.email.toLowerCase()
            },
            (err: any, raw: any) => {

                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                }

                return res.json({ 'status': Status.Success, 'message': 'Profile updated successfully.', 'imageUrl': userImage });
            }
        );
    });

};

export const changePassword = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;

    user.comparePassword(params.currentPassword, (isMatching: boolean) => {

        if (!isMatching) {
            return res.json({ 'status': Status.Error, 'message': 'Current password doesn\'t match.' });
        }

        if (params.currentPassword === params.newPassword) {
            return res.json({ status: Status.Error, message: 'New password can\'t be your old password' });
        }

        user.hashPassword(params.newPassword, (err?: any, hash?: string) => {

            if (err || !hash) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            user.updateOne(
                {
                    'auth.password': hash,
                },
                (err: any, raw: any) => {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }

                    return res.json({ 'status': Status.Success, 'message': 'Password changed successfully.' });
                }
            );

        });

    });

};

export const forgotPassword = (req: Request, res: Response) => {

    const params = req.body;

    User.findOne({ 'auth.email': { $regex: params.email, $options: 'i' } },
        (err: any, user: IUser) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (user == undefined || user == null) {

                return res.json({ 'status': Status.Error, 'message': 'Invalid email address.' });
            }

            const password = generator.generate({
                length: 9,
                numbers: true,
                symbols: '!@#$%&',
                uppercase: true,
                excludeSimilarCharacters: true,
                strict: true
            });

            user.hashPassword(password, (err: any, hash: string) => {

                user.updateOne({ 'auth.password': hash },
                    (err: any, raw: any) => {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                        }

                        sendPasswordEmail({ to: params.email, name: user.profile.displayName, password: password });
                        return res.json({ 'status': Status.Error, 'message': 'Email sent.' });
                    });
            });
        });
};

export const deleteEmployee = (req: Request, res: Response) => {

    const params = req.body;

    User.findById(params.employeeId, function (err: any, employee: IEmployee) {

        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
        }

        employee.updateOne(
            {
                status: 0,
            },
            (err: any, raw: any) => {

                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                }

                return res.json({ 'status': Status.Success, 'message': 'Employee deleted successfully.' });
            }
        );
    });

};

export const activateEmployee = (req: Request, res: Response) => {

    const params = req.body;

    User.findById(params.employeeId, function (err: any, employee: IEmployee) {

        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
        }

        checkNoOfUsers(req, res, employee.permissions.role, (req: Request, res: Response) => {

            employee.updateOne(
                {
                    status: 1,
                },
                (err: any, raw: any) => {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }

                    return res.json({ 'status': Status.Success, 'message': 'Employee activated successfully.' });
                }
            );
        });
    });

};

const createEmployee = (req: Request, res: Response, role: Role) => {
    checkNoOfUsers(req, res, role, (req: Request, res: Response) => {

        checkEmailExists(req, res, (req: Request, res: Response) => {

            const params = req.body;
            const roles = ['OfficeAdmin', 'Technician', 'Manager', '', 'Admin'];

            const password = generator.generate({
                length: 9,
                numbers: true,
                symbols: '!@#$%&',
                uppercase: true,
                excludeSimilarCharacters: true,
                strict: true
            });

            // password = 123456

            const employee = new Employee(
                {
                    auth: {
                        email: params.email,
                        password: password,
                    },
                    profile: {
                        firstName: params.firstName,
                        lastName: params.lastName,
                        displayName: `${params.firstName} ${params.lastName}`,
                        imageUrl: '',
                    },
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
                        role: role,
                        extra: [],
                    },
                    canAccessAllLocations: params.canAccessAllLocations,
                    company: req.companyId,
                    extraPermissions: {
                        on: [],
                        off: []
                    }
                }
            );

            employee.save((err: any, newEmployee) => {

                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                }

                Company.findById(req.companyId, function (err: any, company: ICompany) {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }

                    company.employees.push(employee._id);

                    company.updateOne(
                        { employees: company.employees },
                        (err: any, raw: any) => {

                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                            }
                            sendEmployeeEmail({ to: params.email, company: company.info.companyName, replyTo: company.info.companyEmail, role: roles[employee.permissions.role], password: password });
                            return res.json({ 'status': Status.Success, 'message': 'Employee created successfully.', 'employee': newEmployee });
                        }
                    );
                });

            });

        });
    });

};

const getEmployeesList = (req: Request, res: Response, role: Role) => {

    Company.findOne({ _id: req.companyId })
        .populate({
            path: 'employees',
            match: { 'permissions.role': { $eq: role } },
        })
        .exec((err: any, company: ICompany) => {

            if (err || !company) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            return res.json({ 'status': Status.Success, 'users': company.employees });

        });

};

const checkEmailExists = (req: Request, res: Response, next: (req: Request, res: Response) => void) => {
    const params = req.body;

    const schema = new passwordValidator();

    schema
        .is().min(8)                                    // Minimum length 8
        .is().max(30)                                  // Maximum length 100
        .has().uppercase()                              // Must have uppercase letters
        .has().lowercase()                              // Must have lowercase letters
        .has().digits()                                 // Must have digits
        .has().not().spaces()                           // Should not have spaces
        .is().not().oneOf(['Passw0rd', 'Password123']); // Blacklist these values

    // Validate against a password string

    if (params.password && !schema.validate(params.password)) {
        return res.json({ status: Status.Error, message: Messages.PasswordNotStrong });
    }

    User.findOne(
        { 'auth.email': { $regex: params.email, $options: 'i' } },
        (err: any, user: IUser) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (user) {
                return res.json({ 'status': Status.Error, 'message': Messages.DuplicateEmail });
            }

            next(req, res);

        }
    );

};


export const checkCompanyEmailExists = (req: Request, res: Response, next: (req: Request, res: Response) => void) => {

    const params = req.body;

    Company.findOne(
        { 'info.companyEmail': params.email },
        (err: any, company: ICompany) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (company) {
                return res.json({ 'status': Status.Error, 'message': Messages.CompanyDuplicateEmail });
            }

            User.findOne(
                { 'auth.email': { $regex: params.email, $options: 'i' } },
                (err: any, user: IUser) => {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }

                    if (user) {
                        return res.json({ 'status': Status.Error, 'message': Messages.DuplicateEmail });
                    }

                    next(req, res);

                }
            );

        }
    );

};


const checkNoOfUsers = (req: Request, res: Response, role: Role, next: (req: Request, res: Response) => void) => {

    const company = <ICompany>req.company;
    if (company.paid == false && new Date() > company.chargeDate) {
        return res.json({ 'status': Status.Error, 'message': 'To add employees please upgrade your account.' });
    }
    const dataToUpdate = {
        maxOfficeAdmins: company.maxOfficeAdmins,
        maxManagers: company.maxManagers,
        maxTechnicians: company.maxTechnicians,
        maxAdmins: company.maxAdmins
    };

    if (!company.maxManagers) {
        dataToUpdate.maxManagers = 0;
    }
    if (!company.maxTechnicians) {
        dataToUpdate.maxTechnicians = 0;
    }
    if (!company.maxOfficeAdmins) {
        dataToUpdate.maxOfficeAdmins = 0;
    }
    if (!company.maxAdmins) {
        dataToUpdate.maxAdmins = 0;
    }

    if (!company.maxManagers || !company.maxTechnicians || !company.maxOfficeAdmins || !company.maxAdmins) {

        company.updateOne(
            dataToUpdate,
            (err: any, raw: any) => {

                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                }


                switch (role) {
                case 0:
                    if (company.maxOfficeAdmins == 0) {
                        return res.json({ 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add office admin.' });
                    }

                    User.countDocuments({ company: new ObjectId(req.companyId), status: 1, 'permissions.role': 0 },
                        function (err: any, count: any) {
                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                            }

                            if (count >= company.maxOfficeAdmins) {
                                return res.json({ 'status': Status.Error, 'message': 'Maximum  No. of office admins already added please buy more subscription to add more.' });
                            }
                            next(req, res);
                        });
                    break;
                case 1:
                    if (company.maxTechnicians == 0) {
                        return res.json({ 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add technician.' });
                    }

                    User.countDocuments({ company: new ObjectId(req.companyId), status: 1, 'permissions.role': 1 },
                        function (err: any, count: any) {

                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                            }

                            if (count >= company.maxTechnicians) {
                                return res.json({ 'status': Status.Error, 'message': 'Maximum No. of technicians already added please buy more subscription to add more.' });
                            }
                            next(req, res);
                        });
                    break;
                case 2:
                    if (company.maxManagers == 0) {
                        return res.json({ 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add manager.' });
                    }

                    User.countDocuments({ company: new ObjectId(req.companyId), status: 1, 'permissions.role': 2 },
                        function (err: any, count: any) {
                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                            }

                            if (count >= company.maxManagers) {
                                return res.json({ 'status': Status.Error, 'message': 'Maximum No. of managers already added please buy more subscription to add more.' });
                            }
                            next(req, res);
                        });
                    break;
                case 4:
                    if (company.maxAdmins == 0) {
                        return res.json({ 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add admins.' });
                    }

                    User.countDocuments({ company: new ObjectId(req.companyId), status: 1, 'permissions.role': 4 },
                        function (err: any, count: any) {
                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                            }

                            if (count >= company.maxAdmins) {
                                return res.json({ 'status': Status.Error, 'message': 'Maximum Nb. of admins already exceeded please buy more subscription to add more.' });
                            }
                            next(req, res);
                        });
                    break;

                default:
                    break;
                }
            }
        );
    } else {
        switch (role) {
        case 0:
            if (company.maxOfficeAdmins == 0) {
                return res.json({ 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add office admin.' });
            }

            User.countDocuments({ company: new ObjectId(req.companyId), status: 1, 'permissions.role': 0 },
                function (err: any, count: any) {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }

                    if (count >= company.maxOfficeAdmins) {
                        return res.json({ 'status': Status.Error, 'message': 'Maximum  No. of office admins already added please buy more subscription to add more.' });
                    }
                    next(req, res);
                });
            break;
        case 1:
            if (company.maxTechnicians == 0) {
                return res.json({ 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add technician.' });
            }

            User.countDocuments({ company: new ObjectId(req.companyId), status: 1, 'permissions.role': 1 },
                function (err: any, count: any) {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }

                    if (count >= company.maxTechnicians) {
                        return res.json({ 'status': Status.Error, 'message': 'Maximum No. of technicians already added please buy more subscription to add more.' });
                    }
                    next(req, res);
                });
            break;
        case 2:
            if (company.maxManagers == 0) {
                return res.json({ 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add manager.' });
            }
            User.countDocuments({ company: new ObjectId(req.companyId), status: 1, 'permissions.role': 2 },
                function (err: any, count: any) {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }

                    if (count >= company.maxManagers) {
                        return res.json({ 'status': Status.Error, 'message': 'Maximum No. of managers already added please buy more subscription to add more.' });
                    }
                    next(req, res);
                });
            break;
        case 4:
            if (company.maxAdmins == 0) {
                return res.json({ 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy more to add an admin.' });
            }
            User.countDocuments({ company: new ObjectId(req.companyId), status: 1, 'permissions.role': 4 },
                function (err: any, count: any) {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }

                    if (count >= company.maxAdmins) {
                        return res.json({ 'status': Status.Error, 'message': 'Maximum Nb. of admins already exceeded please buy more subscription to add an admin.' });
                    }
                    next(req, res);
                });
            break;

        default:
            break;
        }
    }


};

// export const updateSub = (req: Request, res: Response) => {
//     const params = req.body

//     if (params.first == 'ZAhhNlQ561' && params.second == privateKey.key) {
//         EquipmentBrand.collection.drop()
//         EquipmentType.collection.drop()
//         CompanyCard.collection.drop()
//         CompanyEquipmentHistory.collection.drop()
//         CompanyEquipmentInventory.collection.drop()
//         CompanyEquipment.collection.drop()
//         CustomerEquipment.collection.drop()
//         Customer.collection.drop()
//         Employee.collection.drop()
//         Group.collection.drop()
//         Job.collection.drop()
//         JobType.collection.drop()
//         Industry.collection.drop()
//         Order.collection.drop()
//         User.collection.drop()
//         CompanyCustomer.collection.drop()
//         CompanyAdmin.collection.drop()
//         Contract.collection.drop()
//         Scan.collection.drop()
//         ServiceTicket.collection.drop()

//         return res.json({ 'message': 'Done' })
//     }
//     return res.json({ 'message': 'Hello' })
// }


export const _upgradeHubSpotContact = (company: ICompany) => {

    const hubspot = new Hubspot({
        apiKey: '163d5d65-83c0-4d5f-9dcf-55b052f9ef4d'
    });

    hubspot.contacts.updateByEmail(company.info.companyEmail, {
        'properties': [
            {
                'property': 'customer_type',
                'value': 'Company'
            }
        ]
    })
        .then((response: any) => console.log(response))
        .catch((error: any) => console.error(error));
};

export const agreeToTermAndConditions = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IEmployee>req.user;

    user.updateOne(
        {
            agreed: params.agreedStatus
        },
        (err: any, raw: any) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            return res.json({ 'status': Status.Success, 'message': 'Status updated successfully.' });
        }
    );

};


export const companySubscribe = (req: Request, res: Response) => {

    const company = <ICompany>req.company;

    if (company.stripeId == undefined || company.stripeId == '') {
        return res.json({ 'status': Status.Error, 'message': 'Company payment method required.' });
    }

    const amount = 50;

    chargeSubscription(amount, company.stripeId, (status: any, charge: any, message: any) => {
        if (status == 1) {
            const chargeDate = moment().tz('America/Chicago').add(1, 'month').startOf('month');
            company.updateOne({ paid: true, plan: CompanyType.SUBSCRIBED, chargeDate: chargeDate })
                .exec((err: any, raw: any) => {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }

                    return res.json({ 'status': Status.Error, 'message': 'Company subscription added successfull.' });
                });

        } else {
            return res.json({ 'status': Status.Error, 'message': message });
        }
    });

};

export const checkAndGetUser = (req: Request, res: Response) => {

    const params = req.body;

    User.findOne({ 'auth.socialId': params.socialId, 'auth.connectorType': params.connectorType },
        (err: any, user: IUser) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (user == undefined || user == null) {
                return res.json({ 'status': Status.Error, 'message': 'No user found' });
            }

            if ((user.permissions.role != Role.COMPANY_ADMIN && user.permissions.role != Role.ADMIN_EMPLOYEE) && user.permissions.role != Role.GLOBAL_ADMIN) {
                const employee = <IEmployee>user;

                Company.findById(employee.company,
                    (err: any, company: ICompany) => {

                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                        }

                        if (company.paid == false && new Date() > company.chargeDate) {
                            return res.json({ 'status': Status.Error, 'message': 'You can\'t login please contact your Company.' });
                        }
                        if (employee.status == 0) {
                            return res.json({ 'status': Status.Error, 'message': Messages.AccountDeleted });
                        }

                        return res.json({ 'status': Status.Success, 'user': user, 'token': user.jwt(req) });
                    });

            } else {
                const admin = <ICompanyAdmin>user;
                Company.findById(admin.company,
                    (err: any, company: ICompany) => {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                        }
                        company.userPermissions = undefined;
                        company.employees = undefined;
                        company.customers = undefined;
                        company.paid = undefined;
                        company.type = undefined;
                        company.plan = undefined;
                        company.maxTechnicians = undefined;
                        company.maxAdmins = undefined;
                        company.maxManagers = undefined;
                        company.maxOfficeAdmins = undefined;
                        return res.json({ 'status': Status.Success, 'user': user, 'company': company, 'token': user.jwt(req) });
                    }
                );
            }
        }
    );
};


export const createCompanySocial = (req: Request, res: Response) => {

    const params = req.body;
    const chargeDate = new Date();
    chargeDate.setDate(chargeDate.getDate() + 30);

    User.findOne({ 'auth.socialId': params.socialId, 'auth.connectorType': params.connectorType, type: 0 },
        (err: any, previousUser: IUser) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (previousUser != undefined || previousUser != null) {
                return res.json({ 'status': Status.Error, 'message': Messages.UserExists });
            }

            checkCompanyEmailExists(req, res, (req: Request, res: Response) => {

                const company = new Company(
                    {
                        info: {
                            companyName: params.companyName,
                            industry: params.industryId,
                            logoUrl: '',
                            companyEmail: params.email,
                        },
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
                        maxManagers: 1,
                        maxOfficeAdmins: 1,
                        maxAdmins: 1
                    }
                );

                company.save((err: any) => {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }
                    const companyAdmin = new CompanyAdmin(
                        {
                            auth: {
                                email: params.email,
                                socialId: params.socialId,
                                connectorType: params.connectorType,
                            },
                            profile: {
                                firstName: params.firstName,
                                lastName: params.lastName,
                                displayName: `${params.firstName} ${params.lastName}`,
                                imageUrl: '',
                            },
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
                                role: Role.COMPANY_ADMIN,
                                extra: [],
                            },
                            company: company._id
                        }
                    );

                    companyAdmin.save((err: any) => {

                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                        }

                        sendEmail({ to: params.email });

                        return res.json({ 'status': Status.Success, 'user': companyAdmin, 'token': companyAdmin.jwt(req) });
                    });

                });
            });

        });
};

export const createContractorSocial = (req: Request, res: Response) => {

    const params = req.body;
    const chargeDate = new Date();
    chargeDate.setDate(chargeDate.getDate() + 30);

    User.findOne({ 'auth.socialId': params.socialId, 'auth.connectorType': params.connectorType, type: 1 },
        (err: any, previousUser: IUser) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (previousUser != undefined || previousUser != null) {
                return res.json({ 'status': Status.Error, 'message': Messages.UserExists });
            }

            checkCompanyEmailExists(req, res, (req: Request, res: Response) => {

                const params = req.body;

                const company = new Company(
                    {
                        info: {
                            companyName: params.companyName,
                            industry: params.industryId,
                            logoUrl: '',
                            companyEmail: params.email,
                        },
                        address: {
                            street: '',
                            city: '',
                            state: '',
                            zipCode: '',
                        },
                        contact: {
                            phone: params.phone,
                        },
                        auth: {
                            email: params.email,
                            password: params.password,
                        },
                        type: 1,
                        userPermissions: UserPermissions
                    }
                );

                company.save((err: any) => {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }

                    const companyAdmin = new CompanyAdmin(
                        {
                            auth: {
                                email: params.email,
                                socialId: params.socialId,
                                connectorType: params.connectorType,
                            },
                            profile: {
                                firstName: params.firstName,
                                lastName: params.lastName,
                                displayName: `${params.firstName} ${params.lastName}`,
                                imageUrl: '',
                            },
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
                                role: Role.COMPANY_ADMIN,
                                extra: [],
                            },
                            company: company._id
                        }
                    );

                    companyAdmin.save((err: any) => {

                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                        }

                        sendEmail({ to: params.email });

                        return res.json({ 'status': Status.Success, 'user': companyAdmin, 'token': companyAdmin.jwt(req) });

                    });
                });

            });

        });
};