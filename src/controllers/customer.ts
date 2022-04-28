import { Request, Response } from 'express'
import { ObjectId } from 'mongodb'
import { Status, Messages, Role } from '../common/constants'

import { Company, ICompany } from '../models/Company'
import { User, IUser } from '../models/User'
import { Contact } from '../models/Contact'
import { Customer, ICustomer, IQBCustomer } from '../models/Customer'
import { CompanyCustomer, ICompanyCustomer } from '../models/CompanyCustomer'
import { Estimate } from '../models/Estimate'
import { PurchaseOrder } from '../models/PurchaseOrder'
import { Tag } from '../models/Tag'
import { CustomerEquipment } from '../models/CustomerEquipment'
import { JobLocation } from '../models/JobLocation'
import { JobSite } from '../models/JobSite'
import { ServiceTicket } from '../models/ServiceTicket'
import { Job } from '../models/Job'
import { IPriceTier } from '../models/PriceTier'
import { Invoice } from '../models/Invoice'
import { Payment } from '../models/Payment'
import { _createQBCustomer, _updateQBCustomer, _inactivateQBCustomers } from '../controllers/quickbook.customer'
import { _getQBInvoices, _updateQBInvoice, _transferQBInvoices, _countQBInvoices } from '../controllers/quickbook.invoice'
import { _getQBPayments, _updateQBPayment, _transferQBPayments, _countQBPayments } from '../controllers/quickbook.payment'
import { _refreshToken } from './quickbook'
import { createCustomerContact } from './contact'
import { CustomerAdmin, ICustomerAdmin } from '../models/CustomerAdmin'

/**
 * To reset Customer quickbookId,
 * used when /disconnectQB API called
 */
export const _resetCustomerQB = (company: ICompany): void => {

    Customer.updateMany(
        { company: company._id, quickbookId: { $ne: null } },
        { $set: { quickbookId: null } }
    ).exec();

    return;

}

export const createCustomer = async (req: Request, res: Response) => {

    const params = req.body
    const company = <ICompany>req.company;
    var companyId = req.companyId;
    let companyTier: { tier: any };
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    /**
     * Check if Item Tier ID is active & belong to the company,
     * then assigned it to the new Customer
     */
    await company.populate({ path: 'itemTier.list.tier' }).execPopulate();
    if (params.itemTierId) {
        companyTier = company.itemTier.list.find(t => {
            const tier = <IPriceTier>t.tier;
            // Check for the active company item tier
            return (tier._id.toString() === params.itemTierId && tier.isActive)
        })

        if (!companyTier) {
            return res.json({ status: Status.Error, message: 'itemTierId is either not found on the Company or itemTier is not active' })
        }
    }

    var data: any = {
        info: {
            email: params.email,
        },
        profile: {
            firstName: params.name,
            lastName: params.name,
            displayName: params.name,
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
        company: companyId,
        permissions: {
            role: Role.CUSTOMER,
            extra: [],
        },
        itemTier: companyTier && companyTier.tier,
        contactName: params.contactName,
        vendorId: params.vendorId,
        contacts: params.contacts
    };

    if (params.latitude && params.longitude) {
        data.location = {
            coordinates: [params.longitude, params.latitude]
        }
    }
    const customer = new Customer(data)

    CompanyCustomer.find({ company: companyId },
        (err: any, companyCustomers: ICompanyCustomer[]) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            const customerIds = companyCustomers.length !== 0 ? companyCustomers.map((obj: any) => {
                return obj.customer
            }) : []

            User.find({ _id: { $in: customerIds } },
                'info.email',
                async (err: any, users: IUser[]) => {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }
                    if (users.length === 0 || (users.findIndex((element: any) => element?.info?.email === customer?.info?.email) < 0)) {
                        // Create contact customer
                        const customerAdmin = await new CustomerAdmin({
                            auth: {
                                email: customer?.info?.email
                            },
                            info: customer?.info,
                            address: customer?.address,
                            location: customer?.location,
                            permissions: customer?.permissions,
                            emailPreferences: customer?.emailPreferences,
                            balance: customer?.balance,
                            commission: customer?.commission,
                            customer: customer._id
                        }).save();

                        customer.admin = customerAdmin._id;
                        customer.save((err: any) => {

                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError, 'error': err })
                            }

                            // create company customer here
                            const companyCustomer = new CompanyCustomer({
                                company: companyId,
                                customer: customer._id,
                                createdAt: Date.now()
                            })

                            companyCustomer.save((err: any) => {

                                if (err) {
                                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                                }

                                if (company.qbAuthorized) {
                                    // Create QB Customer
                                    _createQBCustomer(req, res, company, customer, async (err: any, errMsg: any, qbCustomer: IQBCustomer) => {
                                        if (err) {
                                            return res.json({ status: err, message: errMsg });
                                        }

                                        if (qbCustomer) {
                                            // Create new Customer in QuickBooks
                                            customer.quickbookId = qbCustomer.Id;
                                            await customer.save();

                                            // If company's customers already synced, update the synced date
                                            if (company.qbSync?.customersSynced) {
                                                company.qbSync.customersSyncedAt = new Date();
                                                await company.save();
                                            }
                                        }

                                        return res.json({ status: Status.Success, message: 'Customer created successfully.', customer, quickbookCustomer: qbCustomer });
                                    })
                                } else {
                                    return res.json({ status: Status.Success, message: 'Customer created successfully.', customer });
                                }

                            })
                        })
                    } else {
                        return res.json({ 'status': Status.Error, 'message': 'This email is already registered so please try with other email again' })
                    }

                })

        })

}

/**
 * Reusable create Customer function to be used anywhere
 */
export const _createCustomer = async (req: Request, res: Response, next: (err: any, customer: ICustomer) => void) => {

    const params = req.body;
    const companyId = req.otherCompanyId || req.companyId;
    let customer: ICustomer;

    // Check existing customer from the Company's customers
    const companyCustomers: ICompanyCustomer[] = await CompanyCustomer.find({ company: companyId });
    const customerIds = companyCustomers.map(obj => obj.customer) || [];
    const customers: ICustomer[] = await Customer.find({ _id: { $in: customerIds } });
    const existingCustomer = customers.find((customer: ICustomer) => customer.info.email === params.email);
    if (existingCustomer) {
        // Existing customer found, return it already
        customer = await Customer.findById(existingCustomer._id);
        return next(null, <ICustomer>customer);
    }

    try {
        // No existing customer found, create new customer
        customer = new Customer({
            info: {
                email: params.email
            },
            profile: {
                firstName: params.name,
                lastName: params.name,
                displayName: params.name,
                imageUrl: ''
            },
            address: {
                street: params.street,
                unit: params.unit,
                city: params.city,
                state: params.state,
                zipCode: params.zipCode
            },
            location: [],
            contact: {
                phone: params.phone,
                fax: params.fax
            },
            company: companyId,
            permissions: {
                role: Role.CUSTOMER,
                extra: []
            },
            contactName: params.contactName,
            vendorId: params.vendorId,
            contacts: params.contacts
        });
        if (params.latitude && params.longitude) {
            customer.location = {
                coordinates: [params.longitude, params.latitude]
            }
        }

        await customer.save();

        // Save the company customer as well
        const companyCustomer = new CompanyCustomer({
            company: companyId,
            customer: customer._id,
            createdAt: Date.now()
        })
        await companyCustomer.save();

    } catch (error) {
        return next(error, null);
    }

    return next(null, <ICustomer>customer);

}

export const getCustomers = (req: Request, res: Response) => {

    const params = req.body
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    var filter = {}
    if (params.includeActive == 'true' && params.includeNonActive == 'true') {
        filter = {}
    } else if (params.includeActive == 'true') {
        filter = { 'isActive': { $eq: true } }
    } else {
        filter = { 'isActive': { $eq: false } }
    }
    var companyId = companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    CompanyCustomer.find({ company: companyId },
        (err: any, companyCustomers: ICompanyCustomer[]) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (companyCustomers.length == 0) {
                return res.json({ 'status': Status.Success, 'customers': [] })
            }
            const customerIds = companyCustomers.map((obj: any) => {

                return obj.customer
            })

            Customer.find({ _id: { $in: customerIds }, ...filter },
                'info.email auth.email profile.firstName profile.lastName profile.displayName address.street address.city address.state address.zipCode location contact.phone permissions.role isActive balance company vendorId itemTier paymentTerm quickbookId inactiveBy inactiveAt')
                .populate({ path: 'itemTier', select: '-companyId -__v' })
                .populate({ path: 'inactiveBy', select: 'profile' })
                .exec((err: any, customers: ICustomer[]) => {

                    if (err) {

                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    return res.json({ 'status': Status.Success, 'customers': customers })
                })

        })
}

export const updateCustomer = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    const companyId = req.companyId;
    let companyTier: { tier: any };
    Customer.findById(params.customerId)
        .exec(async (err: any, customer: ICustomer) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            /**
             * Check if Item Tier ID is active & belong to the company,
             * then assigned it to the updated Customer
             */
            const company = await Company.findById(companyId).populate({ path: 'itemTier.list.tier' });
            if (params.itemTierId) {
                companyTier = company.itemTier.list.find(t => {
                    const tier = <IPriceTier>t.tier;
                    // Check for the active company item tier
                    return (tier._id.toString() === params.itemTierId && tier.isActive)
                });

                if (!companyTier) {
                    return res.json({ status: Status.Error, message: 'itemTierId is either not found on the Company or itemTier is not active' })
                }
            }

            // Handle the stringify boolean value
            const isCustomPrice = params.isCustomPrice === 'false' || params.isCustomPrice === false ? false : !!params.isCustomPrice;
            const isActive = params.isActive === undefined || params.isActive === null
                ? customer.isActive
                : params.isActive === 'false' || params.isActive === '0'
                    ? false
                    : !!params.isActive;

            // Check if customer has customPrices or not when isCustomPrice set to true
            const warningMessage = isCustomPrice && customer.customPrices.length <= 0 ? 'Customer will use custom price, but no custom price is configured currently.' : undefined;

            var data: any = {
                'info.email': params.email,
                'auth.email': params.email,
                'profile.firstName': params.name,
                'profile.lastName': params.name,
                'profile.displayName': params.name,
                'address.street': params.street,
                'address.unit': params.unit,
                'address.city': params.city,
                'address.state': params.state,
                'address.zipCode': params.zipCode,
                'contact.phone': params.phone,
                'contact.fax': params.fax,
                isActive,
                itemTier: companyTier && companyTier.tier,
                isCustomPrice,
                contactName: params.contactName,
                vendorId: params.vendorId,
                contacts: params.contacts,
                inactiveAt: null,
                inactiveBy: null,
            }

            if (customer.isActive && !isActive) {
                data.inactiveAt = new Date();
                data.inactiveBy = user._id;
            }

            if (params.latitude && params.longitude) {
                data['location.coordinates'] = [params.longitude, params.latitude]
            }

            await CustomerAdmin.findOneAndUpdate({ _id: customer.admin }, data);
            customer.updateOne(data, { omitUndefined: true }, (err: any, raw: any) => {
                if (err) {
                    return res.json({ 'status': Status.Error, 'message': err.message });
                }

                // Find customer to get updated customer data
                Customer.findOne({ _id: params.customerId }).exec(async (err: any, customer: ICustomer) => {
                    if (company.qbAuthorized && customer.quickbookId) {
                        // Sync the update to Customer in QuickBooks
                        _updateQBCustomer(req, res, company, customer, (err, errMsg, qbCustomer) => {
                            if (err) {
                                return res.json({ status: err, message: errMsg });
                            }

                            if (qbCustomer) {
                                // If company's customers already synced, update the synced date
                                if (company.qbSync?.customersSynced) {
                                    company.qbSync.customersSyncedAt = new Date();
                                    company.save();
                                }
                            }

                            return res.json({
                                status: Status.Success,
                                message: 'Customer Updated Successfully',
                                customer,
                                quickbookCustomer: qbCustomer,
                                quickbookMessage: errMsg
                            });
                        });

                    } else {
                        return res.json({ status: Status.Success, message: 'Customer updated successfully.', warningMessage });
                    }
                });
            });
        })
}

export const updateCustomPrices = async (req: Request, res: Response) => {

    const companyId = req.companyId;
    const params = req.body;

    // Check if customerId is a valid ObjectId
    if (!ObjectId.isValid(params.customerId))
        return res.json({ status: Status.Error, message: `customerId: ${Messages.WrongId}` });

    // Find and check if the customer exist
    const customer = await Customer.findOne({ _id: params.customerId, company: companyId });
    if (!customer)
        return res.json({ status: Status.Error, message: 'Customer not found' });

    if (params.customPrices) {
        let parsedCustomPrices = [];
        let isValid = true;

        try {
            parsedCustomPrices = JSON.parse(params.customPrices);

            // To handle any over-stringified strings
            if (!Array.isArray(parsedCustomPrices)) {
                parsedCustomPrices = JSON.parse(parsedCustomPrices);
            }
        } catch (err) {
            return res.json({ status: Status.Error, message: 'customPrices json is invalid' });
        }

        // Sort the parsed custom prices by the quantity
        parsedCustomPrices.sort((a: any, b: any) => (a.quantity > b.quantity) ? 1 : ((b.quantity > a.quantity) ? -1 : 0));
        // Check if quantity is in sequence
        for (let i = 0; i < parsedCustomPrices.length; i++) {
            if (parsedCustomPrices[i].quantity !== i + 1) {
                isValid = false
                break;
            }
        }

        // There is a missing quantity, return error
        if (!isValid) {
            return res.json({ status: Status.Error, message: 'customPrices quantity is not in sequence/order.' });
        }

        // Save the new customPrices to the customer
        customer.customPrices = parsedCustomPrices;
        await customer.save();

        return res.json({ status: Status.Success, message: 'Customer custom prices are successfully saved.' });
    }

    return res.json({ status: Status.Success, message: 'Nothing to do.' });

}

export const customerDetail = (req: Request, res: Response) => {

    const params = req.body

    let companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    CompanyCustomer.findOne({ 'customer': params.customerId, company: companyId })
        .populate({
            path: 'customer',
            populate: [{ path: 'jobLocations', populate: { path: 'jobSites' } }, { path: 'equipments' }, { path: 'itemTier', select: '-companyId -__v' }, { path: 'paymentTerm', select: '-company -__v' }]
        })
        .exec().then((companyCustomer: ICompanyCustomer) => {
            const customer: any = companyCustomer.customer;
            if (!companyCustomer || customer.permissions.role != Role.CUSTOMER) {
                return res.json({ 'status': Status.Error, 'message': 'No customer found' })
            }
            return res.json({ 'status': Status.Success, 'customer': customer })
        }).catch((err) => {
            return res.json({ 'status': Status.Error, 'message': err.message });
        });
}

export const searchDuplicatedCustomers = async (req: Request, res: Response) => {

    const params = req.body;
    const companyId = req.companyId;
    const company = <ICompany>req.company;

    await Customer.find({
        company: companyId,
        $or: [
            { 'profile.firstName': { $regex: params.keyword, $options: 'i' } },
            { 'profile.lastName': { $regex: params.keyword, $options: 'i' } },
            { 'profile.displayName': { $regex: params.keyword, $options: 'i' } },
            { 'info.email': { $regex: params.keyword, $options: 'i' } }
        ]
    })
        .populate({ path: 'equipments', select: '-__v' })
        .populate({ path: 'itemTier', select: '-__v -createdAt -updatedAt' })
        .populate({ path: 'paymentTerm', select: '-__v -createdAt -updatedAt' })
        .populate({ path: 'contacts', select: '-__v' })
        .populate({
            path: 'jobLocations',
            select: '-__v -customerId -createdAt -updatedAt',
            populate: [
                { path: 'contacts', select: '-__v' },
                { path: 'jobSites', select: '-__v -locationId -customerId' }
            ]
        })
        .exec(async (err: any, customers: ICustomer[]) => {
            if (err || !customers.length) {
                return res.json({ 'status': Status.Success, message: `Customers with keyword "${params.keyword}" not found.` });
            }

            const customerWithInvoicesPayments = await _getCustomerInvoicesPayments(customers, company);
            return res.json({ status: Status.Success, customers: customerWithInvoicesPayments });
        });
}

export const mergeCustomers = async (req: Request, res: Response) => {

    const params = req.body;
    const companyId = req.companyId;
    const company = <ICompany>req.company;

    const unusedCustomerIds = params.unusedCustomerIds?.length ? JSON.parse(params.unusedCustomerIds) : [];
    const jobLocationParams: string[] = params.jobLocations?.length ? JSON.parse(params.jobLocations) : [];
    const customerEquipmentParams: string[] = params.equipments?.length ? JSON.parse(params.equipments) : [];
    const contactsParams: string[] = params.contacts?.length ? JSON.parse(params.contacts) : [];

    const contacts = await Contact.find({ _id: { $in: contactsParams } }).exec();
    const customerEquipments = await CustomerEquipment.find({ _id: { $in: customerEquipmentParams }, customer: { $in: unusedCustomerIds } }).exec();
    const jobLocations = await JobLocation.find({ _id: { $in: jobLocationParams }, customerId: { $in: unusedCustomerIds } }).exec();

    const contactIds = contacts.map(contact => contact.id);
    const customerEquipmentIds = customerEquipments.map(customerEquipment => customerEquipment.id);
    const jobLocationIds = jobLocations.map(jobLocation => jobLocation.id);

    const qbCustomerPayments: string[] = []


    _refreshToken(req, res, company, async (err, errMsg, company) => {
        if (err === 0) {
            res.json({ status: Status.Error, message: errMsg });
        }

        if (err === 400) {
            Company.findByIdAndUpdate(req.company._id, {
                qbAuthorized: false,
                qbAccessToken: undefined,
                qbRefreshToken: undefined
            });

            res.json({ status: Status.QBUnauthorized, message: Messages.QBUnAuthorized });
        }

        // Get deposited customer
        for (const unusedCustomerId of unusedCustomerIds) {
            const unusedCustomer = await Customer.findOne({ _id: unusedCustomerId }).exec();
            const qbPayments = await _getQBPayments(req, res, company, unusedCustomer);
            if (qbPayments) {

                qbPayments.forEach(qbPayment => {
                    qbCustomerPayments.push(qbPayment?.CustomerRef?.name);
                    // if (qbPayment?.LinkedTxn) {
                    //     const depositedPayment = qbPayment?.LinkedTxn.find(linkedPayment => linkedPayment.TxnType === 'Deposit')
                    //     if (depositedPayment) {
                    //         customerPaymentDeposited.push(qbPayment?.CustomerRef?.name);
                    //     }
                    // }
                });
            }

        }
    })

    // Return error when unused user have deposited payment
    if (qbCustomerPayments.length) {
        return res.json({ status: Status.Error, message: `You cannot merge this customer(s): ${[...new Set(qbCustomerPayments)].toString()}. Because they already have a payments on Quickbooks. Either remove the payments of those customers or merge the other customers instead.` })
    }

    const { credit: mergedCredit, balance: mergedBalance } = await _sumMergedCreditBalance(unusedCustomerIds);

    Customer.findById(params.customerId).exec(async (err: any, customer: ICustomer) => {
        if (err || !customer) {
            return res.json({ status: Status.NotFound, message: 'Customer not found' })
        }

        const mergeEntry: any = {
            'info.email': params.email ?? customer?.info?.email,
            'profile.firstName': params.firstName ?? customer?.profile?.firstName,
            'profile.lastName': params.lastName ?? customer?.profile?.lastName,
            'profile.displayName': params.displayName ?? customer?.profile?.displayName,
            'address.street': params.street ?? customer?.address?.street,
            'address.unit': params.unit ?? customer?.address?.unit,
            'address.city': params.city ?? customer?.address?.city,
            'address.state': params.state ?? customer?.address?.state,
            'address.zipCode': params.zipCode ?? customer?.address?.zipCode,
            'contact.phone': params.phone ?? customer?.contact?.phone,
            'contact.fax': params.fax ?? customer?.contact?.fax,
            jobLocations: params.jobLocations?.length ? jobLocationIds : customer?.jobLocations,
            equipments: params.equipments?.length ? customerEquipmentIds : customer?.equipments,
            // quickbookId: params.quickbookId ?? customer?.quickbookId,
            isCustomPrice: params.isCustomPrice ?? customer?.isCustomPrice,
            contactName: params.contactName ?? customer?.contactName,
            vendorId: params.vendorId ?? customer?.vendorId,
            contacts: params.contacts?.length ? contactIds : customer?.contacts,
            isActive: true,
            credit: (customer.credit ?? 0) + mergedCredit,
            balance: (customer.balance ?? 0) + mergedBalance,
            inactiveAt: null,
            inactiveBy: null,
        }

        if (!customer.quickbookId) {
            await _createQBCustomer(req, res, company, customer, async (err: any, errMsg: any, qbCustomer: IQBCustomer) => {
                if (err) {
                    return res.json({ status: err, message: errMsg });
                }

                // Create new Customer in QuickBooks
                mergeEntry.quickbookId = qbCustomer.Id;
            })
        }

        // Save the updated data to customer
        await customer.updateOne(mergeEntry).exec();

        // Refresh the updated customer data from database
        customer = await Customer.findById(customer._id);

        await Customer.find({ _id: { $in: unusedCustomerIds } }).exec(async (err: any, unusedCustomers: ICustomer[]) => {

            // Update customer on job location
            await _moveCustomer({ req, res, customerId: params.customerId, companyId, unusedCustomerIds, jobLocations: jobLocationIds, customerEquipments: customerEquipmentIds });

            if (company?.qbAuthorized && customer.quickbookId) {

                // Update qb invoice
                await _transferQBInvoices(req, res, company, unusedCustomers, customer, async (err, errMsg) => {
                    if (err) {
                        // return res.json({ status: err, message: errMsg });
                        throw new Error(errMsg);
                    }

                    // Update qb payment
                    await _transferQBPayments(req, res, company, unusedCustomers, customer);

                    // Inactive unused customer
                    await _inactivateQBCustomers(req, res, company, unusedCustomers, async (err, errMsg) => {
                        if (err) {
                            // return res.json({ status: err, message: errMsg });
                            throw new Error(errMsg)
                        }

                        await _updateQBCustomer(req, res, company, customer, async (err, errMsg, qbCustomer) => {
                            if (err) {
                                // return res.json({ status: err, message: errMsg });
                                throw new Error(errMsg)
                            }

                            // Remove unused customer (Disable for development)
                            // Customer.deleteMany({_id: {$in: unusedCustomerIds}}).exec();
                            await Customer.updateMany(
                                { _id: { $in: unusedCustomerIds }, company: companyId },
                                { $set: { isActive: false } }
                            ).exec()
                        });
                    });
                });
            }

            return res.json({ status: Status.Success, customer });
        });
    });

}

export const _getCustomerInvoicesPayments = async (customers: ICustomer[], company: ICompany) => {

    const customerWithInvoicesPayments = [];
    for (const customer of customers) {
        try {
            const bcInvoices = await Invoice.find({ customer: customer._id, isDraft: { $ne: true } }).countDocuments();
            const bcPayments = await Payment.find({ customer: customer._id }).countDocuments();
            // const hasQBInvoice = await _countQBInvoices(company, customer);
            // const hasQBPayment = await _countQBPayments(company, customer);
            const [hasQBInvoice, hasQBPayment] = await Promise.all([
                _countQBInvoices(company, customer),
                _countQBPayments(company, customer)
            ]);

            customerWithInvoicesPayments.push({
                customer,
                BCInvoice: bcInvoices,
                hasQBInvoice,
                BCPayment: bcPayments,
                hasQBPayment
            });
        } catch (err) {
            console.log('== Search Duplicated Cust Err:', err.message);
            continue;
        }
    }
    return customerWithInvoicesPayments;

}

const _moveCustomer = async ({
    req,
    res,
    customerId,
    companyId,
    unusedCustomerIds,
    jobLocations,
    customerEquipments
}: {
    req: Request
    res: Response
    customerId: string
    companyId: string
    unusedCustomerIds: string[]
    jobLocations: string[]
    customerEquipments: string[]
}) => {

    // Update unused customer balance and credit
    Customer.updateMany({ _id: { $in: unusedCustomerIds } }, { $set: { balance: 0, credit: 0 } });

    // Update customer on job location when job location is provided
    JobLocation.updateMany(
        { _id: { $in: jobLocations }, customerId: { $in: unusedCustomerIds } },
        { $set: { customerId: customerId } }
    ).exec();

    // Update customer on job location when job location is provided
    CustomerEquipment.updateMany(
        { _id: { $in: customerEquipments }, customer: { $in: unusedCustomerIds } },
        { $set: { customer: customerId } }
    ).exec();

    // Update customer on service ticket
    ServiceTicket.updateMany(
        { company: companyId, customer: { $in: unusedCustomerIds } },
        { $set: { customer: customerId } }
    ).exec();

    // Update customer on job
    Job.updateMany(
        { company: companyId, customer: { $in: unusedCustomerIds } },
        { $set: { customer: customerId } }
    ).exec();

    // Update customer on job site
    JobSite.updateMany(
        { customerId: { $in: unusedCustomerIds } },
        { $set: { customerId: customerId } }
    ).exec();

    // Update customer on payment
    Payment.updateMany(
        { customer: { $in: unusedCustomerIds }, company: companyId },
        { $set: { customer: customerId } }
    ).exec();

    // Update customer on purchase order
    PurchaseOrder.updateMany(
        { customer: { $in: unusedCustomerIds }, company: companyId },
        { $set: { customer: customerId } }
    ).exec();

    // Update customer on estimate
    Estimate.updateMany(
        { customer: { $in: unusedCustomerIds }, company: companyId },
        { $set: { customer: customerId } }
    ).exec();

    // Update customer tag
    Tag.updateMany(
        { customer: { $in: unusedCustomerIds }, company: companyId },
        { $set: { customer: customerId } }
    ).exec();

    // Update customer invoice
    Invoice.updateMany(
        { customer: { $in: unusedCustomerIds }, company: companyId },
        { $set: { customer: customerId } }
    ).exec();

    return;
}

const _sumMergedCreditBalance = async (unusedCustomerIds: string[]): Promise<{ credit: number, balance: number }> => {

    let credit = 0;
    let balance = 0;

    const unusedCustomers = await Customer.find({ _id: { $in: unusedCustomerIds } }).exec();
    for (const unusedCustomer of unusedCustomers) {
        balance += unusedCustomer.balance;
        credit += unusedCustomer.credit;
    }

    return { credit, balance };

}
