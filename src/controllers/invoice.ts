import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment';

import { InvoiceStatus, Messages, Status } from '../common/constants';
import { IContact } from '../common/contact';
import { Contact } from '../models/Contact';
import { IUser } from '../models/User';
import { Company, ICompany } from '../models/Company';
import { ICompanyAdmin } from '../models/CompanyAdmin';
import { CompanyInvoice } from '../models/CompanyInvoice';
import { Customer, ICustomer } from '../models/Customer';
import { IItem, Item } from '../models/Item';
import { IPriceTier } from '../models/PriceTier';
import { IServiceTicket } from '../models/ServiceTicket';
import { IJob, Job } from '../models/Job';
import { IJobReport, JobReport } from '../models/JobReport';
import { IPurchaseOrder, PurchaseOrder } from '../models/PurchaseOrder';
import { Estimate, IEstimate } from '../models/Estimate';
import { IInvoicePrefix, InvoicePrefix } from '../models/InvoicePrefix';
import { IPaymentTerm, PaymentTerm } from '../models/PaymentTerm';
import { Payment } from '../models/Payment';
import { IInvoice, Invoice } from '../models/Invoice';
import { IScan, Scan } from '../models/Scan';
import { EmailDefault } from '../models/EmailDefault';

import { sendInvoiceEmailToCustomer } from '../services/aws';
import { _createQBInvoice } from '../controllers/quickbook.invoice';
import { transformPlaceholders, getPlaceholderValues } from './emailDefault';

/**
 * To reset Invoice quickbookId,
 * used when /disconnectQB API called
 */
export const _resetInvoiceQB = (company: ICompany): void => {

    Invoice.updateMany(
        { company: company._id, quickbookId: { $ne: null } },
        { $set: { quickbookId: null } }
    ).exec();

    return;

}

export const getInvoicesByCustomerId = (req: Request, res: Response) => {

    const params = req.query;

    Invoice.find({'company': req.companyId, customer: params.customerId})
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

    if (params.jobId) {

        Invoice.findOne({ 'job': params.jobId, 'company': req.companyId })
            .then((previousInvoice: any) => {

                if (previousInvoice) {
                    throw new Error('Invoice already created for this job')
                }

                const jobPromise = Job.findById(params.jobId)
                const POPromise = PurchaseOrder.find({
                    job: params.jobId
                })
                return Promise.all([jobPromise, POPromise])

            })
            .then((result: any) => {
                const job = <IJob>result[0]

                // Convert jobTypes to ObjectId in array
                const jobTypeIds = job.tasks.map(task => task.jobType);
                // Fallback for old job who still using one job type
                if (!jobTypeIds.length) jobTypeIds.push(job.type);
                // Search all jobTypes' items
                const items = Item.find({ jobType: { $in: jobTypeIds }});
                return Promise.all([result[0], result[1], items])
            })
            .then((result: any) => {

                const job = result[0]
                const purchaseOrders = result[1]
                const items = result[2];

                if (!job) {
                    throw new Error('Invalid job id')
                    // return res.json({ 'status': Status.Error, 'message': 'Invalid job id' })
                }
                return new Promise((resolve, reject) => {
                    _populateInvoiceData(req, res, job, items, purchaseOrders, null, null, (req, res, invoiceData, currentInvoiceId )=>{

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
                                        resolve(invoice)
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
            .then((invoice: any) => {

                // Mark the job report as it has been invoiced
                return new Promise((resolve, reject) => {
                    JobReport.findOne({ job: invoice.job })
                        .then(async (jobReport: IJobReport) => {
                            if (jobReport) {
                                jobReport.invoiceCreated = true;
                                jobReport.invoice = invoice._id;
                                await jobReport.save();
                            }

                            resolve(invoice);
                        })
                })

            })
            .then((invoice: IInvoice) => {
                if (company.qbAuthorized) {
                    // Create new Invoice in QuickBooks
                    _createQBInvoice(req, res, company, invoice, (err, errMsg, qbInvoice) => {
                        if (err) {
                            return res.json({ status: err, message: errMsg })
                        }

                        if (qbInvoice) {
                            invoice.quickbookId = qbInvoice.Id;
                            invoice.save();

                            // If company's invoices already synced, update the synced date
                            if (company.qbSync?.invoicesSynced) {
                                company.qbSync.invoicesSyncedAt = new Date();
                                company.save();
                            }
                        }

                        return res.json({
                            status: Status.Success,
                            message: 'Job invoice created successfully.',
                            invoice,
                            quickbookInvoice: qbInvoice
                        });
                    })
                } else {
                    return res.json({ status: Status.Success, message: 'Job invoice created successfully.', invoice });
                }
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
                                        resolve(invoice)
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
            .then((invoice: IInvoice) => {
                if (company.qbAuthorized) {
                    // Create new Invoice in QuickBooks
                    _createQBInvoice(req, res, company, invoice, (err, errMsg, qbInvoice) => {
                        if (err) {
                            return res.json({ status: err, message: errMsg })
                        }

                        if (qbInvoice) {
                            invoice.quickbookId = qbInvoice.Id;
                            invoice.save();

                            // If company's invoices already synced, update the synced date
                            if (company.qbSync?.invoicesSynced) {
                                company.qbSync.invoicesSyncedAt = new Date();
                                company.save();
                            }
                        }

                        return res.json({
                            status: Status.Success,
                            message: 'Purchase order invoice created successfully.',
                            invoice,
                            quickbookInvoice: qbInvoice
                        });
                    })
                } else {
                    return res.json({ status: Status.Success, message: 'Purchase order invoice created successfully.', invoice });
                }
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
                                        resolve(invoice)
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
            .then((invoice: IInvoice) => {
                if (company.qbAuthorized) {
                    // Create new Invoice in QuickBooks
                    _createQBInvoice(req, res, company, invoice, (err, errMsg, qbInvoice) => {
                        if (err) {
                            return res.json({ status: err, message: errMsg })
                        }

                        if (qbInvoice) {
                            invoice.quickbookId = qbInvoice.Id;
                            invoice.save();

                            // If company's invoices already synced, update the synced date
                            if (company.qbSync?.invoicesSynced) {
                                company.qbSync.invoicesSyncedAt = new Date();
                                company.save();
                            }
                        }

                        return res.json({
                            status: Status.Success,
                            message: 'Estimate invoice created successfully.',
                            invoice,
                            quickbookInvoice: qbInvoice
                        });
                    })
                } else {
                    return res.json({ status: Status.Success, message: 'Estimate invoice created successfully.', invoice });
                }
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

                                        if (company.qbAuthorized) {
                                            // Create new Invoice in QuickBooks
                                            _createQBInvoice(req, res, company, newInvoice, (err, errMsg, qbInvoice) => {
                                                if (err) {
                                                    return res.json({ status: err, message: errMsg })
                                                }

                                                if (qbInvoice) {
                                                    newInvoice.quickbookId = qbInvoice.Id;
                                                    newInvoice.save();

                                                    // If company's invoices already synced, update the synced date
                                                    if (company.qbSync?.invoicesSynced) {
                                                        company.qbSync.invoicesSyncedAt = new Date();
                                                        company.save();
                                                    }
                                                }

                                                return res.json({
                                                    status: Status.Success,
                                                    message: 'Invoice created successfully.',
                                                    invoice: newInvoice,
                                                    quickbookInvoice: qbInvoice
                                                });
                                            })
                                        } else {
                                            return res.json({ status: Status.Success, message: 'Invoice created successfully.', invoice: newInvoice });
                                        }

                                    })
                            })
                    })
            })
        })
    }
}

const _populateInvoiceData = async (req: Request, res: Response, job: IJob, jobTypeitems: IItem[], purchaseOrders: any, purchaseOrder: any, estimate: any, next: (req: Request, res: Response, invoice: IInvoice, invoiceId: number) => void) =>{

    const params = req.body
    const company = <ICompany>req.company
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

    const invNumber = parseInt(params.invoiceNumber) || company.currentInvoiceId + 1 
    let invoiceId = company.invoicePrefix
        ? `Invoice ${company.invoicePrefix}-${invNumber}`
        : `Invoice ${invNumber}`;

    let taxAmount: number = 0;
    let charges: number = 0;
    let shippingCost: number = 0;
    let subTotalBeforeTax: number = 0
    let total: number = 0;
    let invoiceType: number = 0;
    let ticket: IServiceTicket;
    let customer : string
    let jobId : string
    // let hourlyRate: number = 0
    let timeSpent: number = 0
    let purchaseOrderId: string = null
    let estimateId: string = null
    // let isFixed: boolean = false
    // let taxPercentage: number = 0


    if (job) {
        charges = job.charges;
        invoiceType = 0
        customer = job.customer
        jobId = job._id

        await job.populate({ path: 'ticket' }).execPopulate();
        ticket = job.ticket;

        /**
         * Kris' remark (Jun 30th, 2021):
         * TODO: These commented lines are TO BE DEPRECATED,
         * because now job has multiple tasks with their own charge and timeSpent
         */
        // if (!jobTypeitem.isFixed && (params.hourlyRate == undefined && params.hourlyRate == null && params.hourlyRate == '""')) {
        //     return res.json({ 'status': Status.Error, 'message': 'Hourly rate is required' })
        // } else if (!jobTypeitem.isFixed) {
        //     hourlyRate = params.hourlyRate
        // }

        // Take the first job type's isFixed as all job types should be the same type
        // if (!jobTypeitems[0]?.isFixed && !params.timeSpent) {
        //     return res.json({ 'status': Status.Error, 'message': 'Time spent is required' })
        // } else if (!jobTypeitems[0]?.isFixed) {
        //     timeSpent = params.timeSpent
        // }
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

            // To handle any over-stringified strings
            if (!Array.isArray(items)) {
                items = JSON.parse(items);
            }
        } catch (error) {
            return res.json({ 'status': Status.Error, 'message': 'Items json is invalid' })
        }
    }

    let invoiceItems: any[] = []
    // Find Customer object to see the itemTier, customPrice, & payment term info
    const customerObj = await Customer.findById(customer).populate({ path: 'paymentTerm' });
    // Populate payment term from the company
    await company.populate({ path: 'paymentTerm' }).execPopulate();

    // Retrive payment term for this invoice
    let paymentTerm: IPaymentTerm;
    if (params.paymentTermId) {
        paymentTerm = await PaymentTerm.findOne({ _id: params.paymentTermId, isActive: true });
    }
    /**
     * Priority order: 1) User params 2) Customer default term 3) Company default term,
     * otherwise leave paymentTerm to be blank
     */
    paymentTerm = paymentTerm || <IPaymentTerm>customerObj?.paymentTerm || <IPaymentTerm>company?.paymentTerm;

    if (items.length > 0) {

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if ((!item.hasOwnProperty('item') || !item.hasOwnProperty('tax') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity') || !item.hasOwnProperty('isFixed')) && (!item.hasOwnProperty('name') || !item.hasOwnProperty('description') || !item.hasOwnProperty('tax') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity') || !item.hasOwnProperty('isFixed'))) {
                return res.json({ 'status': Status.Error, 'message': 'Items format is invalid' })
            }
            let obj: any = {}
            let price = parseFloat(item.price)
            let quantity = parseFloat(item.quantity)
            let itemTax = 0
            let itemTaxAmount: number = 0
            let subTotal = price * quantity

            if(item.tax > 0) {
                itemTax = parseFloat(item.tax)
                itemTaxAmount = subTotal * itemTax / 100;
                taxAmount += itemTaxAmount;
            }

            obj.quantity = item.quantity
            obj.price = Math.round(item.price * 100) / 100
            obj.isFixed = item.isFixed
            obj.tax = itemTax
            obj.taxAmount = Math.round(itemTaxAmount * 100) / 100
            obj.subTotal = Math.round(subTotal * 100) / 100

            if (item.item == undefined || item.item == null) {
                obj.name = item.name
                obj.description = item.description
            } else {
                obj.item = item.item
            }
            invoiceItems.push(obj)

            subTotalBeforeTax += subTotal;
            total += subTotal;
        }

    } else if (jobTypeitems.length > 0) {

        // Iterate all jobTypes' items and add all to invoice's items
        for (const jobTypeitem of jobTypeitems) {

            // Find the job task related to find its timeSpent
            const task = job.tasks.find(task => task.jobType.toString() === jobTypeitem.jobType.toString());
            let itemTier;

            if (customerObj.itemTier) {
                // Find the assigned itemTier of the customer
                itemTier = jobTypeitem.tiers.find(t => t.tier.toString() === customerObj.itemTier.toString());
            } else {
                // Take the first active tier of Item when customer doesn't have itemTier
                await jobTypeitem.populate({ path: 'tiers.tier' }).execPopulate();
                itemTier = jobTypeitem.tiers.find(t => {
                    const tier = <IPriceTier>t.tier;
                    return tier.isActive;
                });
            }

            let obj: any = {}
            // Set price to 0 if customer uses customPrice
            let price = customerObj.isCustomPrice ? 0 : itemTier?.charge || jobTypeitem.charges;
            // If item is hourly, take the task's timeSpent (minutes) for the quantity
            let quantity = jobTypeitem.isFixed ? 1 : (task?.timeSpent / 60) || 1;
            let itemTax =  0
            let itemTaxAmount: number = 0
            let subTotal = price * quantity

            if(jobTypeitem.tax > 0) {
                itemTax =  jobTypeitem.tax
                itemTaxAmount = subTotal * itemTax / 100;
                taxAmount += itemTaxAmount;
            }

            obj.quantity = Math.round(quantity * 100) / 100
            obj.price = Math.round(price * 100) / 100
            obj.isFixed = jobTypeitem.isFixed
            obj.tax = itemTax
            obj.taxAmount = Math.round(itemTaxAmount * 100) / 100
            obj.subTotal = Math.round(subTotal * 100) / 100
            obj.item = jobTypeitem._id

            invoiceItems.push(obj)

            timeSpent += task?.timeSpent || 0;
            subTotalBeforeTax += subTotal;
            total += subTotal;
        }

    }

    // Add the grand total with the tax amount
    total += taxAmount;

    /**
     * Check if invoice coming from Job and customer uses customPrice,
     * Use the customer customPrice's price as the grand total of invoice
     */
    if (jobTypeitems?.length > 0 && customerObj.isCustomPrice) {
        const customPrice = customerObj.customPrices?.find(cp => cp.quantity === jobTypeitems?.length);
        total = customPrice?.price || 0;
    }

    if (params.charges) {
        charges = parseFloat(params.charges);
        total += charges;
    }
    if (params.shippingCost) {
        shippingCost = parseFloat(params.shippingCost);
        total += shippingCost;
    }

    var invoice = new Invoice({
        invoiceId: invoiceId,
        invoiceType: invoiceType,
        job: jobId,
        purchaseOrder: purchaseOrderId,
        jobPurchaseOrders: purchaseOrderIds,
        issuedDate: params.issuedDate ? new Date(params.issuedDate) : Date.now(),
        dueDate: params.dueDate ? new Date(params.dueDate) : moment().add(paymentTerm?.dueDays ?? 30, 'd').valueOf(),
        isDraft: params.isDraft,
        paymentTerm,
        customerPO: params.customerPO ?? ticket?.customerPO,
        customerContactId: params.customerContactId ?? ticket?.customerContactId,
        vendorId: params.vendorId ?? customerObj.vendorId,
        customer: customer,
        company: req.companyId,
        note: params.note,
        charges: Math.round(charges * 100) / 100,
        shippingCost : Math.round(shippingCost * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        subTotal: Math.round(subTotalBeforeTax * 100) / 100,
        total: Math.round(total * 100) / 100,
        balanceDue: Math.round(total * 100) / 100,
        createdBy: user._id,
        createdAt: Date.now(),
        timeSpent: timeSpent,
        items: invoiceItems,
        estimate: estimateId,
        emailHistory: [],
        lastEmailSent: null
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
    const company = <ICompany>req.company;

    Invoice.findOne({'_id': params.invoiceId, 'company': req.companyId},
        async (err: any, invoice: IInvoice) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if(invoice == undefined || invoice == null) {
                return res.json({'status': Status.Success, 'message': "Invalid invoice id."})
            }

            // Find Customer object to see the itemTier, customPrice, * payment term info
            const customerObj = await Customer.findById(invoice.customer).populate({ path: 'paymentTerm' });
            // Populate payment term from the company
            await company.populate({ path: 'paymentTerm' }).execPopulate();

            // Retrieve payment term for this invoice
            let paymentTerm: IPaymentTerm;
            if (params.paymentTermId) {
                paymentTerm = await PaymentTerm.findOne({ _id: params.paymentTermId, isActive: true });
            }

            // Retrieve customer contact for this invoice
            let customerContact: IContact;
            if (params.customerContactId) {
                customerContact = await Contact.findById(params.customerContactId);
            }

            /**
             * Priority order: 1) User params 2) Customer default term 3) Company default term,
             * otherwise leave paymentTerm to be blank
             */
            paymentTerm = paymentTerm || <IPaymentTerm>customerObj?.paymentTerm || <IPaymentTerm>company?.paymentTerm;

            if(invoice.invoiceType == 0) {

                Job.findById(invoice.job)
                    .then((job : any) => {
                        if (job == undefined || job == null) {
                            throw new Error('job for this invoice is not found')
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
                        const issuedDate = params.issuedDate ? new Date(params.issuedDate) : invoice.issuedDate;
                        const dueDate = params.paymentTermId && paymentTerm
                            ? moment(issuedDate).add(paymentTerm?.dueDays, 'd').valueOf()
                            : params.dueDate
                                ? new Date(params.dueDate)
                                : issuedDate
                        // let tax: number = invoice.tax;
                        // let taxPercentage: number = invoice.taxPercentage;
                        let charges: number = invoice.charges;
                        let shippingCost: number = invoice.shippingCost;
                        let taxAmount: number = 0;
                        let subTotalBeforeTax: number = 0;
                        let total: number = 0;
                        let balanceDue = invoice.balanceDue;
                        let paymentApplied = invoice.paymentApplied;
                        let paid = invoice.paid;
                        let status = invoice.status;
                        const oldTotal = invoice.total;

                        // if ((params.tax != undefined && params.tax !== null && params.tax !== '""' && params.tax > 0) &&
                        //     (params.charges == undefined || params.charges == null || params.charges == '""' )) {

                        //     taxPercentage = params.tax
                        //     tax = (charges * params.tax) /100
                        //     total = charges + tax

                        // } else if ((params.charges != undefined && params.charges !== null && params.charges !== '""' ) &&
                        //     (params.tax == undefined || params.tax == null || params.tax == '""' )) {

                        //     tax = (params.charges * taxPercentage) / 100
                        //     charges = parseFloat(params.charges)
                        //     total = charges + tax

                        // }else{

                        //     // update tax and charges
                        //     charges = parseFloat(params.charges)
                        //     taxPercentage = params.tax
                        //     tax = (charges * params.tax) /100
                        //     total = charges + tax
                        // }

                        // invoice.tax = tax
                        // invoice.taxPercentage = taxPercentage
                        // invoice.charges = charges
                        // invoice.total = total

                        // if(!job.isFixed && (params.hourlyRate == undefined && params.hourlyRate == null && params.hourlyRate == '""' )) {
                        //     return res.json({ 'status': Status.Error, 'message': 'Hourly rate is required' })
                        // }else if(!job.isFixed){
                        //     invoice.hourlyRate = params.hourlyRate
                        // }

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

                        // total = invoice.total
                        var items: any = []
                        if (params.items != undefined) {
                            try {
                                items = JSON.parse(params.items);

                                // To handle any over-stringified strings
                                if (!Array.isArray(items)) {
                                    items = JSON.parse(items);
                                }
                            } catch (error) {
                                return res.json({ 'status': Status.Error, 'message': 'Items json is invalid' })
                            }
                        }

                        let invoiceItems: any[] = []

                        if (items.length > 0) {

                            for (let i = 0; i < items.length; i++) {
                                const item = items[i];
                                if ((!item.hasOwnProperty('item') || !item.hasOwnProperty('tax') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity') || !item.hasOwnProperty('isFixed')) && (!item.hasOwnProperty('name') || !item.hasOwnProperty('description') || !item.hasOwnProperty('tax') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity') || !item.hasOwnProperty('isFixed'))) {
                                    return res.json({ 'status': Status.Error, 'message': 'Items format is invalid' })
                                }
                                let obj: any = {}
                                let price = parseFloat(item.price)
                                let quantity = parseFloat(item.quantity)
                                let itemTax =  0
                                let itemTaxAmount: number = 0
                                let subTotal = price * quantity

                                if(item.tax > 0) {
                                    itemTax =  parseFloat(item.tax)
                                    itemTaxAmount = subTotal * itemTax / 100;
                                    taxAmount += itemTaxAmount;
                                }

                                obj.quantity = item.quantity
                                obj.price = Math.round(item.price * 100) / 100
                                obj.isFixed = item.isFixed
                                obj.tax = itemTax
                                obj.taxAmount = Math.round(itemTaxAmount * 100) / 100
                                obj.subTotal = Math.round(subTotal * 100) / 100

                                if (item.item == undefined || item.item == null) {
                                    obj.name = item.name
                                    obj.description = item.description
                                } else {
                                    obj.item = item.item
                                }
                                invoiceItems.push(obj)

                                subTotalBeforeTax += subTotal;
                                total += subTotal;
                            }
                        }

                        // Add the grand total with the tax amount
                        total += taxAmount;
                        balanceDue += (total - oldTotal);

                        // Check if invoice updated and several conditions met
                        if (balanceDue <= 0) {
                            /**
                             * Invoice updated to the point balanceDue paid off or even minus,
                             * if minus, will put the extra payment to cust's credit,
                             * then mark invoice as PAID
                             */
                            customerObj.credit += Math.abs(balanceDue);
                            paymentApplied = total;
                            balanceDue = 0;
                            status = InvoiceStatus.PAID;
                            paid = true;
                        } else {
                            /**
                             * Balance due still existed or even come back,
                             * make sure status goes to PARTIALLY PAID or UNPAID
                             */
                            status = paymentApplied > 0 ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.UNPAID;
                            paid = false;
                        }

                        /**
                         * Check if invoice coming from Job and customer uses customPrice,
                         * Use the customer customPrice's price as the grand total of invoice
                         */
                        if (job.tasks?.length > 0 && customerObj.isCustomPrice) {
                            const customPrice = customerObj.customPrices?.find(cp => cp.quantity === job.tasks?.length);
                            total = customPrice?.price || 0;
                        }

                        if (params.charges) {
                            charges = parseFloat(params.charges);
                            total += charges;
                        }
                        if(params.shippingCost){
                            shippingCost = parseFloat(params.shippingCost);
                            total += shippingCost;
                        }

                        invoice.updateOne({
                            jobPurchaseOrders: purchaseOrderIds,
                            items: invoiceItems,
                            shippingCost: Math.round(shippingCost * 100) / 100,
                            taxAmount: Math.round(taxAmount * 100) / 100,
                            subTotal: Math.round(subTotalBeforeTax * 100) / 100,
                            total: Math.round(total * 100) / 100,
                            balanceDue: Math.round(balanceDue * 100) / 100,
                            paymentApplied: Math.round(paymentApplied * 100) / 100,
                            status, paid,
                            charges, issuedDate, dueDate, note: params.note,
                            isDraft: params.isDraft,
                            paymentTerm: params.paymentTermId ? paymentTerm : undefined,
                            customerPO: params.customerPO,
                            customerContactId: customerContact,
                            vendorId: params.vendorId
                        }, { omitUndefined: true },

                            async (err: any) => {
                                if (err) {
                                    return res.json({ status: Status.Error, message: Messages.GenericError });
                                }

                                // Save the new credit of customer
                                await customerObj.save();

                                // Retrieve invoice after the update process
                                invoice = await Invoice.findById(invoice._id);

                                return res.json({ status: Status.Success, message: "Invoice updated successfully.", invoice });
                            })
                    })
                    .catch((error: any) => {
                        console.log('== error:', error);
                        return res.json({ status: Status.Error, message: error.message || Messages.GenericError });
                    })
            } else {

                if ((params.charges == undefined || params.charges == null || params.charges == '""' ) && (params.tax == undefined || params.tax == null || params.tax == '""' )) {
                    return res.json({'status': Status.Error, 'message': 'Tax Percentage or charges are required'})
                }
                const issuedDate = params.issuedDate ? new Date(params.issuedDate) : invoice.issuedDate;
                const dueDate = params.paymentTermId && paymentTerm
                    ? moment(issuedDate).add(paymentTerm?.dueDays, 'd').valueOf()
                    : params.dueDate
                        ? new Date(params.dueDate)
                        : issuedDate
                // let tax: number = invoice.tax;
                // let taxPercentage: number = invoice.taxPercentage;
                let charges: number = invoice.charges;
                let shippingCost: number = invoice.shippingCost;
                let taxAmount: number = 0;
                let subTotalBeforeTax: number = 0;
                let total: number = 0;
                let balanceDue = invoice.balanceDue;
                let paymentApplied = invoice.paymentApplied;
                let paid = invoice.paid;
                let status = invoice.status;
                const oldTotal = invoice.total;

                // if ((params.tax != undefined && params.tax !== null && params.tax !== '""' && params.tax > 0) &&
                //     (params.charges == undefined || params.charges == null || params.charges == '""' )) {

                //     taxPercentage = params.tax
                //     tax = (charges * params.tax) /100
                //     total = charges + tax

                // } else if ((params.charges != undefined && params.charges !== null && params.charges !== '""' ) &&
                //     (params.tax == undefined || params.tax == null || params.tax == '""' )) {

                //     tax = (params.charges * taxPercentage) / 100
                //     charges = parseFloat(params.charges)
                //     total = charges + tax

                // }else{

                //     charges = parseFloat(params.charges)
                //     taxPercentage = params.tax
                //     tax = (charges * params.tax) /100
                //     total = charges + tax
                // }

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

                        // To handle any over-stringified strings
                        if (!Array.isArray(items)) {
                            items = JSON.parse(items);
                        }
                    } catch (error) {
                        return res.json({ 'status': Status.Error, 'message': 'Items json is invalid' })
                    }
                }

                let invoiceItems: any[] = []

                if (items.length > 0) {

                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        if ((!item.hasOwnProperty('item') || !item.hasOwnProperty('tax') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity') || !item.hasOwnProperty('isFixed')) && (!item.hasOwnProperty('name') || !item.hasOwnProperty('description') || !item.hasOwnProperty('tax') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity') || !item.hasOwnProperty('isFixed'))) {
                            return res.json({ 'status': Status.Error, 'message': 'Items format is invalid' })
                        }
                        let obj: any = {}
                        let price = parseFloat(item.price)
                        let quantity = parseFloat(item.quantity)
                        let itemTax =  0
                        let itemTaxAmount: number = 0
                        let subTotal = price * quantity

                        if(item.tax > 0) {
                            itemTax =  parseFloat(item.tax)
                            itemTaxAmount = subTotal * itemTax / 100;
                            taxAmount += itemTaxAmount;
                        }

                        obj.quantity = item.quantity
                        obj.price = Math.round(item.price * 100) / 100
                        obj.isFixed = item.isFixed
                        obj.tax = itemTax
                        obj.taxAmount = Math.round(itemTaxAmount * 100) / 100
                        obj.subTotal = Math.round(subTotal * 100) / 100

                        if (item.item == undefined || item.item == null) {
                            obj.name = item.name
                            obj.description = item.description
                        } else {
                            obj.item = item.item
                        }
                        invoiceItems.push(obj)

                        subTotalBeforeTax += subTotal;
                        total += subTotal;
                    }
                }

                // Add the grand total with the tax amount
                total +=  taxAmount;
                balanceDue += (total - oldTotal);

                // Check if invoice updated and several conditions met
                if (balanceDue <= 0) {
                    /**
                     * Invoice updated to the point balanceDue paid off or even minus,
                     * if minus, will put the extra payment to cust's credit,
                     * then mark invoice as PAID
                     */
                    customerObj.credit += Math.abs(balanceDue);
                    paymentApplied = total;
                    balanceDue = 0;
                    status = InvoiceStatus.PAID;
                    paid = true;
                } else {
                    /**
                     * Balance due still existed or even come back,
                     * make sure status goes to PARTIALLY PAID or UNPAID
                     */
                    status = paymentApplied > 0 ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.UNPAID;
                    paid = false;
                }

                /**
                 * Check if invoice coming from Job and customer uses customPrice,
                 * Use the customer customPrice's price as the grand total of invoice
                 */
                if (invoice.items?.length > 0 && customerObj.isCustomPrice) {
                    const customPrice = customerObj.customPrices?.find(cp => cp.quantity === invoice.items?.length);
                    total = customPrice?.price || 0;
                }

                if (params.charges) {
                    charges = parseFloat(params.charges);
                    total += charges;
                }
                if(params.shippingCost){
                    shippingCost = parseFloat(params.shippingCost);
                    total += shippingCost;
                }

                invoice.updateOne({
                    items: invoiceItems,
                    charges: Math.round(charges * 100) / 100,
                    shippingCost: Math.round(shippingCost * 100) / 100,
                    taxAmount: Math.round(taxAmount * 100) / 100,
                    subTotal: Math.round(subTotalBeforeTax * 100) / 100,
                    total: Math.round(total * 100) / 100,
                    balanceDue: Math.round(balanceDue * 100) / 100,
                    paymentApplied: Math.round(paymentApplied * 100) / 100,
                    status, paid,
                    issuedDate, dueDate, note: params.note,
                    isDraft: params.isDraft,
                    paymentTerm: params.paymentTermId ? paymentTerm : undefined,
                    customerPO: params.customerPO,
                    customerContactId: customerContact,
                    vendorId: params.vendorId
                }, { omitUndefined: true },
                    async (err: any) => {
                        if (err) {
                            return res.json({ status: Status.Error, message: Messages.GenericError });
                        }

                        // Save the new credit of customer
                        await customerObj.save();

                        // Retrieve invoice after the update process
                        invoice = await Invoice.findById(invoice._id);

                        return res.json({ status: Status.Success, message: "Invoice updated successfully.", invoice });
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
                { path: 'customer', select: 'info.email auth.email profile.firstName profile.lastName profile.displayName address.street address.city address.state address.unit address.zipCode contact.phone contact.fax vendorId contactName contactEmail' },
                { path: 'technician', select: 'profile.displayName auth.email contact.phone permissions.role' },
                { path: 'contractor', select: 'info.companyName info.logoUrl info.companyEmail address contact.phone contact.fax', populate: { path: 'admin', select: 'profile.displayName auth.email contact.phone permissions.role' }},
                { path: 'ticket', populate: {path: 'ticket', populate: 'customerContactId' }},
                { path: 'jobLocation', select: 'name location address' },
                { path: 'jobSite', select: 'name location address' }
            ],
        })
        .populate({
            path: 'purchaseOrder',
            select: 'purchaseOrderId items equipment status estimate note total',
            populate: [
                { path: 'equipment', select: 'info maintenance type brand', populate: [ { path: 'type', select: 'title' }, { path: 'brand', select: 'title' }]},
                { path: 'items.part', select: 'name itemCode description totalQuantity availableQuantity cost price' }
            ]
        })
        .populate({
            path: 'paymentTerm',
            select: '-company -__v'
        })
        .populate({
            path: 'customerContactId',
            select: '-__v'
        })
        .populate({
            path: 'items.item',
            select: 'name isFixed charges tax',
            populate: [{path: 'jobType'}]
        })
        .populate({
            path: 'company',
            select: 'info.companyName info.logoUrl info.companyEmail permissions.role address.street address.city address.state address.zipCode contact.phone contact.fax'
        })
        .populate({
            path: 'customer',
            select: 'info.email auth.email profile.firstName profile.lastName profile.displayName address.street address.city address.state address.unit address.zipCode contact.phone contact.fax vendorId contactName contactEmail'
        })
        .populate({
            path: 'estimate',
            select: 'total items note status customer company createdAt createdBy'
        })
        .populate({
            path: 'createdBy',
            select: 'info.companyName auth.email profile.displayName permissions.role address contact.phone'
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
                .exec (async (err: any, scans: IScan[]) => {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    const payments = await Payment.find({
                        company: req.companyId,
                        invoice: invoice._id
                    });

                    return res.json({ status: Status.Success, invoice, scans, payments });
                })
        })
}

/**
 * Kris' Remark (Aug 30st, 2021):
 * TODO: To remove, this already been refactored below
 */
// export const sendInvoice = (req: Request, res: Response) => {
//     const params = req.body
//     const company = <ICompany>req.company;

//     // Check if invoiceId was a valid ObjectId
//     if (params.invoiceId && !ObjectId.isValid(params.invoiceId)) {
//         return res.json({ status: Status.Error, message: Messages.WrongId });
//     }

//     try {
//         Invoice.findOne({ _id: params.invoiceId, 'company': req.companyId})
//             .populate({
//                 path: 'customer',
//                 select: 'info.email auth.email profile.displayName address.street address.city address.state address.zipCode contact.phone contactName'
//             })
//             .then(async (invoice: IInvoice)=>{
//                 if (!invoice) {
//                     return res.json({'status': Status.Error, 'message': 'Invoice not found'})
//                 }

//                 const customer = <ICustomer>invoice.customer;

//                 sendInvoiceEmailToCustomer({
//                     companyName: company.info.companyName,
//                     companyEmail: company.info.companyEmail,
//                     customerName: customer.profile.displayName,
//                     customerEmail: customer.info.email,
//                     invoiceNumber: invoice.invoiceId,
//                     invoiceAmount: invoice.total,
//                 });

//                 // Update email history and last email sent info
//                 const sendingDate = new Date();
//                 invoice.emailHistory.push({
//                     sentTo: customer.info.email,
//                     sentAt: sendingDate
//                 });
//                 invoice.lastEmailSent = sendingDate;
//                 await invoice.save();

//                 return res.json({ status: Status.Success, message: 'Invoice has been sent successfully!' });
//             })

//     } catch (err) {
//         return res.json({'status': Status.Error, 'message': err.message});
//     }
// }

export const getInvoiceEmailTemplate = async (req: Request, res: Response) => {

    const params = req.query;
    const company = <ICompany>req.company;

    // Retrieve invoice and populate customer and paymentTerm info
    const invoice = await Invoice
        .findOne({ company, _id: params.invoiceId })
        .populate({
            path: 'customer',
            select: 'info.email auth.email profile.displayName address.street address.city address.state address.zipCode contact.phone contactName'
        })

    if (!invoice) {
        return res.json({ status: Status.Error, message: 'Invoice not found.' });
    }

    const customer = <ICustomer>invoice.customer;

    // Retrieve company email default
    const emailDefault = await EmailDefault.findOne({ company });

    /**
     * Transfrom the email default placeholder symbol to fit Javascript Template Literal,
     * '{{' become '${' & '}}' become '}'
     */
    await transformPlaceholders(emailDefault);

    // Get available placeholder values for Invoice email template
    const { company_name, company_email, customer_name, customer_email, invoice_number, invoice_amount, invoice_due_date } = await getPlaceholderValues(company, invoice, customer);

    return res.json({
        status: Status.Success,
        emailTemplate: {
            from: company_email,
            to: customer_email,
            subject: eval('`' + emailDefault.subject + '`'),
            message: eval('`' + emailDefault.message + '`')
        },
        invoice
    });

}

export const sendInvoiceEmail = async (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    // Retrieve invoice and populate customer and paymentTerm info
    const invoice = await Invoice
        .findOne({ company, _id: params.invoiceId })
        .populate({
            path: 'customer',
            select: 'info.email auth.email profile.displayName address.street address.city address.state address.zipCode contact.phone contactName'
        })
        .populate({
            path: 'paymentTerm',
            select: 'name dueDays'
        })

    if (!invoice) {
        return res.json({ status: Status.Error, message: 'Invoice not found.' });
    }

    const customer = <ICustomer>invoice.customer;
    const paymentTerm = <IPaymentTerm>invoice.paymentTerm;

    // Retrieve company email default
    const emailDefault = await EmailDefault.findOne({ company });

    // Call AWS SES method
    sendInvoiceEmailToCustomer({
        subject: params.subject ?? emailDefault?.subject,
        message: params.message ?? emailDefault?.message,
        sender_email: user.auth?.email,
        company_name: company.info?.companyName,
        company_email: company.info?.companyEmail,
        company_logo: company.info?.logoUrl,
        customer_name: customer.profile?.displayName,
        customer_email: customer.info?.email,
        invoice_number: invoice.invoiceId,
        invoice_amount: invoice.total,
        invoice_due_date: moment(invoice.dueDate).format('MMMM DD, YYYY'),
        invoice_pdf: req.file?.path,
        invoice_pdf_name: req.file?.originalname,
        term_name: paymentTerm?.name,
        term_due_days: paymentTerm?.dueDays
    });

    // Update email history and last email sent info
    const sendingDate = new Date();
    invoice.emailHistory.push({
        sentTo: customer.info?.email,
        sentAt: sendingDate
    });
    invoice.lastEmailSent = sendingDate;
    await invoice.save();

    return res.json({ status: Status.Success, message: 'Invoice has been sent successfully.' });

}

export const getInvoices = (req: Request, res: Response) => {

    Invoice.find({'company': req.companyId})
        .populate({
            path: 'job',
            populate: [
                { path: 'type', select: 'title' },
                { path: 'customer', select: 'info.email auth.email profile.firstName profile.lastName profile.displayName address.street address.city address.state address.unit address.zipCode contact.phone contact.fax vendorId contactName contactEmail' },
                { path: 'technician', select: 'profile.displayName auth.email contact.phone permissions.role' },
                { path: 'contractor', select: 'info.companyName info.logoUrl info.companyEmail address contact.phone contact.fax', populate: { path: 'admin', select: 'profile.displayName auth.email contact.phone permissions.role' }},
                { path: 'ticket', populate: {path: 'ticket', populate: 'customerContactId' }},
                { path: 'jobLocation', select: 'name location address' },
                { path: 'jobSite', select: 'name location address' }
            ],
        })
        .populate({
            path: 'purchaseOrder',
            select: 'purchaseOrderId items equipment status estimate note total',
            populate: [
                { path: 'equipment', select: 'info maintenance type brand', populate: [ { path: 'type', select: 'title' }, { path: 'brand', select: 'title' }]},
                { path: 'items.part', select: 'name itemCode description totalQuantity availableQuantity cost price' }
            ]
        })
        .populate({
            path: 'paymentTerm',
            select: '-company -__v'
        })
        .populate({
            path: 'customerContactId',
            select: '-__v'
        })
        .populate({
            path: 'items.item',
            select: 'name isFixed charges tax',
            populate: [{path: 'jobType'}]
        })
        .populate({
            path: 'company',
            select: 'info.companyName info.logoUrl info.companyEmail permissions.role address.street address.city address.state address.zipCode contact.phone contact.fax'
        })
        .populate({
            path: 'customer',
            select: 'info.email auth.email profile.firstName profile.lastName profile.displayName address.street address.city address.state address.unit address.zipCode contact.phone contact.fax vendorId contactName contactEmail'
        })
        .populate({
            path: 'estimate',
            select: 'total items note status customer company createdAt createdBy'
        })
        .populate({
            path: 'createdBy',
            select: 'info.companyName auth.email profile.displayName permissions.role address contact.phone'
        })
        .exec((err: any, invoices: IInvoice[])=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            return res.json({ 'status': Status.Success, 'invoices': invoices })
        })
}
export const getCompanyInvoices = (req: Request, res: Response) => {

    CompanyInvoice.find({'company': req.companyId})
        .populate('company')
        .exec((err: any, invoices: IInvoice[])=>{
            if (err) {
                return res.json({'status': Status.Error, 'message': err.message})
            }
            return res.json({ 'status': Status.Success, 'companyInvoices': invoices })
        });
}
export const getCompanyInvoiceDetails = (req: Request, res: Response) => {
    const companyInvoiceId = req.query.companyInvoiceId;
    CompanyInvoice.find({'company': req.companyId, _id: new ObjectId(companyInvoiceId)})
        .populate('company')
        .exec((err: any, invoices: IInvoice[])=>{
            if (err) {
                return res.json({'status': Status.Error, 'message': err.message})
            }
            return res.json({ 'status': Status.Success, 'companyInvoice': invoices })
        });
}
