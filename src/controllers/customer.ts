import { Request, Response } from 'express'
import { ObjectId } from 'mongodb'
import { Status, Messages, Role } from '../common/constants'

import { Customer, ICustomer, IQBCustomer } from '../models/Customer'
import { Company, ICompany } from '../models/Company'
import { CompanyCustomer, ICompanyCustomer } from '../models/CompanyCustomer'
import { User, IUser } from '../models/User'
import { CustomerEquipment, ICustomerEquipment } from '../models/CustomerEquipment'
import { IPriceTier } from '../models/PriceTier'
import { _createQBCustomer, _updateQBCustomer } from './quickbook.customer'

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
    if(req.otherCompanyId != undefined) {
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
            return res.json({ status: Status.Error, message: 'itemTierId is either not found on the Company or itemTier is not active'})
        }
    }

    var data: any =  {
        info: {
            email: params.email,
        },
        profile:{
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

    CompanyCustomer.find({company: companyId},
        (err: any, companyCustomers: ICompanyCustomer[])=>{
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            const customerIds = companyCustomers.length !== 0 ? companyCustomers.map((obj: any)=>{
                return obj.customer
            }) : []

            User.find({_id : {$in: customerIds}},
                'info.email',
                (err: any, users: IUser[]) =>{

                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
                if (users.length === 0 || (users.findIndex((element: any) => element.info.email === customer.info.email) < 0)) {
                    customer.save((err: any) => {

                        if (err) {
                            return res.json({'status': Status.Error, 'message': Messages.GenericError, 'error' : err})
                        }

                        // create company customer here
                        const companyCustomer = new CompanyCustomer({
                            company: companyId,
                            customer: customer._id,
                            createdAt: Date.now()
                        })

                        companyCustomer.save((err: any) => {

                            if (err) {
                                return res.json({'status': Status.Error, 'message': Messages.GenericError})
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
                    return res.json({'status': Status.Error, 'message': 'This email is already registered so please try with other email again'})
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
    let customer: IUser;

    // Check existing customer from the Company's customers
    const companyCustomers: ICompanyCustomer[] = await CompanyCustomer.find({ company: companyId });
    const customerIds = companyCustomers.map(obj => obj.customer) || [];
    const users: IUser[] = await User.find({ _id: { $in: customerIds } });
    const existingCustomer = users.find((user: ICustomer) => user.info.email === params.email);
    if (existingCustomer) {
        // Existing customer found, return it already
        customer = await User.findById(existingCustomer._id);
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
                coordinates: [ params.longitude, params.latitude ]
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
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    var filter = {}
    if (params.includeActive == 'true' && params.includeNonActive == 'true') {
        filter = {}
    }else if (params.includeActive == 'true') {
        filter = {'isActive': { $eq: true }}
    }else {
        filter = {'isActive': { $eq: false }}
    }
    var companyId = companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    CompanyCustomer.find({company: companyId},
    (err: any, companyCustomers: ICompanyCustomer[])=>{
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        if (companyCustomers.length == 0) {
            return res.json({'status': Status.Success, 'customers': []})
        }
        const customerIds = companyCustomers.map((obj: any)=>{

            return obj.customer
        })

        Customer.find({_id : {$in: customerIds}, ...filter},
            'info.email auth.email profile.firstName profile.lastName profile.displayName address.street address.city address.state address.zipCode location contact.phone permissions.role isActive balance company vendorId itemTier paymentTerm quickbookId inactiveBy inactiveAt')
            .populate({ path: 'itemTier', select: '-companyId -__v' })
            .populate({ path: 'inactiveBy', select: 'profile' })
            .exec((err: any, customers: ICustomer[]) =>{

            if (err) {

                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            return res.json({'status': Status.Success, 'customers': customers})
        })

    })
}

export const updateCustomer = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    let companyTier: { tier: any };
    Customer.findById(params.customerId)
    .exec(async (err: any, customer: ICustomer)=>{
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        /**
         * Check if Item Tier ID is active & belong to the company,
         * then assigned it to the updated Customer
         */
        const company = await Company.findById(customer.company).populate({path: 'itemTier.list.tier'});
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

        var data: any =  {
            'info.email': params.email,
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
            inactiveAt: '',
            inactiveBy: '',
        }

        if (!isActive) {
            data.inactiveAt = new Date();
            data.inactiveBy = user._id;
        }

        if (params.latitude && params.longitude) {
            data['location.coordinates'] = [params.longitude, params.latitude]
        }
        customer.updateOne(data, { omitUndefined: true }, (err: any, raw: any)=> {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': err.message });
            }

            // Find customer to get updated customer data
            Customer.findOne({ _id: params.customerId }).exec( async (err: any, customer: ICustomer)=> {
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
            if (parsedCustomPrices[i].quantity !== i+1) {
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

    CompanyCustomer.findOne({ 'customer': params.customerId, company: companyId})
    .populate({
        path: 'customer',
        populate: [{ path: 'jobLocations', populate: {path: 'jobSites'}}, { path: 'equipments'}, { path: 'itemTier', select: '-companyId -__v' }, { path: 'paymentTerm', select: '-company -__v' }]
    })
    .exec().then((companyCustomer: ICompanyCustomer)=>{
        const customer: any = companyCustomer.customer;
        if (!companyCustomer || customer.permissions.role != Role.CUSTOMER) {
            return res.json({'status': Status.Error, 'message': 'No customer found'})
        }
        return res.json({'status': Status.Success, 'customer': customer})
    }).catch((err) => {
        return res.json({'status': Status.Error, 'message': err.message});
    });
}
