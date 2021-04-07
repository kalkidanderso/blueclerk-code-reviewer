import {Request, Response} from 'express';
import {IInvoice, Invoice} from '../models/Invoice';
import {Messages, Status} from '../common/constants';
import {ICompanyAdmin} from '../models/CompanyAdmin';
import {Company, ICompany} from '../models/Company';
import {IInvoicePrefix, InvoicePrefix} from '../models/InvoicePrefix';
import {IUser} from '../models/User';
import {Job} from '../models/Job';
import {IPurchaseOrder, PurchaseOrder} from '../models/PurchaseOrder';
import {Item} from '../models/Item';
import {Customer, ICustomer} from '../models/Customer';
import {Estimate, IEstimate} from '../models/Estimate';
import {IScan, Scan} from '../models/Scan';
import {sendInvoiceEmailToCustomer} from '../services/aws';

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

export const setCustomInvoiceNumber = (req: Request, res: Response) => {

    const params = req.body
    const admin = <ICompanyAdmin>req.user
    var oldInvoicePrefix: string
    var oldInvoiceId:  number

    if((params.invoicePrefix == undefined || params.invoicePrefix === '""') && (params.invoiceNumber == undefined || params.invoiceNumber === '""')) {
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

                    company.updateOne({'invoicePrefix':params.invoicePrefix}, (err: any)=> {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }


                        if(previousPrefix == null && oldInvoicePrefix != undefined) {

                            var prefix = new InvoicePrefix({
                                company : req.companyId,
                                prefix : oldInvoicePrefix,
                                maxInvoiceId: company.currentInvoiceId
                            })

                            prefix.save((err: any) => {
                                if (err) {
                                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                                }

                                return res.json({'status': Status.Success, 'message': "Prefix updated successfully."});
                            })

                        }else if(previousPrefix != null){

                            previousPrefix.updateOne(
                                {'prefix' : oldInvoicePrefix, 'maxInvoiceId': company.currentInvoiceId},
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
            } else if (typeof params.invoiceNumber !== 'undefined' && params.invoiceNumber && (typeof params.invoicePrefix === 'undefined' || !params.invoicePrefix)){

                if(company.currentInvoiceId > params.invoiceNumber) {
                    return res.json({'status': Status.Success, 'message': "Invoice number can not be less then "+company.currentJobId});
                }

                company.updateOne({'currentInvoiceId' : params.invoiceNumber}, (err: any)=> {
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

                    company.updateOne({'currentInvoiceId' : params.invoiceNumber}, (err: any)=> {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        return res.json({'status': Status.Success, 'message': "Invoice number updated successfully."});
                    })

                } else if (company.prefix != params.invoicePrefix) {
                    checkInvoicePrefixExists(req, res, (req: Request, res: Response) => {

                        oldInvoicePrefix = company.prefix
                        oldInvoiceId = company.currentJobId

                        company.updateOne({'invoicePrefix' : params.invoicePrefix, 'currentInvoiceId' : params.invoiceNumber}, (err: any)=> {
                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                            }

                            if(prefix == null && oldInvoicePrefix != undefined) {
                                var prefix = new InvoicePrefix({
                                    company : req.companyId,
                                    prefix : oldInvoicePrefix,
                                    maxInvoiceId: oldInvoiceId
                                })
                                prefix.save((err: any) => {
                                    if (err) {
                                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                                    }

                                    return res.json({'status': Status.Success, 'message': "Prefix updated successfully."});
                                })
                            }else if(prefix != null) {
                                const invoicePrefix = <IInvoicePrefix>prefix

                                invoicePrefix.updateOne({'prefix' : oldInvoicePrefix, 'maxInvoiceId': oldInvoiceId},
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
                            .catch(()=>{
                                reject('Unable to create invoice, please try again')
                            })

                    })
                })

            })
            .then((data: any) => {

                return new Promise((resolve, reject) => {
                    let invoiceId = data.latestInvoiceId + 1
                    company.updateOne({ currentInvoiceId: invoiceId })
                        .then(() => {
                            resolve(data.invoice)
                        })
                        .catch(()=>{
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
                                    .then(() => {
                                        resolve()
                                    })
                                    .catch(()=>{
                                        reject()
                                    })
                            }
                        })
                        .catch(()=>{
                            reject()
                        })
                })
            })
            .then(() =>{
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
                            .catch(()=>{
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
                                    .then(() => {
                                        resolve()
                                    })
                                    .catch(()=>{
                                        reject()
                                    })
                            }
                        })
                        .catch(()=>{
                            reject()
                        })
                })
            })
            .then(() =>{
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
                            .catch(()=>{
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
                                    .then(() => {
                                        resolve()
                                    })
                                    .catch(()=>{
                                        reject()
                                    })
                            }
                        })
                        .catch(()=>{
                            reject()
                        })
                })
            })
            .then(() =>{
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
                    .exec((companyError: any) => {
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
                                    .exec((err: any) =>{
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

                invoice.save((invoiceError: any) => {
                    if (invoiceError) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    company.updateOne({ currentInvoiceId: currentInvoiceId + 1 })
                        .exec((companyError: any) => {
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

                            (err: any) => {
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
                    (err: any) => {
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
            populate: [
                { path: 'type', select: 'title' },
                { path: 'ticket', select: 'ticketId note scheduleDateTime'},
                { path: 'technician', select: 'profile.displayName auth.email contact.phone permissions.role'},
                { path: 'ticket', populate: {path: 'ticket', populate: 'customerContactId'}},
                {path: 'jobLocation'},
                {path: 'jobSite'}
            ],
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

export const sendInvoice = (req: Request, res: Response) => {
    const params = req.body
    const company = <ICompany>req.company;
    try {
        Invoice.findOne({ _id: params.invoiceId, 'company': req.companyId})
            .populate({
                path: 'customer',
                select: 'info.email auth.email profile.displayName address.street address.city address.state address.zipCode contact.phone contactName'
            })
            .then((invoice: IInvoice)=>{
                if (!invoice) {
                    return res.json({'status': Status.Error, 'message': 'Invalid invoice id'})
                }
                sendInvoiceEmailToCustomer({
                    companyName: company.info.companyName,
                    companyEmail: company.info.companyEmail,
                    customerName: invoice.customer.profile.displayName,
                    customerEmail: invoice.customer.info.email,
                    invoiceNumber: invoice.invoiceId,
                    invoiceAmount: invoice.total,
                });
            })

    } catch (err) {
        return res.json({'status': Status.Error, 'message': err.message});
    }
}

export const getInvoices = (req: Request, res: Response) => {

    Invoice.find({'company': req.companyId})
        .populate({
            path: 'job',
            populate: [
                { path: 'type', select: 'title' },
                { path: 'customer', select: 'info.email auth.email profile.displayName contactName' },
                { path: 'technician', select: 'profile.displayName auth.email contact.phone permissions.role' },
                { path: 'ticket', populate: {path: 'ticket', populate: 'customerContactId'}},
                {path: 'jobLocation'},
                {path: 'jobSite'}
            ],
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
