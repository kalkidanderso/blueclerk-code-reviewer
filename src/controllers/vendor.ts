import {Request, Response} from 'express';
import moment from 'moment-timezone';

import {CompanyType, ContractStatus, Messages, Role, Status, UserPermissions, SocketEvents} from '../common/constants';
import {
    sendAccountUpgradeEmail,
    sendContractStartEmail,
    sendContractStartEmailToCompany,
    sendContractStatusChangeEmailToCompany,
    sendContractStatusChangeEmailToContractor,
    sendEmail,
    sendInvitationToContractor
} from '../services/aws';
import {addCustomerAndCharge, chargeSubscription, createStripeInvoiceItem} from '../services/stripe';

import { Company, ICompany } from '../models/Company';
import { IUser } from '../models/User';
import { CompanyAdmin, ICompanyAdmin } from '../models/CompanyAdmin';
import { CompanyCustomer } from '../models/CompanyCustomer';
import { CompanyCard } from '../models/CompanyCard';
import { CompanyInvoice, ICompanyInvoice } from '../models/CompanyInvoice';
import { Contract, IContract } from '../models/Contract';
import { NotificationTypes } from '../models/Notification';
import { NotificationContract, INotificationContract } from '../models/NotificationDiscriminator';
import { _createHubSpotContact, _upgradeHubSpotContact, checkCompanyEmailExists, login } from '../controllers/user';
import { _handleNotification } from './notification';
import { Employee } from '../models/Employee';
import * as Sentry from '@sentry/node';

// new contractor signup
export const createContractor = (req: Request, res: Response, sio: any) => {

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
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
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
                    return res.json({'status': Status.Error, 'message': Messages.GenericError});
                }

                company.updateOne({
                    'admin': companyAdmin._id
                }, (err: any, raq: any) => {

                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError});
                    }
                    _createHubSpotContact(company, companyAdmin);
                    sendEmail({to: params.email});
                    login(req, res, sio);
                });

            });
        });

    });

};

// search contractor/organization for contract
export const searchContractor = (req: Request, res: Response) => {

    const query: any = [];
    const params = req.body;

    if (params.email) {
        query.push({'info.companyEmail': {$regex: params.email, $options: 'i'}});
    }

    if (params.keyword) {
        query.push({'info.companyName': {$regex: params.keyword, $options: 'i'}});
        query.push({'info.companyEmail': {$regex: params.keyword, $options: 'i'}});
    }

    if (!params.email && !params.keyword) {
        return res.json({'status': Status.Success, 'contractors': []});
    }

    Company.find(
        {$or: query},
        'info.companyEmail info.companyName contact.phone info.logoUrl address.street address.city address.state address.zipCode',
        (err: any, contractors: ICompany[]) => {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            if (contractors.length == 0) {
                return res.json({'status': Status.Success, 'contractors': []});
            }
            return res.json({'status': Status.Success, 'contractors': contractors});
        }
    );
};

// company start / initiate contract for contractor
export const startContract = async (req: Request, res: Response, sio: any) => {

    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;
    /*    if (company.paid == false && company.type == 1) {
            return res.json({'status': Status.Error, 'message': 'Your Free Trial has ended. Please buy Subscription to Add Contractors'});
        }*/
    const nbOfAvailableContracts = await Contract.countDocuments({
        company: company._id,
        status: {$in: [ContractStatus.ACCEPTED, ContractStatus.PENDING]}
    });

    Company.findById(params.contractorId,
        (err: any, contractor: ICompany) => {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            if (contractor == undefined) {
                return res.json({'status': Status.Error, 'message': 'Invalid vendor.'});
            }

            // Check if company still in 30 days free period or not
            // if (moment(company.trialEndDate).isBefore(moment()) && !company.stripeId) {
            if (!company.paid && new Date() > company.chargeDate && !company.stripeId) {
                return res.json({
                    status: Status.Error,
                    message: 'Cannot add vendor right now, please update the company billing method first. (Go to menu: Admin > Billing > Billing Methods)'
                });
            }

            /**
             * Check if contract with PENDING or ACCEPTED already existed,
             * otherwise, company can resend new contract to the same vendor
             */
            Contract.find({
                'company': req.companyId,
                'contractor': contractor._id,
            }).sort({$natural: -1}).limit(1).exec(
                (err: any, oldcontract: IContract[]) => {
                    let contract: IContract;
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError});
                    }

                    if (oldcontract[0]?.status == ContractStatus.PENDING || oldcontract[0]?.status == ContractStatus.ACCEPTED) {
                        return res.json({'status': Status.Error, 'message': 'Vendor already exist.'});
                    } else if (oldcontract[0]?.status == ContractStatus.CANCELED || oldcontract[0]?.status == ContractStatus.FINISHED || oldcontract[0]?.status == ContractStatus.REJECTED) {

                        // if previous canceled, finished or rejected contract found, reactivate it instead creating new one
                        contract = oldcontract[0];
                        contract.status = ContractStatus.ACCEPTED;
                    } else {
                        // if first time start contract with contractor, create new
                        contract = new Contract(
                            {
                                company: req.companyId,
                                contractor: contractor._id,
                                status: ContractStatus.ACCEPTED,
                            }
                        );
                    }

                    contract.save(async (err: any) => {

                        if (err) {
                            return res.json({'status': Status.Error, 'message': Messages.GenericError});
                        }

                        // Send email to contractor for contract started
                        sendContractStartEmail({
                            to: contractor.info.companyEmail,
                            company: req.company.info.companyName,
                            contractor: contractor.info.companyName,
                            companyEmail: req.company.info.companyEmail
                        });

                        /**
                         * Kris' remark (Sept 16th, 2021):
                         * Disable contract start email to company for now,
                         * Based on [BLUECLERK-352] Fix Vendor Stuff
                         */
                        // sendContractStartEmailToCompany({ to: req.company.info.companyEmail, company: req.company.info.companyName, contractor: contractor.info.companyName })

                        if (
                            (company.paid
                                && new Date() < company.chargeDate)
                            || company.stripeId
                        ) {
                            // Get the pro-rated charge
                            const {amount, tax} = await _getProRatedAmount();

                            // Create a pending invoice items to Stripe
                            const invoiceItem = await createStripeInvoiceItem(company.stripeId, amount + tax, contractor.info?.companyName);

                            // Find existing company invoice
                            let companyInvoice = await CompanyInvoice.findOne({
                                company: company._id,
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
                                    company: company._id
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
                            company.companyInvoices = company.companyInvoices ?? [];
                            const existCompanyInvoice = company.companyInvoices.find(
                                inv => inv.toString() === companyInvoice._id.toString()
                            );
                            if (!existCompanyInvoice) {
                                company.companyInvoices.push(companyInvoice);
                                await company.save();
                            }
                        }

                        // Construct notification entry to be saved
                        const notificationEntry: INotificationContract = new NotificationContract({
                            company: contractor._id,
                            notificationType: NotificationTypes.CONTRACT_INVITATION,
                            message: {
                                title: 'New vendor contract received',
                                body: `Company ${company.info.companyName} has added you to be a vendor`
                            },
                            metadata: contract._id
                        });

                        // Save the notification with Contrac as the metadata
                        notificationEntry.save(async (err: any, notification: INotificationContract) => {

                            if (err) {
                                return res.json({'status': Status.Error, 'message': Messages.GenericError});
                            }

                            // Send notification message to specific room based on the Company ID
                            await notification.populate('metadata').execPopulate();
                            await sio.to(contractor._id.toString()).emit(SocketEvents.NOTIFICATION_CENTER, notification);

                            return res.json({'status': Status.Success, 'message': 'Vendor Added.'});
                        });
                    });
                });

        }
    );
};

//invite contractor for signup
export const inviteContractor = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    // if (moment(company.trialEndDate).isBefore(moment()) && !company.stripeId) {
    if (!company.paid && new Date() > company.chargeDate && !company.stripeId) {
        return res.json({
            status: Status.Error,
            message: 'Cannot invite vendor right now, please update the company billing method first. (Go to menu: Admin > Billing > Billing Methods)'
        });
    }

    Company.findOne({'info.companyEmail': params.email},
        async (err: any, contractor: ICompany) => {

            if (err) {
                return res.json({status: Status.Error, message: Messages.GenericError});
            }

            if (contractor) {
                return res.json({status: Status.Error, message: 'Vendor already added'});
            }

            // Check if contract exist
            let contract = await Contract.findOne({company: company._id, contractorEmail: params.email});
            if (contract) {
                return res.json({status: Status.Error, message: 'Vendor already invited', contract});
            }

            // Create contract without customer
            contract = new Contract({
                company: company._id,
                contractorEmail: params.email,
                status: ContractStatus.ACCOUNT_NOT_CREATED,
                createdBy: user._id
            });
            await contract.save();

            // ToDo email email with signup link
            sendInvitationToContractor({
                to: params.email,
                company: company.info?.companyName,
                replyTo: company.info?.companyEmail,
                companyId: company._id
            });

            return res.json({status: Status.Success, message: 'Invitation sent.', contract});
        }
    );

};

// get all contracts for contractor
export const getAllContracts = (req: Request, res: Response) => {

    const user = <ICompanyAdmin>req.user;

    Contract.find({contractor: user.company})
        .populate({
            path: 'company',
            select: 'info.companyName info.companyEmail type'
        })
        .populate({
            path: 'contractor',
            select: 'info.companyName info.companyEmail type'
        })
        .exec((err: any, contracts: IContract[]) => {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            if (contracts.length == 0) {
                return res.json({'status': Status.Error, 'message': 'No contract found.'});
            }

            return res.json({'status': Status.Success, 'contracts': contracts});
        }
        );
};

// contract accept or reject by contractor /organization
export const acceptRejectContract = (req: Request, res: Response, sio: any) => {

    const params = req.body;
    const contractor = <ICompany>req.company;

    let contractStatus = 0;

    if (params.status == 'accept') {
        contractStatus = ContractStatus.ACCEPTED;

    } else if (params.status == 'reject') {
        contractStatus = ContractStatus.REJECTED;

    } else {
        return res.json({'status': Status.Error, 'message': 'Invalid contract status'});
    }

    Contract.findOne({
        _id: params.contractId,
        contractor: contractor._id
    }).populate('company').populate('contractor').then(async (contract) => {

        if (contract == undefined) {
            return res.json({'status': Status.Error, 'message': 'Invalid contract.'});
        }

        if (contract.status == ContractStatus.ACCEPTED) {
            return res.json({'status': Status.Error, 'message': 'Contract is already accepted.'});
        }

        if (contract.status == ContractStatus.CANCELED) {
            return res.json({'status': Status.Error, 'message': 'Contract is already canceled.'});
        }

        if (contract.status == ContractStatus.REJECTED) {
            return res.json({'status': Status.Error, 'message': 'Contract is already rejected.'});
        }

        if (contract.status == ContractStatus.FINISHED) {
            return res.json({'status': Status.Error, 'message': 'Contract is already finished.'});
        }

        const company = contract.company;
        const contractor = <ICompany>contract.contractor;
        const nbCurrentContract = await Contract.countDocuments({
            company: company._id,
            status: {$in: [ContractStatus.ACCEPTED, ContractStatus.PENDING]}
        });
        if (contractStatus == ContractStatus.ACCEPTED) {
            let amount = 0;
            const now = new Date();
            const daysRemaining = now.getDate();
            const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const daysToCharge = daysInCurrentMonth - daysRemaining + 1;

            const perday = 3 / daysInCurrentMonth;
            amount = amount + (perday * daysToCharge);
            if (daysToCharge >= 10) {
                if (!company.stripeId) {
                    // Company doesn't have billing info
                    return res.json({
                        'status': Status.Error,
                        'message': 'Please contact the company to update their payment information'
                    });
                }

                try {
                    chargeSubscription(amount, company.stripeId, async (status: any, charge: any, tax: any, message: any) => {
                        if (status !== 1) {
                            // Error when charge the subscription
                            return res.json({
                                'status': Status.Error,
                                'message': 'Please contact the company to update their payment information'
                            });
                        }

                        contract.updateOne(
                            {status: contractStatus},
                            (err: any, raw: any) => {
                                if (err) {
                                    return res.json({'status': Status.Error, 'message': Messages.GenericError});
                                }

                                // ToDo send email to company /contractor on update
                                const companyCustomer = new CompanyCustomer({
                                    company: contractor._id,
                                    customer: company._id,
                                });
                                companyCustomer.save((err: any) => {

                                    if (err) {
                                        return res.json({'status': Status.Error, 'message': Messages.GenericError});
                                    }

                                    sendContractStatusChangeEmailToCompany({
                                        to: company.info.companyEmail,
                                        contractor: contractor.info.companyName,
                                        company: company.info.companyName,
                                        contractStatus: params.status + 'ed'
                                    });
                                    sendContractStatusChangeEmailToContractor({
                                        to: contractor.info.companyEmail,
                                        contractor: contractor.info.companyName,
                                        company: company.info.companyName,
                                        replyTo: company.info.companyEmail,
                                        contractStatus: params.status + 'ed'
                                    });
                                });
                            });
                        // Create Company Invoice
                        const companyInvoice: ICompanyInvoice = new CompanyInvoice({
                            technicians: 0,
                            managers: 0,
                            officeAdmins: 0,
                            admins: 0,
                            contractors: 1,
                            charges: amount,
                            tax: tax,
                            total: charge.amount_captured / 100,
                            company: company._id
                        });
                        sendAccountUpgradeEmail({
                            to: company.info.companyEmail,
                            amount: charge.amount_captured / 100,
                            technicians: 0,
                            managers: 0,
                            officeAdmins: 0,
                            admins: 0,
                            contractors: 1
                        }).then(async () => {
                            companyInvoice.emailHistory.push({
                                sentTo: company.info.companyEmail
                            });
                            await companyInvoice.save();
                        });
                        const companyInvoices = company.companyInvoices ? company.companyInvoices : [];
                        const chargeDate = moment().tz('America/Chicago').add(1, 'month').startOf('month');

                        companyInvoices.push(companyInvoice);
                        company.plan = CompanyType.SUBSCRIBED;
                        company.paid = true;
                        company.companyInvoices = companyInvoices;
                        company.chargeDate = chargeDate.toDate();
                        await company.save();

                        // Save notification
                        const notificationEntry: INotificationContract = new NotificationContract({
                            company: company._id,
                            notificationType: NotificationTypes.CONTRACT_ACCEPTED,
                            message: {
                                title: 'Contract accepted',
                                body: `Company ${contractor.info.companyName} has accepted your vendor contract`
                            },
                            metadata: contract._id
                        });

                        notificationEntry.save(async (err: any, notification: INotificationContract) => {

                            if (err) {
                                return res.json({'status': Status.Error, 'message': Messages.GenericError});
                            }

                            // Send notification message to specific room based on the Company ID
                            await notification.populate('metadata').execPopulate();
                            await sio.to(company._id.toString()).emit(SocketEvents.NOTIFICATION_CENTER, notification);

                            return res.json({'status': Status.Success, 'message': 'Contract ' + params.status + 'ed.'});
                        });
                    });
                } catch (err) {
                    Sentry.captureException(err);
                    return res.json({ 'status': Status.Error, 'message': err.message });
                }
            } else {
                contract.updateOne(
                    {status: contractStatus},
                    (err: any, raw: any) => {
                        if (err) {
                            return res.json({'status': Status.Error, 'message': Messages.GenericError});
                        }

                        // ToDo send email to company /contractor on update
                        const companyCustomer = new CompanyCustomer({
                            company: contractor._id,
                            customer: company._id,
                        });
                        companyCustomer.save((err: any) => {

                            if (err) {
                                return res.json({'status': Status.Error, 'message': Messages.GenericError});
                            }

                            sendContractStatusChangeEmailToCompany({
                                to: company.info.companyEmail,
                                contractor: contractor.info.companyName,
                                company: company.info.companyName,
                                contractStatus: params.status + 'ed'
                            });
                            sendContractStatusChangeEmailToContractor({
                                to: contractor.info.companyEmail,
                                contractor: contractor.info.companyName,
                                company: company.info.companyName,
                                replyTo: company.info.companyEmail,
                                contractStatus: params.status + 'ed'
                            });

                            // return res.json({ 'status': Status.Success, 'message': 'Contract ' + params.status + 'ed.' })

                            // needs to change

                        });
                    });
                // Create Company Invoice
                const companyInvoice: ICompanyInvoice = new CompanyInvoice({
                    technicians: 0,
                    managers: 0,
                    officeAdmins: 0,
                    admins: 0,
                    contractors: 1,
                    charges: 0,
                    tax: 0,
                    total: 0,
                    company: company._id
                });
                sendAccountUpgradeEmail({
                    to: company.info.companyEmail,
                    amount: 0,
                    technicians: 0,
                    managers: 0,
                    officeAdmins: 0,
                    admins: 0,
                    contractors: 1
                }).then(async () => {
                    companyInvoice.emailHistory.push({
                        sentTo: company.info.companyEmail
                    });
                    await companyInvoice.save();
                });
                const companyInvoices = company.companyInvoices ? company.companyInvoices : [];
                const chargeDate = moment().tz('America/Chicago').add(1, 'month').startOf('month');

                companyInvoices.push(companyInvoice);
                company.plan = CompanyType.SUBSCRIBED;
                company.paid = true;
                company.companyInvoices = companyInvoices;
                company.chargeDate = chargeDate.toDate();
                await company.save();

                // Save notification
                const notificationEntry: INotificationContract = new NotificationContract({
                    company: company._id,
                    notificationType: NotificationTypes.CONTRACT_ACCEPTED,
                    message: {
                        title: 'Contract accepted',
                        body: `Company ${contractor.info.companyName} has accepted your vendor contract`
                    },
                    metadata: contract._id
                });

                notificationEntry.save(async (err: any, notification: INotificationContract) => {

                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError});
                    }

                    // Send notification message to specific room based on the Company ID
                    await notification.populate('metadata').execPopulate();
                    await sio.to(company._id.toString()).emit(SocketEvents.NOTIFICATION_CENTER, notification);

                    return res.json({'status': Status.Success, 'message': 'Contract ' + params.status + 'ed.'});
                });
            }
        } else {
            contract.updateOne(
                {status: contractStatus},
                (err: any, raw: any) => {
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError});
                    }

                    const companyCustomer = new CompanyCustomer({
                        company: contractor._id,
                        customer: company._id,
                    });
                    companyCustomer.save((err: any) => {

                        if (err) {
                            return res.json({'status': Status.Error, 'message': Messages.GenericError});
                        }

                        sendContractStatusChangeEmailToCompany({
                            to: company.info.companyEmail,
                            contractor: contractor.info.companyName,
                            company: company.info.companyName,
                            contractStatus: params.status + 'ed'
                        });
                        sendContractStatusChangeEmailToContractor({
                            to: contractor.info.companyEmail,
                            contractor: contractor.info.companyName,
                            company: company.info.companyName,
                            replyTo: company.info.companyEmail,
                            contractStatus: params.status + 'ed'
                        });

                        // Save notification
                        const notificationEntry: INotificationContract = new NotificationContract({
                            company: company._id,
                            notificationType: NotificationTypes.CONTRACT_REJECTED,
                            message: {
                                title: 'Contract rejected',
                                body: `Company ${contractor.info.companyName} has rejected your vendor contract`
                            },
                            metadata: contract._id
                        });

                        notificationEntry.save(async (err: any, notification: INotificationContract) => {

                            if (err) {
                                return res.json({'status': Status.Error, 'message': Messages.GenericError});
                            }

                            // Send notification message to specific room based on the Company ID
                            await notification.populate('metadata').execPopulate();
                            await sio.to(company._id.toString()).emit(SocketEvents.NOTIFICATION_CENTER, notification);

                            return res.json({'status': Status.Success, 'message': 'Contract ' + params.status + 'ed.'});
                        });
                    });
                });

        }
    }).catch((err) => {
        Sentry.captureException(err);
        return res.json({ 'status': Status.Error, 'message': err.message });
    });
};

export const updateContract = async (req: Request, res: Response, sio: any) => {

    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    const contract: IContract = await Contract.findById(params.contractId);

    if (contract) {
        if (contract.status === ContractStatus.ACCOUNT_NOT_CREATED) {
            return res.json({
                status: Status.Error,
                message: 'Contract found but the Contractor haven\'t registered to BlueClerk, you can remind them to registered first'
            });
        }

        const contractor: ICompany = await Company.findById(contract.contractor);

        if (!contractor) {
            return res.json({status: Status.Error, message: 'Contractor not found.'});
        }

        let notificationType;
        let messageTitle;
        let messageBody;

        switch (params.status) {
        case ContractStatus.ACCEPTED:
            // Reset finished information
            contract.finishedBy = null;
            contract.finishedAt = null;

            // Construct notification data
            notificationType = NotificationTypes.CONTRACT_ACCEPTED;
            messageTitle = 'New vendor contract received';
            messageBody = `Company ${company.info.companyName} has added you to be a vendor`;

            // Send email to contractor for contract started
            sendContractStartEmail({
                to: contractor.info.companyEmail,
                company: req.company.info.companyName,
                contractor: contractor.info.companyName,
                companyEmail: req.company.info.companyEmail
            });

            // Handle charge for the company
            if (
                (company.paid
                        && new Date() < company.chargeDate)
                    || company.stripeId
            ) {
                // Get the pro-rated charge
                const {amount, tax} = await _getProRatedAmount();

                // Create a pending invoice items to Stripe
                const invoiceItem = await createStripeInvoiceItem(company.stripeId, amount + tax, contractor.info?.companyName);

                // Find existing company invoice
                let companyInvoice = await CompanyInvoice.findOne({
                    company: company._id,
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
                        company: company._id
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
                company.companyInvoices = company.companyInvoices ?? [];
                const existCompanyInvoice = company.companyInvoices.find(
                    inv => inv.toString() === companyInvoice._id.toString()
                );
                if (!existCompanyInvoice) {
                    company.companyInvoices.push(companyInvoice);
                    await company.save();
                }
            }
            break;

        case ContractStatus.FINISHED:
            // Add finished information
            contract.finishedBy = user;
            contract.finishedAt = new Date();

            // Construct notification data
            notificationType = NotificationTypes.CONTRACT_FINISHED;
            messageTitle = 'Contract finished';
            messageBody = `Company ${company.info.companyName} has finished your vendor contract`;
            break;

        default:
            return res.json({status: Status.Error, message: 'Status must be 1 (ACCEPTED) or 4 (FINISHED).'});

        }

        // Save contract status
        contract.status = params.status;
        await contract.save();

        // Save notification to DB and send through SocketIO
        await _handleNotification({
            sio,
            companyId: contractor._id,
            notificationType: notificationType,
            messageTitle,
            messageBody,
            metadataId: contract._id
        });

        await contract
            .populate({path: 'company', select: 'info address contact'})
            .populate({path: 'contractor', select: 'info address contact'})
            .execPopulate();

        return res.json({status: Status.Success, message: 'Company Contract status updated successfully.', contract});
    }

};

// cancel or finish by compnay
export const cancelOrFinishContract = (req: Request, res: Response, sio: any) => {

    const params = req.body;
    const company = <ICompany>req.company;

    let contractStatus = 0;
    let notificationType: NotificationTypes = NotificationTypes.CONTRACT_CANCELED;
    let messageTitle: string, messageBody: string;

    if (params.status == 'cancel') {
        contractStatus = ContractStatus.CANCELED;
        notificationType = NotificationTypes.CONTRACT_CANCELED;
        messageTitle = 'Contract canceled';
        messageBody = `Company ${company.info.companyName} has canceled your vendor contract`;

    } else if (params.status == 'finish') {
        contractStatus = ContractStatus.FINISHED;
        notificationType = NotificationTypes.CONTRACT_FINISHED;
        messageTitle = 'Contract finished';
        messageBody = `Company ${company.info.companyName} has finished your vendor contract`;

    } else {
        return res.json({'status': Status.Error, 'message': 'Invalid contract status'});
    }

    Contract.findOne(
        {'company': req.companyId, '_id': params.contractId},
        (err: any, contract: IContract) => {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            if (contract == undefined || contract == null) {
                return res.json({'status': Status.Error, 'message': 'Invalid contract.'});
            }

            if (contract.status == ContractStatus.CANCELED) {
                return res.json({'status': Status.Error, 'message': 'Contract is already canceled.'});
            }

            if (contract.status == ContractStatus.REJECTED) {
                return res.json({'status': Status.Error, 'message': 'Contract is already rejected.'});
            }

            if (contract.status == ContractStatus.FINISHED) {
                return res.json({'status': Status.Error, 'message': 'Contract is already finished.'});
            }

            contract.updateOne(
                {status: contractStatus},
                (err: any, raw: any) => {
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError});
                    }

                    // ToDo send email to company /contractor on update
                    Company.findById(contract.contractor,
                        (err: any, contractor: ICompany) => {
                            if (err) {
                                return res.json({'status': Status.Error, 'message': Messages.GenericError});
                            }
                            // sendContractStatusChangeEmailToContractor({ to: contractor.info.companyEmail, contractor: contractor.info.companyName , company: company.info.companyName, contractStatus:params.status+'ed' })

                            // Save notification
                            const notificationEntry: INotificationContract = new NotificationContract({
                                company: contractor._id,
                                notificationType,
                                message: {
                                    title: messageTitle,
                                    body: messageBody
                                },
                                metadata: contract._id
                            });

                            notificationEntry.save(async (err: any, notification: INotificationContract) => {

                                if (err) {
                                    return res.json({'status': Status.Error, 'message': Messages.GenericError});
                                }

                                // Send notification message to specific room based on the Company ID
                                await notification.populate('metadata').execPopulate();
                                await sio.to(contractor && contractor._id.toString()).emit(SocketEvents.NOTIFICATION_CENTER, notification);
                            });

                            return res.json({'status': Status.Success, 'message': 'Contract ' + params.status + 'ed.'});
                        });
                });
        }
    );
};

export const finishContract = async (req: Request, res: Response, sio: any) => {

    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    const contract = await Contract.findOne({_id: params.contractId, company});

    if (!contract) {
        return res.json({status: Status.Error, message: 'Contract not found.'});
    }

    if (contract.status === ContractStatus.FINISHED) {
        return res.json({status: Status.Error, message: 'Contract is already finished.'});
    }

    contract.status = ContractStatus.FINISHED;
    contract.finishedBy = user;
    contract.finishedAt = new Date();
    await contract.save();

    const contractorCompany = await Company.findById(contract.contractor);

    // Save notification
    const notificationEntry: INotificationContract = new NotificationContract({
        company: contractorCompany._id,
        notificationType: NotificationTypes.CONTRACT_FINISHED,
        message: {
            title: 'Contract finished',
            body: `Company ${company.info?.companyName} has finished your vendor contract`
        },
        metadata: contract._id
    });

    notificationEntry.save(async (err: any, notification: INotificationContract) => {

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError});
        }

        // Send notification message to specific room based on the Company ID
        await notification.populate('metadata').execPopulate();
        await sio.to(contractorCompany?._id?.toString()).emit(SocketEvents.NOTIFICATION_CENTER, notification);
    });

    return res.json({status: Status.Success, message: 'Contract finished successfully.'});

};

export const upgradeToCompany = (req: Request, res: Response) => {
    // return res.json({ 'status': Status.Error, 'message': 'reached inside.' })
    const params = req.body;
    const user = <ICompanyAdmin>req.user;

    Company.findById(user.company,
        (err: any, contractor: ICompany) => {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            if (contractor == undefined || contractor == null) {
                return res.json({'status': Status.Error, 'message': 'Invalid user.'});
            }

            if (contractor.type == 0 || contractor.paid == true) {
                return res.json({'status': Status.Error, 'message': 'You can not upgrade.'});
            }

            // create strip customer and charge
            addCustomerAndCharge(contractor.info.companyEmail, 'company ' + contractor.info.companyName, params.token, 50, (status: any, customer: any, charge: any, message: string) => {

                if (status == 1) {

                    const chargeDate = new Date();
                    chargeDate.setDate(chargeDate.getDate() + 30);

                    contractor.paid = true;
                    contractor.plan = CompanyType.SUBSCRIBED;
                    contractor.type = 0;
                    contractor.chargeDate = chargeDate;
                    contractor.updateOne(contractor, (err: any, raw: any) => {
                        if (err) {
                            return res.json({'status': Status.Error, 'message': Messages.GenericError});
                        }

                        const stripCard = customer.sources.data[0];

                        const card = new CompanyCard({
                            ending: params.ending,
                            token: params.token,
                            company: contractor._id,
                            cardStripeId: stripCard.id,
                            expirationMonth: stripCard.exp_month,
                            expirationYear: stripCard.exp_year,
                            cardType: stripCard.brand,
                            name: stripCard.name
                        });

                        card.save((err: any) => {
                            if (err) {
                                return res.json({'status': Status.Error, 'message': Messages.GenericError});
                            }

                            _upgradeHubSpotContact(contractor);

                            return res.json({status: Status.Success, message: 'Account upgraded successfully.'});
                        });
                    });

                } else {
                    return res.json({status: Status.Error, message: message});
                }
            });
        }
    );
};

export const getContractors = async (req: Request, res: Response) => {

    const company = <ICompany>req.company;
    const contracts = await Contract.find({company: company}).exec();
    const contractorIds = contracts.map(contracts => contracts.contractor);

    const contractors = await Company.find({_id: {$in: [...new Set(contractorIds)]}})
        .populate({
            path: 'admin',
            select: 'profile.displayName contact.phone auth.email accountType'
        }).exec();
    const technicians = await Employee.find({company}).exec();

    return res.json({status: Status.Success, contractors, technicians});
};

export const remindContractor = async (req: Request, res: Response) => {

    const params = req.body;

    const contract = await Contract.findById(params.contractId).populate('company', 'info');
    if (!contract) {
        return res.json({status: Status.Error, message: 'Contract not found'});
    }
    if (contract.status !== ContractStatus.ACCOUNT_NOT_CREATED) {
        return res.json({status: Status.Error, message: 'Vendor already added'});
    }

    // ToDo email email with signup link
    sendInvitationToContractor({
        to: contract.contractorEmail,
        company: contract.company.info?.companyName,
        replyTo: contract.company.info?.companyEmail,
        companyId: contract.company._id
    });

    return res.json({status: Status.Success, message: 'Contract invitation resent', contract});

};

// update the display name field of the contractor in company collection
export const updateVendorDisplayName = async (req: Request, res: Response) => {

    const params = req.body;

    const contractor = await Company.findById(params.contractorId);

    if (!contractor) {
        return res.json({status: Status.Error, message: 'Contractor not found'});
    }

    contractor.info.displayName = params.displayName;

    await contractor.save();

    return res.json({status: Status.Success, message: 'Contractor display name updated'});

};

// PRIVATE METHOD

export const _getProRatedAmount = async (): Promise<{ amount: number, tax: number }> => {

    const now = new Date();
    const daysRemaining = now.getDate();
    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysToCharge = daysInCurrentMonth - daysRemaining + 1;

    // Vendor price is $5/month
    const perDay = 5 / daysInCurrentMonth;
    let amount = Math.round((perDay * daysToCharge) * 100) / 100;

    // Set amount to $5 in max
    amount = amount > 5 ? 5 : amount;

    /**
     * Chris' tax rate is 8.25%,
     * however, the state picks up 20% of that
     */
    const tax = Math.round(((amount * 0.8) * 0.0825) * 100) / 100;

    return {amount, tax};

};
