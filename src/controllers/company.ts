import {Request, Response} from 'express'
import {CompanyType, ContractStatus, EmployeeStatus, Messages, Role, Status, CompanyCustomerStatus} from '../common/constants'
import {sendAccountDowngradeEmail} from '../services/aws'
import {Company, ICompany} from '../models/Company'
import {ObjectId} from 'mongodb'
import {Contract, IContract} from '../models/Contract'
import {ICompanyAdmin} from '../models/CompanyAdmin'
import {CompanyPrefix, ICompanyPrefix} from '../models/CompanyPrefix'
import { _manageCompanyMainLocation } from '../controllers/companyLocation';
import {ISaleTax, SaleTax} from '../models/SaleTax'
import {IJobCharges, JobCharges} from '../models/JobCharges'
import {IJob, Job} from '../models/Job'
import {IUser, User} from '../models/User'
import {IContractorActivity} from '../models/ContractorActivity'
import { ICustomer, Customer } from '../models/Customer'
import {CompanyCustomer, ICompanyCustomer} from '../models/CompanyCustomer';
import { IItem, Item } from '../models/Item'
import { IPriceTier, PriceTier } from '../models/PriceTier'
import { PaymentEmployee, PaymentVendor } from '../models/Payment'
import { CompanyLocation } from '../models/CompanyLocation'

const Hubspot = require('hubspot')

/**
 * To reset Company QB information and synced status,
 * used when /disconnectQB API called
 */
export const _resetCompanyQB = (company: ICompany): Promise<void> => {

    Company.findByIdAndUpdate(company, {
        qbAuthorized: false,
        qbAccessToken: null,
        qbRefreshToken: null,
        qbRefeshTokenExpiry: null,
        qbCompanyName: null,
        qbCompanyEmail: null,
        'qbSync.customersSynced': false,
        'qbSync.itemsSynced': false,
        'qbSync.paymentTermSynced': false,
        'qbSync.invoicesSynced': false,
        'qbSync.paymentsSynced': false,
        'qbSync.customersSyncedAt': null,
        'qbSync.itemsSyncedAt': null,
        'qbSync.paymentTermSynedAt': null,
        'qbSync.invoicesSyncedAt': null,
        'qbSync.paymentsSyncedAt': null,
    }).exec();

    return;

}

export const updateCompanyProfile = (req: Request, res: Response) => {

    const params = req.body;

    Company.findById(req.companyId, async (err: any, company: ICompany) => {

        if (err) {
            return res.json({ status: Status.Error, message: Messages.GenericError });
        }

        if (!company) {
            return res.json({ status: Status.Error, message: 'Company not found.' });
        }

        // If email updated, check if another company with that email exist
        if (company.info.companyEmail.toLowerCase() != params.companyEmail) {
            Company.findOne(
                { 'info.companyEmail': {$regex : params.companyEmail , $options: 'i' }},
                (err: any, existingCompany: ICompany) => {

                    if (err) {
                        return res.json({ status: Status.Error, message: Messages.GenericError });
                    }

                    if (existingCompany) {
                        return res.json({ status: Status.Error, message: Messages.CompanyDuplicateEmail });
                    }
                }
            )
        }

        // Update company properties
        company.info.companyName = params.companyName;
        company.info.companyEmail = params.companyEmail;
        company.info.logoUrl = params.logoUrl;
        company.address.street = params.street;
        company.address.city = params.city;
        company.address.state = params.state;
        company.address.zipCode = params.zipCode;
        company.contact.phone = params.phone;
        company.contact.fax = params.fax;
        await company.save();

        // To manage company main location, create new or update existing
        const mainLocation = await _manageCompanyMainLocation(company);

        return res.json({ status: Status.Success, message: 'Company Profile updated successfully.', company, mainLocation });
    })

}

export const getEmployeeDetail = async (req: Request, res: Response) => {
    try {
        let employeeData: any = {};
        let company = <ICompany>req.company;
        let employeeId = req.query.employeeId;
        if (employeeId) {
            let checkUserPermission = await Company.findOne({_id: company._id, employees: {$in: [new ObjectId(employeeId)]}});
            if(!checkUserPermission) {
                return res.json({'status': Status.Error, message: Messages.UnAuthorized});
            }

            let employeeDetails: any = await User.findOne({_id: new ObjectId(employeeId)})
                .select('_id auth.email auth.socialId profile address location contact emailPreferences permissions').exec();
            employeeData._id = employeeDetails._id;
            employeeData.email = employeeDetails.auth.email;
            employeeData.socialId = employeeDetails.auth.socialId;
            employeeData.firstName = employeeDetails.profile.firstName;
            employeeData.lastName = employeeDetails.profile.lastName;
            employeeData.displayName = employeeDetails.profile.displayName;
            employeeData.imageUrl = employeeDetails.profile.imageUrl;
            employeeData.address = employeeDetails.address;
            employeeData.location = employeeDetails.location;
            employeeData.phone = employeeDetails.contact.phone;
            employeeData.fax = employeeDetails.contact.fax;
            employeeData.permissions = employeeDetails.permissions;
            let hours = employeeDetails.emailPreferences.time ? employeeDetails.emailPreferences.time.getHours() : '21';
            let minutes = employeeDetails.emailPreferences.time ? employeeDetails.emailPreferences.time.getMinutes() : '00';
            employeeData.emailPreferences = {
                preferences: employeeDetails.emailPreferences.preferences,
                timeZone : employeeDetails.emailPreferences.timeZone,
                time: hours + ':' + minutes
            }
            if (employeeDetails) {
                return res.json({'status': Status.Success, 'employee': employeeData});
            } else {
                return res.json({'status': Status.Success, 'message': 'Employee not found!'});
            }
        }
        return res.json({'status': Status.Error, 'message': 'EmployeeId is required!'});
    } catch (err) {
        return res.json({'status': Status.Error, 'message': err.message});
    }

}
export const getAllEmployees = (req: Request, res: Response) => {

    Company.findOne({ _id: req.companyId })
        .populate({
            path: 'employees',
            select: '_id profile.displayName auth.email contact.phone permissions',
        })
        .populate({
            path: 'admin',
            select: '_id profile.displayName',
        })
        .exec((err: any, company: ICompany) => {

            if (err || !company) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }
            const employees = company.employees
            company.employees = undefined
            company.userPermissions = undefined
            company.stripeId = undefined
            company.employees = undefined
            company.customers = undefined
            company.maxTechnicians = undefined
            company.maxAdmins = undefined
            company.maxManagers = undefined
            company.maxOfficeAdmins = undefined
            company.other = undefined
            company.paid = undefined
            company.type = undefined
            company.plan = undefined
            company.currentJobId = undefined
            company.chargeDate = undefined
            company.contact = undefined
            company.address = undefined

            return res.json({ 'status': Status.Success, 'employees': employees, 'company': company })

        })
}

export const getEmployeesForJob = (req: Request, res: Response) => {
    const workType = req.query.workType;
    const companyLocation = req.query.companyLocation;

    CompanyLocation.aggregate([
        {
            $lookup: {
                from: "companies",
                localField: "company",
                foreignField: "_id",
                as: "company"
            }
        },
        {
            $lookup :{
                from: "users",
                localField: "company.admin",
                foreignField: "_id",
                as: "admin",
            }
        },
        {
            $match: {
                "_id": new ObjectId(companyLocation)
            }
        },
        {   
            $project: {
                _id: 1,
                admin: 1,
                "assignedEmployees": { 
                    $filter: { 
                        input: "$assignedEmployees", 
                        cond: { $in: [new ObjectId(workType),"$$this.workTypes"] } 
                   } 
                } 
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "assignedEmployees.employee",
                foreignField: "_id",
                as: "employees",
            }
        }
    ]).exec((err: any, companyLocations: any[]) => {
        if (err && !companyLocations.length) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }

        let companyLocation = companyLocations[0];
        const employees = companyLocation.employees;
        let admin = {};
        if (companyLocation.admin.length) admin = companyLocation.admin[0]

        return res.json({ 'status': Status.Success, 'employees': employees, 'superAdmin': admin })

    })

    //Old method to get employees by the company 
    // Company.findOne({ _id: req.companyId })
    //     .populate({
    //         path: 'employees',
    //         match: { 'permissions.role': { $ne: 0 } },
    //         select: '_id profile.displayName',
    //     })
    //     .populate({
    //         path: 'admin',
    //         select: '_id profile.displayName',
    //     })
    //     .exec((err: any, company: ICompany) => {

    //         if (err || !company) {
    //             return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
    //         }
    //         const employees = company.employees
    //         const admin = company.admin
    //         company.employees = undefined
    //         company.userPermissions = undefined
    //         company.stripeId = undefined
    //         company.employees = undefined
    //         company.customers = undefined
    //         company.maxTechnicians = undefined
    //         company.maxAdmins = undefined
    //         company.maxManagers = undefined
    //         company.maxOfficeAdmins = undefined
    //         company.other = undefined
    //         company.paid = undefined
    //         company.type = undefined
    //         company.plan = undefined
    //         company.currentJobId = undefined
    //         company.chargeDate = undefined
    //         company.contact = undefined
    //         company.address = undefined

    //         return res.json({ 'status': Status.Success, 'employees': employees, 'superAdmin': admin })

    //     })

}

export const getContractorForJob = (req: Request, res: Response) => {
    const company = <ICompany>req.company;


    Contract.find({company: company._id})
    .populate({
        path: 'contractor',
        select: '_id info.companyName info.companyEmail type',
    })
    .exec(
    (err: any, contracts: IContract[]) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

             const contractors = contracts.map((contract)=>{
                return contract.contractor
            })

            return res.json({ 'status': Status.Success, 'contractors': contractors})
        }
    )

}

export const getCompanyContracts = async (req: Request, res: Response) => {
    const workType = req.body.workType;
    const companyLocation = req.body.companyLocation;

    const company = <ICompany>req.company

    let byCompanyLocationAgg: any[] = []
    if (workType && companyLocation) {
        byCompanyLocationAgg = [
            {
                $lookup: {
                    from: "companylocations",
                    localField: "contractor",
                    foreignField: "company",
                    as: "companylocations",
                }
            },
            {
                $match: {
                    "companylocations._id" : new ObjectId(companyLocation),
                    "companylocations.assignedVendors.workTypes": { $in: [new ObjectId(workType)]} 
                }
            }
        ];
    }

    const contractAggregate: IContract[] = await Contract.aggregate([
        ...byCompanyLocationAgg,
        {
        $match: {"company": company._id}
        },
        {
            $sort: { _id: -1}
        },{
            $group: {
                _id: "$contractor",
                "docs": {"$first": "$$ROOT"}
            }
        },{
            "$replaceRoot":{"newRoot":"$docs"}
        }
    ])

    // Map the Contract IDs filtered
    const contractIds = contractAggregate.map((result)=>result._id)

    Contract.find({_id: {$in : contractIds}})
    .populate({
        path: 'company',
        select: 'info.companyName info.companyEmail type'
    })
    .populate({
        path: 'contractor',
        select: 'info.companyName info.companyEmail type',
        populate: [{ path: 'admin', select: 'profile auth.email contact' }]
    })
    .exec((err: any, contracts: IContract[]) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if(!contracts.length) {
                return res.json({ 'status': Status.Error, 'message': 'No contracts found.' })
            }

            return res.json({ 'status': Status.Success, 'contracts': contracts})
        }
    )
}

export const getContractorDetail = async(req: Request, res: Response) => {

    const params = req.body;
    switch (params.type) {
        case 'vendor':
            if (!params.contractorId) {
                return res.json({ status: Status.Error, message: 'contractorId is required when Type is vendor' });
            }

            const contractor = await Company.findById(params.contractorId);

            if (!contractor) {
                return res.json({ status: Status.Error, message: 'Vendor not found' });
            }

            const paymentVendor = await PaymentVendor.find({ contractor: params.contractorId })
                .populate({
                    path: 'company',
                    select: 'info.companyName info.logoUrl auth.email permissions.role address contact'
                })
                .populate({
                    path: 'contractor',
                    select: 'info address contact',
                    populate: [{ path: 'admin', select: 'profile auth.email contact'}]
                })
                .populate({
                    path: 'invoices',
                    select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost tax paid total note'
                })
                .populate({
                    path: 'createdBy',
                    select: 'profile.displayName auth.email'
                }).exec();

            return res.json({ status: Status.Success, details: contractor, payments: paymentVendor });

         case 'employee':
            if (!params.employeeId) {
                return res.json({ status: Status.Error, message: 'employeeId is required when Type is employee' });
            }

            const employee = await User.findById(params.employeeId);

            if (!employee) {
                return res.json({ status: Status.Error, message: 'Employee not found' });
            }

            const paymentEmployee = await PaymentEmployee.find({ employee: params.employeeId })
                .populate({
                    path: 'company',
                    select: 'info.companyName info.logoUrl auth.email permissions.role address contact'
                })
                .populate({
                    path: 'employee',
                    select: 'profile auth.email address contact'
                })
                .populate({
                    path: 'invoices',
                    select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost tax paid total note'
                })
                .populate({
                    path: 'createdBy',
                    select: 'profile.displayName auth.email'
                }).exec();

            return res.json({ status: Status.Success, details: employee, payments: paymentEmployee });

        default:
            if (!params.contractorId) {
                return res.json({ status: Status.Error, messages: 'contractorId must be provided when type is not selected' });
            }

            Company.findById(params.contractorId,
                (err: any, company: ICompany) => {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    if(company == undefined ) {
                        return res.json({ status: Status.Error, message: 'No company found.' });
                    }

                    return res.json({ status: Status.Success, details: company });
                }
            )
    }
}

export const getCustomWorkNumber = (req: Request, res: Response) => {

    Company.findById(req.companyId,
        (err: any, company: ICompany) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if(company == undefined ) {
                return res.json({ 'status': Status.Error, 'message': 'No company found.' })
            }

            return res.json({status: Status.Success, 'prefix' : company.prefix, 'currentWorkOrderNumber' : company.currentJobId});
        }
    )
}

export const getSyncInfo = (req: Request, res: Response) => {

    Company.findById(req.companyId,
        (err: any, company: ICompany) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if(company == undefined ) {
                return res.json({ 'status': Status.Error, 'message': 'No company found.' })
            }

            return res.json({
                status: Status.Success,
                qbAuthorized: company.qbAuthorized,
                qbCompanyName: company.qbCompanyName,
                qbCompanyEmail: company.qbCompanyEmail,
                qbSync: company.qbSync
            });
        }
    )
}

export const downgradeCompanies = (req: Request, res: Response) => {

    Company.find({ $and: [{chargeDate: { $lte: new Date() }}, {plan: CompanyType.SUBSCRIBED}] }).populate('employees').then((companies)=>{
        if(companies.length) {
            for (let index = 0; index < companies.length; index++) {
                const company = companies[index];
                Contract.find({company: company._id, status: {$in: [ContractStatus.ACCEPTED, ContractStatus.PENDING]}}).then((contracts) => {
                    if (contracts.length) {
                        for (let contract of contracts) {
                            // Canceling the available contracts
                            contract.status = ContractStatus.CANCELED;
                            contract.save();
                        }
                    }
                }).catch((err) => {
                    return res.json({'status': Status.Error, 'message': err.message});
                })
                for(let employee of company.employees) {
                    employee.status = EmployeeStatus.INACTIVE;
                    employee.save();
                }
                company.updateOne({plan: CompanyType.FREE, paid: false, maxTechnicians: 0, maxManagers: 0, maxOfficeAdmins:0 ,maxAdmins: 0}, (err: any) =>{
                    if(err) {
                        return res.json({'status': Status.Success, 'message': err.message});
                    }
                    sendAccountDowngradeEmail({ to: company.info.companyEmail })
                    _downgradeHubSpotContact(company)
                })
            }
            return res.json({'status': Status.Success, 'message': 'Downgrading done.'})
        }else{
            return res.json({'status': Status.Error, 'message': 'Nothing to downgrade.'})
        }
    }).catch((err) => {
        return res.json({'status': Status.Error, 'message': err.message});
    })
}
const _downgradeHubSpotContact = (company: ICompany) => {

    const hubspot = new Hubspot({
        apiKey: '163d5d65-83c0-4d5f-9dcf-55b052f9ef4d'
    })

    hubspot.contacts.updateByEmail(company.info.companyEmail, {
        "properties": [
          {
            "property": "customer_type",
            "value": "Expired"
          }
        ]
      })
      .then((response: any) => console.log(response))
      .catch((error: any) => console.error(error))
}

export const setCustomWorkNumber = (req: Request, res: Response) => {

    const params = req.body
    const admin = <ICompanyAdmin>req.user
    let oldPrefix: string;
    let oldJobId: number;

    if((params.prefix == undefined || params.prefix === '""') && (params.workOrderNumber == undefined || params.workOrderNumber === '""')) {
        return res.json({ 'status': Status.Error, 'message': "Either prefix or work order number is required." })
    }

    Company.findById(admin.company,
        (err: any, company: ICompany) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if(company == undefined ) {
                return res.json({ 'status': Status.Error, 'message': 'No company found.' })
            }

            if(typeof params.prefix !== 'undefined' && params.prefix && ( typeof params.workOrderNumber === 'undefined' && !params.workOrderNumber )) {

                if(params.prefix == company.prefix) {

                    return res.json({'status': Status.Success, 'message': "Prefix already set there."});
                }

                checkPrefixExists(req, res, (req: Request, res: Response, previousPrefix: ICompanyPrefix) => {

                    oldPrefix = company.prefix

                    company.updateOne({'prefix':params.prefix}, (err: any)=> {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }


                        if(previousPrefix == null && oldPrefix != undefined) {

                            const prefix = new CompanyPrefix({
                                company: req.companyId,
                                prefix: oldPrefix,
                                maxJobId: company.currentJobId
                            });

                            prefix.save((err: any) => {
                                if (err) {
                                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                                }

                                return res.json({'status': Status.Success, 'message': "Prefix updated successfully."});
                            })

                        }else if(previousPrefix != null){

                            previousPrefix.updateOne(
                                {'prefix' : oldPrefix, 'maxJobId': company.currentJobId},
                                (err: any) => {
                                if (err) {
                                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                                }

                                return res.json({'status': Status.Success, 'message': "Prefix updated successfully."});
                            })
                        }else{

                            return res.json({'status': Status.Success, 'message': "Prefix updated successfully."});
                        }


                    })

                })
            } else if (typeof params.workOrderNumber !== 'undefined' && params.workOrderNumber && (typeof params.prefix === 'undefined' || !params.prefix)){

                if(company.currentJobId > params.workOrderNumber) {
                    return res.json({'status': Status.Success, 'message': "Work order number can not be less then "+company.currentJobId});
                }

                company.updateOne({'currentJobId':params.workOrderNumber}, (err: any)=> {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    return res.json({'status': Status.Success, 'message': "Work order number updated successfully."});
                })

            } else if ((typeof params.prefix !== 'undefined' && params.prefix) && (typeof params.workOrderNumber !== 'undefined' && params.workOrderNumber) ) {

                if (company.prefix == params.prefix) {

                    if (company.currentJobId > params.workOrderNumber) {
                        return res.json({'status': Status.Success, 'message': "Work order number can not be less then "+company.currentJobId});
                    }

                    company.updateOne({'currentJobId':params.workOrderNumber}, (err: any)=> {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        return res.json({'status': Status.Success, 'message': "Work order number updated successfully."});
                    })

                } else if (company.prefix != params.prefix) {
                    checkPrefixExists(req, res, (req: Request, res: Response) => {

                        oldPrefix = company.prefix
                        oldJobId = company.currentJobId

                        company.updateOne({'prefix':params.prefix, 'currentJobId' : params.workOrderNumber}, (err: any)=> {
                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                            }

                            if(prefix == null && oldPrefix != undefined) {
                                var prefix = new CompanyPrefix({
                                    company : req.companyId,
                                    prefix : oldPrefix,
                                    maxJobId: oldJobId
                                })
                                prefix.save((err: any) => {
                                    if (err) {
                                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                                    }

                                    return res.json({'status': Status.Success, 'message': "Prefix updated successfully."});
                                })
                            }else if(prefix != null) {
                                const companyPrefix = <ICompanyPrefix>prefix

                                companyPrefix.updateOne(
                                    {'prefix' : oldPrefix, 'maxJobId': oldJobId},
                                    (err: any) => {
                                    if (err) {
                                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                                    }

                                    return res.json({'status': Status.Success, 'message': "Prefix updated successfully."});
                                })
                            }else{
                                return res.json({'status': Status.Success, 'message': "Prefix updated successfully."});
                            }
                        })
                    })
                }
            }
        }
    )
}

/**
 * Retrieve all Company's Item Tier List
 */
export const getItemTierList = async (req: Request, res: Response) => {

    const company = <ICompany>req.company;

    await company.populate({
        path: 'itemTier.list.tier',
        select: '-companyId -__v',
        populate: [ { path: 'inactiveBy', select: 'auth.email profile.displayName contact.phone'} ]
    }).execPopulate()

    return res.json({ status: Status.Success, itemTierList: company.itemTier.list });
}

/**
 * Generic function for addItemTier to be used anywhere
 */
export const _addItemTier = async (company: ICompany, next: (err: any, itemTier: IPriceTier) => void) => {

    // Create new Price Tier collection
    const itemTier: IPriceTier = new PriceTier({
        companyId: company._id,
        name: (company.itemTier.count || 0) + 1,
        isActive: true
    })
    await itemTier.save(err => {
        if (err)
            return next(err.message, null);
    });

    // Update Company itemTier Count and add the new one to the list
    company.itemTier.count += 1;
    company.itemTier.list.push({
        tier: itemTier._id,
    });
    await company.save(err => {
        if (err)
            return next(err.message, null);
    });

    // Search all items belong to the Company
    const items: IItem[] = await Item.find({ company: company._id, isDiscountItem: { $ne: true } });

    // Iterate all items and add the new tier
    for (const item of items) {
        if (company.itemTier.count === item.tiers.length) {
            continue;
        }

        item.tiers.push({
            tier: itemTier._id,
        })
        await item.save(err => {
            if (err)
                return next(err.message, null);
        })
    }

    return next(null, itemTier);

}

/**
 * Create a new Price Tier in collection,
 * then add it to the Company Item Tier list,
 * then add it to all Company Item's tiers
 */
export const addItemTier = (req: Request, res: Response) => {

    const company = <ICompany>req.company;

    _addItemTier(company, (err, createdItemTier) => {

        if (err)
            return res.json({ status: Status.Error, message: err.message });

        return res.json({ status: Status.Success, message: 'New Item Tier added successfully', itemTier: createdItemTier });

    });

}

/**
 * Update Company Item Tier's name & isActive,
 * which will update the real record on Price Tier
 */
export const updateItemTier = async (req: Request, res: Response) => {

    const user = <IUser>req.user;
    const company = <ICompany>req.company;
    const params = req.body;
    let conflictCustomers: ICustomer[];

    // Check if params.itemTierId is a valid Mongo ObjectID
    if (!ObjectId.isValid(params.itemTierId)) {
        return res.json({ status: Status.Error, message: Messages.WrongId });
    }

    // Search the tier to the Price Tier collection
    const tier = await PriceTier.findOne({ _id: params.itemTierId, companyId: company._id });
    if (!tier) {
        return res.json({ status: Status.Error, message: 'Item Tier not found' });
    }

    tier.name = params.name || tier.name;
    tier.isActive = params.isActive ? !!(Number(params.isActive)) : tier.isActive;

    // Handle inactiveBy & inactiveAt based on active status
    if (params.isActive === '0') {
        tier.inactiveBy = user._id;
        tier.inactiveAt = new Date();

        conflictCustomers = await Customer.find({ itemTier: tier._id });
    } else if (params.isActive === '1') {
        tier.inactiveBy = null;
        tier.inactiveAt = null;
    }

    await tier.save(err => {
        if (err)
            return res.json({ status: Status.Error, message: err.message });
    });

    await tier.populate({
        path: 'inactiveBy',
        select: 'auth.email profile.displayName contact.phone'
    }).execPopulate();

    return res.json({ status: Status.Success, message: 'Item Tier updated successfully', itemTier: tier, conflictCustomers });

}

const checkPrefixExists = (req: Request, res: Response, next: (req: Request, res: Response, prefix: ICompanyPrefix) => void) => {

    const params = req.body

    CompanyPrefix.findOne(
        { 'prefix': req.company.prefix, 'company' : req.companyId },
        (err: any, companyPrefix: ICompanyPrefix) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (companyPrefix == undefined) {
                next(req, res, null)
                return

            }else{
                if(params.workOrderNumber != undefined && params.workOrderNumber!= '""') {
                    if (companyPrefix.maxJobId > params.workOrderNumber) {
                        return res.json({ 'status': Status.Error, 'message': 'Work order number with prefix '+params.prefix+' is not allowed. Try no greater then '+companyPrefix.maxJobId })
                    } else {
                        next(req, res, companyPrefix)
                        return
                    }

                }else if (companyPrefix.maxJobId > req.company.currentJobId){
                    return res.json({ 'status': Status.Error, 'message': 'Current work order number with prefix '+params.prefix+' is not allowed. Try no greater then '+companyPrefix.maxJobId })

                }else{
                    next(req, res, companyPrefix)
                    return
                }
            }
        }
    )

}


export const updateContractorEmailPreferences =  (req: Request, res: Response) => {
    const params = req.body
    const company = <ICompany>req.company
    const user = <IUser>req.user
    if(params.contractorId) {
        if (params.emailPreferences == 1 && !params.emailTime) {
            return res.json({'status': Status.Error, 'message': "Email time is required for scheduled emails."})
        }
        Company.findOne({_id: params.contractorId}).then((c) => {
            if (c && c.type == 1 && JSON.stringify(c._id) == JSON.stringify(company._id)) {
                let sendTime = new Date();
                let time = params.emailTime ? params.emailTime.split(':') : [];
                sendTime.setHours(time[0] ? time[0] : 21,time[1] ? time[1] : 0,time[2] ? time[2]: 0);
                c.emailPreferences.preferences = params.emailPreferences;
                c.emailPreferences.time = sendTime;
                if ((user.permissions.role == Role.COMPANY_ADMIN || user.permissions.role == Role.ADMIN_EMPLOYEE) && JSON.stringify(user._id) == JSON.stringify(c.admin)) {
                    if (params.timeZone) {
                        c.emailPreferences.timeZone = params.timeZone;
                    }
                } else {
                    return res.json({'status': Status.Error, 'message': Messages.UnAuthorized});
                }
                c.save().then(() => {
                    return res.json({'status': Status.Success, 'message': "preferences updated successfully."})
                }).catch((err) => {
                    return res.json({'status': Status.Error, 'message': err.message})
                })
            } else {
                return res.json({ 'status': Status.Error, 'message': 'Could not find contractor' })
            }
        }).catch((err) => {
            return res.json({'status': Status.Error, 'message': err.message})
        });
    }

}
export const updateEmployeeEmailPreferences = (req: Request, res: Response) => {
    const params = req.body
    const company = <ICompany>req.company
    const user = <IUser>req.user
    if(params.employeeId) {
        if (params.emailPreferences == 1 && !params.emailTime) {
            return res.json({'status': Status.Error, 'message': "Email time is required for scheduled emails."})
        }
            User.findOne({_id: params.employeeId}).then((e) => {
            if (e) {
                Company.findOne(  {
                    $and : [
                        { _id : new ObjectId(company._id) },
                        { $or : [
                                { admin : new ObjectId(params.employeeId) },
                                {employees :
                                        {$in: [new ObjectId(params.employeeId)]}
                                }
                            ]
                        }
                    ] } ).then((c) => {
                    if (c) {
                        if (user.permissions.role == Role.TECHNICIAN ||
                            user.permissions.role == Role.MANAGER ||
                            user.permissions.role == Role.COMPANY_ADMIN ||
                            user.permissions.role == Role.ADMIN_EMPLOYEE ||
                            user.permissions.role == Role.GLOBAL_ADMIN
                        ) {
                            let sendTime = new Date();
                            let time = params.emailTime ? params.emailTime.split(':') : [];
                            sendTime.setHours(time[0] ? time[0] : 21,time[1] ? time[1] : 0,time[2] ? time[2]: 0);
                            e.emailPreferences.preferences = params.emailPreferences;
                            e.emailPreferences.time = sendTime;
                            if ((user.permissions.role == Role.COMPANY_ADMIN || user.permissions.role == Role.ADMIN_EMPLOYEE) && JSON.stringify(user._id) == JSON.stringify(c.admin)) {
                                if (params.timeZone) {
                                    e.emailPreferences.timeZone = params.timeZone;
                                }
                            } else {
                                return res.json({'status': Status.Error, 'message': Messages.UnAuthorized});
                            }                            e.save().then(() => {
                                return res.json({'status': Status.Success, 'message': "preferences updated successfully."})
                            }).catch((err) => {
                                return res.json({'status': Status.Error, 'message': err.message})
                            })
                        } else {
                            return res.json({ 'status': Status.Error, 'message': Messages.UnAuthorized })
                        }
                    } else {
                        return res.json({ 'status': Status.Error, 'message': Messages.UnAuthorized })
                    }
                }).catch((err) => {
                    return res.json({'status': Status.Error, 'message': err.message})
                });

            } else {
                return res.json({ 'status': Status.Error, 'message': Messages.UnAuthorized })
            }
        }).catch((err) => {
            return res.json({'status': Status.Error, 'message': err.message})
        });
    }
};


export const updateCustomerEmailPreferences = (req: Request, res: Response) => {
    const params = req.body
    const company = <ICompany>req.company
    const timeZone = params.timeZone ? params.timeZone : 'America/Chicago';
    if(params.customerId) {
        if(params.emailPreferences == 1 && !params.emailTime) {
            return res.json({'status': Status.Error, 'message': "Email time is required for scheduled emails."})
        }
        CompanyCustomer.findOne(
            {company: new ObjectId(company._id), customer: {$in : [new ObjectId(params.customerId)]}})
            .then((companyCustomer) => {
           if (companyCustomer) {
               let sendTime = new Date();
               let time = params.emailTime ? params.emailTime.split(':') : [];
               sendTime.setHours(time[0] ? time[0] : 21,time[1] ? time[1] : 0,time[2] ? time[2]: 0);
               Customer.findOneAndUpdate({_id: companyCustomer.customer},
                   {
                       'emailPreferences.preferences': params.emailPreferences,
                       'emailPreferences.time': sendTime,
                       'emailPreferences.timeZone': timeZone
                   }).then((c) => {
                   if (c) {
                       return res.json({'status': Status.Success, 'message': "preferences updated successfully."})
                   } else {
                       return res.json({'status': Status.Success, 'message': Messages.GenericError});
                   }
               }).catch((err) => {
                   return res.json({ 'status': Status.Error, 'message': err.message })
               });
           } else {
               return res.json({ 'status': Status.Error, 'message': Messages.UnAuthorized })
           }
            }).catch((err) => {
            return res.json({ 'status': Status.Error, 'message': err.message })
        });
    }
};

export const createSalesTax = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user

    SaleTax.findOne({'state': params.state, 'company': req.companyId}, (err: any, saleTax: ISaleTax) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }

        if(saleTax != undefined || saleTax != null) {
            return res.json({'status': Status.Success, 'message': "Sales tax already added."})
        }

        const sale = new SaleTax({
            state: params.state,
            tax: params.tax,
            company: req.companyId,
            createdBy: user._id,
            createdAt: Date.now()
        });

        sale.save((err: any) => {
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            return res.json({'status': Status.Success, 'message': "Sale tax created successfully."})
        })
    });
}

export const updateSalesTax = (req: Request, res: Response) => {

    const params = req.body

    SaleTax.findOne({'_id': params.salesTaxId, 'company': req.companyId}, (err: any, saleTax: ISaleTax) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }

        if(saleTax == undefined) {
            return res.json({'status': Status.Success, 'message': "Invalid sale tax id."})
        }

        saleTax.updateOne({ state : params.state, tax : params.tax },
        (err: any) => {
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            return res.json({'status': Status.Success, 'message': "Sale tax updated successfully."})
        })
    });
}

export const deleteSalesTax = (req: Request, res: Response) => {

    const params = req.body

    SaleTax.findOne({'_id': params.salesTaxId, 'company': req.companyId}, (err: any, saleTax: ISaleTax) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }

        if(saleTax == undefined) {
            return res.json({'status': Status.Success, 'message': "Invalid sale tax id."})
        }


        SaleTax.deleteOne({_id: saleTax._id})
        .exec((err: any) => {
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            return res.json({'status': Status.Success, 'message': "Sale tax deleted successfully."})
        })
    });
}

export const getSalesTaxes = (req: Request, res: Response) => {

    SaleTax.find({'company': req.companyId}, (err: any, saleTaxes: ISaleTax[]) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }

        return res.json({'status': Status.Success, 'taxes': saleTaxes})
    });
}

// Job Charges
export const createJobCharges = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user

    JobCharges.findOne({'jobType': params.jobTypeId, 'company': req.companyId},
    (err: any, jobCharges: IJobCharges) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }
        if(jobCharges != undefined || jobCharges != null) {
            return res.json({'status': Status.Success, 'message': "Job charge already added."})
        }

        const charges = new JobCharges({
            jobType: params.jobTypeId,
            charges: params.charges,
            company: req.companyId,
            createdBy: user._id,
            createdAt: Date.now(),
            isFixed: params.isFixed
        });

        if(params.sales_tax_id != undefined && params.sales_tax_id !== '""') {

            _getSalesTax(req, res, params.sales_tax_id,(req: Request, res: Response, saleTax: ISaleTax) => {

                charges.salesTax = saleTax._id

                charges.save((err: any) => {
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }

                    return res.json({'status': Status.Success, 'message': "Job charges created successfully."})
                })
            } )

        }else{
            charges.save((err: any) => {
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }

                return res.json({'status': Status.Success, 'message': "Job charges created successfully."})
            })
        }


    });
}

const _getSalesTax = (req: Request, res: Response, sales_tax_id: string, next: (req: Request, res: Response, salesTax: ISaleTax) => void ) =>{

    SaleTax.findById(sales_tax_id,
        (err: any, saleTax: ISaleTax) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }

        if(saleTax == undefined) {
            return res.json({'status': Status.Success, 'message': "Invalid sales tax id."})
        }
        next(req, res, saleTax)
        return
    });
}

export const updateJobCharges = (req: Request, res: Response) => {

    const params = req.body

    JobCharges.findOne({'_id': params.jobChargesId, 'company': req.companyId},
    (err: any, jobCharges: IJobCharges) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }

        if(jobCharges == undefined) {
            return res.json({'status': Status.Success, 'message': "Invalid job Charge id."})
        }

        jobCharges.charges = params.charges
        jobCharges.isFixed = params.isFixed

        if(params.sales_tax_id != undefined && params.sales_tax_id !== '""') {


            if(params.sales_tax_id != undefined && params.sales_tax_id !== '""') {

                _getSalesTax(req, res, params.sales_tax_id,(req: Request, res: Response, saleTax: ISaleTax) => {

                    jobCharges.salesTax = saleTax._id

                    jobCharges.updateOne(jobCharges, (err: any) => {
                        if (err) {
                            return res.json({'status': Status.Error, 'message': Messages.GenericError})
                        }

                        return res.json({'status': Status.Success, 'message': "Job charges updated successfully."})
                    })
                } )

            }else{

                jobCharges.updateOne(jobCharges, (err: any) => {
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }

                    return res.json({'status': Status.Success, 'message': "Job charges updated successfully."})
                })
            }
        }
    });
}

export const deleteJobCharges = (req: Request, res: Response) => {

    const params = req.body

    JobCharges.findOne({'_id': params.jobChargesId, 'company': req.companyId},
    (err: any, jobCharges: IJobCharges) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }

        if(jobCharges == undefined) {
            return res.json({'status': Status.Success, 'message': "Invalid job Charge id."})
        }

        JobCharges.deleteOne({_id: jobCharges._id})
        .exec((err: any) => {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            return res.json({'status': Status.Success, 'message': "Job charge deleted successfully."})
        })
    });
}

export const getJobCharges = (req: Request, res: Response) => {

    JobCharges.find({'company': req.companyId})
    .populate({
        path: 'jobType',
        select: 'title description sku',
    })
    .populate({
        path: 'salesTax',
        select: 'state tax',
    })
    .exec((err: any, jobCharges: IJobCharges[])=>{

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        return res.json({'status': Status.Success, 'jobCharges': jobCharges})
    })
}


export const getCompanyContractorActivity = (req: Request, res: Response) => {

    const company = <ICompany>req.company

    Contract.find({ company: company._id })

        .exec((err: any, contracts: IContract[]) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            let contractors  = contracts.map((contract) => {
                return contract.contractor
            })

            Job.find({ 'tasks.technician': { $in: contractors } }).sort({ endtime : 1 , startTime : 1 , dateTime : 1 })
                // TODO: To be deprecated
                .populate({
                    path: 'technician',
                    select: 'profile.displayName'
                })
                .populate({
                    path: 'tasks.technician',
                    select: 'profile.displayName'
                })
                .populate({
                    path: 'customer',
                    select: 'profile.displayName contactName'
                })
                .populate({
                    path: 'type',
                    select: 'title description sku'
                })
                .populate({
                    path: 'tasks.jobTypes.jobType',
                    select: 'title description sku'
                })
                .exec((err: any, jobs: IJob[]) => {

                    if (!jobs.length) {
                        return res.json({ 'status': Status.Error, 'message': 'No contractor activity found.' })
                    }
                    const contractorActivities: IContractorActivity[] = [];
                    for (let i = 0; i < jobs.length; i++) {
                        const job: any = jobs[i];
                        let obj: any = {};
                        obj = {
                            job : job._id,
                            customer :  job.customer.profile.displayName,
                            contractor : job.technician.profile.displayName,
                            startTime : job.startTime,
                            endTime : job.endTime,
                            dateTime : job.dateTime,
                            jobType : job.type.title,
                        }

                        contractorActivities.push(obj)
                    }
                    return res.json({ 'status': Status.Success, 'contractorActivities': contractorActivities })
                })
        })
}

export const getCompanyCustomer = async (req: Request, res: Response) => {

    const companyId = req.query.companyId;
    const customerId = req.query.customerId;
    const status = req.query.status;
    const isPreferred = req.query.isPreferred;
    const isActive = req.query.isActive;

    const filterQuery: any = {
        $and: []
    };

    if (!companyId && !customerId) {
        return res.json({ status: Status.Error, message: 'Either companyId or customerId need to be provided' });
    }

    if (companyId) {
        filterQuery['$and'].push({ company: companyId });
    } else {
        filterQuery['$and'].push({ customer: customerId });
    }

    if (status !== undefined && status !== null) {
        // check if customer status 1 , existing customer that didn't have status will be returned too
        if (status == CompanyCustomerStatus.ACCEPTED) {
            filterQuery['$and'].push({ '$or': [{ status: CompanyCustomerStatus.ACCEPTED }, { status: null }] });
        } else {
            filterQuery['$and'].push({ status: status });
        }
    }

    if (isPreferred !== undefined && isPreferred !== null) {
        if (isPreferred) {
            filterQuery['$and'].push({ isPreferred: isPreferred });
        } else {
            // if isPreferred false, existing customer that didn't have isPreferred will be returned too
            filterQuery['$and'].push({ '$or': [{ isPreferred: false }, { isPreferred: null }] });
        }
    }

    const companyCustomers = await CompanyCustomer.find(filterQuery)
        .populate({
            path: 'company',
            select: 'info address contact'
        })
        .populate({
            path: 'customer',
            select: 'info profile address contact location vendorId'
        })

    return res.json({ status: Status.Success, companyCustomers });

}

export const getAllCompanies = async (req: Request, res: Response) => {
    const { ENVIRONMENT } = process.env;
    const params = req.query;
    const query: any = { __t: { $ne: 'CompanyCustomer' } };
    const companyName = ["Norton Fitness", "Lance Dahse, Inc."];

    switch (ENVIRONMENT) {
        case 'staging':
            query['$or'] = [{ 'info.companyName': companyName[0] }];
            break;

        case 'production':
            query['$or'] = [{ 'info.companyName': { $in: companyName } }];
            break;

        default:
            if (params.keyword) {
                const keywordRegex = { $regex: params.keyword, $options: 'i' };
                query['$or'] = [
                    { 'info.companyName': keywordRegex },
                    { 'info.companyEmail': keywordRegex }
                ];
            }
            break;
    }

    const companies = await Company.find({ ...query }, 'info contact address').sort({ 'info.companyName': 1 })
    return res.json({ status: Status.Success, companies });
}

export const updateCompanyCustomer = async (req: Request, res: Response) => {
    const params = req.body;
    const companyCustomer = await CompanyCustomer.findById(params.companyCustomerId);
    if (!companyCustomer) {
        return res.json({ status: Status.NotFound, messages: 'Company customer not found.' });
    }

    companyCustomer.status = params.status ?? companyCustomer.status;
    companyCustomer.isPreferred = params.isPreferred ?? companyCustomer.isPreferred;
    companyCustomer.save();
    return res.json({ status: Status.Success, messages: 'Company customer updated successfully.', companyCustomer });
}