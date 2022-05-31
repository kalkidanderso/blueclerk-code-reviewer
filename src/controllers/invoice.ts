import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment';
import fs from 'fs';
import pdfmake from 'pdfmake';
import * as http from 'http';
import * as https from 'https';
import * as helper from '../services/helper';
import { ContractorPermissions, DefaultCommission, DefaultPageSize, InvoiceStatus, Messages, Status } from '../common/constants';
import { IContact } from '../common/contact';
import { INVOICE_FONT_PATH, INVOICE_IMAGE_PATH, INVOICE_PDF_PATH } from '../common/config';
import { Contact } from '../models/Contact';
import { IUser, User } from '../models/User';
import { Company, ICompany } from '../models/Company';
import { ICompanyAdmin } from '../models/CompanyAdmin';
import { CompanyInvoice } from '../models/CompanyInvoice';
import { Customer, ICustomer } from '../models/Customer';
import { IItem, Item } from '../models/Item';
import { IPriceTier } from '../models/PriceTier';
import { IServiceTicket } from '../models/ServiceTicket';
import { IJob, ITaskJobType, Job } from '../models/Job';
import { IJobReport, JobReport } from '../models/JobReport';
import { IPurchaseOrder, PurchaseOrder } from '../models/PurchaseOrder';
import { Estimate, IEstimate } from '../models/Estimate';
import { IInvoicePrefix, InvoicePrefix } from '../models/InvoicePrefix';
import { IPaymentTerm, PaymentTerm } from '../models/PaymentTerm';
import { Payment } from '../models/Payment';
import { IInvoice, IQBInvoice, Invoice } from '../models/Invoice';
import { IScan, Scan } from '../models/Scan';
import { EmailDefault } from '../models/EmailDefault';

import { sendInvoiceEmailToCustomer } from '../services/aws';
import { _createQBInvoice, _deleteQBInvoice, _updateQBInvoice } from '../controllers/quickbook.invoice';
import { transformPlaceholders, getPlaceholderValues, _createCompanyDefaultEmail } from '../controllers/emailDefault';
import { IJobSite } from '../models/JobSite';
import { IJobLocation } from '../models/JobLocation';
import { IInvoiceCommission, InvoiceCommission } from '../models/InvoiceCommission';
import { getDatesFilterQuery } from 'src/services/pagination';

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

    Invoice.find({ 'company': req.companyId, customer: params.customerId })
        .populate({
            path: 'job',
            populate: [{
                path: 'type', select: 'title description sku'
            }, {
                path: 'customer', select: 'info.email auth.email profile.displayName contactName'
            }, {
                path: 'technician', select: 'profile.displayName auth.email contact.phone permissions.role'
            }, {
                path: 'tasks.technician', select: 'profile auth.email contact'
            }],
        })
        .populate({
            path: 'items.item',
            select: 'name description sku itemCode note cost price',
            populate: [{ path: 'jobType' }]
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
        .exec((err: any, invoices: IInvoice[]) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            return res.json({ 'status': Status.Success, 'invoices': invoices })
        })

}

export const setCustomInvoiceNumber = (req: Request, res: Response) => {

    const params = req.body
    const admin = <ICompanyAdmin>req.user
    var oldInvoicePrefix: string
    var newInvoicePrefix: string
    var oldInvoiceId: number

    if ((params.invoicePrefix == undefined || params.invoicePrefix === '""') && (params.invoiceNumber == undefined || params.invoiceNumber === '""')) {
        return res.json({ 'status': Status.Error, 'message': "Either prefix or work order number is required." })
    }

    Company.findById(admin.company,
        (err: any, company: ICompany) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (company == undefined || company == null) {
                return res.json({ 'status': Status.Error, 'message': 'No company found.' })
            }

            if (typeof params.invoicePrefix !== 'undefined' && params.invoicePrefix && (typeof params.invoiceNumber === 'undefined' && !params.invoiceNumber)) {

                if (params.invoicePrefix == company.invoicePrefix) {

                    return res.json({ 'status': Status.Success, 'message': "Invoice Prefix already set there." });
                }

                checkInvoicePrefixExists(req, res, (req: Request, res: Response, previousPrefix: IInvoicePrefix) => {

                    oldInvoicePrefix = company.invoicePrefix

                    company.updateOne({ 'invoicePrefix': params.invoicePrefix }, (err: any) => {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }


                        if (previousPrefix == null && oldInvoicePrefix != undefined) {

                            var prefix = new InvoicePrefix({
                                company: req.companyId,
                                prefix: oldInvoicePrefix,
                                maxInvoiceId: company.currentInvoiceId
                            })

                            prefix.save((err: any) => {
                                if (err) {
                                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                                }

                                return res.json({ 'status': Status.Success, 'message': "Prefix updated successfully." });
                            })

                        } else if (previousPrefix != null) {

                            previousPrefix.updateOne(
                                { 'prefix': oldInvoicePrefix, 'maxInvoiceId': company.currentInvoiceId },
                                (err: any) => {
                                    if (err) {
                                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                                    }

                                    return res.json({ 'status': Status.Success, 'message': "Prefix updated successfully." });
                                })
                        } else {
                            return res.json({ 'status': Status.Success, 'message': "Prefix updated successfully." });
                        }

                    })

                })
            } else if (typeof params.invoiceNumber !== 'undefined' && (typeof params.invoicePrefix === 'undefined' || !params.invoicePrefix)) {

                // if (company.currentInvoiceId > params.invoiceNumber) {
                //     return res.json({ 'status': Status.Success, 'message': "Invoice number can not be less then " + company.currentJobId });
                // }

                newInvoicePrefix = params.invoicePrefix == "" ? null : params?.invoicePrefix

                company.updateOne({ 'currentInvoiceId': params.invoiceNumber, 'invoicePrefix': newInvoicePrefix }, (err: any) => {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }
                    return res.json({ 'status': Status.Success, 'message': "Invoice number updated successfully." });
                })

            } else if ((typeof params.invoicePrefix !== 'undefined' && params.invoicePrefix) && (typeof params.invoiceNumber !== 'undefined')) {

                if (company.invoicePrefix == params.invoicePrefix) {

                    // if (company.currentJobId > params.invoiceNumber) {
                    //     return res.json({ 'status': Status.Success, 'message': "Invoice number can not be less then " + company.currentJobId });
                    // }

                    company.updateOne({ 'currentInvoiceId': params.invoiceNumber }, (err: any) => {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        return res.json({ 'status': Status.Success, 'message': "Invoice number updated successfully." });
                    })

                } else if (company.prefix != params.invoicePrefix) {
                    checkInvoicePrefixExists(req, res, (req: Request, res: Response) => {

                        oldInvoicePrefix = company.prefix
                        oldInvoiceId = company.currentJobId

                        company.updateOne({ 'invoicePrefix': params.invoicePrefix, 'currentInvoiceId': params.invoiceNumber }, (err: any) => {
                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                            }

                            if (prefix == null && oldInvoicePrefix != undefined) {
                                var prefix = new InvoicePrefix({
                                    company: req.companyId,
                                    prefix: oldInvoicePrefix,
                                    maxInvoiceId: oldInvoiceId
                                })
                                prefix.save((err: any) => {
                                    if (err) {
                                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                                    }

                                    return res.json({ 'status': Status.Success, 'message': "Prefix updated successfully." });
                                })
                            } else if (prefix != null) {
                                const invoicePrefix = <IInvoicePrefix>prefix

                                invoicePrefix.updateOne({ 'prefix': oldInvoicePrefix, 'maxInvoiceId': oldInvoiceId },
                                    (err: any) => {
                                        if (err) {
                                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                                        }

                                        return res.json({ 'status': Status.Success, 'message': "Prefix updated successfully." });
                                    })
                            } else {
                                return res.json({ 'status': Status.Success, 'message': "Prefix updated successfully." });
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
        { 'prefix': req.company.prefix, 'company': req.companyId },
        (err: any, invoicePrefix: IInvoicePrefix) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (invoicePrefix == undefined || invoicePrefix == null) {
                next(req, res, null)
                return

            } else {
                if (params.invoiceNumber != undefined && params.invoiceNumber !== null && params.invoiceNumber != '""') {
                    // if (invoicePrefix.maxInvoiceId > params.invoiceNumber) {
                    //     return res.json({ 'status': Status.Error, 'message': 'Invoice number with prefix ' + params.invoicePrefix + ' is not allowed. Try no greater then ' + invoicePrefix.maxInvoiceId })
                    // } else {
                    next(req, res, invoicePrefix)
                    //     return
                    // }

                } else if (invoicePrefix.maxInvoiceId > req.company.currentJobId) {
                    return res.json({ 'status': Status.Error, 'message': 'Current invoice number with prefix ' + params.invoicePrefix + ' is not allowed. Try no greater then ' + invoicePrefix.maxInvoiceId })

                } else {
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

            if (company == undefined || company == null) {
                return res.json({ 'status': Status.Error, 'message': 'No company found.' })
            }

            return res.json({ status: Status.Success, 'invoicePrefix': company.invoicePrefix, 'currentInvoiceNumber': company.currentInvoiceId });
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
                const jobTypeIds = [];
                job.tasks.forEach(task => {
                    task.jobTypes.forEach(taskJobType => {
                        jobTypeIds.push(taskJobType.jobType)
                    })
                })
                // const jobTypeIds = job.tasks.map(task => task.jobType);
                // Fallback for old job who still using one job type
                if (!jobTypeIds.length) jobTypeIds.push(job.type);
                // Search all jobTypes' items
                // const items = Item.find({ jobType: { $in: jobTypeIds }});
                const items: any[] = []
                jobTypeIds.forEach(async (jobTypeId) => {
                    const item = await Item.findOne({ jobType: jobTypeId })
                    items.push(item);
                });

                // const items = jobTypeIds.map(jobTypeId => Item.findOne({ jobType: jobTypeId }))
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
                    _populateInvoiceData(req, res, job, items, purchaseOrders, null, null, (req, res, invoiceData, currentInvoiceId) => {

                        invoiceData.save()
                            .then((newInvoice: IInvoice) => {
                                resolve({ latestInvoiceId: currentInvoiceId, invoice: newInvoice })
                            })
                            .catch(() => {
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
                        .catch(() => {
                            reject()
                        })
                })
            })
            .then((invoice: IInvoice) => {

                return new Promise(async (resolve, reject) => {

                    if (!invoice.isDraft) {
                        const customer = await Customer.findById(invoice.customer);
                        const job = await Job.findById(invoice.job);
                        customer.balance += invoice.total;
                        await customer.save();
                        const invoiceCommissionEntry = [];

                        if (job.tasks) {
                            const totalTechnician = job.tasks.length;
                            for (const task of job?.tasks) {
                                if (task.contractor) {
                                    const contractor = await Company.findOne({ _id: task.contractor });

                                    if (contractor) {
                                        const commission = (invoice.total / totalTechnician) * (contractor.commission ?? DefaultCommission.VENDOR_COMMISSION) / 100;
                                        const contractorCommissionEntry = {
                                            contractor: contractor._id,
                                            technician: contractor.admin,
                                            commission: contractor.commission,
                                            commissionAmount: Number(commission.toFixed(2))
                                        }

                                        contractor.balance += Number(commission.toFixed(2));
                                        contractor.save();

                                        invoiceCommissionEntry.push(contractorCommissionEntry);
                                    }
                                }

                                if (task.technician && !task.contractor) {
                                    const technician = await User.findOne({ _id: task.technician });

                                    if (technician) {
                                        const commission = (invoice.total / totalTechnician) * (technician.commission ?? DefaultCommission.EMPLOYEE_COMMISSION) / 100;
                                        const technicianCommissionEntry = {
                                            technician: technician._id,
                                            commission: technician.commission,
                                            commissionAmount: Number(commission.toFixed(2))
                                        }

                                        technician.balance += Number(commission.toFixed(2));
                                        technician.save();

                                        invoiceCommissionEntry.push(technicianCommissionEntry);
                                    }
                                }
                            }
                        }

                        let invoiceCommission = await InvoiceCommission.findOne({ invoice: invoice._id });
                        if (!invoiceCommission) {
                            invoiceCommission = await new InvoiceCommission({
                                invoice: invoice._id,
                                technicians: invoiceCommissionEntry
                            }).save();
                        } else {
                            invoiceCommission.technicians = invoiceCommissionEntry;
                            invoiceCommission.save();
                        }

                        invoice.commission = invoiceCommission._id;
                        await invoice.save();
                    }

                    resolve(invoice);
                })
            })
            .then((invoice: any) => {

                // Mark the job report as it has been invoiced
                return new Promise(async (resolve, reject) => {

                    const jobReport = await JobReport.findOne({ job: invoice.job });
                    if (jobReport) {
                        jobReport.invoiceCreated = true;
                        jobReport.invoice = invoice._id;
                        await jobReport.save();
                    }

                    resolve(invoice);
                })

            })
            .then((invoice: IInvoice) => {
                if (company.qbAuthorized && !invoice.isDraft) {
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
    else if (params.hasOwnProperty('purchaseOrderId') && params.purchaseOrderId != null && params.purchaseOrderId != '""') {

        Invoice.findOne({ 'purchaseOrder': params.purchaseOrderId, 'company': req.companyId })
            .then((invoice: IInvoice | null) => {
                if (invoice != undefined && invoice != null) {
                    throw new Error('Invoice already created for this purchase order')
                } else {
                    return PurchaseOrder.findById(params.purchaseOrderId)
                }

            })
            .then((purchaseOrder: IPurchaseOrder | null) => {
                if (purchaseOrder == undefined || purchaseOrder == null) {
                    throw new Error('Invalid purchase order id')
                }

                if (purchaseOrder.invoiceCreated) {
                    throw new Error('Invoice already created for this purchase order')
                }

                return new Promise((resolve, reject) => {
                    _populateInvoiceData(req, res, null, null, null, purchaseOrder, null, (req, res, invoiceData, currentInvoiceId) => {

                        invoiceData.save()
                            .then((newInvoice: IInvoice) => {
                                resolve({ latestInvoiceId: currentInvoiceId, invoice: newInvoice, purchaseOrderId: purchaseOrder._id })
                            })
                            .catch(() => {
                                reject('Unable to create invoice, please try again')
                            })

                    })
                })
            })
            .then((data: any) => {
                let invoiceId = data.latestInvoiceId + 1

                const companyUpdate = company.updateOne({ currentInvoiceId: invoiceId })
                const poUpdate = PurchaseOrder.updateOne({ _id: data.purchaseOrderId }, { invoiceCreated: true })

                return Promise.all([data.invoice, companyUpdate, poUpdate])
            })
            .then((response: any) => {

                const invoice = response[0]
                return new Promise(async (resolve, reject) => {

                    if (!invoice.isDraft) {
                        const customer = await Customer.findById(invoice.customer);
                        customer.balance += invoice.total;
                        await customer.save();
                    }

                    resolve(invoice);
                })
            })
            .then((invoice: IInvoice) => {
                if (company.qbAuthorized && !invoice.isDraft) {
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
    else if (params.hasOwnProperty('estimateId') && params.estimateId != null && params.estimateId != '""') {

        Invoice.findOne({ 'estimate': params.estimateId, 'company': req.companyId })
            .then((invoice: IInvoice | null) => {
                if (invoice != undefined && invoice != null) {
                    throw new Error('Invoice already created for this estimate')
                } else {
                    return Estimate.findById(params.estimateId)
                }

            })
            .then((estimate: IEstimate | null) => {
                if (estimate == undefined || estimate == null) {
                    throw new Error('Invalid estimate id')
                }

                if (estimate.invoiceCreated) {
                    throw new Error('Invoice already created for this estimate')
                }

                return new Promise((resolve, reject) => {
                    _populateInvoiceData(req, res, null, null, null, null, estimate, (req, res, invoiceData, currentInvoiceId) => {

                        invoiceData.save()
                            .then((newInvoice: IInvoice) => {
                                resolve({ latestInvoiceId: currentInvoiceId, invoice: newInvoice, estimateId: estimate._id })
                            })
                            .catch(() => {
                                reject('Unable to create invoice, please try again')
                            })

                    })
                })
            })
            .then((data: any) => {
                let invoiceId = data.latestInvoiceId + 1

                const companyUpdate = company.updateOne({ currentInvoiceId: invoiceId })
                const estimateUpdate = Estimate.updateOne({ _id: data.estimateId }, { invoiceCreated: true })

                return Promise.all([data.invoice, companyUpdate, estimateUpdate])
            })
            .then((response: any) => {

                const invoice = response[0]
                return new Promise(async (resolve, reject) => {

                    if (!invoice.isDraft) {
                        const customer = await Customer.findById(invoice.customer);
                        customer.balance += invoice.total;
                        await customer.save();
                    }

                    resolve(invoice);
                })
            })
            .then((invoice: IInvoice) => {
                if (company.qbAuthorized && !invoice.isDraft) {
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

        _populateInvoiceData(req, res, null, null, null, null, null, (req, res, invoiceData, currentInvoiceId) => {

            invoiceData.save((invoiceError: any, newInvoice: IInvoice,) => {
                if (invoiceError) {

                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                }

                company.updateOne({ currentInvoiceId: currentInvoiceId + 1 })
                    .exec(async (companyError: any) => {
                        if (companyError) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        if (!newInvoice.isDraft) {
                            const customer = await Customer.findById(newInvoice.customer);
                            customer.balance += newInvoice.total;
                            await customer.save();
                        }

                        if (company.qbAuthorized && !newInvoice.isDraft) {
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
    }
}

const _populateInvoiceData = async (req: Request, res: Response, job: IJob, jobTypeitems: IItem[], purchaseOrders: any, purchaseOrder: any, estimate: any, next: (req: Request, res: Response, invoice: IInvoice, invoiceId: number) => void) => {

    const params = req.body
    const company = <ICompany>req.company
    const user = <IUser>req.user

    let currentInvoiceId = 0;
    if (company.currentInvoiceId) {
        currentInvoiceId = company.currentInvoiceId
    }

    /* remove checking invoiceId with estimateId 
    if (company.currentEstimateId > company.currentInvoiceId) {
        currentInvoiceId = company.currentEstimateId
    } else if (company.currentInvoiceId > company.currentEstimateId) {
        currentInvoiceId = company.currentInvoiceId
    }
    */

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
    let customer: string
    let jobId: string
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
    }

    if (purchaseOrder != null) {
        if (purchaseOrder.total == undefined || purchaseOrder.total == null || purchaseOrder.total == '""') {
            return res.json({ 'status': Status.Error, 'message': 'purchaseOrder total is missing' })
        }
        if (purchaseOrder.customer == undefined || purchaseOrder.customer == null || purchaseOrder.customer == '""') {
            return res.json({ 'status': Status.Error, 'message': 'purchaseOrder customer is missing' })
        }

        purchaseOrderId = purchaseOrder._id
        charges = purchaseOrder.total
        customer = purchaseOrder.customer
        invoiceType = 1
    }

    if (estimate != null) {

        if (estimate.total == undefined || estimate.total == null || estimate.total == '""') {
            return res.json({ 'status': Status.Error, 'message': 'Estimate total is missing' })
        }
        if (estimate.customer == undefined || estimate.customer == null || estimate.customer == '""') {
            return res.json({ 'status': Status.Error, 'message': 'Estimate customer is missing' })
        }

        estimateId = estimate._id
        charges = estimate.total
        customer = estimate.customer
        invoiceType = 2

        let idOfEstimate = estimate.estimateId.replace('Estimate ', '')
        invoiceId = 'Invoice ' + idOfEstimate

        if (company.invoicePrefix != undefined && company.invoicePrefix != null && company.invoicePrefix == '""') {
            invoiceId = 'Invoice ' + company.invoicePrefix + '-' + idOfEstimate
        }
    }

    if (job == null && purchaseOrder == null && estimate == null) {

        if (params.customerId == undefined || params.customerId == null || params.customerId == '""') {
            return res.json({ 'status': Status.Error, 'message': 'customer is required' })
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

            if (item.tax > 0) {
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
                obj.name = item.name || item.item?.name
                obj.description = item.description || item.item?.description
            }
            invoiceItems.push(obj)

            subTotalBeforeTax += subTotal;
            total += subTotal;
        }

    } else if (jobTypeitems.length >= 0) {

        // Iterate all jobTypes' items and add all to invoice's items
        for (const jobTypeitem of jobTypeitems) {

            // Find the job task related to find its timeSpent
            let jobTypes: ITaskJobType
            const task = job.tasks.find(task => {
                jobTypes = <ITaskJobType>task.jobTypes.find(jobType => jobType.jobType.toString() === jobTypeitem.jobType.toString())
                return jobTypes;
            });
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
            let quantity = jobTypeitem.isFixed ? 1 : (jobTypes?.timeSpent / 60) || 1;
            let itemTax = 0
            let itemTaxAmount: number = 0
            let subTotal = price * quantity

            if (jobTypeitem.tax > 0) {
                itemTax = jobTypeitem.tax
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
            obj.name = jobTypeitem.name
            obj.description = jobTypeitem.description

            invoiceItems.push(obj)

            timeSpent += jobTypes?.timeSpent || 0;
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

    /**
     * Check if invoice coming from Job and customer has Discount Prices,
     * add the discount price based on the quantity of the invoice item
     */
    if (jobTypeitems?.length > 0 && customerObj.discountPrices?.length > 0) {
        // Sort the customer discount prices and filter any null prices
        let discountPrices = customerObj.discountPrices?.sort((a, b) => { return a.quantity - b.quantity });
        discountPrices = discountPrices.filter(disc => disc.discountItem);

        // Get the max quantity that should be discounted
        const maxDiscountQty = discountPrices[discountPrices.length - 1]?.quantity;
        const totalItemDiscounted = jobTypeitems.length > maxDiscountQty ? maxDiscountQty : jobTypeitems.length;

        // Find the discount item based on how many item that gonna be discounted
        const customerDiscount = customerObj.discountPrices?.find(disc => disc.quantity === totalItemDiscounted);
        const discountItem = await Item.findById(customerDiscount?.discountItem);

        if (discountItem) {
            const discountAmount = discountItem.charges ?? 0;
            const discountTaxAmount = discountItem.tax > 0 ? discountAmount * discountItem.tax / 100 : 0;
            const obj = {
                quantity: 1,
                price: Math.round(discountAmount * 100) / 100,
                isFixed: discountItem.isFixed,
                tax: discountItem.tax,
                taxAmount: Math.round(discountTaxAmount * 100) / 100,
                subTotal: Math.round(discountAmount * 100) / 100,
                item: discountItem._id,
                name: discountItem.name,
                description: discountItem.description
            };

            invoiceItems.push(obj);
            subTotalBeforeTax += discountAmount;
            // Take into account the tax amount from discount
            taxAmount += discountTaxAmount;
            // Deduct the grand total with the discount amount
            total += discountAmount;
            // Deduct the grand total with the discount tax amountD
            total += discountTaxAmount;
        }
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
        isDraft: params.isDraft ?? true,
        paymentTerm,
        customerPO: params.customerPO ?? ticket?.customerPO,
        customerContactId: params.customerContactId ?? ticket?.customerContactId,
        vendorId: params.vendorId ?? customerObj.vendorId,
        customer: customer,
        company: req.companyId,
        note: params.note,
        charges: Math.round(charges * 100) / 100,
        shippingCost: Math.round(shippingCost * 100) / 100,
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
                    note: params.note,
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

    Invoice.findOne({ '_id': params.invoiceId, 'company': req.companyId },
        async (err: any, invoice: IInvoice) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (invoice == undefined || invoice == null) {
                return res.json({ 'status': Status.Success, 'message': "Invalid invoice id." })
            }

            // Handle the stringify boolean value
            const isDraft = params.isDraft === undefined || params.isDraft === null
                ? invoice.isDraft
                : params.isDraft === 'false' || params.isDraft === '0'
                    ? false
                    : !!params.isDraft;

            if (isDraft && invoice.status !== InvoiceStatus.UNPAID) {
                return res.json({ status: Status.Error, message: 'Cannot update a PAID/PARTIALLY PAID invoce to become draft.' });
            }

            // Find Customer object to see the itemTier, customPrice, * payment term info
            const customerObj = await Customer.findById(invoice.customer).populate({ path: 'paymentTerm' });
            // Populate payment term from the company
            await company.populate({ path: 'paymentTerm' }).execPopulate();
            // Save the invoice old isDraft before it is replaced
            const oldIsDraft = invoice.isDraft;
            const oldTotalInvoice = invoice.total

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
            // paymentTerm = paymentTerm || <IPaymentTerm>customerObj?.paymentTerm || <IPaymentTerm>company?.paymentTerm;

            const invoiceId = params.invoiceNumber === undefined || params.invoiceNumber === null
                ? invoice.invoiceId
                : company.invoicePrefix
                    ? `Invoice ${company.invoicePrefix}-${params.invoiceNumber}`
                    : `Invoice ${params.invoiceNumber}`;

            if (invoice.invoiceType == 0) {

                Job.findById(invoice.job)
                    .then((job: any) => {
                        if (job == undefined || job == null) {
                            throw new Error('job for this invoice is not found')
                        }

                        const POPromise = PurchaseOrder.find({
                            job: invoice.job
                        })
                        return Promise.all([job, POPromise])
                    })
                    .then(async (result: any) => {
                        let job = result[0]
                        let purchaseOrders = result[1]

                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        if ((params.charges == undefined || params.charges == null || params.charges == '""') && (params.tax == undefined || params.tax == null || params.tax == '""')) {
                            return res.json({ 'status': Status.Error, 'message': 'Tax Percentage or charges are required' })
                        }
                        const issuedDate = params.issuedDate ? new Date(params.issuedDate) : invoice.issuedDate;
                        const dueDate = params.paymentTermId && paymentTerm
                            ? moment(issuedDate).add(paymentTerm?.dueDays, 'd').valueOf()
                            : params.dueDate
                                ? new Date(params.dueDate)
                                : issuedDate
                        let charges: number = invoice.charges;
                        let shippingCost: number = invoice.shippingCost;
                        let taxAmount: number = 0;
                        let subTotalBeforeTax: number = 0;
                        let total: number = 0;
                        let balanceDue = invoice.balanceDue ?? invoice.total;
                        let paymentApplied = invoice.paymentApplied ?? 0;
                        let paid = invoice.paid;
                        let status = invoice.status;
                        const oldTotal = invoice.total;

                        if (!job.isFixed && (params.timeSpent == undefined && params.timeSpent == null && params.timeSpent == '""')) {
                            return res.json({ 'status': Status.Error, 'message': 'Time spent is required' })
                        } else if (!job.isFixed) {
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
                                let itemTax = 0
                                let itemTaxAmount: number = 0
                                let subTotal = price * quantity

                                if (item.tax > 0) {
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

                                if (!item.item) {
                                    obj.name = item.name
                                    obj.description = item.description
                                } else {
                                    obj.item = item.item
                                    obj.name = item.name || item.item?.name
                                    obj.description = item.description || item.item?.description
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

                        // Update company and technician commission when charges is updated and invoice is not draft
                        if (!invoice.isDraft && invoice.job) {
                            const invoiceCommission = await InvoiceCommission.findOne({ invoice: invoice._id });

                            if (invoiceCommission.technicians) {
                                const totalTechnician = invoiceCommission.technicians.length;
                                for (const invoiceCommissionTechnician of invoiceCommission.technicians) {
                                    if (invoiceCommissionTechnician.contractor) {
                                        const contractor = await Company.findOne({ _id: invoiceCommissionTechnician.contractor }).exec();
                                        if (contractor) {
                                            if (Number(total) !== Number(oldTotalInvoice)) {
                                                const oldCommission = (oldTotal / totalTechnician) * (contractor.commission ?? DefaultCommission.VENDOR_COMMISSION) / 100;
                                                const commission = (total / totalTechnician) * (contractor.commission ?? DefaultCommission.VENDOR_COMMISSION) / 100;
                                                contractor.balance -= Number(oldCommission.toFixed(2));
                                                contractor.balance += Number(commission.toFixed(2));
                                                invoiceCommissionTechnician.commissionAmount = Number(commission.toFixed(2));
                                            }

                                            contractor.save();
                                            invoiceCommission.save();
                                        }
                                    }

                                    if (invoiceCommissionTechnician.technician && !invoiceCommissionTechnician.contractor) {
                                        const technician = await User.findOne({ _id: invoiceCommissionTechnician.technician }).exec();
                                        if (technician) {
                                            if (Number(total) !== Number(oldTotalInvoice)) {
                                                const oldCommission = (oldTotal / totalTechnician) * (technician.commission ?? DefaultCommission.EMPLOYEE_COMMISSION) / 100;
                                                const commission = (total / totalTechnician) * (technician.commission ?? DefaultCommission.EMPLOYEE_COMMISSION) / 100;
                                                invoiceCommissionTechnician.commissionAmount = Number(commission.toFixed(2));
                                                technician.balance -= Number(oldCommission.toFixed(2));
                                                technician.balance += Number(commission.toFixed(2));
                                            }

                                            technician.save();
                                            invoiceCommission.save();
                                        }
                                    }
                                }
                            }
                        }

                        if (params.charges) {
                            charges = parseFloat(params.charges);
                            total += charges;
                        }
                        if (params.shippingCost) {
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
                            isDraft,
                            paymentTerm: params.paymentTermId ? paymentTerm : undefined,
                            customerPO: params.customerPO,
                            customerContactId: customerContact,
                            vendorId: params.vendorId,
                            invoiceId
                        }, { omitUndefined: true },

                            async (err: any) => {
                                if (err) {
                                    return res.json({ status: Status.Error, message: Messages.GenericError });
                                }

                                // To handle the switch of Invoice isDraft
                                _handleDraftInvoiceAndSyncQB(req, res, company, customerObj, invoice, oldIsDraft, (invoice, qbInvoice) => {

                                    return res.json({ status: Status.Success, message: "Invoice updated successfully.", invoice, quickbookInvoice: qbInvoice });
                                });
                            })
                    })
                    .catch((error: any) => {
                        return res.json({ status: Status.Error, message: error.message || Messages.GenericError });
                    })
            } else {

                if ((params.charges == undefined || params.charges == null || params.charges == '""') && (params.tax == undefined || params.tax == null || params.tax == '""')) {
                    return res.json({ 'status': Status.Error, 'message': 'Tax Percentage or charges are required' })
                }
                const issuedDate = params.issuedDate ? new Date(params.issuedDate) : invoice.issuedDate;
                const dueDate = params.paymentTermId && paymentTerm
                    ? moment(issuedDate).add(paymentTerm?.dueDays, 'd').valueOf()
                    : params.dueDate
                        ? new Date(params.dueDate)
                        : issuedDate
                let charges: number = invoice.charges;
                let shippingCost: number = invoice.shippingCost;
                let taxAmount: number = 0;
                let subTotalBeforeTax: number = 0;
                let total: number = 0;
                let balanceDue = invoice.balanceDue ?? invoice.total;
                let paymentApplied = invoice.paymentApplied ?? 0;
                let paid = invoice.paid;
                let status = invoice.status;
                const oldTotal = invoice.total;

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
                        let itemTax = 0
                        let itemTaxAmount: number = 0
                        let subTotal = price * quantity

                        if (item.tax > 0) {
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

                        if (!item.item) {
                            obj.name = item.name
                            obj.description = item.description
                        } else {
                            obj.item = item.item
                            obj.name = item.name || item.item?.name
                            obj.description = item.description || item.item?.description
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
                if (invoice.items?.length > 0 && customerObj.isCustomPrice) {
                    const customPrice = customerObj.customPrices?.find(cp => cp.quantity === invoice.items?.length);
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
                    isDraft,
                    paymentTerm: params.paymentTermId ? paymentTerm : undefined,
                    customerPO: params.customerPO,
                    customerContactId: customerContact,
                    vendorId: params.vendorId,
                    invoiceId
                }, { omitUndefined: true },
                    async (err: any) => {
                        if (err) {
                            return res.json({ status: Status.Error, message: Messages.GenericError });
                        }

                        // To handle the switch of Invoice isDraft
                        _handleDraftInvoiceAndSyncQB(req, res, company, customerObj, invoice, oldIsDraft, (invoice, qbInvoice) => {

                            return res.json({ status: Status.Success, message: "Invoice updated successfully.", invoice, quickbookInvoice: qbInvoice });
                        });
                    })
            }
        });
}

export const getInvoiceDetail = (req: Request, res: Response) => {
    const params = req.body

    Invoice.findOne({ _id: params.invoiceId, 'company': req.companyId })
        .populate({
            path: 'job',
            populate: [
                { path: 'type', select: 'title description sku' },
                { path: 'tasks.jobTypes.jobType', select: 'title description sku' },
                { path: 'customer', select: 'info.email auth.email profile.firstName profile.lastName profile.displayName address.street address.city address.state address.unit address.zipCode contact.phone contact.fax vendorId contactName contactEmail' },
                { path: 'tasks.technician', select: 'profile.displayName auth.email contact.phone permissions.role' },
                { path: 'tasks.contractor', select: 'info.companyName info.logoUrl info.companyEmail address contact.phone contact.fax', populate: { path: 'admin', select: 'profile.displayName auth.email contact.phone permissions.role' } },
                { path: 'ticket', populate: { path: 'ticket', populate: 'customerContactId' } },
                { path: 'jobLocation', select: 'name location address' },
                { path: 'jobSite', select: 'name location address' }
            ],
        })
        .populate({
            path: 'purchaseOrder',
            select: 'purchaseOrderId items equipment status estimate note total',
            populate: [
                { path: 'equipment', select: 'info maintenance type brand', populate: [{ path: 'type', select: 'title' }, { path: 'brand', select: 'title' }] },
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
            select: 'name description sku isFixed charges tax',
            populate: [{ path: 'jobType' }]
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
        .exec((err: any, invoice: IInvoice) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (invoice == undefined || invoice == null) {
                return res.json({ 'status': Status.Error, 'message': 'Invalid invoice id' })
            }

            Scan.find({ job: invoice.job }, 'comment timeOfScan')
                .populate({
                    path: 'equipment',
                    select: 'info.model info.serialNumber info.nfcTag images info.location',
                    populate: [{ path: 'brand', select: 'title' }, { path: 'type', select: 'title' }],

                })
                .exec(async (err: any, scans: IScan[]) => {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    const payments = await Payment.find({
                        company: req.companyId,
                        $or: [
                            { invoice: invoice._id },
                            { 'line.invoice': invoice._id }
                        ]
                    });

                    return res.json({ status: Status.Success, invoice, scans, payments });
                })
        })
}

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
    let emailDefault = await EmailDefault.findOne({ company });

    // Create email default if company doesn't have one yet
    if (!emailDefault) {
        await _createCompanyDefaultEmail(company);
        emailDefault = await EmailDefault.findOne({ company });
    }

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
    // const { INVOICE_PDF_PATH } = process.env;
    const invoice = await Invoice
        .findOne({ company, _id: params.invoiceId })
        .populate({
            path: 'job',
            populate: [
                { path: 'type', select: 'title description sku' },
                { path: 'tasks.jobTypes.jobType', select: 'title description sku' },
                { path: 'customer', select: 'info.email auth.email profile.firstName profile.lastName profile.displayName address.street address.city address.state address.unit address.zipCode contact.phone contact.fax vendorId contactName contactEmail' },
                { path: 'tasks.technician', select: 'profile.displayName auth.email contact.phone permissions.role' },
                { path: 'tasks.contractor', select: 'info.companyName info.logoUrl info.companyEmail address contact.phone contact.fax', populate: { path: 'admin', select: 'profile.displayName auth.email contact.phone permissions.role' } },
                { path: 'ticket', populate: { path: 'ticket', populate: 'customerContactId' } },
                { path: 'jobLocation', select: 'name location address' },
                { path: 'jobSite', select: 'name location address' }
            ],
        })
        .populate({
            path: 'customer',
            select: 'info.email auth.email profile.displayName address contact contactName'
        })
        .populate({
            path: 'customerContactId',
            select: '-__v'
        })
        .populate({
            path: 'paymentTerm',
            select: '-company -__v'
        })
        .populate({
            path: 'items.item',
            select: 'name description sku isJobType isFixed charges tax',
            populate: [{ path: 'jobType' }]
        })

    if (!invoice) {
        return res.json({ status: Status.Error, message: 'Invoice not found.' });
    }

    const customer = <ICustomer>invoice.customer;
    const paymentTerm = <IPaymentTerm>invoice.paymentTerm;
    const customerContact = <IContact>invoice.customerContactId;

    // Retrieve company email default
    const filepath = req.file?.path ?? `${INVOICE_PDF_PATH}/${invoice.invoiceId}.pdf`;
    const emailDefault = await EmailDefault.findOne({ company });

    // Generate Invoice PDF
    await _generateInvoicePdf(company, invoice);

    let paramRecipients: string[];
    let recipientEmails: string[];
    let copyToMyself: boolean;
    try {
        // Handle the stringify array of recipients value
        if (params.recipients && !Array.isArray(params.recipients)) {
            paramRecipients = JSON.parse(params.recipients);
        }

        // Handle the stringify boolean value
        copyToMyself = params.copyToMyself
            ? params.copyToMyself === 'false' || params.copyToMyself === false
                ? false
                : !!params.copyToMyself
            : false;

        /**
         * Construct list of recipients if providef from FE,
         * othwerwise using customerContact or customer
         */
        recipientEmails = paramRecipients?.length > 0
            ? paramRecipients
            : [(customerContact?.email ?? customer?.info?.email)];

        // Add the user's email himself if he want to receive copy email
        if (copyToMyself) {
            recipientEmails.push(user.auth?.email);
        }
    } catch (error) {
        console.log('== Send Invoice Error:', error);
        return res.json({ status: Status.Error, message: Messages.GenericError });
    }

    // Call AWS SES method
    sendInvoiceEmailToCustomer({
        subject: params.subject ?? emailDefault?.subject,
        message: params.message ?? emailDefault?.message,
        sender_email: user.auth?.email,
        company_name: company.info?.companyName,
        company_email: company.info?.companyEmail,
        company_logo: company.info?.logoUrl,
        customer_name: customer.profile?.displayName,
        customer_email: customerContact?.email ?? customer?.info?.email,
        recipient_emails: recipientEmails,
        invoice_number: invoice.invoiceId,
        invoice_amount: invoice.total,
        invoice_due_date: moment(invoice.dueDate).format('MMMM DD, YYYY'),
        invoice_pdf: filepath,
        invoice_pdf_name: req.file?.originalname ?? `${invoice.invoiceId}.pdf`,
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

export const getInvoices = async (req: Request, res: Response) => {

    const params = req.body;
    let companyId = req.otherCompanyId || req.companyId;

    // Return error when all cursors are provided
    if (params.nextCursor && params.previousCursor) {
        return res.json({ status: Status.Error, message: 'Provided cursor could only be one of either nextCursor or previousCursor.' });
    }

    // Data query that used to search Invoices and available previous/next page
    const filterQuery: any = {
        $and: [{
            $or: [
                // { contractor: companyId },
                { company: companyId }
            ]
        }]
    };

    // Check and add if params filter provided
    if (params.keyword) {
        const keywordRegex = { $regex: params.keyword, $options: 'i' };
        filterQuery['$and'].push({
            $or: [
                { invoiceId: keywordRegex },
                { status: keywordRegex },
                { customerPO: keywordRegex },
                { vendorId: keywordRegex },
                { 'jobObj.jobId': keywordRegex },
                { 'customerObj.profile.displayName': keywordRegex },
                { 'jobLocationObj.name': keywordRegex },
                { 'jobLocationObj.address.street': keywordRegex },
                { 'jobLocationObj.address.city': keywordRegex },
                { 'jobSiteObj.name': keywordRegex },
                { 'jobSiteObj.address.street': keywordRegex },
                { 'jobSiteObj.address.city': keywordRegex },
                { 'technicianObj.profile.displayName': keywordRegex },
                { 'contractorsObj.info.companyName': keywordRegex },
            ]
        })
    }
    if (params.customerId) {
        filterQuery['$and'].push({ customer: new ObjectId(params.customerId) });
    }
    if (params.dueDate) {
        const dueDate = moment(params.dueDate).endOf('day').format();
        filterQuery['$and'].push({ dueDate: { $lte: new Date(dueDate) } });
    }
    if (params.status) {
        filterQuery['$and'].push({ status: { $in: JSON.parse(params.status) } });
    }
    if (params.isDraft !== undefined || params.isDraft !== null) {
        switch (params.isDraft) {
            case true:
                filterQuery['$and'].push({ isDraft: params.isDraft });
                break;

            default:
                /**
                 * For isDraft false, use the $ne because we want to retrieve old invoices,
                 * old invoices may don't have isDraft property at all
                 */
                filterQuery['$and'].push({ isDraft: { $ne: true } });
                break;
        }
    }
    if (params.startDate && params.endDate) {
        const startDate = moment(params.startDate).format('YYYY-MM-DD');
        const endDate = moment(params.endDate).format('YYYY-MM-DD');
        filterQuery['$and'].push({ createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } });
    }

    // Deep clone filterQuery
    const query: any = { $and: [] };
    filterQuery['$and'].map((q: any) => { query['$and'].push({ ...q }) });
    // Pagination query that default to nothing
    let paginationQuery = {};
    // Sort query that default to sort by the recent ones
    let sortQuery = { createdAt: -1, _id: -1 };

    if (params.nextCursor) {
        // Update pagination query to get the next page
        const cursor = JSON.parse(helper.fromCursorHash(params.nextCursor));
        const cursorId = ObjectId.isValid(cursor._id) ? new ObjectId(cursor._id) : null;
        paginationQuery = {
            $or: [
                { createdAt: { $lt: new Date(cursor.createdAt) } },
                { createdAt: new Date(cursor.createdAt), _id: { $lt: cursorId } }
            ]
        };
        query['$and'].push({ ...paginationQuery });
    }
    if (params.previousCursor) {
        // Update pagination query to get the previous page
        const cursor = JSON.parse(helper.fromCursorHash(params.previousCursor));
        const cursorId = ObjectId.isValid(cursor._id) ? new ObjectId(cursor._id) : null;
        paginationQuery = {
            $or: [
                { createdAt: { $gt: new Date(cursor.createdAt) } },
                { createdAt: new Date(cursor.createdAt), _id: { $gt: cursorId } }
            ]
        };
        query['$and'].push({ ...paginationQuery });
        // Getting previous page is special, we need to reverse the sort
        sortQuery = { createdAt: 1, _id: 1 };
    }

    // Construct aggreate lookups here to be used multiple times
    const aggregateLookups = [
        { $lookup: { from: 'jobs', localField: 'job', foreignField: '_id', as: 'jobObj' } },
        { $lookup: { from: 'users', localField: 'customer', foreignField: '_id', as: 'customerObj' } },
        { $lookup: { from: 'joblocations', localField: 'jobObj.jobLocation', foreignField: '_id', as: 'jobLocationObj' } },
        { $lookup: { from: 'jobsites', localField: 'jobObj.jobSite', foreignField: '_id', as: 'jobSiteObj' } },
        { $lookup: { from: 'users', localField: 'jobObj.tasks.technician', foreignField: '_id', as: 'technicianObj' } },
        { $lookup: { from: 'companies', localField: 'jobObj.tasks.contractor', foreignField: '_id', as: 'contractorsObj' } }
    ]

    // Filter jobs using aggregate to be search to another collection
    const invoicesAggregate: IInvoice[] = await Invoice.aggregate([
        ...aggregateLookups,
        { $match: { ...query } },
        { $project: { _id: 1, createdAt: 1 } },
        { $sort: sortQuery },
        { $limit: params.pageSize || DefaultPageSize }
    ]);
    // Map the Invoice IDs filtered
    const invoiceIds = invoicesAggregate.map((invoice) => invoice._id);

    Invoice.find({ _id: { $in: invoiceIds } })
        .sort({ ...sortQuery })
        .populate({
            path: 'job',
            populate: [
                { path: 'type', select: 'title description sku' },
                // TODO: To be deprecated
                { path: 'tasks.jobType', select: 'title description sku' },
                { path: 'tasks.jobTypes.jobType', select: 'title description sku' },
                { path: 'customer', select: 'info.email auth.email profile.firstName profile.lastName profile.displayName address.street address.city address.state address.unit address.zipCode contact.phone contact.fax vendorId contactName contactEmail' },
                // TODO: To be deprecated
                { path: 'technician', select: 'profile.displayName auth.email contact.phone permissions.role' },
                // TODO: To be deprecated
                { path: 'contractor', select: 'info.companyName info.logoUrl info.companyEmail address contact.phone contact.fax', populate: { path: 'admin', select: 'profile.displayName auth.email contact.phone permissions.role' } },
                { path: 'tasks.technician', select: 'profile.displayName auth.email contact.phone permissions.role' },
                { path: 'tasks.contractor', select: 'info.companyName info.logoUrl info.companyEmail address contact.phone contact.fax', populate: { path: 'admin', select: 'profile.displayName auth.email contact.phone permissions.role' } },
                { path: 'ticket', populate: { path: 'ticket', populate: 'customerContactId' } },
                { path: 'jobLocation', select: 'name location address' },
                { path: 'jobSite', select: 'name location address' }
            ],
        })
        .populate({
            path: 'purchaseOrder',
            select: 'purchaseOrderId items equipment status estimate note total',
            populate: [
                { path: 'equipment', select: 'info maintenance type brand', populate: [{ path: 'type', select: 'title' }, { path: 'brand', select: 'title' }] },
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
            select: 'name description sku isFixed charges tax',
            populate: [{ path: 'jobType' }]
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
        .exec(async (err: any, invoices: IInvoice[]) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            // Because we reverse sort for previous page, we need to revert it back
            if (params.previousCursor) {
                invoices = invoices.reverse();
            }

            /**
             * Get all total invoices count
             */
            const totalInvoices = await Invoice.aggregate([
                ...aggregateLookups,
                { $match: { ...filterQuery } },
                { $count: 'count' }
            ])

            /**
             * Check if next page is available
             */
            let nextCursor = { createdAt: invoices[invoices.length - 1]?.createdAt, _id: invoices[invoices.length - 1]?._id };
            // Deep clone filterQuery
            const nextPageQuery: any = { $and: [] };
            filterQuery['$and'].map((q: any) => { nextPageQuery['$and'].push({ ...q }) });
            // To be added with the pagination for the previous page
            nextPageQuery['$and'].push({
                $or: [
                    { createdAt: { $lt: new Date(nextCursor.createdAt) } },
                    { createdAt: new Date(nextCursor.createdAt), _id: { $lt: nextCursor._id } }
                ]
            });
            const isNextPage = await Invoice.aggregate([
                ...aggregateLookups,
                { $match: { ...nextPageQuery } },
                { $project: { _id: 1, createdAt: 1 } },
                { $sort: { createdAt: -1, _id: -1 } },
                { $limit: 1 }
            ]);

            /**
             * Check if previous page is availabe
             */
            let previousCursor = { createdAt: invoices[0]?.createdAt, _id: invoices[0]?._id };
            // Deep clone filterQuery
            const previousPageQuery: any = { $and: [] };
            filterQuery['$and'].map((q: any) => { previousPageQuery['$and'].push({ ...q }) });
            // To be added with the pagination for the previous page
            previousPageQuery['$and'].push({
                $or: [
                    { createdAt: { $gt: new Date(previousCursor.createdAt) } },
                    { createdAt: new Date(previousCursor.createdAt), _id: { $gt: previousCursor._id } }
                ]
            });
            const isPreviousPage = await Invoice.aggregate([
                ...aggregateLookups,
                { $match: { ...previousPageQuery } },
                { $project: { _id: 1, createdAt: 1 } },
                { $sort: { createdAt: 1, _id: 1 } },
                { $limit: 1 }
            ]);

            return res.json({
                status: Status.Success,
                invoices,
                total: totalInvoices[0]?.count,
                pagination: {
                    nextCursor: isNextPage.length ? helper.toCursorHash(JSON.stringify(nextCursor)) : null,
                    previousCursor: isPreviousPage.length ? helper.toCursorHash(JSON.stringify(previousCursor)) : null,
                    pageSize: params.pageSize || null
                },
                // sort: {
                //     by: params.sortBy,
                //     order: params.sortOrder
                // }
            });
        })

}

export const getCompanyInvoices = (req: Request, res: Response) => {

    CompanyInvoice.find({ 'company': req.companyId })
        .populate('company')
        .exec((err: any, invoices: IInvoice[]) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': err.message })
            }
            return res.json({ 'status': Status.Success, 'companyInvoices': invoices })
        });
}
export const getCompanyInvoiceDetails = (req: Request, res: Response) => {
    const companyInvoiceId = req.query.companyInvoiceId;
    CompanyInvoice.find({ 'company': req.companyId, _id: new ObjectId(companyInvoiceId) })
        .populate('company')
        .exec((err: any, invoices: IInvoice[]) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': err.message })
            }
            return res.json({ 'status': Status.Success, 'companyInvoice': invoices })
        });
}


/**
 * ===================================
 * =====[ PRIVATE METHODS BELOW ]=====
 * ===================================
 */

/**
 * To handle the switch of Invoice isDraft,
 * Add or deduct customer balance,
 * Create, update, or remove QB Invoice
 */
const _handleDraftInvoiceAndSyncQB = async (req: Request, res: Response, company: ICompany, customer: ICustomer, invoice: IInvoice, oldIsDraft: boolean, next: (invoice: IInvoice, qbInvoice: IQBInvoice) => void) => {

    // Retrieve the latest invoice
    invoice = await Invoice.findById(invoice._id);

    if (oldIsDraft && !invoice.isDraft) {
        /**
         * Update & switch from DRAFT to ACTIVE invoice
         */

        // Add customer balance
        const balance = customer.balance + invoice.total;
        Customer.findByIdAndUpdate(customer._id, { balance }).exec();

        const techniciansEntry = []
        if (invoice.job) {
            const invoiceCommission = await InvoiceCommission.findOne({ invoice: invoice._id })
            if (invoiceCommission) {
                if (invoiceCommission?.technicians) {
                    const totalTechnician = invoiceCommission.technicians.length;
                    for (const invoiceCommissionTechnician of invoiceCommission.technicians) {
                        if (invoiceCommissionTechnician.contractor) {
                            const contractor = await Company.findOne({ _id: invoiceCommissionTechnician.contractor }).exec();
                            const commission = (invoice.total / totalTechnician) * (contractor.commission ?? DefaultCommission.VENDOR_COMMISSION) / 100;
                            const contractorBalance = contractor.balance + Number(commission.toFixed(2));
                            await Company.findByIdAndUpdate(invoiceCommissionTechnician.contractor, { balance: contractorBalance }).exec();
                            await InvoiceCommission.findByIdAndUpdate(invoiceCommissionTechnician.contractor, { commissionAmount: Number(commission.toFixed(2)) }).exec();
                        }

                        if (invoiceCommissionTechnician.technician && !invoiceCommissionTechnician.contractor) {
                            const technician = await User.findOne({ _id: invoiceCommissionTechnician.technician }).exec();
                            const commission = (invoice.total / totalTechnician) * (technician.commission ?? DefaultCommission.EMPLOYEE_COMMISSION) / 100;
                            const technicianBalance = technician.balance + Number(commission.toFixed(2));
                            await User.findByIdAndUpdate(invoiceCommissionTechnician.technician, { balance: technicianBalance }).exec();
                            await InvoiceCommission.findByIdAndUpdate(invoiceCommissionTechnician.technician, { commissionAmount: Number(commission.toFixed(2)) }).exec();
                        }
                    }
                }
            } else {
                // Add new invoice commission when invoice haven't invoice commission
                const job = await Job.findById(invoice.job);
                if (job.tasks) {
                    const totalTechnician = job.tasks.length;
                    for (const task of job?.tasks) {
                        if (task.contractor) {
                            const contractor = await Company.findOne({ _id: task.contractor }).exec();
                            const commission = (invoice.total / totalTechnician) * (contractor.commission ?? DefaultCommission.VENDOR_COMMISSION) / 100;
                            const contractorEntry = {
                                contractor: contractor._id,
                                technician: contractor.admin,
                                commission: contractor.commission,
                                commissionAmount: Number(commission.toFixed(2))
                            }

                            if (contractor) {
                                contractor.balance += Number(commission.toFixed(2));
                                contractor.save();
                            }

                            techniciansEntry.push(contractorEntry);
                        }

                        if (task.technician && !task.contractor) {
                            const technician = await User.findOne({ _id: task.technician }).exec();
                            const commission = (invoice.total / totalTechnician) * (technician.commission ?? DefaultCommission.EMPLOYEE_COMMISSION) / 100;
                            const invoiceTechnicianEntry: any = {
                                technician: technician._id,
                                commission: technician.commission,
                                commissionAmount: Number(commission.toFixed(2))
                            }

                            if (technician) {
                                technician.balance += Number(commission.toFixed(2));
                                technician.save();
                            }

                            techniciansEntry.push(invoiceTechnicianEntry);
                        }
                    }
                }

                const commissionInvoice = await new InvoiceCommission({
                    invoice: invoice._id,
                    technicians: techniciansEntry
                }).save();

                invoice.commission = commissionInvoice._id;
                await invoice.save();
            }
        }

        const jobReport = await JobReport.findOne({ job: invoice.job });
        if (jobReport) {
            jobReport.invoiceCreated = true;
            jobReport.invoice = invoice._id;
            jobReport.save();
        }

        // Create QB Invoice
        if (company.qbAuthorized) {
            // Create new Invoice in QuickBooks
            _createQBInvoice(req, res, company, invoice, (err, errMsg, qbInvoice) => {
                if (qbInvoice) {
                    invoice.quickbookId = qbInvoice.Id;
                    invoice.save();

                    // If company's invoices already synced, update the synced date
                    if (company.qbSync?.invoicesSynced) {
                        company.qbSync.invoicesSyncedAt = new Date();
                        company.save();
                    }
                }

                return next(invoice, qbInvoice);
            })
        } else {
            return next(invoice, null);
        }

    } else if (!oldIsDraft && invoice.isDraft) {
        /**
         * Update & switch from ACTIVE to DRAFT invoice
         */

        // Deduct customer balance
        const balance = customer.balance -= invoice.total;
        Customer.findByIdAndUpdate(customer._id, { balance }).exec();

        if (invoice.job && invoice.commission) {
            const invoiceCommission = await InvoiceCommission.findOne({ invoice: invoice._id })
            if (invoiceCommission.technicians) {
                const totalTechnician = invoiceCommission.technicians.length;
                for (const invoiceCommissionTechnician of invoiceCommission?.technicians) {
                    if (invoiceCommissionTechnician.contractor) {
                        const contractor = await Company.findOne({ _id: invoiceCommissionTechnician.contractor }).exec();
                        if (contractor) {
                            const commission = (invoice.total / totalTechnician) * (contractor.commission ?? DefaultCommission.VENDOR_COMMISSION) / 100;
                            const contractorBalance = contractor.balance - Number(commission.toFixed(2));
                            await Company.findByIdAndUpdate(invoiceCommissionTechnician.contractor, { balance: contractorBalance }).exec();
                        }
                    }

                    if (invoiceCommissionTechnician.technician && !invoiceCommissionTechnician.contractor) {
                        const technician = await User.findOne({ _id: invoiceCommissionTechnician.technician }).exec();
                        if (technician) {
                            const commission = (invoice.total / totalTechnician) * (technician.commission ?? DefaultCommission.EMPLOYEE_COMMISSION) / 100;
                            const technicianBalance = technician.balance - Number(commission.toFixed(2));
                            await User.findByIdAndUpdate(invoiceCommissionTechnician.technician, { balance: technicianBalance }).exec();
                        }
                    }
                }
            }
        }

        // Remove Job Report invoice
        const jobReport = await JobReport.findOne({ job: invoice.job });
        if (jobReport) {
            jobReport.invoiceCreated = false;
            jobReport.invoice = null;
            jobReport.save();
        }

        if (company.qbAuthorized && invoice.quickbookId) {
            // Delete Invoice in QuickBooks
            _deleteQBInvoice(req, res, company, invoice, (err, errMsg, status) => {
                if (status === 'Deleted') {
                    invoice.quickbookId = null;
                    invoice.save();

                    // If company's invoices already synced, update the synced date
                    if (company.qbSync?.invoicesSynced) {
                        company.qbSync.invoicesSyncedAt = new Date();
                        company.save();
                    }
                }

                return next(invoice, null);
            })
        } else {
            return next(invoice, null);
        }

    } else if (!oldIsDraft && !invoice.isDraft) {
        /**
         * Invoice is not DRAFT,
         * only save the customer as on the previous code,
         * customer credit already processed & calculated
         */

        // Save customer credit
        customer.save()

        if (company.qbAuthorized && invoice.quickbookId) {
            // Update Invoice in QuickBooks
            _updateQBInvoice(req, res, company, invoice, (err, errMsg, qbInvoice) => {
                if (qbInvoice) {
                    // If company's invoices already synced, update the synced date
                    if (company.qbSync?.invoicesSynced) {
                        company.qbSync.invoicesSyncedAt = new Date();
                        company.save();
                    }
                }

                return next(invoice, qbInvoice);
            })
        } else {
            return next(invoice, null);
        }

    } else {
        /**
         * Invoice remains DRAFT,
         * nothing to do
         */

        return next(invoice, null);
    }

}

export const _generateInvoicePdf = async (company: ICompany, invoice: IInvoice) => {

    // const { INVOICE_FONT_PATH, INVOICE_IMAGE_PATH, INVOICE_PDF_PATH } = process.env;

    // await downloadFontToPath(INVOICE_FONT_PATH);
    const fonts = {
        Roboto: {
            normal: `${INVOICE_FONT_PATH}/Roboto-Regular.ttf`,
            bold: `${INVOICE_FONT_PATH}/Roboto-Medium.ttf`,
            italics: `${INVOICE_FONT_PATH}/Roboto-Thin.ttf`,
            bolditalics: `${INVOICE_FONT_PATH}/Roboto-MediumItalic.ttf`,
        }
    };

    // Initialize PDF Make
    const pdfMake = new pdfmake(fonts);

    // Retrieve invoice populated or detailed data
    const customer = <ICustomer>invoice.customer;
    const paymentTerm = <IPaymentTerm>invoice.paymentTerm;
    const job = <IJob>invoice.job;
    const ticket = <IServiceTicket>job?.ticket;
    const customerContact = <IContact>invoice.customerContactId;

    // Construct Company Address object
    const companyAddress = {
        street: company.address?.street ? `${company.address?.street}` : '',
        city: company.address?.city ? `, ${company.address?.city}` : '',
        state: company.address?.state ? `, ${company.address?.state}` : '',
        zipCode: company.address?.zipCode ? `, ${company.address?.zipCode}` : '',
    }

    // Construct Customer Address object
    const customerAddress = {
        street: customer?.address?.street ? `${customer?.address?.street}` : '',
        city: customer?.address?.city ? `, ${customer?.address?.city}` : '',
        state: customer?.address?.state ? `, ${customer?.address?.state}` : '',
        zipCode: customer?.address?.zipCode ? `, ${customer?.address?.zipCode}` : '',
    }

    // Construct default Job Service Address and Job Site Address object
    const jobAddress: any = { ...customerAddress };
    const jobSiteAddress: any = { ...customerAddress };

    let serviceAddress = {
        text: [
            { text: "JOB ADDRESS", style: "smallFont", alignment: "left" },
            { text: `\n${jobAddress.street}${jobAddress.city}${jobAddress.state}${jobAddress.zipCode}`, style: "defaultFont" }
        ],
        rowSpan: 2
    }
    let jobSiteServiceAddress = {};

    if (job) {
        // Take Job Location address if any
        const jobLocation = <IJobLocation>job.jobLocation;
        if (jobLocation) {
            jobAddress.name = `\n${jobLocation?.name}` ?? '';
            jobAddress.street = jobLocation?.address?.street ?? '';
            jobAddress.city = jobAddress.street && jobLocation?.address?.city ? ', ' : '';
            jobAddress.city += jobLocation?.address?.city ?? '';
            jobAddress.state = (jobAddress.street || jobAddress.city) && jobLocation?.address?.state ? ', ' : '';
            jobAddress.state += jobLocation?.address?.state ?? '';
            jobAddress.zipCode = (jobAddress.street || jobAddress.city || jobAddress.state) && jobLocation?.address?.zipcode ? ', ' : '';
            jobAddress.zipCode += jobLocation?.address?.zipcode ?? '';

            serviceAddress = {
                text: [
                    { text: "JOB ADDRESS", style: "smallFont", alignment: "left" },
                    { text: `${jobAddress.name}`, style: "defaultFontBold" },
                    { text: `\n${jobAddress.street}${jobAddress.city}${jobAddress.state}${jobAddress.zipCode}`, style: "defaultFont" }
                ],
                rowSpan: 2
            }
        }

        // Take Job Site address if any
        const site = <IJobSite>job.jobSite;
        if (site) {
            jobSiteAddress.name = `\n${site?.name}` ?? '';
            jobSiteAddress.street = site?.address?.street ?? '';
            jobSiteAddress.city = jobSiteAddress.street && site?.address?.city ? ', ' : '';
            jobSiteAddress.city += site?.address?.city ?? '';
            jobSiteAddress.state = (jobSiteAddress.street || jobSiteAddress.city) && site?.address?.state ? ', ' : '';
            jobSiteAddress.state += site?.address?.state ?? '';
            jobSiteAddress.zipCode = (jobSiteAddress.street || jobSiteAddress.city || jobSiteAddress.state) && site?.address?.zipcode ? ', ' : '';
            jobSiteAddress.zipCode += site?.address?.zipcode ?? '';

            // If Job Site exist, add additional information for Job Location
            serviceAddress = {
                text: [
                    { text: "SUBDIVISION", style: "smallFont", alignment: "left" },
                    { text: `${jobAddress.name}`, style: "defaultFontBold" },
                    { text: `\n${jobAddress.street}${jobAddress.city}${jobAddress.state}${jobAddress.zipCode}`, style: "defaultFont" }
                ],
                rowSpan: 2
            }

            // Job Site Address still shown as Service Address but shifted below
            jobSiteServiceAddress = {
                text: [
                    { text: "JOB ADDRESS", style: "smallFont", alignment: "left" },
                    { text: `${jobSiteAddress.name}`, style: "defaultFontBold" },
                    { text: `\n${jobSiteAddress.street}${jobSiteAddress.city}${jobSiteAddress.state}${jobSiteAddress.zipCode}`, style: "defaultFont" }
                ],
                rowSpan: 2
            }
        }
    }

    // Construct default Company Logo image
    let companyImage: any = {
        text: '',
        fillColor: '#cccccc'
    }

    if (company.info?.logoUrl) {
        // Check and download Company Logo to /tmp file
        await downloadFileToPath(company, company.info.logoUrl, INVOICE_IMAGE_PATH);

        companyImage = {
            image: 'companyLogo',
            width: 67,
            height: 52,
        }
    }

    // Construct Contact Details text
    let contactDetails = {
        text: `${!customerContact?.phone ? ' ' : customerContact?.phone + '\n'} ${customerContact?.email ?? ''}`, fontSize: 6, bold: true
    };

    // Construct the header for the Invoice Items
    const table: any = {
        headerRows: 1,
        widths: [44, 202, 40, 86, 40, 86, 35],
        body: [
            [
                { text: '', fillColor: "#eaecf3", lineColor: "#ffffff" },
                {
                    text: "SERVICE/PRODUCT",
                    style: "smallFont",
                    fillColor: "#eaecf3",
                    lineColor: "#ffffff",
                    alignment: "left"
                },
                {
                    text: 'QUANTITY',
                    style: 'smallFont',
                    fillColor: '#eaecf3',
                    alignment: "center"
                },
                {
                    text: 'PRICE',
                    style: "smallFont",
                    fillColor: '#eaecf3',
                    alignment: "center"
                },
                {
                    text: "TAX",
                    style: "smallFont",
                    fillColor: "#eaecf3",
                    alignment: "center",
                },
                {
                    text: "AMOUNT",
                    style: "smallFont",
                    fillColor: "#eaecf3",
                    alignment: "right",
                },
                { fillColor: "#eaecf3", text: "" },
            ],
        ],
    }

    // Add Invoice's Items to table template
    const bodyTable: any = [];
    invoice.items.forEach(item => {
        const itemPopulated = <IItem>item.item;
        const itemName = [{ text: `${item.name ?? itemPopulated?.name ?? ''}`, style: "defaultFontBold", alignment: "left" }, { text: `${item.description ?? itemPopulated?.description ?? ''}`, style: "defaultFont", alignment: "left" }];
        const itemQuantity = [{ text: " ", style: "defaultFontBold", alignment: "center" }, { text: item.quantity, style: "defaultFont", alignment: "center" }];
        const itemPrice = [{ text: " ", style: "defaultFontBold", alignment: "center" }, { text: `$${item.price}`, style: "defaultFont", alignment: "center" }];
        const itemTax = [{ text: " ", style: "defaultFontBold", alignment: "center" }, { text: item.tax === 0 ? 'No' : `Yes`, style: "defaultFont", alignment: "center" }];
        const itemSubTotal = [{ text: " ", style: "defaultFontBold", alignment: "right" }, { text: `$${item.subTotal}`, style: "defaultFont", alignment: "right" }];

        bodyTable.push([
            {},
            itemName,
            itemQuantity,
            itemPrice,
            itemTax,
            itemSubTotal,
            {}
        ]);
    });

    bodyTable.push([{}, {}, {}, {}, {}, {}, {}]);
    for (let i = 0; i < bodyTable.length; i++) {
        table.body.push(bodyTable[i]);
    }

    // INITIALIZE INVOICE PDF TEMPLATE
    const docDefinition: any = {
        pageSize: "A4",
        pageMargins: [0, 0, 50, 0],
        content: [
            {
                table: {
                    headerRows: 1,
                    widths: [48, 67, 100, 370],
                    body: [
                        [{}, {}, {}, {}],
                        [
                            {},
                            companyImage,
                            [{
                                text: `${company.info?.companyName}`,
                                fontSize: 8,
                                alignment: "left",
                                bold: true,
                            }, {
                                text: `\n${company.contact?.phone ?? ''}\n${company.info?.companyEmail ?? ''}\n${companyAddress.street}${companyAddress.city}${companyAddress.state}${companyAddress.zipCode}`,
                                style: "defaultFont",
                            }],
                            [{ text: '\n\nVendor Number:', style: 'smallFont' }, { text: invoice.vendorId ?? 'No vendor found', style: 'defaultFont', bold: true }],
                        ],
                        [{}, {}, {}, {}],
                    ],
                },
                fillColor: '#EAECF3',
                layout: 'noBorders'
            },
            {
                table: {
                    headerRows: 2,
                    widths: [48, 110, 85, 70, 63, 50, 74, 70],
                    body: [
                        [
                            {},
                            {},
                            {},
                            {},
                            {},
                            { text: 'INVOICE', fontSize: 15, bold: true, colSpan: 2, alignment: 'right' },
                            {},
                            {}
                        ],
                        [{}, {}, {}, {}, {}, {}, {}, {}],
                        [
                            {},
                            {
                                text: "BILL TO",
                                italics: true,
                                fontSize: 5,
                                lineHeight: 1.2,
                            },
                            {},
                            {
                                text: "INVOICE #:",
                                style: "smallFont",
                                alignment: "right",
                            },
                            {
                                text: `${invoice.invoiceId}`,
                                style: "defaultFont",
                            },
                            {
                                text: "INVOICE DATE:",
                                style: "smallFont",
                                alignment: "right",
                            },
                            {
                                text: `${moment(invoice.createdAt).format('MMM. DD, YYYY')}`,
                                style: "defaultFont",
                                alignment: "right",
                            },
                            {},
                        ],
                        [
                            {},
                            {
                                text: customer?.profile?.displayName, fontSize: 8, bold: true
                            },
                            {},
                            {
                                text: "CUSTOMER PO: ",
                                style: "smallFont",
                                alignment: "right",
                            },
                            { text: invoice.customerPO ?? 'N/A', style: "defaultFont" },
                            { text: "DUE DATE:", style: "smallFont", alignment: "right" },
                            { text: moment(invoice.dueDate).format('MMM. DD, YYYY'), style: "defaultFont", alignment: "right" },
                            {}
                        ],
                        [
                            {},
                            [
                                { text: !customer?.contact?.phone ? '\n' : `\n${customer.contact.phone}`, style: "defaultFont" },
                                { text: `${customerAddress.street}${customerAddress.city}${customerAddress.state}${customerAddress.zipCode}`, style: "defaultFont" }
                            ],
                            { ...serviceAddress },
                            {},
                            {},
                            { text: "TERMS:", style: "smallFont", alignment: "right" },
                            { text: paymentTerm?.name ?? "", style: "defaultFont", alignment: "right" },
                            {}
                        ],
                        [{}, {}, {}, {}, {}, {}, {}, {}],
                        [
                            {},
                            [
                                { text: "CONTACT DETAILS", style: "smallFont" },
                                { text: `${customerContact?.name ?? ''}`, fontSize: 6, bold: true },
                                { text: `${!customerContact?.phone ? ' ' : customerContact?.phone + '\n'} ${customerContact?.email ?? ''}`, fontSize: 6, bold: true },
                            ],
                            { ...jobSiteServiceAddress },
                            { text: "\nTOTAL", fontSize: 5, rowSpan: 4, colSpan: 2, fillColor: "#D0D3DC" },
                            {},
                            { text: "", colSpan: 2, fillColor: "#D0D3DC" },
                            {},
                            {},
                        ],
                        [
                            {},
                            {},
                            {},
                            {},
                            {},
                            {
                                text: `\n$${invoice.total}`,
                                fontSize: 16, rowSpan: 3, colSpan: 2, fillColor: "#D0D3DC", alignment: 'right', lineHeight: 0.1
                            },
                            {},
                            {}
                        ],
                        [
                            {},
                            [
                                { text: "NOTE", style: "smallFont" },
                                { text: `${ticket?.note ?? ''}`, fontSize: 6, bold: true },
                            ],
                            {},
                            {},
                            {},
                            {},
                            {},
                            {}
                        ],
                        [{}, {}, {}, {}, {}, {}, {}, {}],
                    ],
                },
                fillColor: '#EAECF3',
                layout: 'noBorders'
            },
            {
                table,
                layout: {
                    hLineWidth: function (i: number, node: { table: { body: string | any[]; }; }) {
                        return i === 0 || i === node.table.body.length ? 0 : 1;
                    },
                    vLineWidth: function (i: number, node: { table: { widths: string | any[]; }; }) {
                        return i === 0 || i === node.table.widths.length ? 0 : 1;
                    },
                    vLineColor: function (i: number, node: { table: { widths: string | any[]; }; }) {
                        return i === 0 || i === node.table.widths.length ? "black" : "white";
                    },
                    hLineColor: function (i: number, node: { table: { body: string | any[]; }; }) {
                        return i === 0 || i === node.table.body.length
                            ? "#d0d3dc"
                            : "#eeeeee";
                    },
                },
            },
            {
                table: {
                    headerRows: 1,
                    widths: [48, 120, 10, 201, 137, 35],
                    body: [
                        [
                            {},
                            {
                                text: "SUBTOTAL",
                                style: "defaultFont",
                                fillColor: "#eaecf3",
                                lineColor: "#ffffff",
                                alignment: "left"
                            },
                            {
                                text: "",
                                fillColor: "#eaecf3"
                            },
                            {
                                text: "TAX",
                                style: "defaultFont",
                                fillColor: "#eaecf3",
                                lineColor: "#ffffff",
                                alignment: "left"
                            },
                            { fillColor: "#d0d3dc", text: 'TOTAL', style: "defaultFont", alignment: 'right' },
                            {},
                        ],
                        [
                            {},
                            {
                                text: `$${invoice.subTotal}`,
                                fillColor: "#eaecf3",
                                fontSize: 20,
                                alignment: "left"
                            },
                            {
                                text: `+`,
                                fillColor: "#eaecf3",
                                fontSize: 15,
                                alignment: "left"
                            },
                            {
                                text: `$${invoice.taxAmount}`,
                                fillColor: "#eaecf3",
                                fontSize: 20,
                                alignment: "left"
                            },
                            {
                                text: `$${invoice.total}`,
                                fillColor: "#d0d3dc",
                                fontSize: 20,
                                alignment: "right"
                            },
                            {},
                        ]
                    ],
                },
                layout: 'noBorders'
            }
        ],
        styles: {
            header: {
                fontSize: 18,
                bold: true,
            },
            bigger: {
                fontSize: 15,
                italics: true,
            },
            subheader: {
                fontSize: 15,
                bold: true,
            },
            quote: {
                italics: true,
            },
            smallFont: {
                italics: true,
                fontSize: 5,
                lineHeight: 1.2,
            },
            defaultFont: {
                bold: false,
                fontSize: 6,
                weight: 100,
                lineHeight: 1.2,
            },
            defaultFontBold: {
                bold: true,
                fontSize: 6,
                weight: 100,
                lineHeight: 1.2,
            },
            tableFont: {
                bold: false,
                fontSize: 16,
                weight: 100,
                lineHeight: 1.2,
            },
            tableHeader: {
                bold: true,
                fontSize: 13,
                color: "black",
            },
        },
        defaultStyle: {
            columnGap: 10,
            font: "Roboto",
        },
        images: {
            companyLogo: `${INVOICE_IMAGE_PATH}/${company.info.companyName.replace(/\s+/g, '').toLowerCase()}.jpg`
        },
    };

    return new Promise((resolve) => {
        const fullPath = `${INVOICE_PDF_PATH}/${invoice.invoiceId}.pdf`;
        // Check if folder path exist, create if not
        if (!fs.existsSync(INVOICE_PDF_PATH)) {
            fs.mkdirSync(INVOICE_PDF_PATH);
        }
        // Check if existing Invoice PDF exist, remove if any
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }

        const pdfDoc = pdfMake.createPdfKitDocument(docDefinition);
        const writeStream = fs.createWriteStream(fullPath);
        pdfDoc.pipe(writeStream);
        pdfDoc.end();
        writeStream.on('finish', resolve)
    })

}

// Check and download Company Logo to /tmp file
export const downloadFileToPath = async (
    company: ICompany,
    sourceUrl: string,
    absoluteTargetPath: string,
) => {

    const filename = company.info.companyName.replace(/\s+/g, '').toLowerCase();
    const fullPath = `${absoluteTargetPath}/${filename}.jpg`;
    if (!fs.existsSync(absoluteTargetPath)) {
        fs.mkdirSync(absoluteTargetPath);
    }
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath)
    }
    const file = fs.createWriteStream(fullPath);
    return new Promise((resolve) => {
        const protocol = sourceUrl.startsWith('https') ? https : http;
        protocol.get(sourceUrl, (res) => {
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(true);
                return;
            });
        })
    })

}

/**
 * @description Checks if a file exists on specified path
 */
export const fileExists = async (absolutePath: string): Promise<boolean> => {
    return fs.existsSync(absolutePath);
}

export const updateCommission = async (req: Request, res: Response) => {

    const params = req.body;
    let commissionBalance = 0;

    switch (params.type) {
        case 'vendor':
            const contractor = await Company.findById(params.id).exec();
            if (!contractor) {
                return res.json({ status: Status.Error, message: 'Vendor not found' });
            }

            // Update vendor's commission rate
            contractor.commission = params.commission ?? null;

            // Find if vendor already have invoice commission
            const contractorInvoiceCommissions = await InvoiceCommission.find({ 'technicians.contractor': contractor._id }).populate('invoice').exec();
            if (contractorInvoiceCommissions.length) {
                // Iterate all invoice commissions 
                for (const invoiceCommission of contractorInvoiceCommissions) {
                    const invoice = <IInvoice>invoiceCommission.invoice;
                    const totalTechnician = invoiceCommission?.technicians?.length;
                    const contractorCommission = invoiceCommission?.technicians?.find(technician => technician?.contractor?.toString() === contractor._id?.toString());
                    if (!contractorCommission) {
                        continue;
                    }

                    if (!contractorCommission.paid) {
                        /**
                         * If invoice commission is not been paid,
                         * update the amount with the new rate
                         */
                        contractorCommission.commission = params.commission ?? null;
                        const commissionAmount = (invoice.total / totalTechnician) * (params.commission ?? 0) / 100;
                        contractorCommission.commissionAmount = Number(commissionAmount.toFixed(2));
                    }

                    // Recalculate vendor open balance
                    commissionBalance += contractorCommission.commissionAmount;
                    await invoiceCommission.save();
                }
            }

            // Update vendor balance and save vendor object
            contractor.balance = commissionBalance;
            await contractor.save();

            return res.json({ status: Status.Success, message: 'Commission updated successfully', contractor });

        case 'employee':
            const employee = await User.findById(params.id).exec();
            if (!employee) {
                return res.json({ status: Status.Error, message: 'Employee not found' });
            }

            // Update employee's commission rate
            employee.commission = params.commission ?? null;

            // Find if employee already have invoice commission
            const employeeInvoiceCommissions = await InvoiceCommission.find({ 'technicians.technician': employee._id }).populate('invoice').exec();
            if (employeeInvoiceCommissions.length) {
                // Iterate all invoice commissions 
                for (const invoiceCommission of employeeInvoiceCommissions) {
                    const invoice = <IInvoice>invoiceCommission.invoice;
                    const totalTechnician = invoiceCommission?.technicians?.length;
                    const employeeCommission = invoiceCommission.technicians?.find(technician => technician?.technician?.toString() === employee._id?.toString());
                    if (!employeeCommission) {
                        continue;
                    }

                    if (!employeeCommission.paid) {
                        /**
                         * If invoice commission is not been paid,
                         * update the amount with the new rate
                         */
                        employeeCommission.commission = params.commission ?? null;
                        const commissionAmount = (invoice.total / totalTechnician) * (params.commission ?? 0) / 100;
                        employeeCommission.commissionAmount = Number(commissionAmount.toFixed(2));
                    }

                    // Recalculate employee open balance
                    commissionBalance += employeeCommission.commissionAmount;
                    await invoiceCommission.save();
                }
            }

            // Update employee balance and save employee object
            employee.balance = commissionBalance;
            await employee.save();

            return res.json({ status: Status.Success, message: 'Commission updated successfully', employee });

        default:
            return res.json({ status: Status.Success, message: 'Type not supported. Available Type to be used: vendor or employee.' });
    }

}

export const getInvoicesByContractor = async (req: Request, res: Response) => {

    let jobQuery, query: any;
    const params = req.query;
    const company = <ICompany>req.company;
    const startDate = moment(params.startDate).startOf('day').utcOffset(params.offset ?? '', true).utc().format();
    const endDate = moment(params.endDate).endOf('day').utcOffset(params.offset ?? '', true).utc().format();

    if (params.startDate && params.endDate) {
        query = { issuedDate: { $gte: startDate, $lte: endDate } }
    }

    if (params.name) {
        // find to note or vendorId
        query.$or = [
            { note: { $regex: params.name, $options: 'i' } },
            { vendorId: { $regex: params.name, $options: 'i' } },
            { invoiceId: { $regex: params.name, $options: 'i' } },
        ]
    }

    if (!params.id) {
        return res.json({ status: Status.Error, message: 'Id is required when type is vendor' });
    }

    switch (params.type) {
        case 'vendor':
            jobQuery = { company, 'tasks.contractor': params.id }
            break;

        case 'employee':
            jobQuery = { company, 'tasks.technician': params.id };
            break;

        default:
            return res.json({ status: Status.Error, message: 'Type is required' });
    }

    const jobs = await Job.find(jobQuery).exec();
    const jobIds = jobs.map(job => job._id);
    const invoices = await Invoice.find({ company: req.companyId, job: { $in: jobIds }, ...query })
        .populate({
            path: 'job',
            populate: [{
                path: 'type', select: 'title description sku'
            }, {
                path: 'customer', select: 'info.email auth.email profile.displayName contactName'
            }, {
                path: 'technician', select: 'profile.displayName auth.email contact.phone permissions.role'
            }, {
                path: 'tasks.technician', select: 'profile auth.email contact'
            }],
        })
        .populate({
            path: 'items.item',
            select: 'name description sku itemCode note cost price',
            populate: [{ path: 'jobType' }]
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
        }).exec();

    if (!invoices) {
        return res.json({ status: Status.Success, invoices: '' });
    }

    return res.json({ status: Status.Success, invoices });

}