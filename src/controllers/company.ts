import { Request, Response } from 'express'
import { Status, Messages } from '../common/constants'
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
import { IUser } from '../models/User'
import { PurchaseOrder, IPurchaseOrder } from '../models/PurchaseOrder'
import { IContractorActivity } from '../models/ContractorActivity'
import { Estimate, IEstimate } from '../models/Estimate'
import { Item} from '../models/Item'
import { Customer, ICustomer } from '../models/Customer'
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

export const getAllEmployees = (req: Request, res: Response) => {

    Company.findOne({ _id: req.companyId })
        .populate({
            path: 'employees',
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

            res.json({ 'status': Status.Success, 'employees': employees, 'company': company })

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

            res.json({ 'status': Status.Success, 'employees': employees, 'superAdmin': admin })

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

            res.json({ 'status': Status.Success, 'contracts': contracts})
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

export const setCustomInvoiceNumber = (req: Request, res: Response) => {
   
    const params = req.body
    const admin = <ICompanyAdmin>req.user
    var oldInvoicePrefix: string
    var oldInvoiceId:  number

    if((params.invoicePrefix == undefined || params.invoicePrefix === null || params.invoicePrefix === '""') && (params.invoiceNumber == undefined || params.invoiceNumber === null || params.invoiceNumber === '""')) {
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
            
            if(typeof params.invoicePrefix !== 'undefined' && params.invoicePrefix && ( typeof params.invoiceNumber === 'undefined' && !params.invoiceNumber )) {
            
                if(params.invoicePrefix == company.invoicePrefix) {
               
                    return res.json({'status': Status.Success, 'message': "Invoice Prefix already set there."});
                }
                
                checkInvoicePrefixExists(req, res, (req: Request, res: Response, previousPrefix: IInvoicePrefix) => { 
               
                    oldInvoicePrefix = company.invoicePrefix
               
                    company.updateOne({'invoicePrefix':params.invoicePrefix}, (err: any, raw: any)=> {
                        if (err) {                
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }
                        
                  
                        if(previousPrefix == null && oldInvoicePrefix != undefined) {
                  
                            var prefix = new InvoicePrefix({
                                company : req.companyId,
                                prefix : oldInvoicePrefix,
                                maxInvoiceId: company.currentInvoiceId
                            })
                  
                            prefix.save((err: any, invoicePrefix: IInvoicePrefix) => {
                                if (err) {
                                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                                }
                  
                                return res.json({'status': Status.Success, 'message': "Prefix updated successfully."});
                            })
                  
                        }else if(previousPrefix != null){
                  
                            previousPrefix.updateOne(
                                {'prefix' : oldInvoicePrefix, 'maxInvoiceId': company.currentInvoiceId},
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
            } else if (typeof params.invoiceNumber !== 'undefined' && params.invoiceNumber && (typeof params.invoicePrefix === 'undefined' || !params.invoicePrefix)){
          
                if(company.currentInvoiceId > params.invoiceNumber) {
                    return res.json({'status': Status.Success, 'message': "Invoice number can not be less then "+company.currentJobId});      
                }

                company.updateOne({'currentInvoiceId' : params.invoiceNumber}, (err: any, raw: any)=> {
                    if (err) {                
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    return res.json({'status': Status.Success, 'message': "Invoice number updated successfully."});
                })

            } else if ((typeof params.invoicePrefix !== 'undefined' && params.invoicePrefix) && (typeof params.invoiceNumber !== 'undefined' && params.invoiceNumber) ) {
                
                if (company.invoicePrefix == params.invoicePrefix) {

                    if (company.currentJobId > params.invoiceNumber) {
                        return res.json({'status': Status.Success, 'message': "Invoice number can not be less then "+company.currentJobId});
                    }

                    company.updateOne({'currentInvoiceId' : params.invoiceNumber}, (err: any, raw: any)=> {
                        if (err) {                
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }
                        
                        return res.json({'status': Status.Success, 'message': "Invoice number updated successfully."});
                    })
                
                } else if (company.prefix != params.invoicePrefix) {
                    checkInvoicePrefixExists(req, res, (req: Request, res: Response) => { 

                        oldInvoicePrefix = company.prefix
                        oldInvoiceId = company.currentJobId

                        company.updateOne({'invoicePrefix' : params.invoicePrefix, 'currentInvoiceId' : params.invoiceNumber}, (err: any, raw: any)=> {
                            if (err) {                
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                            }

                            if(prefix == null && oldInvoicePrefix != undefined) {
                                var prefix = new InvoicePrefix({
                                    company : req.companyId,
                                    prefix : oldInvoicePrefix,
                                    maxInvoiceId: oldInvoiceId
                                })
                                prefix.save((err: any, invoicePrefix: IInvoicePrefix) => {
                                    if (err) {
                                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                                    }
            
                                    return res.json({'status': Status.Success, 'message': "Prefix updated successfully."});
                                })
                            }else if(prefix != null) {
                                const invoicePrefix = <IInvoicePrefix>prefix
                                
                                invoicePrefix.updateOne({'prefix' : oldInvoicePrefix, 'maxInvoiceId': oldInvoiceId}, 
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

const checkInvoicePrefixExists = (req: Request, res: Response, next: (req: Request, res: Response, prefix: IInvoicePrefix) => void) => {

    const params = req.body

    InvoicePrefix.findOne(
        { 'prefix': req.company.prefix, 'company' : req.companyId },
        (err: any, invoicePrefix: IInvoicePrefix) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (invoicePrefix == undefined || invoicePrefix == null) {
                next(req, res, null)
                return
            
            }else{
                if(params.invoiceNumber != undefined && params.invoiceNumber !==null && params.invoiceNumber!= '""') {
                    if (invoicePrefix.maxInvoiceId > params.invoiceNumber) {
                        return res.json({ 'status': Status.Error, 'message': 'Invoice number with prefix '+params.invoicePrefix+' is not allowed. Try no greater then '+invoicePrefix.maxInvoiceId })
                    } else {
                        next(req, res, invoicePrefix)
                        return
                    }

                }else if (invoicePrefix.maxInvoiceId > req.company.currentJobId){
                    return res.json({ 'status': Status.Error, 'message': 'Current invoice number with prefix '+params.invoicePrefix+' is not allowed. Try no greater then '+invoicePrefix.maxInvoiceId })
                
                }else{
                    next(req, res, invoicePrefix)
                    return
                }   
            }
        }
    )

}

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

export const getInvoiceNumber = (req: Request, res: Response) => {
   
    Company.findById(req.companyId,
        (err: any, company: ICompany) => {

            if (err) {          
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }
            
            if(company == undefined || company == null ) {
                return res.json({ 'status': Status.Error, 'message': 'No company found.' })
            }

            return res.json({status: Status.Success, 'invoicePrefix' : company.invoicePrefix, 'currentInvoiceNumber' : company.currentInvoiceId});
        }
    )
}

// Job Invoices
export const createInvoice = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user
    const company = <ICompany>req.company
    
    if(params.hasOwnProperty('jobId') && (params.jobId != null && params.jobId != '""' )){
        
        Invoice.findOne({ 'job': params.jobId, 'company': req.companyId })
            .then((previousInvoice: any) => {

                if (previousInvoice != undefined || previousInvoice != null) {
                    throw new Error('Invoice already created for this job')
                }

                const jobPrmoies = Job.findById(params.jobId)
                const POPromise = PurchaseOrder.find({
                    job: params.jobId
                })
                return Promise.all([jobPrmoies, POPromise])

            })
            .then((result: any) => {
                const job = result[0]

                const item = Item.findOne({jobType: job.type})
                return Promise.all([result[0], result[1], item])
            })
            .then((result: any) => {

                const job = result[0]
                const purchaseOrders = result[1]
                const item = result[2]

                if (job == undefined || job == null) {
                    throw new Error('Invalid job id')
                    // return res.json({ 'status': Status.Error, 'message': 'Invalid job id' })
                }
                return new Promise((resolve, reject) => {
                    _populateInvoiceData(req, res, job, item, purchaseOrders, null, null, (req, res, invoiceData, currentInvoiceId )=>{
                        
                        invoiceData.save()
                        .then((newInvoice: IInvoice) =>{
                            resolve({latestInvoiceId: currentInvoiceId, invoice: newInvoice})
                        })
                        .catch((invoiceError: any)=>{
                            reject('Unable to create invoice, please try again')
                        })
                        
                    })
                })

            })
            .then((data: any) => {
                
                return new Promise((resolve, reject) => {
                    let invoiceId = data.latestInvoiceId + 1
                    company.updateOne({ currentInvoiceId: invoiceId })
                    .then((res: any) => {
                        resolve(data.invoice)
                    })
                    .catch((err: any)=>{
                        reject()
                    })
                })
            })
            .then((invoice: any) => {

                return new Promise((resolve, reject) => {
                    
                    Customer.findById(invoice.customer)
                    .then((customer: ICustomer) => {
                        if(customer == null){
                            reject()
                        }else{
                            let newBalance = customer.balance + invoice.total
                            customer.updateOne({balance: newBalance})
                            .then((res: any) => {
                                resolve()
                            })
                            .catch((err: any)=>{
                                reject()
                            })
                        }
                    })
                    .catch((err: any)=>{
                        reject()
                    })
                })
            })
            .then((response: any) =>{
                return res.json({ 'status': Status.Success, 'message': "Job invoice created successfully." })
            })
            .catch((error: any) => {
                if (error.message != undefined) {
                    return res.json({ 'status': Status.Error, 'message': error.message })
                } else {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                }
            })
    }
    else if(params.hasOwnProperty('purchaseOrderId') && params.purchaseOrderId != null && params.purchaseOrderId != '""' ){

        Invoice.findOne({ 'purchaseOrder': params.purchaseOrderId, 'company': req.companyId })
        .then((invoice: IInvoice| null) => {
            if(invoice != undefined && invoice != null) {
                throw new Error('Invoice already created for this purchase order')
            }else{
                return PurchaseOrder.findById(params.purchaseOrderId)
            }

        })
        .then((purchaseOrder: IPurchaseOrder | null) => {
            if(purchaseOrder == undefined || purchaseOrder == null) {
                throw new Error('Invalid purchase order id')
            }

            if (purchaseOrder.invoiceCreated) {
                throw new Error('Invoice already created for this purchase order')
            }

            return new Promise((resolve, reject) => {
                _populateInvoiceData(req, res, null, null, null, purchaseOrder, null, (req, res, invoiceData, currentInvoiceId )=>{
                    
                    invoiceData.save()
                    .then((newInvoice: IInvoice) =>{
                        resolve({latestInvoiceId: currentInvoiceId, invoice: newInvoice, purchaseOrderId: purchaseOrder._id})
                    })
                    .catch((err: any)=>{
                        reject('Unable to create invoice, please try again')
                    })
                    
                })
            })
        })
        .then((data: any) => {
            let invoiceId = data.latestInvoiceId + 1
            
            const companyUpdate = company.updateOne({ currentInvoiceId: invoiceId })
            const poUpdate = PurchaseOrder.updateOne({_id: data.purchaseOrderId}, {invoiceCreated: true})
             
            return Promise.all([data.invoice, companyUpdate, poUpdate])
        })
        .then((response: any) => {

            const invoice = response[0]
            return new Promise((resolve, reject) => {
                
                Customer.findById(invoice.customer)
                .then((customer: ICustomer) => {
                    if(customer == null){
                        reject()
                    }else{
                        let newBalance = customer.balance + invoice.total
                        customer.updateOne({balance: newBalance})
                        .then((res: any) => {
                            resolve()
                        })
                        .catch((err: any)=>{
                            reject()
                        })
                    }
                })
                .catch((err: any)=>{
                    reject()
                })
            })
        })
        .then((response: any) =>{
            return res.json({ 'status': Status.Success, 'message': "Purchase order invoice created successfully." })
        })
        .catch((error: any) => {
            if (error.message != undefined) {
                return res.json({ 'status': Status.Error, 'message': error.message })
            } else {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }
        })


        // fdasdf
        // (err: any, previousInvoice: IInvoice) => {

        //     if (err) {
        //         return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        //     }

        //     if (previousInvoice != undefined || previousInvoice != null) {
        //         return res.json({ 'status': Status.Success, 'message': "Invoice already created for this purchase order." })
        //     }

        //     PurchaseOrder.findById(params.purchaseOrderId, (err: any, purchaseOrder: IPurchaseOrder) => {

        //         if (err) {
        //             return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        //         }

        //         if (purchaseOrder == undefined || purchaseOrder == null) {
        //             return res.json({ 'status': Status.Error, 'message': 'Invalid purchase order id' })
        //         }

        //         if (purchaseOrder.invoiceCreated) {
        //             return res.json({ 'status': Status.Error, 'message': 'Invoice already created for this purchase order' })
        //         }

            
        //         _populateInvoiceData(req, res, null, null, null, purchaseOrder, null, (req, res, invoiceData, currentInvoiceId )=>{
                    
        //             invoiceData.save((invoiceError: any, newInvoice: IInvoice, ) => {

        //                 if (invoiceError) {
        //                     return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        //                 }

        //                 purchaseOrder.updateOne({ invoiceCreated: true}).exec((poUpdateError: any, raw: any) => {
                            
        //                     if (poUpdateError) {
        //                         return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        //                     }
                            
        //                     company.updateOne({ currentInvoiceId: currentInvoiceId + 1 }).exec((companyError: any, raw: any) => {
                            
        //                         if (companyError) {
        //                             return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        //                         }
    
        //                         return res.json({ 'status': Status.Success, 'message': "Purchase order invoice created successfully." })
        //                     })

        //                 })
    
    
        //             })
        //         })

        //     })


        // });
    }
    else if(params.hasOwnProperty('estimateId') && params.estimateId != null && params.estimateId != '""' ){

        Invoice.findOne({ 'estimate': params.estimateId, 'company': req.companyId })
        .then((invoice: IInvoice| null) => {
            if(invoice != undefined && invoice != null) {
                throw new Error('Invoice already created for this estimate')
            }else{
                return Estimate.findById(params.estimateId)
            }

        })
        .then((estimate: IEstimate | null) => {
            if(estimate == undefined || estimate == null) {
                throw new Error('Invalid estimate id')
            }

            if (estimate.invoiceCreated) {
                throw new Error('Invoice already created for this estimate')
            }

            return new Promise((resolve, reject) => {
                _populateInvoiceData(req, res, null, null, null, null, estimate, (req, res, invoiceData, currentInvoiceId )=>{
                    
                    invoiceData.save()
                    .then((newInvoice: IInvoice) =>{
                        resolve({latestInvoiceId: currentInvoiceId, invoice: newInvoice, estimateId: estimate._id})
                    })
                    .catch((err: any)=>{
                        reject('Unable to create invoice, please try again')
                    })
                    
                })
            })
        })
        .then((data: any) => {
            let invoiceId = data.latestInvoiceId + 1
            
            const companyUpdate = company.updateOne({ currentInvoiceId: invoiceId })
            const estimateUpdate = Estimate.updateOne({_id: data.estimateId}, {invoiceCreated: true})
             
            return Promise.all([data.invoice, companyUpdate, estimateUpdate])
        })
        .then((response: any) => {

            const invoice = response[0]
            return new Promise((resolve, reject) => {
                
                Customer.findById(invoice.customer)
                .then((customer: ICustomer) => {
                    if(customer == null){
                        reject()
                    }else{
                        let newBalance = customer.balance + invoice.total
                        customer.updateOne({balance: newBalance})
                        .then((res: any) => {
                            resolve()
                        })
                        .catch((err: any)=>{
                            reject()
                        })
                    }
                })
                .catch((err: any)=>{
                    reject()
                })
            })
        })
        .then((response: any) =>{
            return res.json({ 'status': Status.Success, 'message': "Estimate invoice created successfully." })
        })
        .catch((error: any) => {
            if (error.message != undefined) {
                return res.json({ 'status': Status.Error, 'message': error.message })
            } else {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }
        })

        // Invoice.findOne({ 'estimate': params.estimateId, 'company': req.companyId },
        // (err: any, previousInvoice: IInvoice) => {

        //     if (err) {
        //         return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        //     }

        //     if (previousInvoice != undefined || previousInvoice != null) {
        //         return res.json({ 'status': Status.Success, 'message': "Invoice already created for this estimate." })
        //     }

        //     Estimate.findById(params.estimateId, (estimateError: any, estimate: IEstimate) => {

        //         if (estimateError) {
        //             return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        //         }

        //         if (estimate == undefined || estimate == null) {
        //             return res.json({ 'status': Status.Error, 'message': 'Invalid estimate id' })
        //         }
             
        //         if (estimate.invoiceCreated) {
        //             return res.json({ 'status': Status.Error, 'message': 'Invoice already created for this invoice' })
        //         }

        //         _populateInvoiceData(req, res, null, null, null, null, estimate, (req, res, invoiceData, currentInvoiceId )=>{
                    
        //             invoiceData.save((invoiceError: any, newInvoice: IInvoice, ) => {
                        
        //                 if (invoiceError) {
        //                     return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        //                 }
                        
        //                 estimate.updateOne({invoiceCreated: true}).exec((estimateUpdateError: any, raw: any) => {
                            
        //                     if (estimateUpdateError) {
        //                         return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        //                     }

        //                     company.updateOne({ currentInvoiceId: currentInvoiceId })
        //                     .exec((companyError: any, raw: any) => {
                                
        //                         if (companyError) {
        //                             return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        //                         }
    
        //                         return res.json({ 'status': Status.Success, 'message': "Estimate invoice created successfully." })
        //                     })

        //                 })
    
    
        //             })
        //         })

        //     })
        // });
    }
    else {
        
        _populateInvoiceData(req, res, null, null, null, null, null, (req, res, invoiceData, currentInvoiceId )=>{
                    
            invoiceData.save((invoiceError: any, newInvoice: IInvoice, ) => {
                if (invoiceError) {
                    
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                }

                company.updateOne({ currentInvoiceId: currentInvoiceId + 1 })
                    .exec((companyError: any, raw: any) => {
                        if (companyError) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        Customer.findById(newInvoice.customer)
                        .exec((err: any, customer: ICustomer) => {
                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                            }
                            
                            let newBalance = customer.balance + newInvoice.total
                            customer.updateOne({balance: newBalance})
                            .exec((err: any, result: any) =>{
                                if (err) {
                                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                                }

                                return res.json({ 'status': Status.Success, 'message': "Invoice created successfully." })
                            })
                        })
                    })
            })
        })
    }
}

const _populateInvoiceData = (req: Request, res: Response, job: any, jobTypeitem: any, purchaseOrders: any, purchaseOrder: any, estimate: any, next: (req: Request, res: Response, invoice: IInvoice, invoiceId: number) => void) =>{
    
    const params = req.body
    const company = req.company
    const user = <IUser>req.user
    
    let currentInvoiceId = 0;
    if (company.currentInvoiceId) {
        currentInvoiceId = company.currentInvoiceId
    }

    if(company.currentEstimateId > company.currentInvoiceId) {
        currentInvoiceId = company.currentEstimateId
    }else if(company.currentInvoiceId > company.currentEstimateId){
        currentInvoiceId = company.currentInvoiceId
    }

    let invoiceId = 'Invoice ' + (currentInvoiceId + 1)

    if (company.invoicePrefix != undefined && company.invoicePrefix != null && company.invoicePrefix == '""') {
        invoiceId = 'Invoice ' + company.invoicePrefix + '-' + (currentInvoiceId + 1)
    }

    let taxAmount: number = 0;
    let charges: number = 0;
    let total: number = 0;
    let invoiceType: number = 0;
    let customer : string
    let jobId : string
    let hourlyRate: number = 0
    let timeSpent: number = 0
    let purchaseOrderId: string = null
    let estimateId: string = null
    let isFixed: boolean = false
    let taxPercentage: number = 0
    

    if(job != null){
        charges = job.charges;
        invoiceType = 0
        customer = job.customer
        jobId = job._id

        if (!jobTypeitem.isFixed && (params.hourlyRate == undefined && params.hourlyRate == null && params.hourlyRate == '""')) {
            return res.json({ 'status': Status.Error, 'message': 'Hourly rate is required' })
        } else if (!jobTypeitem.isFixed) {
            hourlyRate = params.hourlyRate
        }

        if (!jobTypeitem.isFixed && (params.timeSpent == undefined && params.timeSpent == null && params.timeSpent == '""')) {
            return res.json({ 'status': Status.Error, 'message': 'Time spent is required' })
        } else if (!jobTypeitem.isFixed) {
            timeSpent = params.timeSpent
        }

        if(jobTypeitem.isFixed)
        isFixed = true
    }

    if(purchaseOrder != null){
        if(purchaseOrder.total == undefined || purchaseOrder.total == null || purchaseOrder.total == '""' ){
            return res.json({ 'status': Status.Error, 'message': 'purchaseOrder total is missing' })
        }
        if(purchaseOrder.customer == undefined || purchaseOrder.customer == null || purchaseOrder.customer == '""' ){
            return res.json({ 'status': Status.Error, 'message': 'purchaseOrder customer is missing' })
        }

        purchaseOrderId = purchaseOrder._id
        charges = purchaseOrder.total
        customer = purchaseOrder.customer
        invoiceType = 1
    }
   
    if(estimate != null){

        if(estimate.total == undefined || estimate.total == null || estimate.total == '""' ){
            return res.json({ 'status': Status.Error, 'message': 'Estimate total is missing' })
        }
        if(estimate.customer == undefined || estimate.customer == null || estimate.customer == '""' ){
            return res.json({ 'status': Status.Error, 'message': 'Estimate customer is missing' })
        }

        estimateId = estimate._id
        charges = estimate.total
        customer = estimate.customer
        invoiceType = 2

        let idOfEstimate = estimate.estimateId.replace('Estimate ','')
        invoiceId = 'Invoice ' + idOfEstimate

        if (company.invoicePrefix != undefined && company.invoicePrefix != null && company.invoicePrefix == '""') {
            invoiceId = 'Invoice ' + company.invoicePrefix + '-' + idOfEstimate
        }
    }

    if(job == null && purchaseOrder == null && estimate == null) {

        if(params.customerId == undefined || params.customerId == null || params.customerId == '""' ){
            return res.json({ 'status': Status.Error, 'message': 'customer is required' })
        }
    
        if(params.note == undefined || params.note == null || params.note == '""' ){
            return res.json({ 'status': Status.Error, 'message': 'Note is required ' })
        }
        
        if (params.charges == undefined || params.charges == null || params.charges === '""') {
            return res.json({ 'status': Status.Error, 'message': 'charges are required' })  
        } 

        invoiceType = 3
        customer = params.customerId
    }

    if (params.charges != undefined && params.charges !== null && params.charges !== '""'){
        charges = parseInt(params.charges)
    }

    if (params.tax != undefined && params.tax !== null && params.tax !== '""' && params.tax > 0) {
        taxPercentage = params.tax
        taxAmount = charges * (taxPercentage / 100)
    }

    total = charges + taxAmount
    
    if(params.shippingCost != undefined && params.shippingCost != null)
    total = total + parseInt(params.shippingCost)
    
    let purchaseOrderIds: any = []
    if (params.includePO) {
        
        if (purchaseOrders != null && purchaseOrders.length > 0) {
            purchaseOrders.map((PO: any) => {
                purchaseOrderIds.push(PO._id)
                total = total + PO.total
            })
        }
    }


    var items: any = []
    if (params.items != undefined) {
        try {
            items = JSON.parse(params.items);
        } catch (error) {
            return res.json({ 'status': Status.Error, 'message': 'Items json is invalid' })
        }
    }
    
    let invoiceItems: any[] = []
    
    if (items.length > 0) {
    
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if ((!item.hasOwnProperty('item') || !item.hasOwnProperty('tax') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity')) && (!item.hasOwnProperty('name') || !item.hasOwnProperty('description') || !item.hasOwnProperty('tax') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity'))) {
                return res.json({ 'status': Status.Error, 'message': 'Items format is invalid' })
            }
            let obj: any = {}
            let price = parseInt(item.price)
            let quantity = parseInt(item.quantity)
            let itemTax =  0
            let subTotal = price * quantity

            if(item.tax > 0) {
                itemTax =  parseInt(item.tax)
                subTotal = subTotal + (subTotal * itemTax /100)
            }
            
            obj.quantity = item.quantity
            obj.price = item.price
            obj.tax = item.tax
            obj.subTotal = subTotal
            
            if (item.item == undefined || item.item == null) {
                obj.name = item.name
                obj.description = item.description
            } else {
                obj.item = item.item
            }
            invoiceItems.push(obj)

            total = total + subTotal
        }
    
    } else if(jobTypeitem != null) {
        
        
        let obj: any = {}
        let price = parseInt(jobTypeitem.charges)
        let quantity = parseInt(job.timeSpent)
        let itemTax =  0
        let subTotal = price * quantity

        if(jobTypeitem.tax > 0) {
            itemTax =  parseInt(jobTypeitem.tax)
            subTotal = subTotal + (subTotal * itemTax /100)
        }
        
        obj.quantity = job.timeSpent
        obj.price = price
        obj.tax = itemTax
        obj.subTotal = subTotal
        obj.item = jobTypeitem._id
        
        invoiceItems.push(obj)

        total = total + subTotal
    }


    var invoice = new Invoice({
        invoiceId: invoiceId,
        invoiceType: invoiceType,
        job: jobId,
        purchaseOrder: purchaseOrderId,
        jobPurchaseOrders: purchaseOrderIds,
        customer: customer,
        company: req.companyId,
        note: params.note,
        charges: charges,
        shippingCost : params.shippingCost,
        tax: taxAmount,
        total: total,
        taxPercentage: taxPercentage,
        createdBy: user._id,
        createdAt: Date.now(),
        isFixed: isFixed,
        hourlyRate: hourlyRate,
        timeSpent: timeSpent,
        items: invoiceItems,
        estimate: estimateId
    })

    next(req, res, invoice, currentInvoiceId)
              

}
// PO Invoices
export const createPOInvoice = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user
    const company = <ICompany>req.company

    Invoice.findOne({ 'purchaseOrder': params.purchaseOrderId, 'company': req.companyId },
        (err: any, previousInvoice: IInvoice) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (previousInvoice != undefined || previousInvoice != null) {
                return res.json({ 'status': Status.Success, 'message': "Invoice already created for this purchase order." })
            }

            PurchaseOrder.findById(params.purchaseOrderId, (POError: any, PO: IPurchaseOrder) => {

                if (POError) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                }

                if (PO == undefined || PO == null) {
                    return res.json({ 'status': Status.Error, 'message': 'Invalid purchase order id' })
                }

                let currentInvoiceId = 0;
                if (company.currentInvoiceId) {
                    currentInvoiceId = company.currentInvoiceId
                }
                let invoiceId = 'Invoice ' + (currentInvoiceId + 1)

                if (company.invoicePrefix != undefined && company.invoicePrefix != null && company.invoicePrefix == '""') {
                    invoiceId = 'Invoice ' + company.invoicePrefix + '-' + (currentInvoiceId + 1)
                }

                var invoice = new Invoice({
                    invoiceId: invoiceId,
                    purchaseOrder: params.purchaseOrderId,
                    customer: PO.customer,
                    company: req.companyId,
                    total: PO.total,
                    createdBy: user._id,
                    note : params.note,
                    createdAt: Date.now(),
                    invoiceType: 1
                })

                invoice.save((invoiceError: any, newInvoice: IInvoice) => {
                    if (invoiceError) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    company.updateOne({ currentInvoiceId: currentInvoiceId + 1 })
                        .exec((companyError: any, raw: any) => {
                            if (companyError) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                            }

                            return res.json({ 'status': Status.Success, 'message': "Purchase order invoice created successfully." })
                        })


                })
            })


        });
}

export const updateInvoice = (req: Request, res: Response) => {

    const params = req.body

    Invoice.findOne({'_id': params.invoiceId, 'company': req.companyId},  
    (err: any, invoice: IInvoice) => { 
        if (err) { 
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }
        
        if(invoice == undefined || invoice == null) {
            return res.json({'status': Status.Success, 'message': "Invalid invoice id."})
        }

        if(invoice.invoiceType == 0) {
            
            Job.findById(invoice.job)
            .then((job : any) => {
                if (job == undefined || job == null) {
                    throw new Error('job for this invoice is not fount')
                }

                const POPromise = PurchaseOrder.find({
                    job: invoice.job
                })
                return Promise.all([job, POPromise])
            })
            .then((result : any ) => {
                let job = result[0]
                let purchaseOrders = result[1]

                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                }
    
                if ((params.charges == undefined || params.charges == null || params.charges == '""' ) && (params.tax == undefined || params.tax == null || params.tax == '""' )) {
                    return res.json({'status': Status.Error, 'message': 'Tax Percentage or charges are required'})
                }
                let tax: number = invoice.tax;
                let taxPercentage: number = invoice.taxPercentage;
                let charges: number = invoice.charges;
                let total: number = invoice.total;
                
                if ((params.tax != undefined && params.tax !== null && params.tax !== '""' && params.tax > 0) && 
                (params.charges == undefined || params.charges == null || params.charges == '""' )) {
                
                    taxPercentage = params.tax
                    tax = (charges * params.tax) /100
                    total = charges + tax
                    
                } else if ((params.charges != undefined && params.charges !== null && params.charges !== '""' ) && 
                (params.tax == undefined || params.tax == null || params.tax == '""' )) {
                    
                    tax = (params.charges * taxPercentage) / 100
                    charges = parseInt(params.charges)
                    total = charges + tax
                    
                }else{
                    
                    // update tax and charges
                    charges = parseInt(params.charges)
                    taxPercentage = params.tax
                    tax = (charges * params.tax) /100
                    total = charges + tax
                }
    
                invoice.tax = tax
                invoice.taxPercentage = taxPercentage
                invoice.charges = charges
                // invoice.total = total
    
                if(!job.isFixed && (params.hourlyRate == undefined && params.hourlyRate == null && params.hourlyRate == '""' )) {
                    return res.json({ 'status': Status.Error, 'message': 'Hourly rate is required' })
                }else if(!job.isFixed){
                    invoice.hourlyRate = params.hourlyRate
                }
    
                if(!job.isFixed && (params.timeSpent == undefined && params.timeSpent == null && params.timeSpent == '""' )) {
                    return res.json({ 'status': Status.Error, 'message': 'Time spent is required' })
                }else if(!job.isFixed){
                    invoice.timeSpent = params.timeSpent
                }
                let purchaseOrderIds: any = []
                if (params.includePO) {
                    if (purchaseOrders != null && purchaseOrders.length > 0) {
                        purchaseOrders.map((PO: any) => {
                            purchaseOrderIds.push(PO._id)
                        })
                        // invoice.jobPurchaseOrders = purchaseOrderIds
                    }
                }
    
                if(params.shippingCost != undefined && params.shippingCost != null){
                    invoice.total = invoice.total + parseInt(params.shippingCost)
                    // invoice.shippingCost = params.shippingCost
                }

                // total = invoice.total
                var items: any = []
                if (params.items != undefined) {
                    try {
                        items = JSON.parse(params.items);
                    } catch (error) {
                        return res.json({ 'status': Status.Error, 'message': 'Items json is invalid' })
                    }
                }
                
                let invoiceItems: any[] = []
                
                if (items.length > 0) {
                
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        if ((!item.hasOwnProperty('item') || !item.hasOwnProperty('tax') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity')) && (!item.hasOwnProperty('name') || !item.hasOwnProperty('description') || !item.hasOwnProperty('tax') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity'))) {
                            return res.json({ 'status': Status.Error, 'message': 'Items format is invalid' })
                        }
                        let obj: any = {}
                        let price = parseInt(item.price)
                        let quantity = parseInt(item.quantity)
                        let itemTax =  0
                        let subTotal = price * quantity

                        if(item.tax > 0) {
                            itemTax =  parseInt(item.tax)
                            subTotal = subTotal + (subTotal * itemTax /100)
                        }
                        
                        obj.quantity = item.quantity
                        obj.price = item.price
                        obj.tax = item.tax
                        obj.subTotal = subTotal
                        
                        if (item.item == undefined || item.item == null) {
                            obj.name = item.name
                            obj.description = item.description
                        } else {
                            obj.item = item.item
                        }
                        invoiceItems.push(obj)

                        total = total + subTotal
                    }
                }

                // invoice.total = total

                invoice.updateOne({total: total, items: invoiceItems, shippingCost: params.shippingCost, jobPurchaseOrders: purchaseOrderIds, tax: tax, taxPercentage: taxPercentage, charges: charges, note: params.note},
                    
                    (err: any, raw: any) => {
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }
        
                    return res.json({'status': Status.Success, 'message': "Invoice updated successfully."})
                })
            })
        } else {

            if ((params.charges == undefined || params.charges == null || params.charges == '""' ) && (params.tax == undefined || params.tax == null || params.tax == '""' )) {
                return res.json({'status': Status.Error, 'message': 'Tax Percentage or charges are required'})
            }
            let tax: number = invoice.tax;
            let taxPercentage: number = invoice.taxPercentage;
            let charges: number = invoice.charges;
            let total: number = invoice.total;
            
            if ((params.tax != undefined && params.tax !== null && params.tax !== '""' && params.tax > 0) && 
            (params.charges == undefined || params.charges == null || params.charges == '""' )) {
            
                taxPercentage = params.tax
                tax = (charges * params.tax) /100
                total = charges + tax
                
            } else if ((params.charges != undefined && params.charges !== null && params.charges !== '""' ) && 
            (params.tax == undefined || params.tax == null || params.tax == '""' )) {
                
                tax = (params.charges * taxPercentage) / 100
                charges = parseInt(params.charges)
                total = charges + tax
                
            }else{
                
                charges = parseInt(params.charges)
                taxPercentage = params.tax
                tax = (charges * params.tax) /100
                total = charges + tax
            }
            
            // invoice.tax = tax
            // invoice.taxPercentage = taxPercentage
            // invoice.charges = charges
            // invoice.total = total
            // invoice.note = params.note

            // total = invoice.total
            var items: any = []
            if (params.items != undefined) {
                try {
                    items = JSON.parse(params.items);
                } catch (error) {
                    return res.json({ 'status': Status.Error, 'message': 'Items json is invalid' })
                }
            }
            
            let invoiceItems: any[] = []
            
            if (items.length > 0) {
            
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if ((!item.hasOwnProperty('item') || !item.hasOwnProperty('tax') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity')) && (!item.hasOwnProperty('name') || !item.hasOwnProperty('description') || !item.hasOwnProperty('tax') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity'))) {
                        return res.json({ 'status': Status.Error, 'message': 'Items format is invalid' })
                    }
                    let obj: any = {}
                    let price = parseInt(item.price)
                    let quantity = parseInt(item.quantity)
                    let itemTax =  0
                    let subTotal = price * quantity

                    if(item.tax > 0) {
                        itemTax =  parseInt(item.tax)
                        subTotal = subTotal + (subTotal * itemTax /100)
                    }
                    
                    obj.quantity = item.quantity
                    obj.price = item.price
                    obj.tax = item.tax
                    obj.subTotal = subTotal
                    
                    if (item.item == undefined || item.item == null) {
                        obj.name = item.name
                        obj.description = item.description
                    } else {
                        obj.item = item.item
                    }
                    invoiceItems.push(obj)

                    total = total + subTotal
                }
            }

            if(params.shippingCost != undefined && params.shippingCost != null){
                invoice.total = invoice.total + parseInt(params.shippingCost)
                // invoice.shippingCost = params.shippingCost
            }
            
            invoice.updateOne({total: total, items: invoiceItems, shippingCost: params.shippingCost, tax: tax, taxPercentage: taxPercentage, charges: charges, note: params.note},
                (err: any, raw: any) => {
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
    
                return res.json({'status': Status.Success, 'message': "Invoice updated successfully."})
            })
            
        }
    });
}

export const getInvoiceDetail = (req: Request, res: Response) => {
 const params = req.body

    Invoice.findOne({ _id: params.invoiceId, 'company': req.companyId})
    .populate({
        path: 'job',
        populate: [{ path: 'type', select: 'title' }, { path: 'ticket', select: 'ticketId note scheduleDateTime'}, { path: 'technician', select: 'profile.displayName auth.email contact.phone permissions.role'}],
    })
    .populate({
        path: 'customer',
        select: 'info.email auth.email profile.displayName address.street address.city address.state address.zipCode contact.phone contactName'
    })
    .populate({
        path: 'estimate',
        select: 'total items note status customer company createdAt createdBy'
    })
    .populate({
        path: 'company',
        select: 'info.companyName info.logoUrl auth.email permissions.role address.street address.city address.state address.zipCode contact.phone'
    })
    .populate({
        path: 'createdBy',
        select: 'info.companyName auth.email profile.displayName permissions.role address.street address.city address.state address.zipCode contact.phone'
    })
    .populate({
        path: 'purchaseOrder'
    })
    .populate({
        path: 'items.item',
        select: 'name itemCode note cost price',
        populate: [{path: 'jobType'}]
    })
    .exec((err: any, invoice: IInvoice)=>{

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }
        
        if (invoice == undefined || invoice == null) {
            return res.json({'status': Status.Error, 'message': 'Invalid invoice id'})
        }

        Scan.find({ job: invoice.job}, 'comment timeOfScan')
            .populate({
                path: 'equipment',
                select: 'info.model info.serialNumber info.nfcTag images info.location',
                populate: [{ path: 'brand', select: 'title' },{ path: 'type', select: 'title' }],
                
            })
            .exec ((err: any, scans: IScan[]) => {
                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                }
                
                return res.json({ 'status': Status.Success, 'invoice': invoice, 'scans': scans })
            })
    })
}

export const getInvoices = (req: Request, res: Response) => {

    Invoice.find({'company': req.companyId})
    .populate({
        path: 'job',
        populate: [{ path: 'type', select: 'title' },{ path: 'customer', select: 'info.email auth.email profile.displayName contactName' }, { path: 'technician', select: 'profile.displayName auth.email contact.phone permissions.role' }],
    })
    .populate({
        path: 'items.item',
        select: 'name itemCode note cost price',
        populate: [{path: 'jobType'}]
    })
    .populate({
        path: 'company',
        select: 'info.companyName info.logoUrl info.email permissions.role address.street address.city address.state address.zipCode contact.phone'
    })
    .populate({
        path: 'customer',
        select: 'info.email auth.email profile.displayName address.street address.city address.state address.zipCode contact.phone contactName'
    })
    .populate({
        path: 'estimate',
        select: 'total items note status customer company createdBy'
    })
    .exec((err: any, invoices: IInvoice[])=>{

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }
        
        return res.json({ 'status': Status.Success, 'invoices': invoices })
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
                    res.json({ 'status': Status.Success, 'contractorActivities': contractorActivities })
                })
        })
}

export const getInvoicesByCustomerId = (req: Request, res: Response) => {

    const params = req.body

    Invoice.find({'company': req.companyId, customer: params.customer})
    .populate({
        path: 'job',
        populate: [{ path: 'type', select: 'title' },{ path: 'customer', select: 'info.email auth.email profile.displayName contactName' }, { path: 'technician', select: 'profile.displayName auth.email contact.phone permissions.role' }],
    })
    .populate({
        path: 'items.item',
        select: 'name itemCode note cost price',
        populate: [{path: 'jobType'}]
    })
    .populate({
        path: 'company',
        select: 'info.companyName info.logoUrl info.email permissions.role address.street address.city address.state address.zipCode contact.phone'
    })
    .populate({
        path: 'customer',
        select: 'info.email auth.email profile.displayName address.street address.city address.state address.zipCode contact.phone contactName'
    })
    .populate({
        path: 'estimate',
        select: 'total items note status customer company createdBy'
    })
    .exec((err: any, invoices: IInvoice[])=>{

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }
        
        return res.json({ 'status': Status.Success, 'invoices': invoices })
    })
}
