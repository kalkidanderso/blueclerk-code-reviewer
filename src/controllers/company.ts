import { Request, Response } from 'express'
import {Status, Messages, Role, Permissions} from '../common/constants'
import { sendAccountDowngradeEmail } from '../services/aws'
import { Company, ICompany } from '../models/Company'
import { Employee, IEmployee } from '../models/Employee'
import { ObjectId } from 'mongodb'
import { Contract, IContract } from '../models/Contract'
import { ICompanyAdmin } from '../models/CompanyAdmin'
import { CompanyPrefix, ICompanyPrefix } from '../models/CompanyPrefix'
import { InvoicePrefix, IInvoicePrefix } from '../models/InvoicePrefix'
import { SaleTax, ISaleTax } from '../models/SaleTax'
import { JobCharges, IJobCharges } from '../models/JobCharges'
import { Invoice, IInvoice } from '../models/Invoice'
import { Job, IJob } from '../models/Job'
import { Scan, IScan } from '../models/Scan'
import {IUser, User} from '../models/User'
import { PurchaseOrder, IPurchaseOrder } from '../models/PurchaseOrder'
import { IContractorActivity } from '../models/ContractorActivity'
import { Estimate, IEstimate } from '../models/Estimate'
import { Item} from '../models/Item'
import { Customer, ICustomer } from '../models/Customer'
import {CompanyCustomer} from '../models/CompanyCustomer';
import {ServiceTicket} from '../models/ServiceTicket';
const Hubspot = require('hubspot')

export const updateCompanyProfile = (req: Request, res: Response) => {

    const params = req.body

    Company.findById(req.companyId, function (err: any, company: ICompany) {

        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }

        if(company.info.companyEmail != params.companyEmail ) {

            Company.findOne(
                { 'info.companyEmail': params.companyEmail },
                (err: any, previousCompany: ICompany) => {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    if (previousCompany) {
                        return res.json({ 'status': Status.Error, 'message': Messages.CompanyDuplicateEmail })
                    }
                    company.updateOne(
                        {
                            'info.companyName': params.companyName,
                            'info.companyEmail': params.companyEmail,
                            'info.logoUrl': params.logoUrl,
                            'address.street': params.street,
                            'address.city': params.city,
                            'address.state': params.state,
                            'address.zipCode': params.zipCode,
                            'contact.phone': params.phone,
                            'contact.fax': params.fax,
                        },
                        (err: any, raw: any) => {

                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                            }

                            return res.json({ 'status': Status.Success, 'message': 'Profile updated successfully.' })
                        }
                    )
                }
            )

        }else{
            company.updateOne(
                {
                    'info.companyName': params.companyName,
                    'info.logoUrl': params.logoUrl,
                    'address.street': params.street,
                    'address.city': params.city,
                    'address.state': params.state,
                    'address.zipCode': params.zipCode,
                    'contact.phone': params.phone,
                    'contact.fax': params.fax,
                },
                (err: any, raw: any) => {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    return res.json({ 'status': Status.Success, 'message': 'Profile updated successfully.' })
                }
            )
        }
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
                .select('profile.firstName profile.lastName auth.email contact.phone emailPreferences').exec();
            employeeData.firstName = employeeDetails.profile.firstName;
            employeeData.lastName = employeeDetails.profile.lastName;
            employeeData.email = employeeDetails.auth.email;
            employeeData.phone = employeeDetails.contact.phone;
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
            select: '_id profile.displayName auth.email contact.phone',
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
            company.maxManagers = undefined
            company.maxOfficeAdmins = undefined
            company.other = undefined
            company.paid = undefined
            company.type = undefined
            company.currentJobId = undefined
            company.chargeDate = undefined
            company.contact = undefined
            company.address = undefined

            return res.json({ 'status': Status.Success, 'employees': employees, 'company': company })

        })
}

export const getEmployeesForJob = (req: Request, res: Response) => {

    Company.findOne({ _id: req.companyId })
        .populate({
            path: 'employees',
            match: { 'permissions.role': { $ne: 0 } },
            select: '_id profile.displayName',
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
            const admin = company.admin
            company.employees = undefined
            company.userPermissions = undefined
            company.stripeId = undefined
            company.employees = undefined
            company.customers = undefined
            company.maxTechnicians = undefined
            company.maxManagers = undefined
            company.maxOfficeAdmins = undefined
            company.other = undefined
            company.paid = undefined
            company.type = undefined
            company.currentJobId = undefined
            company.chargeDate = undefined
            company.contact = undefined
            company.address = undefined

            return res.json({ 'status': Status.Success, 'employees': employees, 'superAdmin': admin })

        })

}

export const getContractorForJob = (req: Request, res: Response) => {

    var companyId = req.companyId;
    var company  = <ICompany>req.company;

    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

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

export const getCompanyContracts = (req: Request, res: Response) => {

    const company = <ICompany>req.company

    Contract.find({company: company._id})
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
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if(contracts.length == 0 || contracts == undefined ) {
                return res.json({ 'status': Status.Error, 'message': 'No contracts found.' })
            }

            return res.json({ 'status': Status.Success, 'contracts': contracts})
        }
    )
}

export const getContractorDetail = (req: Request, res: Response) => {

    Company.findById(req.body.contractorId,
        (err: any, company: ICompany) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if(company == undefined || company == null ) {
                return res.json({ 'status': Status.Error, 'message': 'No company found.' })
            }

            return res.json({status: Status.Success, 'details' : company});
        }
    )
}

export const getCustomWorkNumber = (req: Request, res: Response) => {

    const params = req.body
    const admin = <ICompanyAdmin>req.user

    Company.findById(req.companyId,
        (err: any, company: ICompany) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if(company == undefined || company == null ) {
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

            if(company == undefined || company == null ) {
                return res.json({ 'status': Status.Error, 'message': 'No company found.' })
            }

            return res.json({'status': Status.Success, 'customersSyncedAt' : company.customersSyncedAt, 'customersSynced' : company.customersSynced, 'qbAuthorized' : company.qbAuthorized});
        }
    )
}

export const downgradeCompanies = (req: Request, res: Response) => {

    Company.find(
        { $and: [{chargeDate: { $lte: new Date() }}, {paid: false}, {type: 0}] },
        (err: any, companies: ICompany[])=>{
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            if(companies.length > 0) {
                const companiesToDowngrade:number = companies.length
                let companiesDowngraded: number = 0;

                for (let index = 0; index < companies.length; index++) {
                    const company = companies[index];

                    company.updateOne({type: 1}, (err: any, raw: any) =>{
                        if(err) {
                            console.log("Unable to downgrade" + company._id + "\n")
                        }
                        sendAccountDowngradeEmail({ to: company.info.companyEmail })
                        _downgradeHubSpotContact(company)
                        companiesDowngraded ++;
                        if(companiesToDowngrade == companiesDowngraded) {
                            return res.json({'status': Status.Success, 'message': 'Downgrading done.'})
                        }
                    })

                }
            }else{
                return res.json({'status': Status.Error, 'message': 'Nothing to downgrade.'})
            }
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
    var oldPrefix: string
    var oldJobId:  number

    if((params.prefix == undefined || params.prefix === null || params.prefix === '""') && (params.workOrderNumber == undefined || params.workOrderNumber === null || params.workOrderNumber === '""')) {
        return res.json({ 'status': Status.Error, 'message': "Either prefix or work order number is required." })
    }

    Company.findById(admin.company,
        (err: any, company: ICompany) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if(company == undefined || company == null ) {
                return res.json({ 'status': Status.Error, 'message': 'No company found.' })
            }

            if(typeof params.prefix !== 'undefined' && params.prefix && ( typeof params.workOrderNumber === 'undefined' && !params.workOrderNumber )) {

                if(params.prefix == company.prefix) {

                    return res.json({'status': Status.Success, 'message': "Prefix already set there."});
                }

                checkPrefixExists(req, res, (req: Request, res: Response, previousPrefix: ICompanyPrefix) => {

                    oldPrefix = company.prefix

                    company.updateOne({'prefix':params.prefix}, (err: any, raw: any)=> {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }


                        if(previousPrefix == null && oldPrefix != undefined) {

                            var prefix = new CompanyPrefix({
                                company : req.companyId,
                                prefix : oldPrefix,
                                maxJobId: company.currentJobId
                            })

                            prefix.save((err: any, companyPrefix: ICompanyPrefix) => {
                                if (err) {
                                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                                }

                                return res.json({'status': Status.Success, 'message': "Prefix updated successfully."});
                            })

                        }else if(previousPrefix != null){

                            previousPrefix.updateOne(
                                {'prefix' : oldPrefix, 'maxJobId': company.currentJobId},
                                (err: any, raw: any) => {
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

                company.updateOne({'currentJobId':params.workOrderNumber}, (err: any, raw: any)=> {
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

                    company.updateOne({'currentJobId':params.workOrderNumber}, (err: any, raw: any)=> {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        return res.json({'status': Status.Success, 'message': "Work order number updated successfully."});
                    })

                } else if (company.prefix != params.prefix) {
                    checkPrefixExists(req, res, (req: Request, res: Response) => {

                        oldPrefix = company.prefix
                        oldJobId = company.currentJobId

                        company.updateOne({'prefix':params.prefix, 'currentJobId' : params.workOrderNumber}, (err: any, raw: any)=> {
                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                            }

                            if(prefix == null && oldPrefix != undefined) {
                                var prefix = new CompanyPrefix({
                                    company : req.companyId,
                                    prefix : oldPrefix,
                                    maxJobId: oldJobId
                                })
                                prefix.save((err: any, companyPrefix: ICompanyPrefix) => {
                                    if (err) {
                                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                                    }

                                    return res.json({'status': Status.Success, 'message': "Prefix updated successfully."});
                                })
                            }else if(prefix != null) {
                                const companyPrefix = <ICompanyPrefix>prefix

                                companyPrefix.updateOne(
                                    {'prefix' : oldPrefix, 'maxJobId': oldJobId},
                                    (err: any, raw: any) => {
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

const checkPrefixExists = (req: Request, res: Response, next: (req: Request, res: Response, prefix: ICompanyPrefix) => void) => {

    const params = req.body

    CompanyPrefix.findOne(
        { 'prefix': req.company.prefix, 'company' : req.companyId },
        (err: any, companyPrefix: ICompanyPrefix) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (companyPrefix == undefined || companyPrefix == null) {
                next(req, res, null)
                return

            }else{
                if(params.workOrderNumber != undefined && params.workOrderNumber !==null && params.workOrderNumber!= '""') {
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
                if (user.permissions.role == Role.COMPANY_ADMIN && JSON.stringify(user._id) == JSON.stringify(c.admin)) {
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
                            user.permissions.role == Role.GLOBAL_ADMIN
                        ) {
                            let sendTime = new Date();
                            let time = params.emailTime ? params.emailTime.split(':') : [];
                            sendTime.setHours(time[0] ? time[0] : 21,time[1] ? time[1] : 0,time[2] ? time[2]: 0);
                            e.emailPreferences.preferences = params.emailPreferences;
                            e.emailPreferences.time = sendTime;
                            if (user.permissions.role == Role.COMPANY_ADMIN && JSON.stringify(user._id) == JSON.stringify(c.admin)) {
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

        var sale = new SaleTax({
            state : params.state,
            tax : params.tax,
            company: req.companyId,
            createdBy: user._id,
            createdAt: Date.now()
        })

        sale.save((err: any, tax: ISaleTax) => {
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

        if(saleTax == undefined || saleTax == null) {
            return res.json({'status': Status.Success, 'message': "Invalid sale tax id."})
        }

        saleTax.updateOne({ state : params.state, tax : params.tax },
        (err: any, raw: any) => {
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

        if(saleTax == undefined || saleTax == null) {
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

        var charges = new JobCharges({
            jobType : params.jobTypeId,
            charges : params.charges,
            company: req.companyId,
            createdBy: user._id,
            createdAt: Date.now(),
            isFixed: params.isFixed
        })

        if(params.sales_tax_id != undefined && params.sales_tax_id !== null && params.sales_tax_id !== '""') {

            _getSalesTax(req, res, params.sales_tax_id,(req: Request, res: Response, saleTax: ISaleTax) => {

                charges.salesTax = saleTax._id

                charges.save((err: any, charge: IJobCharges) => {
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }

                    return res.json({'status': Status.Success, 'message': "Job charges created successfully."})
                })
            } )

        }else{
            charges.save((err: any, charge: IJobCharges) => {
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

        if(saleTax == undefined || saleTax == null) {
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

        if(jobCharges == undefined || jobCharges == null) {
            return res.json({'status': Status.Success, 'message': "Invalid job Charge id."})
        }

        jobCharges.charges = params.charges
        jobCharges.isFixed = params.isFixed

        if(params.sales_tax_id != undefined && params.sales_tax_id !== null && params.sales_tax_id !== '""') {


            if(params.sales_tax_id != undefined && params.sales_tax_id !== null && params.sales_tax_id !== '""') {

                _getSalesTax(req, res, params.sales_tax_id,(req: Request, res: Response, saleTax: ISaleTax) => {

                    jobCharges.salesTax = saleTax._id

                    jobCharges.updateOne(jobCharges, (err: any, raw: any) => {
                        if (err) {
                            return res.json({'status': Status.Error, 'message': Messages.GenericError})
                        }

                        return res.json({'status': Status.Success, 'message': "Job charges updated successfully."})
                    })
                } )

            }else{

                jobCharges.updateOne(jobCharges, (err: any, raw: any) => {
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

        if(jobCharges == undefined || jobCharges == null) {
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
        select: 'title',
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

            Job.find({ technician: { $in: contractors } }).sort({ endtime : 1 , startTime : 1 , dateTime : 1 })
                .populate({
                    path: 'technician',
                    select: 'profile.displayName'
                })
                .populate({
                    path: 'customer',
                    select: 'profile.displayName contactName'
                })
                .populate({
                    path: 'type',
                    select: 'title'
                })
                .exec((err: any, jobs: IJob[]) => {

                    if (jobs.length == 0 || jobs == undefined) {
                        return res.json({ 'status': Status.Error, 'message': 'No contractor activity found.' })
                    }
                    var contractorActivities : IContractorActivity[] = []
                    for (var i = 0; i < jobs.length; i++) {
                        var job : any = jobs[i];
                        var obj : any = {};
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

