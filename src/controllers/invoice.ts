import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment';
import fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as helper from '../services/helper';
import {
    ContractorPermissions,
    DefaultCommission,
    DefaultPageSize,
    InvoiceStatus,
    Messages,
    Status
} from '../common/constants';
import { IContact } from '../common/contact';
import { FONT_SETS, INVOICE_FONT_PATH, INVOICE_IMAGE_PATH, INVOICE_PDF_PATH } from '../common/config';
import { Layouts, Styles } from '../common/constants.pdf';
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
import { Payment, PaymentCustomer } from '../models/Payment';
import { IInvoice, IQBInvoice, Invoice } from '../models/Invoice';
import { IScan, Scan } from '../models/Scan';
import { EmailDefault, EmailTypes } from '../models/EmailDefault';

import { sendInvoiceEmailToCustomer, uploadFileInS3 } from '../services/aws';
import { _checkQBCustomerJobLocation } from '../controllers/quickbook.customer';
import { _createQBInvoice, _deleteQBInvoice, _updateQBInvoice, _voidQBInvoice } from '../controllers/quickbook.invoice';
import { transformPlaceholders, getPlaceholderValues, _createCompanyDefaultEmail } from '../controllers/emailDefault';
import * as InvoiceLogController from '../controllers/invoiceLogs';
import { IJobSite, JobSite } from '../models/JobSite';
import { IJobLocation, JobLocation } from '../models/JobLocation';
import { IInvoiceCommission, InvoiceCommission } from '../models/InvoiceCommission';
import { ICommissionHistory, CommissionHistory } from '../models/CommissionHistory';
import { getDatesFilterQuery } from '../services/pagination';
import { v4 as uuidv4 } from 'uuid';
import { ICompanyLocation } from '../models/CompanyLocation';
import * as Sentry from '@sentry/node';
import axios from 'axios';
import { JobCommission } from '../models/JobCommission';
import { IJobCosting } from '../models/JobCosting';
import { logType } from 'src/models/invoiceLogs';
import { userInfo } from 'os';

const pdfmake = require('pdfmake');

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

};

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
        .populate({ path: 'jobLocation', select: 'name address location' })
        .populate({ path: 'jobSite', select: 'name address location' })
        .populate({ path: 'customerContactId', select: 'name phone email' })
        .populate({
            path: 'estimate',
            select: 'total items note status customer company createdBy'
        })
        .exec((err: any, invoices: IInvoice[]) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            return res.json({ 'status': Status.Success, 'invoices': invoices });
        });

};

export const setCustomInvoiceNumber = (req: Request, res: Response) => {

    const params = req.body;
    const admin = <ICompanyAdmin>req.user;
    let oldInvoicePrefix: string;
    let newInvoicePrefix: string;
    let oldInvoiceId: number;

    if ((params.invoicePrefix == undefined || params.invoicePrefix === '""') && (params.invoiceNumber == undefined || params.invoiceNumber === '""')) {
        return res.json({ 'status': Status.Error, 'message': 'Either prefix or work order number is required.' });
    }

    Company.findById(admin.company,
        (err: any, company: ICompany) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (company == undefined || company == null) {
                return res.json({ 'status': Status.Error, 'message': 'No company found.' });
            }

            if (typeof params.invoicePrefix !== 'undefined' && params.invoicePrefix && (typeof params.invoiceNumber === 'undefined' && !params.invoiceNumber)) {

                if (params.invoicePrefix == company.invoicePrefix) {

                    return res.json({ 'status': Status.Success, 'message': 'Invoice Prefix already set there.' });
                }

                checkInvoicePrefixExists(req, res, (req: Request, res: Response, previousPrefix: IInvoicePrefix) => {

                    oldInvoicePrefix = company.invoicePrefix;

                    company.updateOne({ 'invoicePrefix': params.invoicePrefix }, (err: any) => {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                        }


                        if (previousPrefix == null && oldInvoicePrefix != undefined) {

                            const prefix = new InvoicePrefix({
                                company: req.companyId,
                                prefix: oldInvoicePrefix,
                                maxInvoiceId: company.currentInvoiceId
                            });

                            prefix.save((err: any) => {
                                if (err) {
                                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                                }

                                return res.json({ 'status': Status.Success, 'message': 'Prefix updated successfully.' });
                            });

                        } else if (previousPrefix != null) {

                            previousPrefix.updateOne(
                                { 'prefix': oldInvoicePrefix, 'maxInvoiceId': company.currentInvoiceId },
                                (err: any) => {
                                    if (err) {
                                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                                    }

                                    return res.json({
                                        'status': Status.Success,
                                        'message': 'Prefix updated successfully.'
                                    });
                                });
                        } else {
                            return res.json({ 'status': Status.Success, 'message': 'Prefix updated successfully.' });
                        }

                    });

                });
            } else if (typeof params.invoiceNumber !== 'undefined' && (typeof params.invoicePrefix === 'undefined' || !params.invoicePrefix)) {

                // if (company.currentInvoiceId > params.invoiceNumber) {
                //     return res.json({'status': Status.Success, 'message': "Invoice number can not be less then " + company.currentJobId});
                //}

                newInvoicePrefix = params.invoicePrefix == '' ? null : params?.invoicePrefix;

                company.updateOne({
                    'currentInvoiceId': params.invoiceNumber,
                    'invoicePrefix': newInvoicePrefix
                }, (err: any) => {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }
                    return res.json({ 'status': Status.Success, 'message': 'Invoice number updated successfully.' });
                });

            } else if ((typeof params.invoicePrefix !== 'undefined' && params.invoicePrefix) && (typeof params.invoiceNumber !== 'undefined')) {

                if (company.invoicePrefix == params.invoicePrefix) {

                    // if (company.currentJobId > params.invoiceNumber) {
                    //     return res.json({'status': Status.Success, 'message': "Invoice number can not be less then " + company.currentJobId});
                    //}

                    company.updateOne({ 'currentInvoiceId': params.invoiceNumber }, (err: any) => {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                        }

                        return res.json({ 'status': Status.Success, 'message': 'Invoice number updated successfully.' });
                    });

                } else if (company.prefix != params.invoicePrefix) {
                    checkInvoicePrefixExists(req, res, (req: Request, res: Response) => {

                        oldInvoicePrefix = company.prefix;
                        oldInvoiceId = company.currentJobId;

                        company.updateOne({
                            'invoicePrefix': params.invoicePrefix,
                            'currentInvoiceId': params.invoiceNumber
                        }, (err: any) => {
                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                            }

                            if (prefix == null && oldInvoicePrefix != undefined) {
                                var prefix = new InvoicePrefix({
                                    company: req.companyId,
                                    prefix: oldInvoicePrefix,
                                    maxInvoiceId: oldInvoiceId
                                });
                                prefix.save((err: any) => {
                                    if (err) {
                                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                                    }

                                    return res.json({
                                        'status': Status.Success,
                                        'message': 'Prefix updated successfully.'
                                    });
                                });
                            } else if (prefix != null) {
                                const invoicePrefix = <IInvoicePrefix>prefix;

                                invoicePrefix.updateOne({ 'prefix': oldInvoicePrefix, 'maxInvoiceId': oldInvoiceId },
                                    (err: any) => {
                                        if (err) {
                                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                                        }

                                        return res.json({
                                            'status': Status.Success,
                                            'message': 'Prefix updated successfully.'
                                        });
                                    });
                            } else {
                                return res.json({ 'status': Status.Success, 'message': 'Prefix updated successfully.' });
                            }
                        });
                    });
                }
            }
        }
    );
};

const checkInvoicePrefixExists = (req: Request, res: Response, next: (req: Request, res: Response, prefix: IInvoicePrefix) => void) => {

    const params = req.body;

    InvoicePrefix.findOne(
        { 'prefix': req.company.prefix, 'company': req.companyId },
        (err: any, invoicePrefix: IInvoicePrefix) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (invoicePrefix == undefined || invoicePrefix == null) {
                next(req, res, null);
                return;

            } else {
                if (params.invoiceNumber != undefined && params.invoiceNumber !== null && params.invoiceNumber != '""') {
                    // if (invoicePrefix.maxInvoiceId > params.invoiceNumber) {
                    //     return res.json({'status': Status.Error, 'message': 'Invoice number with prefix ' + params.invoicePrefix + ' is not allowed. Try no greater then ' + invoicePrefix.maxInvoiceId})
                    //} else {
                    next(req, res, invoicePrefix);
                    //     return
                    //}

                } else if (invoicePrefix.maxInvoiceId > req.company.currentJobId) {
                    return res.json({
                        'status': Status.Error,
                        'message': 'Current invoice number with prefix ' + params.invoicePrefix + ' is not allowed. Try no greater then ' + invoicePrefix.maxInvoiceId
                    });

                } else {
                    next(req, res, invoicePrefix);
                    return;
                }
            }
        }
    );

};

export const getInvoiceNumber = (req: Request, res: Response) => {

    Company.findById(req.companyId,
        (err: any, company: ICompany) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (company == undefined || company == null) {
                return res.json({ 'status': Status.Error, 'message': 'No company found.' });
            }

            return res.json({
                status: Status.Success,
                'invoicePrefix': company.invoicePrefix,
                'currentInvoiceNumber': company.currentInvoiceId
            });
        }
    );
};

// Job Invoices
export const createInvoice = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    if (params.jobId) {

        Invoice.findOne({ 'job': params.jobId, 'company': req.companyId, isVoid: { $ne: true } })
            .then((previousInvoice: any) => {

                if (previousInvoice) {
                    throw new Error('Invoice already created for this job');
                }

                const jobPromise = Job.findById(params.jobId);
                const POPromise = PurchaseOrder.find({
                    job: params.jobId
                });
                return Promise.all([jobPromise, POPromise]);

            })
            .then((result: any) => {
                const job = <IJob>result[0];

                // Convert jobTypes to ObjectId in array
                const jobTypes: { id: any; quantity: number; price: number; }[] = [];
                job.tasks.forEach(task => {
                    task.jobTypes.forEach(taskJobType => {
                        jobTypes.push({
                            id: taskJobType.jobType,
                            quantity: taskJobType.completedCount || taskJobType.quantity,
                            price: taskJobType.price,
                        });
                    });
                });

                // To merge job types when they have the same item
                const jobTypesFiltered = jobTypes.reduce((accumulator, currentObj) => {
                    const existingItem = accumulator.find(item => item.id.toString() === currentObj.id.toString());
                    
                    if (existingItem) {
                        existingItem.quantity += currentObj.quantity;
                    } else {
                        accumulator.push(currentObj);
                    }
                    return accumulator;
                }, []);
                // const jobTypeIds = job.tasks.map(task => task.jobType);
                // Fallback for old job who still using one job type
                if (!jobTypesFiltered.length) jobTypesFiltered.push({id: job.type, quantity: 1, price: 0});
                // Search all jobTypes' items
                // const items = Item.find({jobType: {$in: jobTypeIds}});
                const items: any[] = [];
                jobTypesFiltered.forEach(async (jobType) => {
                    const item: any = await Item.findOne({jobType: jobType.id});
                    item['quantity'] = jobType.quantity;
                    item['price'] = jobType.price;
                    items.push(item);
                });

                // const items = jobTypeIds.map(jobTypeId => Item.findOne({jobType: jobTypeId}))
                return Promise.all([result[0], result[1], items]);
            })
            .then((result: any) => {

                const job = result[0];
                const purchaseOrders = result[1];
                const items = result[2];

                if (!job) {
                    throw new Error('Invalid job id');
                    // return res.json({'status': Status.Error, 'message': 'Invalid job id'})
                }
                return new Promise((resolve, reject) => {
                    _populateInvoiceData(req, res, job, items, purchaseOrders, null, null, (req, res, invoiceData, currentInvoiceId) => {

                        invoiceData.save()
                            .then((newInvoice: IInvoice) => {
                                resolve({ latestInvoiceId: currentInvoiceId, invoice: newInvoice });
                            })
                            .catch(() => {
                                reject('Unable to create invoice, please try again');
                            });

                    });
                });

            })
            .then((data: any) => {

                return new Promise((resolve, reject) => {
                    const invoiceId = data.latestInvoiceId + 1;
                    company.updateOne({ currentInvoiceId: invoiceId })
                        .then(() => {
                            resolve(data.invoice);
                        })
                        .catch(() => {
                            reject();
                        });
                });
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

                                    if (contractor && contractor.commissionType != 'fixed') {
                                        const commission = (invoice.total / totalTechnician) * (contractor.commission ?? DefaultCommission.VENDOR_COMMISSION) / 100;
                                        const contractorCommissionEntry = {
                                            contractor: contractor._id,
                                            technician: contractor.admin,
                                            commission: contractor.commission,
                                            commissionAmount: Number(commission.toFixed(2))
                                        };

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
                                        };

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
                });
            })
            .then((invoice: any) => {

                // Mark the job report as it has been invoiced
                return new Promise(async (resolve, reject) => {

                    const jobReport = await JobReport.findOne({ job: invoice.job });
                    if (jobReport) {
                        jobReport.invoiceCreated = true;
                        jobReport.invoiceVoid = false;
                        jobReport.invoice = invoice._id;
                        await jobReport.save();
                    }

                    resolve(invoice);
                });

            })
            .then((invoice: IInvoice) => {
                const inoiceLogsObj:any={
                    invoiceId: invoice.invoiceId, invoice: invoice._id, type: logType.CREATED,info:'Invoice created', customer: invoice.customer, companyLocation: invoice.companyLocation, workType: invoice.workType, company: invoice.company
                    , createdBy: user._id
                };
                InvoiceLogController.create(inoiceLogsObj);
                if (company.qbAuthorized && !invoice.isDraft) {
                    /**
                     * Check Customer & Job Locations data on QBooks,
                     * if not found, create them on QBooks
                     */
                    const customerId = invoice.customer.toString();
                    _checkQBCustomerJobLocation(req, res, company, customerId, (err, errMsg, qbCustomer) => {
                        if (err || errMsg) {
                            return res.json({
                                status: Status.Success,
                                message: 'Job invoice created successfully.',
                                invoice
                            });
                        }

                        if (qbCustomer) {
                            // Create new Invoice in QuickBooks
                            _createQBInvoice(req, res, company, invoice, (err, errMsg, qbInvoice) => {
                                if (err || errMsg) {
                                    return res.json({
                                        status: Status.Success,
                                        message: 'Job invoice created successfully.',
                                        invoice,
                                        quickbookInvoice: null,
                                        quickbookInvoiceError: errMsg
                                    });
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
                            });
                        }
                    });

                } else {
                    return res.json({ status: Status.Success, message: 'Job invoice created successfully.', invoice });
                }
            })
            .catch((error: any) => {
                Sentry.captureException(error);
                if (error.message != undefined) {
                    return res.json({ 'status': Status.Error, 'message': error.message });
                } else {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                }
            });
    } else if (params.hasOwnProperty('purchaseOrderId') && params.purchaseOrderId != null && params.purchaseOrderId != '""') {

        Invoice.findOne({ 'purchaseOrder': params.purchaseOrderId, 'company': req.companyId })
            .then((invoice: IInvoice | null) => {
                if (invoice != undefined && invoice != null) {
                    throw new Error('Invoice already created for this purchase order');
                } else {
                    return PurchaseOrder.findById(params.purchaseOrderId);
                }

            })
            .then((purchaseOrder: IPurchaseOrder | null) => {
                if (purchaseOrder == undefined || purchaseOrder == null) {
                    throw new Error('Invalid purchase order id');
                }

                if (purchaseOrder.invoiceCreated) {
                    throw new Error('Invoice already created for this purchase order');
                }

                return new Promise((resolve, reject) => {
                    _populateInvoiceData(req, res, null, null, null, purchaseOrder, null, (req, res, invoiceData, currentInvoiceId) => {

                        invoiceData.save()
                            .then((newInvoice: IInvoice) => {
                                resolve({
                                    latestInvoiceId: currentInvoiceId,
                                    invoice: newInvoice,
                                    purchaseOrderId: purchaseOrder._id
                                });
                            })
                            .catch(() => {
                                reject('Unable to create invoice, please try again');
                            });

                    });
                });
            })
            .then((data: any) => {
                const invoiceId = data.latestInvoiceId + 1;

                const companyUpdate = company.updateOne({ currentInvoiceId: invoiceId });
                const poUpdate = PurchaseOrder.updateOne({ _id: data.purchaseOrderId }, { invoiceCreated: true });

                return Promise.all([data.invoice, companyUpdate, poUpdate]);
            })
            .then((response: any) => {

                const invoice = response[0];
                return new Promise(async (resolve, reject) => {

                    if (!invoice.isDraft) {
                        const customer = await Customer.findById(invoice.customer);
                        customer.balance += invoice.total;
                        await customer.save();
                    }

                    resolve(invoice);
                });
            })
            .then((invoice: IInvoice) => {
                if (company.qbAuthorized && !invoice.isDraft) {
                    /**
                     * Check Customer & Job Locations data on QBooks,
                     * if not found, create them on QBooks
                     */
                    const customerId = invoice.customer.toString();
                    _checkQBCustomerJobLocation(req, res, company, customerId, (err, errMsg, qbCustomer) => {
                        if (err || errMsg) {
                            return res.json({
                                status: Status.Success,
                                message: 'Purchase order invoice created successfully.',
                                invoice
                            });
                        }

                        if (qbCustomer) {
                            // Create new Invoice in QuickBooks
                            _createQBInvoice(req, res, company, invoice, (err, errMsg, qbInvoice) => {
                                if (err || errMsg) {
                                    return res.json({
                                        status: Status.Success,
                                        message: 'Purchase order invoice created successfully.',
                                        invoice,
                                        quickbookInvoice: null,
                                        quickbookInvoiceError: errMsg
                                    });
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
                            });
                        }
                    });

                } else {
                    return res.json({
                        status: Status.Success,
                        message: 'Purchase order invoice created successfully.',
                        invoice
                    });
                }
            })
            .catch((error: any) => {
                Sentry.captureException(error);
                if (error.message != undefined) {
                    return res.json({ 'status': Status.Error, 'message': error.message });
                } else {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                }
            });


        // (err: any, previousInvoice: IInvoice) => {

        //     if (err) {
        //         return res.json({'status': Status.Error, 'message': Messages.GenericError})
        //    }

        //     if (previousInvoice != undefined || previousInvoice != null) {
        //         return res.json({'status': Status.Success, 'message': "Invoice already created for this purchase order."})
        //    }

        //     PurchaseOrder.findById(params.purchaseOrderId, (err: any, purchaseOrder: IPurchaseOrder) => {

        //         if (err) {
        //             return res.json({'status': Status.Error, 'message': Messages.GenericError})
        //        }

        //         if (purchaseOrder == undefined || purchaseOrder == null) {
        //             return res.json({'status': Status.Error, 'message': 'Invalid purchase order id'})
        //        }

        //         if (purchaseOrder.invoiceCreated) {
        //             return res.json({'status': Status.Error, 'message': 'Invoice already created for this purchase order'})
        //        }


        //         _populateInvoiceData(req, res, null, null, null, purchaseOrder, null, (req, res, invoiceData, currentInvoiceId )=>{

        //             invoiceData.save((invoiceError: any, newInvoice: IInvoice, ) => {

        //                 if (invoiceError) {
        //                     return res.json({'status': Status.Error, 'message': Messages.GenericError})
        //                }

        //                 purchaseOrder.updateOne({invoiceCreated: true}).exec((poUpdateError: any, raw: any) => {

        //                     if (poUpdateError) {
        //                         return res.json({'status': Status.Error, 'message': Messages.GenericError})
        //                    }

        //                     company.updateOne({currentInvoiceId: currentInvoiceId + 1}).exec((companyError: any, raw: any) => {

        //                         if (companyError) {
        //                             return res.json({'status': Status.Error, 'message': Messages.GenericError})
        //                        }

        //                         return res.json({'status': Status.Success, 'message': "Purchase order invoice created successfully."})
        //                    })

        //                })


        //            })
        //        })

        //    })


        //});
    } else if (params.hasOwnProperty('estimateId') && params.estimateId != null && params.estimateId != '""') {

        Invoice.findOne({ 'estimate': params.estimateId, 'company': req.companyId })
            .then((invoice: IInvoice | null) => {
                if (invoice != undefined && invoice != null) {
                    throw new Error('Invoice already created for this estimate');
                } else {
                    return Estimate.findById(params.estimateId);
                }

            })
            .then((estimate: IEstimate | null) => {
                if (estimate == undefined || estimate == null) {
                    throw new Error('Invalid estimate id');
                }

                if (estimate.invoiceCreated) {
                    throw new Error('Invoice already created for this estimate');
                }

                return new Promise((resolve, reject) => {
                    _populateInvoiceData(req, res, null, null, null, null, estimate, (req, res, invoiceData, currentInvoiceId) => {

                        invoiceData.save()
                            .then((newInvoice: IInvoice) => {
                                resolve({
                                    latestInvoiceId: currentInvoiceId,
                                    invoice: newInvoice,
                                    estimateId: estimate._id
                                });
                            })
                            .catch(() => {
                                reject('Unable to create invoice, please try again');
                            });

                    });
                });
            })
            .then((data: any) => {
                const invoiceId = data.latestInvoiceId + 1;

                const companyUpdate = company.updateOne({ currentInvoiceId: invoiceId });
                const estimateUpdate = Estimate.updateOne({ _id: data.estimateId }, { invoiceCreated: true });

                return Promise.all([data.invoice, companyUpdate, estimateUpdate]);
            })
            .then((response: any) => {

                const invoice = response[0];
                return new Promise(async (resolve, reject) => {

                    if (!invoice.isDraft) {
                        const customer = await Customer.findById(invoice.customer);
                        customer.balance += invoice.total;
                        await customer.save();
                    }

                    resolve(invoice);
                });
            })
            .then((invoice: IInvoice) => {
                if (company.qbAuthorized && !invoice.isDraft) {
                    /**
                     * Check Customer & Job Locations data on QBooks,
                     * if not found, create them on QBooks
                     */
                    const customerId = invoice.customer.toString();
                    _checkQBCustomerJobLocation(req, res, company, customerId, (err, errMsg, qbCustomer) => {
                        if (err || errMsg) {
                            return res.json({
                                status: Status.Success,
                                message: 'Estimate invoice created successfully.',
                                invoice
                            });
                        }

                        if (qbCustomer) {
                            // Create new Invoice in QuickBooks
                            _createQBInvoice(req, res, company, invoice, (err, errMsg, qbInvoice) => {
                                if (err || errMsg) {
                                    return res.json({
                                        status: Status.Success,
                                        message: 'Estimate invoice created successfully.',
                                        invoice,
                                        quickbookInvoice: null,
                                        quickbookInvoiceError: errMsg
                                    });
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
                            });
                        }
                    });

                } else {
                    return res.json({
                        status: Status.Success,
                        message: 'Estimate invoice created successfully.',
                        invoice
                    });
                }
            })
            .catch((error: any) => {
                Sentry.captureException(error);
                if (error.message != undefined) {
                    return res.json({ 'status': Status.Error, 'message': error.message });
                } else {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                }
            });

        // Invoice.findOne({'estimate': params.estimateId, 'company': req.companyId},
        // (err: any, previousInvoice: IInvoice) => {

        //     if (err) {
        //         return res.json({'status': Status.Error, 'message': Messages.GenericError})
        //    }

        //     if (previousInvoice != undefined || previousInvoice != null) {
        //         return res.json({'status': Status.Success, 'message': "Invoice already created for this estimate."})
        //    }

        //     Estimate.findById(params.estimateId, (estimateError: any, estimate: IEstimate) => {

        //         if (estimateError) {
        //             return res.json({'status': Status.Error, 'message': Messages.GenericError})
        //        }

        //         if (estimate == undefined || estimate == null) {
        //             return res.json({'status': Status.Error, 'message': 'Invalid estimate id'})
        //        }

        //         if (estimate.invoiceCreated) {
        //             return res.json({'status': Status.Error, 'message': 'Invoice already created for this invoice'})
        //        }

        //         _populateInvoiceData(req, res, null, null, null, null, estimate, (req, res, invoiceData, currentInvoiceId )=>{

        //             invoiceData.save((invoiceError: any, newInvoice: IInvoice, ) => {

        //                 if (invoiceError) {
        //                     return res.json({'status': Status.Error, 'message': Messages.GenericError})
        //                }

        //                 estimate.updateOne({invoiceCreated: true}).exec((estimateUpdateError: any, raw: any) => {

        //                     if (estimateUpdateError) {
        //                         return res.json({'status': Status.Error, 'message': Messages.GenericError})
        //                    }

        //                     company.updateOne({currentInvoiceId: currentInvoiceId})
        //                     .exec((companyError: any, raw: any) => {

        //                         if (companyError) {
        //                             return res.json({'status': Status.Error, 'message': Messages.GenericError})
        //                        }

        //                         return res.json({'status': Status.Success, 'message': "Estimate invoice created successfully."})
        //                    })

        //                })


        //            })
        //        })

        //    })
        //});
    } else {
        // MANUAL CUSTOM INVOICE

        _populateInvoiceData(req, res, null, null, null, null, null, (req, res, invoiceData, currentInvoiceId) => {

            invoiceData.save((invoiceError: any, newInvoice: IInvoice,) => {
                if (invoiceError) {

                    return res.json({ status: Status.Error, message: Messages.GenericError });
                }

                company.updateOne({ currentInvoiceId: currentInvoiceId + 1 })
                    .exec(async (companyError: any) => {
                        if (companyError) {
                            return res.json({ status: Status.Error, message: Messages.GenericError });
                        }

                        const customer = await Customer.findById(newInvoice.customer);
                        if (!newInvoice.isDraft) {
                            customer.balance += newInvoice.total;
                            await customer.save();
                        }

                        if (company.qbAuthorized && !newInvoice.isDraft) {
                            /**
                             * Check Customer & Job Locations data on QBooks,
                             * if not found, create them on QBooks
                             */
                            await _checkQBCustomerJobLocation(req, res, company, customer._id, (err, errMsg, qbCustomer) => {
                                if (err || errMsg) {
                                    return res.json({
                                        status: Status.Success,
                                        message: 'Invoice created successfully.',
                                        invoice: newInvoice
                                    });
                                }

                                if (qbCustomer) {
                                    // Create new Invoice in QuickBooks
                                    _createQBInvoice(req, res, company, newInvoice, (err, errMsg, qbInvoice) => {
                                        if (err || errMsg) {
                                            return res.json({
                                                status: Status.Success,
                                                message: 'Invoice created successfully.',
                                                invoice: newInvoice,
                                                quickbookInvoice: null,
                                                quickbookInvoiceError: errMsg
                                            });
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
                                    });
                                }
                            });
                        } else {
                            return res.json({
                                status: Status.Success,
                                message: 'Invoice created successfully.',
                                invoice: newInvoice
                            });
                        }
                    });
            });
        });
    }
};

const _populateInvoiceData = async (req: Request, res: Response, job: IJob, jobTypeitems: IItem[], purchaseOrders: any, purchaseOrder: any, estimate: any, next: (req: Request, res: Response, invoice: IInvoice, invoiceId: number) => void) => {

    const params = req.body;
    const company = <ICompany>req.company;
    const user = <IUser>req.user;

    let currentInvoiceId = 0;
    if (company.currentInvoiceId) {
        currentInvoiceId = company.currentInvoiceId;
    }

    /* remove checking invoiceId with estimateId
    if (company.currentEstimateId > company.currentInvoiceId) {
        currentInvoiceId = company.currentEstimateId
   } else if (company.currentInvoiceId > company.currentEstimateId) {
        currentInvoiceId = company.currentInvoiceId
   }
    */

    const invNumber = parseInt(params.invoiceNumber) || company.currentInvoiceId + 1;
    let invoiceId = company.invoicePrefix
        ? `Invoice ${company.invoicePrefix}-${invNumber}`
        : `Invoice ${invNumber}`;

    let taxAmount = 0;
    let charges = 0;
    let shippingCost = 0;
    let subTotalBeforeTax = 0;
    let total = 0;
    let invoiceType = 0;
    let ticket: IServiceTicket;
    let customer: string;
    let jobLocation: string;
    let jobSite: string;
    let jobId: string;
    let timeSpent = 0;
    let purchaseOrderId: string = null;
    let estimateId: string = null;
    let workType: string = params.workType;
    let companyLocation: string = params.companyLocation;

    if (job) {
        charges = job.charges;
        invoiceType = 0;
        customer = job.customer;
        jobLocation = job.jobLocation;
        jobSite = job.jobSite;
        jobId = job._id;
        workType = job.workType;
        companyLocation = job.companyLocation;

        await job.populate({ path: 'ticket' }).execPopulate();
        ticket = job.ticket;
    }

    if (purchaseOrder != null) {
        if (purchaseOrder.total == undefined || purchaseOrder.total == null || purchaseOrder.total == '""') {
            return res.json({ 'status': Status.Error, 'message': 'purchaseOrder total is missing' });
        }
        if (purchaseOrder.customer == undefined || purchaseOrder.customer == null || purchaseOrder.customer == '""') {
            return res.json({ 'status': Status.Error, 'message': 'purchaseOrder customer is missing' });
        }

        purchaseOrderId = purchaseOrder._id;
        charges = purchaseOrder.total;
        customer = purchaseOrder.customer;
        invoiceType = 1;
    }

    if (estimate != null) {

        if (estimate.total == undefined || estimate.total == null || estimate.total == '""') {
            return res.json({ 'status': Status.Error, 'message': 'Estimate total is missing' });
        }
        if (estimate.customer == undefined || estimate.customer == null || estimate.customer == '""') {
            return res.json({ 'status': Status.Error, 'message': 'Estimate customer is missing' });
        }

        estimateId = estimate._id;
        charges = estimate.total;
        customer = estimate.customer;
        invoiceType = 2;

        const idOfEstimate = estimate.estimateId.replace('Estimate ', '');
        invoiceId = 'Invoice ' + idOfEstimate;

        if (company.invoicePrefix != undefined && company.invoicePrefix != null && company.invoicePrefix == '""') {
            invoiceId = 'Invoice ' + company.invoicePrefix + '-' + idOfEstimate;
        }
    }

    if (job == null && purchaseOrder == null && estimate == null) {

        if (!params.customerId) {
            return res.json({ status: Status.Error, message: 'Customer ID is required' });
        }

        if (params.charges == undefined || params.charges == null || params.charges === '""') {
            return res.json({ status: Status.Error, message: 'Charges are required' });
        }

        invoiceType = 3;
        customer = params.customerId;
    }

    // Handle and overwrite Job Location if provided
    if (params.jobLocationId) {
        // const jobLocationObj = await JobLocation.findById(params.jobLocationId);
        const jobLocationObj = await JobLocation.findOne({
            _id: params.jobLocationId,
            customerId: customer,
            isActive: { $ne: false }
        });
        if (!jobLocationObj) {
            return res.json({ status: Status.Error, message: 'Subdivision not found' });
        }
        jobLocation = jobLocationObj._id;
    }

    // Handle and overwrite Job Site if provided
    if (params.jobSiteId) {
        // const jobSiteObj = await JobSite.findById(params.jobSiteId);
        const jobSiteObj = await JobSite.findOne({ _id: params.jobSiteId, customerId: customer, isActive: { $ne: false } });
        if (!jobSiteObj) {
            return res.json({ status: Status.Error, message: 'Job Address not found' });
        }
        jobSite = jobSiteObj._id;
    }

    const purchaseOrderIds: any = [];
    if (params.includePO) {

        if (purchaseOrders != null && purchaseOrders.length > 0) {
            purchaseOrders.map((PO: any) => {
                purchaseOrderIds.push(PO._id);
                total = total + PO.total;
            });
        }
    }

    let items: any = [];
    if (params.items != undefined) {
        try {
            items = JSON.parse(params.items);

            // To handle any over-stringified strings
            if (!Array.isArray(items)) {
                items = JSON.parse(items);
            }
        } catch (error) {
            Sentry.captureException(error);
            return res.json({ 'status': Status.Error, 'message': 'Items json is invalid' });
        }
    }

    const invoiceItems: any[] = [];
    // Find Customer object to see the itemTier, customPrice, & payment term info
    const customerObj = await Customer.findById(customer).populate({path: 'paymentTerm'}).populate({path: 'discountPrices.discountItem'});
    if (!customerObj) {
        return res.json({ status: Status.Error, message: 'Customer not found' });
    }
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
                return res.json({ 'status': Status.Error, 'message': 'Items format is invalid' });
            }
            const obj: any = {};
            const price = parseFloat(item.price);
            const quantity = parseFloat(item.quantity);
            let itemTax = 0;
            let itemTaxAmount = 0;
            const subTotal = price * quantity;

            if (item.tax > 0) {
                itemTax = parseFloat(item.tax);
                itemTaxAmount = subTotal * itemTax / 100;
                taxAmount += itemTaxAmount;
            }

            obj.quantity = item.quantity;
            obj.price = Math.round(item.price * 100) / 100;
            obj.isFixed = item.isFixed;
            obj.tax = itemTax;
            obj.taxAmount = Math.round(itemTaxAmount * 100) / 100;
            obj.subTotal = Math.round(subTotal * 100) / 100;

            if (item.item == undefined || item.item == null) {
                obj.name = item.name;
                obj.description = item.description;
            } else {
                obj.item = item.item;
                obj.name = item.name || item.item?.name;
                obj.description = item.description || item.item?.description;
            }
            invoiceItems.push(obj);

            subTotalBeforeTax += subTotal;
            total += subTotal;
        }

    } else if (jobTypeitems.length >= 0) {

        // Iterate all jobTypes' items and add all to invoice's items
        for (const jobTypeitem of jobTypeitems) {

            // Find the job task related to find its timeSpent
            let jobTypes: ITaskJobType;
            const task = job.tasks.find(task => {
                jobTypes = <ITaskJobType>task.jobTypes.find(jobType => jobType.jobType.toString() === jobTypeitem.jobType.toString());
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

            const obj: any = {};
            // Set price to 0 if customer uses customPrice
            const price = (jobTypeitem as any).price ?? (customerObj.isCustomPrice ? 0 : itemTier?.charge || jobTypeitem.charges);
            // If item is hourly, take the task's timeSpent (minutes) for the quantity
            const quantity = jobTypeitem.isFixed ? ((jobTypeitem as any).quantity || 1) : (jobTypes?.timeSpent / 60) || 1;
            let itemTax = 0;
            let itemTaxAmount = 0;
            const subTotal = price * quantity;

            if (jobTypeitem.tax > 0) {
                itemTax = jobTypeitem.tax;
                itemTaxAmount = subTotal * itemTax / 100;
                taxAmount += itemTaxAmount;
            }

            obj.quantity = Math.round(quantity * 100) / 100;
            obj.price = Math.round(price * 100) / 100;
            obj.isFixed = jobTypeitem.isFixed;
            obj.tax = itemTax;
            obj.taxAmount = Math.round(itemTaxAmount * 100) / 100;
            obj.subTotal = Math.round(subTotal * 100) / 100;
            obj.item = jobTypeitem._id;
            obj.name = jobTypeitem.name;
            obj.description = jobTypeitem.description;

            invoiceItems.push(obj);

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
        let discountPrices = customerObj.discountPrices?.sort((a, b) => {
            return a.quantity - b.quantity;
        });
        discountPrices = discountPrices.filter(disc => disc.discountItem && ((disc.discountItem as IItem)?.isActive ?? true));

        //Count All Item Quantity
        let allQty = 0;
        for (const jobTypeitem of jobTypeitems) {
            allQty += ((jobTypeitem as any).quantity || 1);
        }

        // Get the max quantity that should be discounted
        const maxDiscountQty = discountPrices[discountPrices.length - 1]?.quantity;
        const totalItemDiscounted = allQty > maxDiscountQty ? maxDiscountQty : jobTypeitems.length;

        // Find the discount item based on how many item that gonna be discounted
        const customerDiscount = customerObj.discountPrices?.find(disc => disc.quantity === totalItemDiscounted && ((disc.discountItem as IItem)?.isActive ?? true));
        const discountItem = await Item.findById((customerDiscount?.discountItem as IItem)?._id);

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

    let status = InvoiceStatus.UNPAID;
    let paid = false;
    if (params.isDraft === false) {
        // Check if invoice updated and several conditions met
        if (total <= 0) {
            /**
             * Invoice updated to the point balanceDue paid off or even minus,
             * if minus, will put the extra payment to cust's credit,
             * then mark invoice as PAID
             */
            customerObj.credit += Math.abs(total);
            // paymentApplied = total;
            // balanceDue = 0;
            status = InvoiceStatus.PAID;
            paid = true;
        }
    }

    const invoice = new Invoice({
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
        jobLocation: jobLocation,
        jobSite: jobSite,
        company: req.companyId,
        note: params.note,
        charges: Math.round(charges * 100) / 100,
        shippingCost: Math.round(shippingCost * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        subTotal: Math.round(subTotalBeforeTax * 100) / 100,
        total: Math.round(total * 100) / 100,
        balanceDue: Math.round(total * 100) / 100,
        status, paid,
        createdBy: user._id,
        createdAt: Date.now(),
        timeSpent: timeSpent,
        items: invoiceItems,
        estimate: estimateId,
        emailHistory: [],
        lastEmailSent: null,
        workType: workType,
        companyLocation: companyLocation
    });

    next(req, res, invoice, currentInvoiceId);

};

// PO Invoices
export const createPOInvoice = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    Invoice.findOne({ 'purchaseOrder': params.purchaseOrderId, 'company': req.companyId },
        (err: any, previousInvoice: IInvoice) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (previousInvoice != undefined || previousInvoice != null) {
                return res.json({
                    'status': Status.Success,
                    'message': 'Invoice already created for this purchase order.'
                });
            }

            PurchaseOrder.findById(params.purchaseOrderId, (POError: any, PO: IPurchaseOrder) => {

                if (POError) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                }

                if (PO == undefined || PO == null) {
                    return res.json({ 'status': Status.Error, 'message': 'Invalid purchase order id' });
                }

                let currentInvoiceId = 0;
                if (company.currentInvoiceId) {
                    currentInvoiceId = company.currentInvoiceId;
                }
                let invoiceId = 'Invoice ' + (currentInvoiceId + 1);

                if (company.invoicePrefix != undefined && company.invoicePrefix != null && company.invoicePrefix == '""') {
                    invoiceId = 'Invoice ' + company.invoicePrefix + '-' + (currentInvoiceId + 1);
                }

                const invoice = new Invoice({
                    invoiceId: invoiceId,
                    purchaseOrder: params.purchaseOrderId,
                    customer: PO.customer,
                    company: req.companyId,
                    total: PO.total,
                    createdBy: user._id,
                    note: params.note,
                    createdAt: Date.now(),
                    invoiceType: 1
                });

                invoice.save((invoiceError: any) => {

                    if (invoiceError) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }

                    const invoiceLogsObj:any={
                        invoiceId: invoice.invoiceId, invoice: invoice._id, type: logType.CREATED, info:'Invoice created',customer: invoice.customer, companyLocation: invoice.companyLocation, workType: invoice.workType, company: invoice.company
                        , createdBy: user._id
                    };
                    InvoiceLogController.create(invoiceLogsObj);

                    company.updateOne({ currentInvoiceId: currentInvoiceId + 1 })
                        .exec((companyError: any) => {
                            if (companyError) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                            }

                            return res.json({
                                'status': Status.Success,
                                'message': 'Purchase order invoice created successfully.'
                            });
                        });
                });
            });
        });
};
const findAddedAndRemovedItems = (original: any, updated: any) => {
    const added = [];
    const removed = [];
    const updatedItems = [];

    const originalIds = original.map((item: any) => item.item.toString());
    const updatedIds = updated.map((item: any) => item.item.toString());

    for (const [index, item] of original.entries()) {
        if (!updatedIds.includes(item.item.toString())) {
            removed.push({
                'type':'removed',
                'name': item?.name
            });
        }
        
        if (updatedIds.includes(item.item.toString())) {

            if (original[index]?.quantity != updated[index]?.quantity ) {
                updatedItems.push({
                    'type':'updated',
                    'name': item?.name,
                    'new': updated[index]?.quantity,
                    'old': original[index]?.quantity,
                });

            }
        }
    }

    for (const [index, item] of updated.entries()){

        if (!originalIds.includes(item.item.toString())) {
            added.push({
                type:'added',
                'name': item?.name
            });
        }
        // if (originalIds.includes(item.item.toString())) {

        //     if (original[index].quantity != updated[index].quantity ) {
        //         updatedItems.push({
        //             "name": item?.name,
        //             "new": updated[index].quantity,
        //             "old": original[index].quantity,
        //         });

        //     }
        // }

    }

    return { added, removed, updatedItems };
};
const getInvoiceLogsPefix = (key: string) => {

    switch (key) {
    case 'status':
        // code block
        return 'Payment status changed';
    case 'ITEMS_ADDED':
        // code block
        return 'Items added';
    case 'taxAmount':
        // code block
        return 'Tax amount changed';
    case 'ITEMS_REMOVED':
        // code block
        return 'Items removed';
    case 'dueDate':
        // code block
        return 'Due date changed';
    case 'issuedDate':
        // code block
        return 'Issued date changed';
    case 'subTotal':
        // code block
        return 'Sub Total changed';
    case 'total':
        // code block
        return 'Invoice Total changed';
    case 'note':
        // code block
        return 'Customer notes changed';
    case 'balanceDue':
        // code block
        return 'Balance due changed';
    case 'customerPO':
        // code block
        return 'PO number changed';
    case 'paid':
        // code block
        return 'Payment status changed';

    default:
        // code block
        return key;
    }
};
const changesManage = (newObj: any, oldObj: any) => {
    const logs: any[] = [];

    Object.keys(newObj).map(key => {

        // if (key == "dueDate") {

        //     if (new Date(newObj[key]).getTime() != new Date(oldObj[key]).getTime()) { logs.push(getInvoiceLogsPefix(key)); }

        // }
        // else if (key == "issuedDate") {

        //     if (new Date(newObj[key]).getTime() != new Date(oldObj[key]).getTime()) { logs.push(getInvoiceLogsPefix(key)); }


        // }
        // else 
        
        if (key == 'items') {
            // if(newObj[key].length==oldObj[key].length)
            {

                const { added, removed, updatedItems } = findAddedAndRemovedItems(oldObj[key], newObj[key]);

                if (added.length) {
                    // logs.push(getInvoiceLogsPefix("ITEMS_ADDED") + " " + added.length);


                    added.map((itemUpdates: any) => {

                        logs.push('Item '+ itemUpdates.name +' added');

                    });
                }
                if (removed.length) {
                    // logs.push(getInvoiceLogsPefix("ITEMS_REMOVED") + " " + removed.length);

                    removed.map((itemUpdates: any) => {

                        logs.push('Item '+ itemUpdates.name +' removed');

                    });
                }
               
                if (updatedItems.length) {

                    updatedItems.map((itemUpdates: any) => {

                        logs.push(itemUpdates.name + ' quantity changed from '+itemUpdates.old +' to ' + itemUpdates.new);

                    });

                }

            }


        }

        else if (key == 'customerPO' ) {
            if (newObj[key] != oldObj[key]) {
                logs.push(`Edited PO number (old: ${oldObj[key]} new: ${newObj[key]})`);
            }
        }
    });


    return logs;
};
export const updateInvoice = (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;
    const user = <IUser>req.user;

    Invoice.findOne({ '_id': params.invoiceId, 'company': req.companyId },
        async (err: any, invoice: IInvoice) => {
            if (err) {
                return res.json({ status: Status.Error, message: Messages.GenericError });
            }

            if (!invoice) {
                return res.json({ status: Status.Error, message: 'Invoice not found' });
            }

            if (params.isDraft && invoice.status !== InvoiceStatus.UNPAID) {
                return res.json({
                    status: Status.Error,
                    message: 'Cannot update a PAID/PARTIALLY PAID invoce to become draft.'
                });
            }

            // Find Customer object to see the itemTier, customPrice, * payment term info
            const customerObj = await Customer.findById(invoice.customer).populate({ path: 'paymentTerm' });
            // Populate payment term from the company
            await company.populate({ path: 'paymentTerm' }).execPopulate();
            // Save the invoice old isDraft before it is replaced
            const oldIsDraft = invoice.isDraft;
            const oldTotalInvoice = invoice.total;

            // Retrieve payment term for this invoice
            let paymentTerm: IPaymentTerm;
            if (params.paymentTermId) {
                paymentTerm = await PaymentTerm.findOne({ _id: params.paymentTermId, isActive: true });
                if (!paymentTerm) {
                    return res.json({ status: Status.Error, message: 'Payment Term not found' });
                }

            }

            // Retrieve customer contact for this invoice
            let customerContact: IContact;
            if (params.customerContactId) {
                customerContact = await Contact.findById(params.customerContactId);
                if (!customerContact) {
                    return res.json({ status: Status.Error, message: 'Customer Contact not found' });
                }
            }

            // Retrieve job location for this invoice
            let jobLocation: IJobLocation;
            if (params.jobLocationId) {
                jobLocation = await JobLocation.findOne({
                    _id: params.jobLocationId,
                    customerId: customerObj?._id,
                    isActive: { $ne: false }
                });
                if (!jobLocation) {
                    return res.json({ status: Status.Error, message: 'Subdivision not found' });
                }
            }

            // Retrieve job site for this invoice
            let jobSite: IJobSite;
            if (params.jobSiteId) {
                jobSite = await JobSite.findOne({
                    _id: params.jobSiteId,
                    customerId: customerObj?._id,
                    isActive: { $ne: false }
                });
                if (!jobSite) {
                    return res.json({ status: Status.Error, message: 'Job Address not found' });
                }
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

                // INVOICE FROM JOB

                Job.findById(invoice.job)
                    .then((job: any) => {
                        if (job == undefined || job == null) {
                            throw new Error('job for this invoice is not found');
                        }

                        const POPromise = PurchaseOrder.find({
                            job: invoice.job
                        });
                        return Promise.all([job, POPromise]);
                    })
                    .then(async (result: any) => {
                        const job = result[0];
                        const purchaseOrders = result[1];

                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                        }

                        if ((params.charges == undefined || params.charges == null || params.charges == '""') && (params.tax == undefined || params.tax == null || params.tax == '""')) {
                            return res.json({
                                'status': Status.Error,
                                'message': 'Tax Percentage or charges are required'
                            });
                        }
                        const issuedDate = params.issuedDate ? new Date(params.issuedDate) : invoice.issuedDate;
                        const dueDate = params.paymentTermId && paymentTerm
                            ? moment(issuedDate).add(paymentTerm?.dueDays, 'd').valueOf()
                            : params.dueDate
                                ? new Date(params.dueDate)
                                : issuedDate;
                        let charges: number = invoice.charges;
                        let shippingCost: number = invoice.shippingCost;
                        let taxAmount = 0;
                        let subTotalBeforeTax = 0;
                        let total = 0;
                        let paymentApplied = invoice.paymentApplied ?? 0;
                        let balanceDue = invoice.balanceDue ?? (invoice.total - paymentApplied) ?? invoice.total;
                        let paid = invoice.paid;
                        let status = invoice.status;
                        const oldTotal = invoice.total;

                        if (!job.isFixed && (params.timeSpent == undefined && params.timeSpent == null && params.timeSpent == '""')) {
                            return res.json({ 'status': Status.Error, 'message': 'Time spent is required' });
                        } else if (!job.isFixed) {
                            invoice.timeSpent = params.timeSpent;
                        }
                        const purchaseOrderIds: any = [];
                        if (params.includePO) {
                            if (purchaseOrders != null && purchaseOrders.length > 0) {
                                purchaseOrders.map((PO: any) => {
                                    purchaseOrderIds.push(PO._id);
                                });
                                // invoice.jobPurchaseOrders = purchaseOrderIds
                            }
                        }

                        // total = invoice.total
                        let items: any = [];
                        if (params.items != undefined) {
                            try {
                                items = JSON.parse(params.items);

                                // To handle any over-stringified strings
                                if (!Array.isArray(items)) {
                                    items = JSON.parse(items);
                                }
                            } catch (error) {
                                Sentry.captureException(error);
                                return res.json({ 'status': Status.Error, 'message': 'Items json is invalid' });
                            }
                        }

                        const invoiceItems: any[] = [];

                        if (items.length > 0) {

                            for (let i = 0; i < items.length; i++) {
                                const item = items[i];
                                if ((!item.hasOwnProperty('item') || !item.hasOwnProperty('tax') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity') || !item.hasOwnProperty('isFixed')) && (!item.hasOwnProperty('name') || !item.hasOwnProperty('description') || !item.hasOwnProperty('tax') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity') || !item.hasOwnProperty('isFixed'))) {
                                    return res.json({ 'status': Status.Error, 'message': 'Items format is invalid' });
                                }
                                const obj: any = {};
                                const price = parseFloat(item.price);
                                const quantity = parseFloat(item.quantity);
                                let itemTax = 0;
                                let itemTaxAmount = 0;
                                const subTotal = price * quantity;

                                if (item.tax > 0) {
                                    itemTax = parseFloat(item.tax);
                                    itemTaxAmount = subTotal * itemTax / 100;
                                    taxAmount += itemTaxAmount;
                                }

                                obj.quantity = item.quantity;
                                obj.price = Math.round(item.price * 100) / 100;
                                obj.isFixed = item.isFixed;
                                obj.tax = itemTax;
                                obj.taxAmount = Math.round(itemTaxAmount * 100) / 100;
                                obj.subTotal = Math.round(subTotal * 100) / 100;

                                if (!item.item) {
                                    obj.name = item.name;
                                    obj.description = item.description;
                                } else {
                                    obj.item = item.item;
                                    obj.name = item.name || item.item?.name;
                                    obj.description = item.description || item.item?.description;
                                }
                                invoiceItems.push(obj);

                                subTotalBeforeTax += subTotal;
                                total += subTotal;
                            }
                        }

                        // Add the grand total with the tax amount
                        total += taxAmount;
                        balanceDue += (total - oldTotal);

                        // Check if invoice updated and several conditions met
                        if (balanceDue <= 0 || (paymentApplied >= total)) {
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
                                        const contractor = await Company.findOne({_id: invoiceCommissionTechnician.contractor}).exec();
                                        if (contractor && contractor.commissionType != 'fixed') {
                                            if (Number(total) !== Number(oldTotalInvoice)) {
                                                const getCommission = (t: any) => (t / totalTechnician) * (contractor.commission ?? DefaultCommission.VENDOR_COMMISSION) / 100;
                                                const oldCommission = getCommission(oldTotal);
                                                let commission = getCommission(total);
                                                commission = Number(commission.toFixed(2));
                                                contractor.balance -= Number(oldCommission.toFixed(2));
                                                contractor.balance += Number(commission.toFixed(2));
                                                invoiceCommissionTechnician.commissionAmount = Number(commission.toFixed(2) || 0);
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

                        const changes = changesManage({
                            jobPurchaseOrders: purchaseOrderIds,
                            items: invoiceItems,
                            shippingCost: helper.roundTwoDecimal(shippingCost),
                            taxAmount: helper.roundTwoDecimal(taxAmount),
                            subTotal: helper.roundTwoDecimal(subTotalBeforeTax),
                            total: helper.roundTwoDecimal(total),
                            balanceDue: helper.roundTwoDecimal(balanceDue),
                            paymentApplied: helper.roundTwoDecimal(paymentApplied),
                            status, paid,
                            charges, issuedDate, dueDate, note: params.note,
                            isDraft: params.isDraft,
                            customerPO: params.customerPO,
                            customerContactId: customerContact,
                            jobLocation: params.jobLocationId === null ? null : jobLocation?._id,
                            jobSite: params.jobSiteId === null ? null : jobSite?._id,
                            vendorId: params.vendorId,
                            invoiceId
                        }, invoice);
                        const oldInovice=invoice;
                        invoice.updateOne({
                            jobPurchaseOrders: purchaseOrderIds,
                            items: invoiceItems,
                            shippingCost: helper.roundTwoDecimal(shippingCost),
                            taxAmount: helper.roundTwoDecimal(taxAmount),
                            subTotal: helper.roundTwoDecimal(subTotalBeforeTax),
                            total: helper.roundTwoDecimal(total),
                            balanceDue: helper.roundTwoDecimal(balanceDue),
                            paymentApplied: helper.roundTwoDecimal(paymentApplied),
                            status, paid,
                            charges, issuedDate, dueDate, note: params.note,
                            isDraft: params.isDraft,
                            customerPO: params.customerPO,
                            customerContactId: customerContact,
                            jobLocation: params.jobLocationId === null ? null : jobLocation?._id,
                            jobSite: params.jobSiteId === null ? null : jobSite?._id,
                            vendorId: params.vendorId,
                            invoiceId
                        }, { omitUndefined: true },

                        async (err: any) => {
                            if (err) {
                                return res.json({ status: Status.Error, message: Messages.GenericError });
                            }

                            /**
                                 * Kris' remark (Sept 27th, 2022):
                                 * Add additional update for payment term,
                                 * to not update too many code for now,
                                 * because the one above have omitUndefined true.
                                 */
                            invoice.paymentTerm = params.paymentTermId ? paymentTerm?._id : null;
                            await invoice.save();
                            if(!oldInovice.isDraft){
                                    
                                const invoiceLogsObj:any={ invoiceId: invoice.invoiceId, invoice: invoice._id, type: logType.UPDATED, info: changes.join(','), customer: invoice.customer, companyLocation: invoice.companyLocation, workType: invoice.workType, company: invoice.company
                                    , createdBy: user._id
                                };
                                InvoiceLogController.create(invoiceLogsObj);

                            }
                            // To handle the switch of Invoice isDraft
                            _handleDraftInvoiceAndSyncQB(req, res, company, customerObj, invoice, oldIsDraft, (errMsg, invoice, qbInvoice) => {
                                if (errMsg) {
                                    return res.json({
                                        status: Status.Success,
                                        message: 'Invoice updated successfully',
                                        invoice,
                                        quickbookInvoice: null,
                                        quickbookInvoiceError: errMsg
                                    });
                                }

                                return res.json({
                                    status: Status.Success,
                                    message: 'Invoice updated successfully',
                                    invoice,
                                    quickbookInvoice: qbInvoice
                                });
                            });
                        });
                    })
                    .catch((error: any) => {
                        Sentry.captureException(error);
                        return res.json({ status: Status.Error, message: error.message || Messages.GenericError });
                    });
            } else {

                // MANUAL / CUSTOM INVOICE

                if ((params.charges == undefined || params.charges == null || params.charges == '""') && (params.tax == undefined || params.tax == null || params.tax == '""')) {
                    return res.json({ 'status': Status.Error, 'message': 'Tax Percentage or charges are required' });
                }
                const issuedDate = params.issuedDate ? new Date(params.issuedDate) : invoice.issuedDate;
                const dueDate = params.paymentTermId && paymentTerm
                    ? moment(issuedDate).add(paymentTerm?.dueDays, 'd').valueOf()
                    : params.dueDate
                        ? new Date(params.dueDate)
                        : issuedDate;
                let charges: number = invoice.charges;
                let shippingCost: number = invoice.shippingCost;
                let taxAmount = 0;
                let subTotalBeforeTax = 0;
                let total = 0;
                let paymentApplied = invoice.paymentApplied ?? 0;
                let balanceDue = invoice.balanceDue ?? (invoice.total - paymentApplied) ?? invoice.total;
                let paid = invoice.paid;
                let status = invoice.status;
                const oldTotal = invoice.total;

                let items: any = [];
                if (params.items != undefined) {
                    try {
                        items = JSON.parse(params.items);

                        // To handle any over-stringified strings
                        if (!Array.isArray(items)) {
                            items = JSON.parse(items);
                        }
                    } catch (error) {
                        Sentry.captureException(error);
                        return res.json({ 'status': Status.Error, 'message': 'Items json is invalid' });
                    }
                }

                const invoiceItems: any[] = [];

                if (items.length > 0) {

                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        if ((!item.hasOwnProperty('item') || !item.hasOwnProperty('tax') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity') || !item.hasOwnProperty('isFixed')) && (!item.hasOwnProperty('name') || !item.hasOwnProperty('description') || !item.hasOwnProperty('tax') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity') || !item.hasOwnProperty('isFixed'))) {
                            return res.json({ 'status': Status.Error, 'message': 'Items format is invalid' });
                        }
                        const obj: any = {};
                        const price = parseFloat(item.price);
                        const quantity = parseFloat(item.quantity);
                        let itemTax = 0;
                        let itemTaxAmount = 0;
                        const subTotal = price * quantity;

                        if (item.tax > 0) {
                            itemTax = parseFloat(item.tax);
                            itemTaxAmount = subTotal * itemTax / 100;
                            taxAmount += itemTaxAmount;
                        }

                        obj.quantity = item.quantity;
                        obj.price = Math.round(item.price * 100) / 100;
                        obj.isFixed = item.isFixed;
                        obj.tax = itemTax;
                        obj.taxAmount = Math.round(itemTaxAmount * 100) / 100;
                        obj.subTotal = Math.round(subTotal * 100) / 100;

                        if (!item.item) {
                            obj.name = item.name;
                            obj.description = item.description;
                        } else {
                            obj.item = item.item;
                            obj.name = item.name || item.item?.name;
                            obj.description = item.description || item.item?.description;
                        }
                        invoiceItems.push(obj);

                        subTotalBeforeTax += subTotal;
                        total += subTotal;
                    }
                }

                // Add the grand total with the tax amount
                total += taxAmount;
                balanceDue += (total - oldTotal);

                // Check if invoice updated and several conditions met
                if (balanceDue <= 0 || (paymentApplied >= total)) {
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
                const changes = changesManage({
                    items: invoiceItems,
                    charges: helper.roundTwoDecimal(charges),
                    shippingCost: helper.roundTwoDecimal(shippingCost),
                    taxAmount: helper.roundTwoDecimal(taxAmount),
                    subTotal: helper.roundTwoDecimal(subTotalBeforeTax),
                    total: helper.roundTwoDecimal(total),
                    balanceDue: helper.roundTwoDecimal(balanceDue),
                    paymentApplied: helper.roundTwoDecimal(paymentApplied),
                    status, paid,
                    issuedDate, dueDate, note: params.note,
                    isDraft: params.isDraft,
                    customerPO: params.customerPO,
                    customerContactId: customerContact,
                    jobLocation: params.jobLocationId === null ? null : jobLocation?._id,
                    jobSite: params.jobSiteId === null ? null : jobSite?._id,
                    vendorId: params.vendorId,
                    invoiceId
                }, invoice);

                invoice.updateOne({
                    items: invoiceItems,
                    charges: helper.roundTwoDecimal(charges),
                    shippingCost: helper.roundTwoDecimal(shippingCost),
                    taxAmount: helper.roundTwoDecimal(taxAmount),
                    subTotal: helper.roundTwoDecimal(subTotalBeforeTax),
                    total: helper.roundTwoDecimal(total),
                    balanceDue: helper.roundTwoDecimal(balanceDue),
                    paymentApplied: helper.roundTwoDecimal(paymentApplied),
                    status, paid,
                    issuedDate, dueDate, note: params.note,
                    isDraft: params.isDraft,
                    customerPO: params.customerPO,
                    customerContactId: customerContact,
                    jobLocation: params.jobLocationId === null ? null : jobLocation?._id,
                    jobSite: params.jobSiteId === null ? null : jobSite?._id,
                    vendorId: params.vendorId,
                    invoiceId
                }, { omitUndefined: true },
                async (err: any) => {
                    if (err) {
                        return res.json({ status: Status.Error, message: Messages.GenericError });
                    }

                    /**
                         * Kris' remark (Sept 27th, 2022):
                         * Add additional update for payment term,
                         * to not update too many code for now,
                         * because the one above have omitUndefined true.
                         */
                    invoice.paymentTerm = params.paymentTermId ? paymentTerm?._id : null;
                    await invoice.save();
                      
                    const invoiceLogsObj:any={
                        invoiceId: invoice.invoiceId, invoice: invoice._id, type: logType.UPDATED, info: changes.join(','), customer: invoice.customer, companyLocation: invoice.companyLocation, workType: invoice.workType, company: invoice.company
                        , createdBy: user._id
                    };
                    InvoiceLogController.create(invoiceLogsObj);
                    // To handle the switch of Invoice isDraft
                    _handleDraftInvoiceAndSyncQB(req, res, company, customerObj, invoice, oldIsDraft, (errMsg, invoice, qbInvoice) => {
                        if (errMsg) {
                            return res.json({
                                status: Status.Success,
                                message: 'Invoice updated successfully',
                                invoice,
                                quickbookInvoice: null,
                                quickbookInvoiceError: errMsg
                            });
                        }

                        return res.json({
                            status: Status.Success,
                            message: 'Invoice updated successfully',
                            invoice,
                            quickbookInvoice: qbInvoice
                        });
                    });
                });
            }
        });
};

export const updateInvoiceMessages = async (req: Request, res: Response) => {
    const params = req.body;
    try {
        const invoice = await Invoice.findOne({ _id: params.invoiceId });
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        invoice.technicianMessages = {
            notes: params.technicianMessages.notes || invoice.technicianMessages.notes,
            images: params.technicianMessages.images || invoice.technicianMessages.images,
        };

        if ([true, false].includes(params.showJobId)) {
            invoice.showJobId = params.showJobId;
        }

        const updatedInvoice = await invoice.save();
        return res.json({ status: Status.Success, message: 'Invoice updated successfully.', data: updatedInvoice });
    } catch (err) {
        return res.json({ status: Status.Error, message: err.message || Messages.GenericError });
    }
};
export const getInvoiceDetail = (req: Request, res: Response) => {
    const params = req.body;

    Invoice.findOne({ _id: params.invoiceId, 'company': req.companyId })
        .populate({
            path: 'job',
            populate: [
                { path: 'type', select: 'title description sku' },
                { path: 'tasks.jobTypes.jobType', select: 'title description sku' },
                {
                    path: 'customer',
                    select: 'info.email auth.email profile.firstName profile.lastName profile.displayName address.street address.city address.state address.unit address.zipCode contact.phone contact.fax vendorId contactName contactEmail notes'
                },
                { path: 'tasks.technician', select: 'profile auth.email address contact permissions.role' },
                {
                    path: 'tasks.contractor',
                    select: 'info.companyName info.logoUrl info.companyEmail address contact.phone contact.fax commissionTier',
                    populate: { path: 'admin', select: 'profile.displayName auth.email contact.phone permissions.role' }
                },
                { path: 'technicianImages.uploadedBy', select: 'profile auth.email address contact permissions.role' },
                { path: 'track.user', select: 'profile auth.email address contact permissions.role' },
                { path: 'ticket', populate: { path: 'ticket', populate: 'customerContactId' } },
                { path: 'jobLocation', select: 'name location address' },
                { path: 'jobSite', select: 'name location address' },
                { path: 'homeOwner', select: 'profile info contact' }
            ],
        })
        .populate({
            path: 'purchaseOrder',
            select: 'purchaseOrderId items equipment status estimate note total',
            populate: [
                {
                    path: 'equipment',
                    select: 'info maintenance type brand',
                    populate: [{ path: 'type', select: 'title' }, { path: 'brand', select: 'title' }]
                },
                { path: 'items.part', select: 'name itemCode description totalQuantity availableQuantity cost price' }
            ]
        })
        .populate({ path: 'paymentTerm', select: '-company -__v' })
        .populate({ path: 'customerContactId', select: '-__v' })
        .populate({
            path: 'items.item',
            select: 'name description sku isFixed charges tax',
            populate: [{ path: 'jobType' }]
        })
        .populate({
            path: 'company',
            select: 'info.companyName info.logoUrl info.companyEmail permissions.role address.street address.city address.state address.zipCode contact.phone contact.fax commissionTier'
        })
        .populate({
            path: 'customer',
            select: 'info.email auth.email profile.firstName profile.lastName profile.displayName address.street address.city address.state address.unit address.zipCode contact.phone contact.fax vendorId contactName contactEmail'
        })
        .populate({ path: 'jobLocation', select: 'name address location' })
        .populate({ path: 'jobSite', select: 'name address location' })
        .populate({
            path: 'estimate',
            select: 'total items note status customer company createdAt createdBy'
        })
        .populate({
            path: 'createdBy',
            select: 'info.companyName auth.email profile.displayName permissions.role address contact.phone profile.displayName'
        })
        .populate({
            path: 'companyLocation',
            select: 'isAddressAsBillingAddress address billingAddress name'
        })
        .populate({
            path: 'workType',
            select: 'title'
        })
        .exec((err: any, invoice: IInvoice) => {

            if (err) {
                return res.json({ status: Status.Error, message: Messages.GenericError });
            }

            // if (invoice == undefined || invoice == null) {
            if (!invoice) {
                return res.json({ status: Status.Error, message: 'Invoice not found' });
            }

            Scan.find({ job: invoice.job }, 'comment timeOfScan')
                .populate({
                    path: 'equipment',
                    select: 'info.model info.serialNumber info.nfcTag images info.location',
                    populate: [{ path: 'brand', select: 'title' }, { path: 'type', select: 'title' }],

                })
                .exec(async (err: any, scans: IScan[]) => {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }

                    const payments = await PaymentCustomer.find({
                        company: req.companyId,
                        isVoid: { $ne: true },
                        $or: [
                            { invoice: invoice._id },
                            { 'line.invoice': invoice._id }
                        ]
                    });

                    return res.json({ status: Status.Success, invoice, scans, payments });
                });
        });
};

export const getInvoiceEmailTemplate = async (req: Request, res: Response) => {

    const params = req.query;
    const company = <ICompany>req.company;
    let invoice, invoices, customer, job;

    switch (params.emailType) {
    case EmailTypes.INVOICES:
        if (!params.invoiceIds) {
            return res.json({ status: Status.Error, message: 'Param invoiceIds is required for emailType INVOICES' });
        }

        const invoiceIds = JSON.parse(params.invoiceIds)?.map((id: string) => new ObjectId(id));
        invoices = await Invoice
            .find({ company, _id: { $in: invoiceIds } })
            .populate({
                path: 'customer',
                select: 'info.email auth.email profile.displayName address.street address.city address.state address.zipCode contact.phone contactName'
            });

        if (!invoices?.length) {
            return res.json({ status: Status.Error, message: 'Invoices not found.' });
        }

        customer = <ICustomer>invoices[0]?.customer;
        break;

    case EmailTypes.INVOICE:
        if (!params.invoiceId) {
            return res.json({ status: Status.Error, message: 'Param invoiceId is required for emailType INVOICE' });
        }

    default:
        // Retrieve invoice and populate customer and paymentTerm info
        invoice = await Invoice
            .findOne({ company, _id: params.invoiceId })
            .populate({
                path: 'customer',
                select: 'info.email auth.email profile.displayName address.street address.city address.state address.zipCode contact.phone contactName'
            })
            .populate({ path: 'customerContactId', select: 'name email phone' })
            .populate({
                path: 'job',
                select: 'customerContactId',
                populate: [{ path: 'customerContactId', select: 'name email phone' }]
            });

        if (!invoice) {
            return res.json({ status: Status.Error, message: 'Invoice not found.' });
        }

        customer = <ICustomer>invoice?.customer;
        job = <IJob>invoice?.job;
        break;
    }

    // const customer = <ICustomer>invoice?.customer;
    const emailType = params.emailType ?? EmailTypes.INVOICE;

    // Retrieve company email default
    let emailDefault = await EmailDefault.findOne({ company, emailType });

    // Create email default if company doesn't have one yet
    if (!emailDefault) {
        await _createCompanyDefaultEmail(company, emailType);
        emailDefault = await EmailDefault.findOne({ company, emailType });
    }

    /**
     * Transfrom the email default placeholder symbol to fit Javascript Template Literal,
     * '{{' become '${' & '}}' become '}'
     */
    await transformPlaceholders(emailDefault);

    // Get available placeholder values for Invoice email template
    const {
        company_name,
        company_email,
        customer_name,
        customer_email,
        invoice_number,
        invoice_amount,
        invoice_total_amount,
        invoice_due_date
    } = await getPlaceholderValues({ company, invoice, invoices, customer, job });

    return res.json({
        status: Status.Success,
        emailType,
        emailTemplate: {
            from: company_email,
            to: customer_email,
            subject: eval('`' + emailDefault.subject + '`'),
            message: eval('`' + emailDefault.message + '`')
        },
        invoice, invoices
    });

};

/**
 * To send email with one invoice as the attachment
 */
export const sendInvoiceEmail = async (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    // Retrieve invoice and populate customer and paymentTerm info
    // const {INVOICE_PDF_PATH} = process.env;
    const invoice = await Invoice
        .findOne({ company, _id: params.invoiceId })
        .populate({
            path: 'job',
            populate: [
                { path: 'type', select: 'title description sku' },
                { path: 'tasks.jobTypes.jobType', select: 'title description sku' },
                {
                    path: 'customer',
                    select: 'info.email auth.email profile.firstName profile.lastName profile.displayName address.street address.city address.state address.unit address.zipCode contact.phone contact.fax vendorId contactName contactEmail'
                },
                { path: 'tasks.technician', select: 'profile.displayName auth.email contact.phone permissions.role' },
                {
                    path: 'tasks.contractor',
                    select: 'info.companyName info.logoUrl info.companyEmail address contact.phone contact.fax',
                    populate: { path: 'admin', select: 'profile.displayName auth.email contact.phone permissions.role' }
                },
                { path: 'ticket', populate: { path: 'ticket', populate: 'customerContactId' } },
                { path: 'jobLocation', select: 'name location address' },
                { path: 'jobSite', select: 'name location address' },
                { path: 'customerContactId', select: '-__v' }
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
        .populate({ path: 'jobLocation', select: 'name address location' })
        .populate({ path: 'jobSite', select: 'name address location' })
        .populate({
            path: 'paymentTerm',
            select: '-company -__v'
        })
        .populate({
            path: 'items.item',
            select: 'name description sku isJobType isFixed charges tax',
            populate: [{ path: 'jobType' }]
        })
        .populate({
            path: 'companyLocation',
            select: 'isAddressAsBillingAddress address billingAddress'
        });

    if (!invoice) {
        return res.json({ status: Status.Error, message: 'Invoice not found.' });
    }

    const customer = <ICustomer>invoice.customer;
    const paymentTerm = <IPaymentTerm>invoice.paymentTerm;
    const customerContact = <IContact>invoice.customerContactId;
    const companyLocation = <ICompanyLocation>invoice.companyLocation;

    // Retrieve company email default
    const filepath = req.file?.path ?? `${INVOICE_PDF_PATH}/${invoice.invoiceId}.pdf`;
    const invoicePdfs = [{invoice, filepath}];
    const emailDefault = await EmailDefault.findOne({company, emailType: EmailTypes.INVOICE});
    const sender_email = companyLocation?.billingAddress?.emailSender || user.auth?.email;
    // Generate Invoice PDF
    await _generateInvoicePdf(company, invoice);

    let paramRecipients: string[];
    let recipientEmails: string[];
    let copyToMyself: boolean;
    try {
        // Handle the stringify array of recipients value
        if (params.recipients) {
            if (Array.isArray(params.recipients)) {
                paramRecipients = params.recipients;
            } else {
                paramRecipients = JSON.parse(params.recipients);
            }
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
            recipientEmails.push(sender_email);
        }
    } catch (error) {
        Sentry.captureException(error);
        console.log('== Send Invoice Error:', error);
        return res.json({ status: Status.Error, message: Messages.GenericError });
    }

    // Call AWS SES method
    sendInvoiceEmailToCustomer({
        subject: params.subject ?? emailDefault?.subject,
        message: params.message ?? emailDefault?.message,
        sender_email: sender_email,
        company_name: company.info?.companyName,
        company_email: company.info?.companyEmail,
        company_logo: company.info?.logoUrl,
        customer_name: customer.profile?.displayName,
        customer_email: customerContact?.email ?? customer?.info?.email,
        recipient_emails: recipientEmails,
        invoice_number: invoice.invoiceId,
        invoice_amount: invoice.total,
        invoice_due_date: moment(invoice.dueDate).format('MMMM DD, YYYY'),
        invoice_pdfs: invoicePdfs,
        term_name: paymentTerm?.name,
        term_due_days: paymentTerm?.dueDays,
        has_cc: copyToMyself
    });

    // Update email history and last email sent info
    const sendingDate = new Date();

    recipientEmails.forEach((item) => {
        invoice.emailHistory.push({
            sentTo: item,
            sentAt: sendingDate,
            sentBy: user._id || null,
            deliveryStatus: true
        });
    });

    invoice.lastEmailSent = sendingDate;
    await invoice.save();

    const invoiceLogsObj:any={ invoiceId: invoice.invoiceId, invoice: invoice._id, type: logType.EMAIL_SENT, customer: invoice.customer, companyLocation: invoice.companyLocation, workType: invoice.workType, company: invoice.company, createdBy: user._id };
    InvoiceLogController.create(invoiceLogsObj);


    return res.json({ status: Status.Success, message: 'Invoice has been sent successfully.' });

};

/**
 * To send email with multiple invoices as the attachments
 */
export const sendInvoicesEmail = async (req: Request, res: Response) => {

    // const {INVOICE_PDF_PATH} = process.env;
    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    // Retrieve and check if customer exist
    const customer = await Customer.findById(params.customerId);
    if (!customer) {
        return res.json({ Status: Status.Error, message: 'Customer not found' });
    }

    // Handle the stringify array of invoice IDs value
    let invoiceIds: any[] = [];
    try {
        if (Array.isArray(invoiceIds)) {
            invoiceIds = params.invoiceIds;
        } else {
            invoiceIds = JSON.parse(invoiceIds);
        }

        // To handle any over-stringified strings
        if (!Array.isArray(invoiceIds)) {
            invoiceIds = JSON.parse(invoiceIds);
        }

        // Convert all string ID to Object ID to be used in $in mongo query
        invoiceIds = invoiceIds.map((id: string) => new ObjectId(id));
    } catch (error) {
        Sentry.captureException(error);
        return res.json({ 'status': Status.Error, 'message': 'Param Invoice IDs is invalid' });
    }

    // Retrieve invoices and populate customer and paymentTerm info
    const invoices = await Invoice
        .find({ company, _id: { $in: invoiceIds } })
        .populate({
            path: 'job',
            populate: [
                { path: 'type', select: 'title description sku' },
                { path: 'tasks.jobTypes.jobType', select: 'title description sku' },
                {
                    path: 'customer',
                    select: 'info.email auth.email profile.firstName profile.lastName profile.displayName address.street address.city address.state address.unit address.zipCode contact.phone contact.fax vendorId contactName contactEmail'
                },
                { path: 'tasks.technician', select: 'profile.displayName auth.email contact.phone permissions.role' },
                {
                    path: 'tasks.contractor',
                    select: 'info.companyName info.logoUrl info.companyEmail address contact.phone contact.fax',
                    populate: { path: 'admin', select: 'profile.displayName auth.email contact.phone permissions.role' }
                },
                { path: 'ticket', populate: { path: 'ticket', populate: 'customerContactId' } },
                { path: 'jobLocation', select: 'name location address' },
                { path: 'jobSite', select: 'name location address' },
                { path: 'customerContactId', select: '-__v' }
            ],
        })
        .populate({
            path: 'customer',
            select: 'info.email auth.email profile.displayName address contact contactName'
        })
        .populate({ path: 'customerContactId', select: '-__v' })
        .populate({ path: 'jobLocation', select: 'name address location' })
        .populate({ path: 'jobSite', select: 'name address location' })
        .populate({ path: 'paymentTerm', select: '-company -__v' })
        .populate({
            path: 'items.item',
            select: 'name description sku isJobType isFixed charges tax',
            populate: [{ path: 'jobType' }]
        })
        .populate({
            path: 'companyLocation',
            select: 'isAddressAsBillingAddress address billingAddress'
        });

    if (!invoices?.length) {
        return res.json({ status: Status.Error, message: 'Invoices not found.' });
    }

    const invoicePdfs = [];
    let totalInvoiceAmount = 0;
    let invoiceSender = '';

    try {
        // Iterate all invoices to generate their PDF and collect the filepath
        for (const invoice of invoices) {

            // Get the invoice filepath
            const filepath = req.file?.path ?? `${INVOICE_PDF_PATH}/${invoice.invoiceId}.pdf`;

            // Generate Invoice PDF
            await _generateInvoicePdf(company, invoice);

            // Sum the invoice amount
            totalInvoiceAmount += invoice.total;

            // Collect all invoices into one array
            invoicePdfs.push({ invoice, filepath });

            // Update email history and last email sent info
            const sendingDate = new Date();
            invoice.emailHistory.push({
                sentTo: customer.info?.email,
                sentAt: sendingDate,
                sentBy: user._id || null,
                deliveryStatus: true
            });
            invoice.lastEmailSent = sendingDate;

            const companyLocation = <ICompanyLocation>invoice.companyLocation;
            invoiceSender = companyLocation?.billingAddress?.emailSender;

            await invoice.save();
            const invoiceLogsObj:any={ invoiceId: invoice.invoiceId, invoice: invoice._id, type: logType.EMAIL_SENT, customer: invoice.customer, companyLocation: invoice.companyLocation, workType: invoice.workType, company: invoice.company, createdBy: user._id };
            InvoiceLogController.create(invoiceLogsObj);
        
        }
    } catch (error) {
        Sentry.captureException(error);
        return res.json({ status: Status.Error, message: Messages.GenericError });
    }

    // Retrieve company email default
    const emailDefault = await EmailDefault.findOne({ company, emailType: EmailTypes.INVOICES });

    let paramRecipients: string[];
    let recipientEmails: string[];
    let copyToMyself: boolean;
    try {
        // Handle the stringify array of recipients value
        if (params.recipients) {
            if (Array.isArray(params.recipients)) {
                paramRecipients = params.recipients;
            } else {
                paramRecipients = JSON.parse(params.recipients);
            }
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
            : [customer?.info?.email];

        // Add the user's email himself if he want to receive copy email
        if (copyToMyself) {
            recipientEmails.push(user.auth?.email);
        }
    } catch (error) {
        Sentry.captureException(error);
        return res.json({ status: Status.Error, message: Messages.GenericError });
    }

    // Call AWS SES method
    sendInvoiceEmailToCustomer({
        subject: params.subject ?? emailDefault?.subject,
        message: params.message ?? emailDefault?.message,
        sender_email: invoiceSender || user.auth?.email,
        company_name: company.info?.companyName,
        company_email: company.info?.companyEmail,
        company_logo: company.info?.logoUrl,
        recipient_emails: recipientEmails,
        invoice_total_amount: totalInvoiceAmount,
        invoice_pdfs: invoicePdfs,
    });

  
    return res.json({ status: Status.Success, message: 'Invoice has been sent successfully.' });

};

export const getInvoices = async (req: Request, res: Response) => {

    const params = req.body;
    const workType = req.query.workType;
    const companyLocation = req.query.companyLocation;
    const companyId = req.otherCompanyId || req.companyId;

    // Check if any filter provided to decide whether return all records or not
    const isAllRecords = await _getIsAllRecordsByParams(params);
    // Get the date of the last 90 days
    const last90days = moment().subtract(90, 'days').format();

    // Return error when all cursors are provided
    if (params.nextCursor && params.previousCursor) {
        return res.json({
            status: Status.Error,
            message: 'Provided cursor could only be one of either nextCursor or previousCursor.'
        });
    }

    // Data query that used to search Invoices and available previous/next page
    const filterQuery: any = {
        $and: [{ $or: [{ company: companyId }] }]
    };

    // Add the last 90 days filter if need to return all records
    if (!isAllRecords) {
        filterQuery['$and'].push({ issuedDate: { $gte: new Date(last90days) } });
    }

    // Check and add if params filter provided
    if (params.keyword) {
        const keywordRegex = helper.getRegex(params.keyword, 'i');
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
        });
    }
    if (params.invoiceId) {
        const invoiceIdRegex = helper.getRegex(params.invoiceId, 'i');
        filterQuery['$and'].push({ invoiceId: invoiceIdRegex });
    }
    if (params.dueDate) {
        const dueDate = moment(params.dueDate).endOf('day').format();
        filterQuery['$and'].push({ dueDate: { $lte: new Date(dueDate) } });
    }
    if (params.status) {
        filterQuery['$and'].push({ status: { $in: JSON.parse(params.status) } });
    }
    if (params.startAmount) {
        filterQuery['$and'].push({ total: { $gte: params.startAmount } });
    }
    if (params.endAmount) {
        filterQuery['$and'].push({ total: { $lte: params.endAmount } });
    }
    if (params.customerPO) {
        const customerPORegex = helper.getRegex(params.customerPO, 'i');
        filterQuery['$and'].push({ customerPO: customerPORegex });
    }
    if (params.missingPO) {
        filterQuery['$and'].push({ $or: [{ customerPO: { $exists: false } }, { customerPO: '' }, { customerPO: null }] });
    }
    if (params.customerId) {
        filterQuery['$and'].push({ customer: new ObjectId(params.customerId) });
    }
    if (params.customerContactId) {
        filterQuery['$and'].push({ customerContactId: new ObjectId(params.customerContactId) });
    }
    if (params.jobId) {
        const jobIdRegex = helper.getRegex(params.jobId, 'i');
        filterQuery['$and'].push({ 'jobObj.jobId': jobIdRegex });
    }
    if (params.jobLocationId) {
        filterQuery['$and'].push({ 'jobLocationObj._id': new ObjectId(params.jobLocationId) });
    }
    if (params.jobAddress) {
        const jobAddressRegex = helper.getRegex(params.jobAddress, 'i');
        filterQuery['$and'].push({ 'jobSiteObj.address.street': jobAddressRegex });
    }
    if (params.jobCity) {
        const jobCityRegex = helper.getRegex(params.jobCity, 'i');
        filterQuery['$and'].push({ 'jobSiteObj.address.city': jobCityRegex });
    }
    if (params.jobState) {
        const jobStateRegex = helper.getRegex(params.jobState, 'i');
        filterQuery['$and'].push({ 'jobSiteObj.address.state': jobStateRegex });
    }
    if (params.jobZip) {
        const jobZipRegex = helper.getRegex(params.jobZip, 'i');
        filterQuery['$and'].push({ 'jobSiteObj.address.zipcode': jobZipRegex });
    }
    if (params.technicianId) {
        filterQuery['$and'].push({ $or: [{ 'jobObj.tasks.technician': new ObjectId(params.technicianId) }, { 'jobObj.tasks.contractor': new ObjectId(params.technicianId) }] });
    }
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
    switch (params.isVoid) {
    case true:
        filterQuery['$and'].push({ isVoid: params.isVoid });
        break;

    default:
        /**
             * For isVoid false, use the $ne because we want to retrieve old invoices,
             * old invoices may don't have isVoid property at all
             */
        filterQuery['$and'].push({ isVoid: { $ne: true } });
        break;
    }
    if (params.startDate && params.endDate) {
        const startDate = moment.utc(params.startDate).startOf('day').format();
        const endDate = moment.utc(params.endDate).endOf('day').format();
        filterQuery['$and'].push({ issuedDate: { $gte: new Date(startDate), $lte: new Date(endDate) } });
    }
    if (params.lastEmailStartDate && params.lastEmailEndDate) {
        const lastEmailStartDate = moment(params.lastEmailStartDate).startOf('day').format();
        const lastEmailEndDate = moment(params.lastEmailEndDate).endOf('day').format();
        filterQuery['$and'].push({
            lastEmailSent: {
                $gte: new Date(lastEmailStartDate),
                $lte: new Date(lastEmailEndDate)
            }
        });
    }

    if (workType) {
        let workTypeIds: any[] = [];
        try {
            const workTypeArr = JSON.parse(workType);
            workTypeIds = workTypeArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) {
        }
        
        filterQuery['$and'].push({ workType: { $in: workTypeIds } });
    }
    if (companyLocation) {
        let companyLocationIds: any[] = [];
        try {
            const companyLocationArr = JSON.parse(companyLocation);
            companyLocationIds = companyLocationArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) {
        }
        filterQuery['$and'].push({ companyLocation: { $in: companyLocationIds } });
    }

    // Deep clone filterQuery
    const query: any = { $and: [] };
    filterQuery['$and'].map((q: any) => {
        query['$and'].push({ ...q });
    });
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
    let aggregateLookups: any[] = [];
    if (isAllRecords) {
        aggregateLookups = [
            { $lookup: { from: 'jobs', localField: 'job', foreignField: '_id', as: 'jobObj' } },
            { $lookup: { from: 'customers', localField: 'customer', foreignField: '_id', as: 'customerObj' } },
            {
                $lookup: {
                    from: 'joblocations',
                    localField: 'jobObj.jobLocation',
                    foreignField: '_id',
                    as: 'jobLocationObj'
                }
            },
            { $lookup: { from: 'jobsites', localField: 'jobObj.jobSite', foreignField: '_id', as: 'jobSiteObj' } },
            { $lookup: { from: 'users', localField: 'jobObj.tasks.technician', foreignField: '_id', as: 'technicianObj' } },
            {
                $lookup: {
                    from: 'companies',
                    localField: 'jobObj.tasks.contractor',
                    foreignField: '_id',
                    as: 'contractorsObj'
                }
            },

        ];
    }

    aggregateLookups.push({
        $lookup: {
            from: 'contacts',
            localField: 'customerContactId',
            foreignField: '_id',
            as: 'contactsObj'
        }
    });


    // Filter jobs using aggregate to be search to another collection
    let invoices: IInvoice[] = await Invoice.aggregate([
        ...aggregateLookups,
        { $match: { ...query } },
        { $sort: sortQuery },
        { $limit: params.pageSize || DefaultPageSize },
        { $project: { jobObj: 0, customerObj: 0, jobLocationObj: 0, jobSiteObj: 0, technicianObj: 0, contractorsObj: 0 } },
    ]);

    // Populate the invoices from aggregate
    await Invoice.populate(invoices, [
        { path: 'job', select: 'jobId scheduleDate ticket jobLocation jobSite tasks scheduleTimeAMPM' },
        { path: 'paymentTerm', select: 'name dueDays' },
        { path: 'customer', select: 'info.email auth.email profile address contact vendorId contactName contactEmail' },
        { path: 'customerContactId', select: 'name phone email' },
        { path: 'jobLocation', select: 'name address location' },
        { path: 'jobSite', select: 'name address location' },
        { path: 'companyLocation', select: 'billingAddress name isMainLocation' },
        { path: 'workType', select: 'title' },
    ]);

    // // Filter jobs using aggregate to be search to another collection
    // const invoicesAggregate: IInvoice[] = await Invoice.aggregate([
    //     ...aggregateLookups,
    //     {$match: {...query}},
    //     {$project: {_id: 1, createdAt: 1}},
    //     {$sort: sortQuery},
    //     {$limit: params.pageSize || DefaultPageSize}
    // ]);
    // // Map the Invoice IDs filtered
    // const invoiceIds = invoicesAggregate.map((invoice) => invoice._id);

    // Invoice.find({_id: {$in: invoiceIds}})
    //     .sort({...sortQuery})
    //     .populate({
    //         path: 'job',
    //         populate: [
    //             {path: 'type', select: 'title description sku'},
    //             // TODO: To be deprecated
    //             // {path: 'tasks.jobType', select: 'title description sku'},
    //             {path: 'tasks.jobTypes.jobType', select: 'title description sku'},
    //             {path: 'customer', select: 'info.email auth.email profile.firstName profile.lastName profile.displayName address.street address.city address.state address.unit address.zipCode contact.phone contact.fax vendorId contactName contactEmail'},
    //             // TODO: To be deprecated
    //             // {path: 'technician', select: 'profile.displayName auth.email contact.phone permissions.role'},
    //             // TODO: To be deprecated
    //             // {path: 'contractor', select: 'info.companyName info.logoUrl info.companyEmail address contact.phone contact.fax', populate: {path: 'admin', select: 'profile.displayName auth.email contact.phone permissions.role'}},
    //             {path: 'tasks.technician', select: 'profile.displayName auth.email contact.phone permissions.role'},
    //             {path: 'tasks.contractor', select: 'info.companyName info.logoUrl info.companyEmail address contact.phone contact.fax', populate: {path: 'admin', select: 'profile.displayName auth.email contact.phone permissions.role'}},
    //             {path: 'ticket', populate: {path: 'ticket', populate: 'customerContactId'}},
    //             {path: 'jobLocation', select: 'name location address'},
    //             {path: 'jobSite', select: 'name location address'}
    //         ],
    //    })
    //     .populate({
    //         path: 'purchaseOrder',
    //         select: 'purchaseOrderId items equipment status estimate note total',
    //         populate: [
    //             {path: 'equipment', select: 'info maintenance type brand', populate: [{path: 'type', select: 'title'}, {path: 'brand', select: 'title'}]},
    //             {path: 'items.part', select: 'name itemCode description totalQuantity availableQuantity cost price'}
    //         ]
    //    })
    //     .populate({path: 'paymentTerm', select: 'name dueDays'})
    //     .populate({path: 'customerContactId', select: 'name phone email'})
    //     .populate({
    //         path: 'items.item',
    //         select: 'name description sku isFixed charges tax',
    //         populate: [{path: 'jobType', select: 'title description sku'}]
    //    })
    //     .populate({
    //         path: 'company',
    //         select: 'info.companyName info.logoUrl info.companyEmail permissions.role address contact'
    //    })
    //     .populate({
    //         path: 'customer',
    //         select: 'info.email auth.email profile address contact vendorId contactName contactEmail'
    //    })
    //     .populate({
    //         path: 'estimate',
    //         select: 'total items note status customer company createdAt createdBy'
    //    })
    //     .populate({
    //         path: 'createdBy',
    //         select: 'info.companyName auth.email profile.displayName permissions.role address contact.phone'
    //    })
    //     .exec(async (err: any, invoices: IInvoice[]) => {

    // Because we reverse sort for previous page, we need to revert it back
    if (params.previousCursor) {
        invoices = invoices.reverse();
    }

    /**
     * Get all total invoices
     */
    const allInvoices = await Invoice.aggregate([
        ...aggregateLookups,
        { $match: { ...filterQuery } },
        { $count: 'count' }
        // {$sort: sortQuery}
    ]);

    /**
     * Get last page cursor
     */
    // const lastDivider = (params.pageSize || DefaultPageSize);
    // const lastModulo = allInvoices?.length % lastDivider;
    // const lastIndex = allInvoices?.length - ((lastModulo == 0) ? lastDivider : lastModulo);

    // let lastPageCursor;
    // if (lastIndex) {
    //     if (params.previousCursor) {
    //         let reverseAllInv = allInvoices.reverse();
    //         lastPageCursor = {createdAt: reverseAllInv[lastIndex - 1]?.createdAt, _id: reverseAllInv[lastIndex - 1]?._id};
    //    } else {
    //         lastPageCursor = {createdAt: allInvoices[lastIndex - 1]?.createdAt, _id: allInvoices[lastIndex - 1]?._id};
    //    }
    //}

    /**
     * Check if next page is available
     */
    const nextCursor = { createdAt: invoices[invoices.length - 1]?.createdAt, _id: invoices[invoices.length - 1]?._id };
    // Deep clone filterQuery
    const nextPageQuery: any = { $and: [] };
    filterQuery['$and'].map((q: any) => {
        nextPageQuery['$and'].push({ ...q });
    });
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
        { $sort: { createdAt: -1, _id: -1 } },
        { $limit: 1 }
    ]);

    /**
     * Check if previous page is availabe
     */
    const previousCursor = { createdAt: invoices[0]?.createdAt, _id: invoices[0]?._id };
    // Deep clone filterQuery
    const previousPageQuery: any = { $and: [] };
    filterQuery['$and'].map((q: any) => {
        previousPageQuery['$and'].push({ ...q });
    });
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
        { $sort: { createdAt: 1, _id: 1 } },
        { $limit: 1 }
    ]).allowDiskUse(true);

    // Retrieve number of the unsynced invoices
    const filterUnsynced: any = {};

    if (workType) {
        let workTypeIds: any[] = [];
        try {
            const workTypeArr = JSON.parse(workType);
            workTypeIds = workTypeArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) {
        }
        
        filterUnsynced['workType'] = { $in: workTypeIds };
    }
    if (companyLocation) {
        let companyLocationIds: any[] = [];
        try {
            const companyLocationArr = JSON.parse(companyLocation);
            companyLocationIds = companyLocationArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) {
        }
        filterUnsynced['companyLocation'] = { $in: companyLocationIds };
    }

    const unsyncedInvoices = await Invoice.find({
        company: companyId,
        isDraft: { $ne: true },
        isVoid: { $ne: true },
        quickbookId: null,
        ...filterUnsynced
    })?.countDocuments();

    return res.json({
        status: Status.Success,
        // total: allInvoices?.length ?? 0,
        total: allInvoices[0]?.count,
        unsyncedInvoices,
        invoices,
        pagination: {
            nextCursor: isNextPage.length ? helper.toCursorHash(JSON.stringify(nextCursor)) : null,
            previousCursor: isPreviousPage.length ? helper.toCursorHash(JSON.stringify(previousCursor)) : null,
            // lastPageCursor: lastPageCursor ? helper.toCursorHash(JSON.stringify(lastPageCursor)) : null,
            pageSize: params.pageSize || null
        },
        // sort: {
        //     by: params.sortBy,
        //     order: params.sortOrder
        //}
    });

};

/**
 * To retrieve unsynced invoices that not draft and active
 */
export const getUnsyncedInvoices = async (req: Request, res: Response) => {

    const params = req.query;
    const companyId = req.companyId;
    const workType = req.query.workType;
    const companyLocation = req.query.companyLocation;

    // Data query that used to search unsynced Invoices
    const filterQuery: any = {
        $and: [
            { company: companyId },
            { isDraft: { $ne: true } },
            { isVoid: { $ne: true } },
            { quickbookId: null }
        ]
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
        });
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

    if (workType) {
        let workTypeIds: any[] = [];
        try {
            const workTypeArr = JSON.parse(workType);
            workTypeIds = workTypeArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) {
        }
        
        filterQuery['$and'].push({ workType: { $in: workTypeIds } });
    }
    if (companyLocation) {
        let companyLocationIds: any[] = [];
        try {
            const companyLocationArr = JSON.parse(companyLocation);
            companyLocationIds = companyLocationArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id);
            });
        } catch (error) {
        }
        filterQuery['$and'].push({ companyLocation: { $in: companyLocationIds } });
    }

    const invoices = await Invoice.find(filterQuery)
        .populate({
            path: 'job',
            populate: [
                { path: 'type', select: 'title description sku' },
                { path: 'tasks.jobTypes.jobType', select: 'title description sku' },
                { path: 'customer', select: 'info auth.email profile address contact vendorId contactName contactEmail' },
                { path: 'tasks.technician', select: 'profile auth.email contact permissions.role' },
                {
                    path: 'tasks.contractor',
                    select: 'info address contact',
                    populate: { path: 'admin', select: 'profile auth.email contact permissions.role' }
                },
                { path: 'ticket', populate: { path: 'ticket', populate: 'customerContactId' } },
                { path: 'jobLocation', select: 'name location address' },
                { path: 'jobSite', select: 'name location address' }
            ],
        })
        .populate({
            path: 'purchaseOrder',
            select: 'purchaseOrderId items equipment status estimate note total',
            populate: [
                {
                    path: 'equipment',
                    select: 'info maintenance type brand',
                    populate: [{ path: 'type', select: 'title' }, { path: 'brand', select: 'title' }]
                },
                { path: 'items.part', select: 'name itemCode description totalQuantity availableQuantity cost price' }
            ]
        })
        .populate({
            path: 'items.item',
            select: 'name description sku isFixed charges tax',
            populate: [{ path: 'jobType' }]
        })
        .populate({ path: 'paymentTerm', select: '-company -__v' })
        .populate({ path: 'customerContactId', select: '-__v' })
        .populate({ path: 'company', select: 'info address contact' })
        .populate({
            path: 'customer',
            select: 'info auth.email profile address contact vendorId contactName contactEmail'
        })
        .populate({ path: 'jobLocation', select: 'name address location' })
        .populate({ path: 'jobSite', select: 'name address location' })
        .populate({ path: 'estimate', select: 'total items note status customer company createdAt createdBy' })
        .populate({ path: 'createdBy', select: 'info auth.email profile permissions.role address contact' });

    return res.json({
        status: Status.Success,
        total: invoices.length,
        invoices
    });

};

export const getCompanyInvoices = (req: Request, res: Response) => {

    CompanyInvoice.find({ 'company': req.companyId })
        .populate('company')
        .exec((err: any, invoices: IInvoice[]) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': err.message });
            }
            return res.json({ 'status': Status.Success, 'companyInvoices': invoices });
        });
};
export const getCompanyInvoiceDetails = (req: Request, res: Response) => {
    const companyInvoiceId = req.query.companyInvoiceId;
    CompanyInvoice.find({ 'company': req.companyId, _id: new ObjectId(companyInvoiceId) })
        .populate('company')
        .exec((err: any, invoices: IInvoice[]) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': err.message });
            }
            return res.json({ 'status': Status.Success, 'companyInvoice': invoices });
        });
};


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
const _handleDraftInvoiceAndSyncQB = async (req: Request, res: Response, company: ICompany, customer: ICustomer, invoice: IInvoice, oldIsDraft: boolean, next: (errMsg: string, invoice: IInvoice, qbInvoice: IQBInvoice) => void, job?: IJob) => {

    // Retrieve the latest invoice
    invoice = await Invoice.findById(invoice._id);

    if (oldIsDraft && !invoice.isDraft) {
        /**
         * Update & switch from DRAFT to ACTIVE invoice
         */

        // Add customer balance
        const balance = customer.balance + invoice.total;
        Customer.findByIdAndUpdate(customer._id, { balance }).exec();


        const techniciansEntry = [];
        if (invoice.job) {
            const invoiceCommission = await InvoiceCommission.findOne({ invoice: invoice._id });
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
                            };

                            if (contractor && contractor.commissionType != 'fixed') {

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
                            };

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
            jobReport.invoiceVoid = false;
            jobReport.invoice = invoice._id;
            jobReport.save();
        }

        // Create QB Invoice
        if (company.qbAuthorized) {
            /**
             * Check Customer & Job Locations data on QBooks,
             * if not found, create them on QBooks
             */
            _checkQBCustomerJobLocation(req, res, company, customer._id, (err, errMsg, qbCustomer) => {
                if (err || errMsg) {
                    return next(errMsg, invoice, null);
                }

                if (qbCustomer) {
                    // Create new Invoice in QuickBooks
                    _createQBInvoice(req, res, company, invoice, (err, errMsg, qbInvoice) => {
                        if (err || errMsg) {
                            return next(errMsg, invoice, null);
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

                        return next(errMsg, invoice, qbInvoice);
                    });
                }
            });

        } else {
            return next(null, invoice, null);
        }

    } else if (!oldIsDraft && invoice.isDraft) {
        /**
         * Update & switch from ACTIVE to DRAFT invoice
         */

        // Deduct customer balance
        const balance = customer.balance -= invoice.total;
        Customer.findByIdAndUpdate(customer._id, { balance }).exec();

        if (invoice.job && invoice.commission) {
            const invoiceCommission = await InvoiceCommission.findOne({ invoice: invoice._id });
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
                if (err || errMsg) {
                    return next(errMsg, invoice, null);
                }

                if (status === 'Deleted') {
                    invoice.quickbookId = null;
                    invoice.save();

                    // If company's invoices already synced, update the synced date
                    if (company.qbSync?.invoicesSynced) {
                        company.qbSync.invoicesSyncedAt = new Date();
                        company.save();
                    }
                }

                return next(null, invoice, null);
            });
        } else {
            return next(null, invoice, null);
        }

    } else if (!oldIsDraft && !invoice.isDraft) {
        /**
         * Invoice is not DRAFT,
         * only save the customer as on the previous code,
         * customer credit already processed & calculated
         */

        // Save customer credit
        customer.save();

        if (company.qbAuthorized) {

            if (invoice.quickbookId) {
                // Update Invoice in QuickBooks
                _updateQBInvoice(req, res, company, invoice, (err, errMsg, qbInvoice) => {
                    if (err || errMsg) {
                        return next(errMsg, invoice, null);
                    }

                    if (qbInvoice) {
                        // If company's invoices already synced, update the synced date
                        if (company.qbSync?.invoicesSynced) {
                            company.qbSync.invoicesSyncedAt = new Date();
                            company.save();
                        }
                    }

                    return next(null, invoice, qbInvoice);
                });
            } else {
                /**
                 * Check Customer & Job Locations data on QBooks,
                 * if not found, create them on QBooks
                 */
                _checkQBCustomerJobLocation(req, res, company, customer._id, (err, errMsg, qbCustomer) => {
                    if (err || errMsg) {
                        return next(errMsg, invoice, null);
                    }

                    if (qbCustomer) {
                        // Create new Invoice in QuickBooks
                        _createQBInvoice(req, res, company, invoice, (err, errMsg, qbInvoice) => {
                            if (err || errMsg) {
                                return next(errMsg, invoice, null);
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

                            return next(null, invoice, qbInvoice);
                        });
                    }
                });
            }
        } else {
            return next(null, invoice, null);
        }

    } else {
        /**
         * Invoice remains DRAFT,
         * nothing to do
         */

        return next(null, invoice, null);
    }

};

async function convertImageToBase64(imageUrl: string) {
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(response.data, 'binary').toString('base64');
        return `data:image/png;base64,${base64Image}`;
    } catch (error) {
        console.error('Error fetching image:', error);
        throw error;
    }
}

async function convertImagesToBase64(images: string[]): Promise<string[]> {
    try {
        const base64Images = await Promise.all(images.map(async (image) => {
            return await convertImageToBase64(image);
        }));
        return base64Images;
    } catch (error) {
        console.error('Error converting images to base64:', error);
        throw error;
    }
}

export const _generateInvoicePdf = async (company: ICompany, invoice: IInvoice) => {

    // Initialize PDF Make
    const pdfMake = new pdfmake({
        ...FONT_SETS.ROBOTO,
        ...FONT_SETS.FONTELLO
    });

    // Retrieve invoice populated or detailed data
    const customer = <ICustomer>invoice.customer;
    const paymentTerm = <IPaymentTerm>invoice.paymentTerm;
    const job = <IJob>invoice.job;
    const ticket = <IServiceTicket>job?.ticket;
    const companyLocation = <ICompanyLocation>invoice?.companyLocation;
    const customerContact = <IContact>invoice.customerContactId ?? job?.customerContactId;


    const jobNote = {
        id: (await ticket?._id)?.toString() ?? '',
        comment: ticket?.note ?? ''
    };
    const jobImgs = ticket?.images?.map(image => image?.imageUrl) ?? [];
    const technicianNote = invoice?.technicianMessages?.notes?.filter((note) => note?.id !== jobNote.id)[0]?.comment ?? '';
    const jobNotes = invoice?.technicianMessages?.notes?.filter(note => note?.id === jobNote?.id)[0]?.comment ?? '';
    const technicianImages = invoice?.technicianMessages?.images.filter((image) => !jobImgs.includes(image)) ?? [];
    const jobImages = invoice?.technicianMessages?.images?.filter((image) => jobImgs?.includes(image)) ?? [];

    const base64Images = await convertImagesToBase64(invoice?.technicianMessages?.images);
    const base64JobImages = await convertImagesToBase64(jobImages);
    const base64TechnicianImages = await convertImagesToBase64(technicianImages);

    const numbOfColumns = 5;

    const jobImagesForPDF = [];
    for (let j = 0; j < base64JobImages.length; j++) {
        jobImagesForPDF.push({ image: base64JobImages[j], width: 150 });
    }
    const jobNumRows = Math.ceil(jobImagesForPDF.length / numbOfColumns);
    const jobBase64ImagesRows = [];
    for (let i = 0; i < jobNumRows; i++) {
        const start = i * numbOfColumns;
        const end = Math.min(start + numbOfColumns, jobImagesForPDF.length);
        const rowImages = jobImagesForPDF.slice(start, end);

        jobBase64ImagesRows.push({
            margin: [30, 0, 0, 30],
            columnGap: 2,
            columns: rowImages,
        });
    }

    const technicianImagesForPDF = [];
    for (let j = 0; j < base64TechnicianImages.length; j++) {
        technicianImagesForPDF.push({ image: base64TechnicianImages[j], width: 150 });
    }
    const numRows = Math.ceil(technicianImagesForPDF.length / numbOfColumns);
    const techBase64ImagesRows = [];
    for (let i = 0; i < numRows; i++) {
        const start = i * numbOfColumns;
        const end = Math.min(start + numbOfColumns, technicianImagesForPDF.length);
        const rowImages = technicianImagesForPDF.slice(start, end);

        techBase64ImagesRows.push({
            margin: [30, 0, 0, 30],
            columnGap: 2,
            columns: rowImages,
        });
    }


    // Construct Billing Address object
    const billingAddress = {
        street: invoice.companyLocation ? `${(companyLocation.isAddressAsBillingAddress ? companyLocation.address?.street : companyLocation.billingAddress?.street) ?? ''}` : `${company.address?.street ?? ''}`,
        city: invoice.companyLocation ? `${(companyLocation.isAddressAsBillingAddress ? companyLocation.address?.city : companyLocation.billingAddress?.city) ?? ''}` : `${company.address?.city ?? ''}`,
        state: invoice.companyLocation ? `${(companyLocation.isAddressAsBillingAddress ? companyLocation.address?.state : companyLocation.billingAddress?.state) ?? ''}` : `${company.address?.state ?? ''}`,
        zipCode: invoice.companyLocation ? `${(companyLocation.isAddressAsBillingAddress ? companyLocation.address?.zipCode : companyLocation.billingAddress?.zipCode) ?? ''}` : `${company.address?.zipCode ?? ''}`,
    };

    // Construct Customer Address object
    const customerAddress = {
        street: customer?.address?.street ? `${customer?.address?.street}` : '',
        city: customer?.address?.city ? `, ${customer?.address?.city}` : '',
        state: customer?.address?.state ? `, ${customer?.address?.state}` : '',
        zipCode: customer?.address?.zipCode ? `, ${customer?.address?.zipCode}` : '',
    };

    // Construct default Job Service Address and Job Site Address object
    const jobAddress: any = { ...customerAddress };
    const jobSiteAddress: any = { ...customerAddress };

    if (job) {
        // Take Job Location address if any
        const jobLocation = <IJobLocation>job.jobLocation;
        if (jobLocation) {
            jobAddress.name = jobLocation?.name ?? '';
            jobAddress.street = jobLocation?.address?.street ?? '';
            jobAddress.city = jobAddress.street && jobLocation?.address?.city ? ', ' : '';
            jobAddress.city += jobLocation?.address?.city ?? '';
            jobAddress.state = (jobAddress.street || jobAddress.city) && jobLocation?.address?.state ? ', ' : '';
            jobAddress.state += jobLocation?.address?.state ?? '';
            jobAddress.zipCode = (jobAddress.street || jobAddress.city || jobAddress.state) && jobLocation?.address?.zipcode ? ', ' : '';
            jobAddress.zipCode += jobLocation?.address?.zipcode ?? '';
        }

        // Take Job Site address if any
        const site = <IJobSite>job.jobSite;
        if (site) {
            jobSiteAddress.name = site?.name ?? '';
            jobSiteAddress.street = jobSiteAddress.name ? '\n' : '';
            jobSiteAddress.street += site?.address?.street ?? '';
            jobSiteAddress.city = jobSiteAddress.street && site?.address?.city ? ', ' : '';
            jobSiteAddress.city += site?.address?.city ?? '';
            jobSiteAddress.state = (jobSiteAddress.street || jobSiteAddress.city) && site?.address?.state ? ', ' : '';
            jobSiteAddress.state += site?.address?.state ?? '';
            jobSiteAddress.zipCode = (jobSiteAddress.street || jobSiteAddress.city || jobSiteAddress.state) && site?.address?.zipcode ? ', ' : '';
            jobSiteAddress.zipCode += site?.address?.zipcode ?? '';
        }
    }

    // Construct default Company Logo image
    let companyImage: any = {
        text: '',
        fillColor: '#cccccc'
    };

    let companyLogoFilePath = '';

    if (company.info?.logoUrl) {
        // Check and download Company Logo to /tmp file
        companyLogoFilePath = await downloadFileToPath(company, company.info.logoUrl, INVOICE_IMAGE_PATH, true);

        companyImage = {
            image: 'companyLogo',
            width: 67,
            height: 52,
            margin: [0, 20, 0, 10],
            border: [false, false, false, true],
            rowSpan: 2
        };
    }

    // Construct the header for the Invoice Items
    const table: any = {
        headerRows: 1,
        widths: [20, 220, 50, 110, 48, 110, 20],
        body: [
            [
                { text: '', style: 'itemTitle' },
                {
                    text: 'Service / Product',
                    style: 'itemTitle',
                },
                {
                    text: 'Quantity',
                    style: 'itemTitle',
                    alignment: 'center'
                },
                {
                    text: 'Price',
                    style: 'itemTitle',
                    alignment: 'center'
                },
                {
                    text: 'Taxable',
                    style: 'itemTitle',
                    alignment: 'center',
                },
                {
                    text: 'Amount',
                    style: 'itemTitle',
                    alignment: 'right',
                },
                { text: '', style: 'itemTitle' },
            ],
        ],
    };

    // Add Invoice's Items to table template
    const bodyTable: any = [];
    invoice.items.forEach(item => {
        const itemPopulated = <IItem>item.item;

        bodyTable.push([
            {},
            {
                stack: [
                    { text: `${item.name ?? itemPopulated?.name ?? ''}`, style: 'itemListBold' },
                    { text: `${item.description ?? itemPopulated?.description ?? ''}`, style: 'itemList' }
                ]
            },
            { text: item.quantity, style: 'itemListCenter' },
            { text: `${helper.delimiterEnUs(item.price)}`, style: 'itemListCenter' },
            { text: item.taxAmount === 0 ? '' : '', style: 'icon' },
            { text: `${helper.delimiterEnUs(item.subTotal)}`, style: 'itemListRight' },
            {}
        ]);
    });

    bodyTable.push([{}, {}, {}, {}, {}, {}, {}]);
    for (let i = 0; i < bodyTable.length; i++) {
        table.body.push(bodyTable[i]);
    }

    // INITIALIZE INVOICE PDF TEMPLATE
    const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [0, 0, 50, 30],
        content: [
            {
                // HEADER FIRST LINE: COMPANY LOGO, NAME, VENDOR, & INVOICE ID
                table: {
                    headerRows: 1,
                    widths: [10, 80, 170, 110, 167, 10],
                    body: [
                        [
                            {},
                            companyImage,
                            {
                                text: `${company.info?.companyName ?? ' '}`,
                                style: 'companyName',
                                margin: [0, 20, 0, 0],
                                colSpan: 2,
                            },
                            {},
                            {
                                text: `${invoice.invoiceId ? invoice.invoiceId?.toUpperCase() : ' '}`,
                                style: 'invoiceId',
                                alignment: 'right',
                                margin: [0, 20, 0, 0]
                            },
                            {}
                        ],
                        [
                            {},
                            {},
                            {
                                text: `${billingAddress.street}\n${billingAddress.city}${billingAddress.state ? ', ' + billingAddress.state : ''}${billingAddress.zipCode ? ', ' + billingAddress.zipCode : ''}\n${company.contact?.phone ?? ''}`,
                                style: 'invoiceHeader',
                                margin: [0, 0, 0, 10],
                                border: [false, false, false, true]
                            },
                            {
                                stack: [
                                    { text: 'Vendor Number', style: 'headerTitleBold' },
                                    { text: invoice.vendorId ?? '', style: 'invoiceHeader' },
                                ],
                                margin: [0, -2, 0, 10],
                                border: [false, false, false, true]
                            },

                            invoice?.showJobId ? {
                                stack: [
                                    { text: 'Job Number', style: 'headerTitleBold' },
                                    { text: job?.jobId ?? '', style: 'invoiceHeader' },
                                ],
                                margin: [0, -2, 0, 10],
                                border: [false, false, false, true]
                            } : {},
                            { text: '', margin: [0, 0, 0, 10], border: [false, false, false, true] },
                        ]
                    ],
                },
                fillColor: '#F9FDFF',
                layout: {
                    ...Layouts.noBorders,
                    hLineColor: (i: number, node: any) => {
                        return '#D0D3DC';
                    },
                    hLineWidth: (i: number, node: any) => {
                        return 1;
                    }
                },
            },
            {
                // HEADER SECOND LINE: CUSTOMER & INVOICE INFORMATION
                table: {
                    widths: [10, 160, 160, 110, 97, 10],
                    body: [
                        [
                            // Bill To, Customer Name, Job PO Title, & Job PO,
                            // we put only Job PO here so it could adjust the break,
                            // based on the lenght of the Invoice PO number
                            {},
                            {
                                stack: [
                                    { text: 'Bill To', style: 'headerTitle' },
                                    { text: customer?.profile?.displayName ?? ' ', style: 'invoiceHeaderBold' }
                                ],
                                rowSpan: 2,
                                margin: [0, 10, 0, 10],
                            },
                            {},
                            { text: 'Job PO/Sales Order:', style: 'invoiceMetadataTitle', margin: [0, 10, 0, 0] },
                            { text: invoice.customerPO ?? ' ', style: 'invoiceMetadata', margin: [0, 10, 0, 0] },
                            {}
                        ],
                        [
                            // The other invoice metadata in here
                            {}, {}, {},
                            {
                                stack: [
                                    { text: 'Invoice Date:', style: 'invoiceMetadataTitle' },
                                    { text: 'Due Date:', style: 'invoiceMetadataTitle' },
                                    { text: 'Terms:', style: 'invoiceMetadataTitle' }
                                ],
                                rowSpan: 2,
                            },
                            {
                                stack: [
                                    {
                                        text: `${moment(invoice.issuedDate ?? invoice.createdAt).format('MMM. DD, YYYY')}`,
                                        style: 'invoiceMetadata'
                                    },
                                    {
                                        text: `${invoice.dueDate ? moment(invoice.dueDate).format('MMM. DD, YYYY') : ' '}`,
                                        style: 'invoiceMetadata'
                                    },
                                    { text: paymentTerm?.name ?? ' ', style: 'invoiceMetadata' }
                                ],
                                rowSpan: 2,
                            },
                            {}
                        ],
                        [
                            // We put the Subdivision, Job Address, Contact name here,
                            // so the Contact Title and Name could be in alignment
                            {},
                            {
                                stack: [
                                    { text: 'Subdivision', style: 'headerTitle' },
                                    { text: jobAddress.name ?? ' ', style: 'invoiceHeader' },
                                    { text: 'Job Address', style: 'headerTitle', margin: [0, 10, 0, 0] },
                                    {
                                        text: `${jobSiteAddress.name ?? ' '}${jobSiteAddress.street ?? ' '}`,
                                        style: 'invoiceHeader'
                                    }
                                ],
                                rowSpan: 2,
                                margin: [0, 0, 0, 10],
                                border: [false, false, false, true]
                            },
                            {
                                stack: [
                                    { text: 'Contact Details', style: 'headerTitle' },
                                    { text: customerContact?.name ?? ' ', style: 'invoiceHeader' }
                                ],
                                margin: [0, 0, 0, 5],
                            },
                            {}, {}, {}
                        ],
                        [
                            // We put the contact phone and email here,
                            // so it could be long to the right,
                            // right under the Terms information
                            {}, {},
                            {
                                stack: [
                                    { text: customerContact?.phone ?? ' ', style: 'invoiceHeader' },
                                    { text: customerContact?.email ?? ' ', style: 'invoiceHeader' }
                                ],
                                colSpan: 3,
                                margin: [0, 0, 0, 10],
                                border: [false, false, false, true]
                            },
                            {}, {}, {}
                        ]
                    ]
                },
                fillColor: '#F9FDFF',
                layout: {
                    ...Layouts.noBorders,
                    hLineColor: (i: number, node: any) => {
                        return '#D0D3DC';
                    },
                    hLineWidth: (i: number, node: any) => {
                        return 1;
                    }
                },
            },
            {
                // INVOICE LINE
                table,
                layout: {
                    ...Layouts.custom,
                    paddingLeft: (i: number, node: any) => {
                        return 1;
                    },
                    paddingRight: (i: number, node: any) => {
                        return 1;
                    },
                    paddingTop: (i: number, node: any) => {
                        return 5;
                    },
                    paddingBottom: (i: number, node: any) => {
                        return 5;
                    },
                },
            },
            {
                // INVOICE SUBTOTAL TOTAL AMOUNTDUE
                table: {
                    widths: [308, 148, 110, 20],
                    body: [
                        [
                            {},
                            { text: 'Subtotal:', style: 'itemListRight', border: [false, false, false, true] },
                            {
                                text: `${helper.delimiterEnUs(invoice.subTotal)}`,
                                style: 'itemListRight',
                                border: [false, false, false, true]
                            },
                            {}
                        ],
                        [
                            {},
                            { text: 'Tax:', style: 'itemListRight', border: [false, false, false, true] },
                            {
                                text: `${helper.delimiterEnUs(invoice.taxAmount)}`,
                                style: 'itemListRight',
                                border: [false, false, false, true]
                            },
                            {}
                        ],
                        [
                            {},
                            { text: 'Total:', style: 'itemListRight', border: [false, false, false, true] },
                            {
                                text: `${helper.delimiterEnUs(invoice.total)}`,
                                style: 'itemListRight',
                                border: [false, false, false, true]
                            },
                            {}
                        ],
                        [
                            {},
                            { text: 'Payments Applied:', style: 'itemListRight', border: [false, false, false, true] },
                            {
                                text: `${helper.delimiterEnUs(invoice.paymentApplied)}`,
                                style: 'itemListRight',
                                border: [false, false, false, true]
                            },
                            {}
                        ],
                        [
                            {},
                            { text: 'AMOUNT DUE:', style: 'amountDueTitle', border: [false, false, false, true] },
                            {
                                text: `${helper.delimiterEnUs(invoice.balanceDue)}`,
                                style: 'amountDue',
                                border: [false, false, false, true]
                            },
                            {}
                        ]
                    ]
                },
                layout: {
                    ...Layouts.noBorders,
                    hLineColor: (i: number, node: any) => {
                        return '#D0D3DC';
                    },
                    hLineWidth: (i: number, node: any) => {
                        return 1;
                    },
                    paddingLeft: (i: number, node: any) => {
                        return 1;
                    },
                    paddingRight: (i: number, node: any) => {
                        return 1;
                    },
                    paddingTop: (i: number, node: any) => {
                        return 5;
                    },
                    paddingBottom: (i: number, node: any) => {
                        return 5;
                    },
                },
            },
            {
                text: '', // Empty text to create a new page
                pageBreak: 'after' // Create a new page after this element
            },
            // {
            //     rowSpan:2, image: base64Image,
            //},
            // {
            //     margin: [2, 2, 2, 2],
            //     columnGap: 3,
            //     columns: rows,
            //},
            // ...rows,

            {
                table: {
                    widths: [10, 900, 900, 900, 900, 10],
                    body: [
                        [
                            {},
                            {
                                stack: [
                                    { text: 'Job/Ticket Details', style: 'headerTitle' },
                                    { text: jobNotes, style: 'invoiceHeaderBold' }
                                ],
                                rowSpan: 2,
                                margin: [0, 10, 0, 10]
                            }, {}, {}, {}, {}
                        ],
                        [{}, {}, {}, {}, {}, {}]
                    ]
                },
                fillColor: '#ffffff',
                layout: {
                    ...Layouts.noBorders,
                    hLineColor: (i: number, node: any) => {
                        return '#D0D3DC';
                    },
                    hLineWidth: (i: number, node: any) => {
                        return 1;
                    }
                },
            },
            ...jobBase64ImagesRows,
            {
                table: {
                    widths: [10, 900, 900, 900, 900, 10],
                    body: [
                        [
                            {},
                            {
                                stack: [
                                    { text: 'Technician comments', style: 'headerTitle' },
                                    { text: technicianNote, style: 'invoiceHeaderBold' }
                                ],
                                rowSpan: 2,
                                margin: [0, 10, 0, 10]
                            }, {}, {}, {}, {}
                        ],
                        [{}, {}, {}, {}, {}, {}]
                    ]
                },
                fillColor: '#ffffff',
                layout: {
                    ...Layouts.noBorders,
                    hLineColor: (i: number, node: any) => {
                        return '#D0D3DC';
                    },
                    hLineWidth: (i: number, node: any) => {
                        return 1;
                    }
                },
            },
            ...techBase64ImagesRows,
        ],
        footer: (currentPage: number, pageCount: number) => {
            return [{
                table: {
                    widths: [20, 535, 20],
                    body: [
                        [
                            {},
                            {
                                text: `Page ${currentPage} of ${pageCount}`,
                                style: 'smallFontGray',
                                alignment: 'right',
                                margin: [0, 10]
                            },
                            {}
                        ],
                    ],
                },
                fillColor: '#F9FDFF',
                layout: { ...Layouts.noBorders },
            }];
        },
        styles: Styles.invoice,
        defaultStyle: {
            columnGap: 10,
            font: 'Roboto',
        },
        images: {
            companyLogo: companyLogoFilePath
        },
    };

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

    return await new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
            if (company.info?.logoUrl) {
                fs.unlink(companyLogoFilePath, (err) => {
                    if (err) console.log(`Error in deleting temporary company logo image file "${companyLogoFilePath}" : ${err}`);
                });
            }
            resolve('');
        })
            .on('error', (error) => {
                reject('Error in _generateInvoicePdf: ' + error);
            });
    });
};

// Check and download Company Logo to /tmp file and return the image fullpath
export const downloadFileToPath = async (
    company: ICompany,
    sourceUrl: string,
    absoluteTargetPath: string,
    makeFileNameUnique: boolean
): Promise<string> => {

    try {
        const filename = company.info.companyName.replace(/\s+/g, '').toLowerCase() + (makeFileNameUnique ? '_' + uuidv4() : '');
        const fullPath = `${absoluteTargetPath}/${filename}.jpg`;
        if (!fs.existsSync(absoluteTargetPath)) {
            fs.mkdirSync(absoluteTargetPath);
        }
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }

        const protocol = sourceUrl.startsWith('https') ? https : http;
        return await new Promise((resolve, reject) => {
            protocol.get(sourceUrl, async (res) => {
                await new Promise<void>((resolve2, reject2) => {
                    const file = fs.createWriteStream(fullPath);
                    res.pipe(file);

                    file.on('finish', () => {
                        file.close();
                        resolve2();
                    });
                });

                resolve(fullPath);
            });
        });
    } catch (error) {
        Sentry.captureException(error);
        console.log('Error in downloadFileToPath: ', error);
        throw error;
    }
};

/**
 * @description Checks if a file exists on specified path
 */
export const fileExists = async (absolutePath: string): Promise<boolean> => {
    return fs.existsSync(absolutePath);
};

export const updateCommission = async (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    let commissionBalance = 0;

    // Insert into commissionHistory
    const commissionHistory = new CommissionHistory({
        technicianOrContractor: params.id,
        effectiveDate: params.commissionEffectiveDate,
        commission: params.commission,
        commissionType: params.commissionType,
        type: params.type,
        editedBy: {
            id: user._id,
            displayName: user.profile.displayName,
        },
    });

    const isFixed = params.commissionType === 'fixed';

    await commissionHistory.save();

    switch (params.type) {
    case 'vendor':
        const contractor = await Company.findById(params.id).exec();
        if (!contractor) {
            return res.json({ status: Status.Error, message: 'Vendor not found' });
        }

        // Update vendor's commission rate
        contractor.commissionType = params.commissionType ?? '%';
        if (isFixed) {
            contractor.commission = 0;
            contractor.commissionTier = params.commissionTier;
        } else {
            contractor.commission = params.commission ?? null;
            contractor.commissionTier = null;
        }

        // Check if the date is greater than today, if so, do nothing... else, do as you used to..
        if (moment.utc(params.commissionEffectiveDate).isSameOrBefore(moment(), 'day') && !isFixed) {
            // Update vendor's commission rate
            contractor.commission = params.commission ?? null;

            // Find if vendor already have invoice commission
            // --should only happen if the invoice issued date is greater than the effective date
            const contractorInvoiceCommissions = await InvoiceCommission.find({ 'technicians.contractor': contractor._id })
                .populate('invoice')
                .exec();

            if (contractorInvoiceCommissions?.length) {
                // Iterate all invoice commissions
                for (const invoiceCommission of contractorInvoiceCommissions) {
                    const invoice = <IInvoice>invoiceCommission.invoice;
                    const totalTechnician = invoiceCommission?.technicians?.length ?? 0;
                    const contractorCommission = invoiceCommission?.technicians?.find((technician) => technician?.contractor?.toString() === contractor._id?.toString());

                    if (!contractorCommission) {
                        continue;
                    }

                    if (!contractorCommission.paid) {
                        /**
                             * If invoice commission is not been paid,
                             * update the amount with the new rate
                             * now for this invoice- let's get the issuedDate and compare it to params effective date
                             * if the issued date is less than effective date-- don't update, else update
                             **/
                        if (moment.utc(params.commissionEffectiveDate).isSameOrBefore(moment.utc(invoice?.issuedDate ?? invoice?.createdAt), 'day')) {
                            contractorCommission.commission = params.commission ?? null;
                            const commissionAmount = (((invoice?.total ?? 0) / totalTechnician) * Number(params.commission ?? 0)) / 100;
                            contractorCommission.commissionAmount = Number(commissionAmount?.toFixed(2));
                        }
                    }

                    // Recalculate vendor open balance
                    commissionBalance += contractorCommission.commissionAmount ?? 0;
                    await invoiceCommission.save();
                }

                // Update vendor balance and save vendor object
                contractor.balance = commissionBalance;
            }
        }

        if (moment.utc(params.commissionEffectiveDate).isSameOrBefore(moment(), 'day') && isFixed) {
            const jobCommissions = await JobCommission.find({ 'technicians.contractor': contractor._id })
                .populate('job')
                .exec();

            if (jobCommissions?.length) {
                // Iterate all job commissions
                for (const jobCommission of jobCommissions) {
                    const job = <IJob>jobCommission.job;
                    const contractorCommission = jobCommission?.technicians?.find((technician) => technician?.contractor?.toString() === contractor._id?.toString());

                    if (!contractorCommission) {
                        continue;
                    }

                    if (!contractorCommission.paid && (moment.utc(params.commissionEffectiveDate).isSameOrBefore(moment.utc(jobCommission?.createdAt), 'day'))) {
                        /**
                             * If job commission is not been paid,
                             * update the amount with the new rate, else update
                             **/
                        contractorCommission.commission = params.commission ?? 0;
                        contractorCommission.commissionAmount = 0;
                        for (const task of job.tasks) {
                            if (String(task.contractor) == String(contractor._id)) {
                                for (const j of task.jobTypes) {
                                    const jobType = await Item.findOne({ jobType: j.jobType });

                                    const commissionTier = contractor.commissionTier as IJobCosting;
                                    const commissionTierId = commissionTier._id || contractor.commissionTier;
                                    if (commissionTierId) {
                                        const commissionTier = jobType.costing.find(({ tier }) => String(tier) == String(commissionTierId));
                                        if (commissionTier?.charge) {
                                            contractorCommission.commissionAmount += commissionTier.charge;
                                        }
                                    }
                                }
                            }
                        }
                        const commisionHistory = await CommissionHistory.find({ job: job._id, technicianOrContractor: contractor._id }).sort({ createdAt: -1 });
                        if (commisionHistory.length) {
                            contractorCommission.commissionAmount += commisionHistory[0].addition?.amount || 0;
                            contractorCommission.commissionAmount -= commisionHistory[0].deduction?.amount || 0;
                        }
                    }

                    // Recalculate vendor open balance
                    commissionBalance += contractorCommission.commissionAmount ?? 0;
                    await jobCommission.save();
                }

                // Update vendor balance and save vendor object
                contractor.balance = commissionBalance;
            }
        }

        await contractor.save();
        return res.json({ status: Status.Success, message: 'Commission updated successfully', contractor });

    case 'employee':
        const employee = await User.findById(params.id).exec();
        if (!employee) {
            return res.json({ status: Status.Error, message: 'Employee not found' });
        }

        // Check if the date is greater than today, if so, do not update commision... else, do as you used to..
        if (moment.utc(params.commissionEffectiveDate).isSameOrBefore(moment(), 'day')) {
            // Update employee's commission rate
            employee.commission = params.commission ?? null;

            // Find if employee already have invoice commission
            // --should only happen if the invoice issued date is greater than the effective date
            const employeeInvoiceCommissions = await InvoiceCommission.find({ 'technicians.technician': employee._id })
                .populate('invoice')
                .exec();

            if (employeeInvoiceCommissions?.length) {
                // Iterate all invoice commissions
                for (const invoiceCommission of employeeInvoiceCommissions) {
                    const invoice = <IInvoice>invoiceCommission.invoice;
                    const totalTechnician = invoiceCommission?.technicians?.length ?? 0;
                    const employeeCommission = invoiceCommission.technicians?.find((technician) => technician?.technician?.toString() === employee._id?.toString());

                    if (!employeeCommission) {
                        continue;
                    }

                    if (!employeeCommission.paid) {
                        /**
                             * If invoice commission is not been paid,
                             * update the amount with the new rate
                             * now for this invoice- let's get the issuedDate and compare it to params effective date
                             * if the issued date is less than effective date-- don't update, else update
                             **/
                        if (moment.utc(params.commissionEffectiveDate).isSameOrBefore(moment.utc(invoice?.issuedDate ?? invoice?.createdAt), 'day')) {
                            employeeCommission.commission = params.commission ?? null;
                            const commissionAmount = (((invoice?.total ?? 0) / totalTechnician) * Number(params.commission ?? 0)) / 100;
                            employeeCommission.commissionAmount = Number(commissionAmount?.toFixed(2));
                        }
                    }

                    // Recalculate employee open balance
                    commissionBalance += employeeCommission.commissionAmount ?? 0;
                    await invoiceCommission.save();
                }
            }

            // Update employee balance and save employee object
            employee.balance = commissionBalance;
        } //else part here for commission processing if date is in future

        await employee.save();
        return res.json({ status: Status.Success, message: 'Commission updated successfully', employee });

    default:
        return res.json({
            status: Status.Success,
            message: 'Type not supported. Available Type to be used: vendor or employee.'
        });
    }

};

export const getCommissionHistory = async (req: Request, res: Response) => {
    const { beneficiaryId } = req.params;
    const commissionHistories = await CommissionHistory.find({ technicianOrContractor: beneficiaryId });
    return res.json({ 'status': Status.OK, 'history': commissionHistories });
};


export const getCommissionHistoryByJob = async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const commissionHistories = await CommissionHistory.find({ job: jobId });
    return res.json({ 'status': Status.OK, 'history': commissionHistories });
};


export const updateCommissionCron = async (req: Request, res: Response) => {

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);
    // get commission_ histories whole effective date is today
    const commissionHistories = await CommissionHistory.find({ effectiveDate: { $gte: start, $lt: end } });
    if (commissionHistories?.length > 0) {
        for (const history of commissionHistories) {
            //    if type is contractor
            if (history?.type === 'vendor') {

                const contractor = await Company.findById(history.technicianOrContractor).exec();
                if (contractor) {
                    //update that commision
                    contractor.commission = history.commission;
                    await contractor.save();
                }
            } else if (history?.type === 'employee') {
                const employee = await User.findById(history.technicianOrContractor).exec();
                if (employee) {
                    // update employee
                    employee.commission = history.commission;
                    await employee.save();

                }

            }

        }
    }
    return res.json({ status: Status.OK });
};

export const getInvoicesByContractor = async (req: Request, res: Response) => {

    let jobQuery, query: any;
    const params = req.query;
    const company = <ICompany>req.company;
    const startDate = moment(params.startDate).startOf('day').utcOffset(params.offset ?? '', true).utc().format();
    const endDate = moment(params.endDate).endOf('day').utcOffset(params.offset ?? '', true).utc().format();

    if (params.startDate && params.endDate) {
        query = { issuedDate: { $gte: startDate, $lte: endDate } };
    }

    if (params.name) {
        // find to note or vendorId
        query.$or = [
            { note: { $regex: params.name, $options: 'i' } },
            { vendorId: { $regex: params.name, $options: 'i' } },
            { invoiceId: { $regex: params.name, $options: 'i' } },
        ];
    }

    if (!params.id) {
        return res.json({ status: Status.Error, message: 'Id is required when type is vendor' });
    }

    switch (params.type) {
    case 'vendor':
        jobQuery = { company, 'tasks.contractor': params.id };
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
        .populate({ path: 'jobLocation', select: 'name address location' })
        .populate({ path: 'jobSite', select: 'name address location' })
        .populate({ path: 'customerContactId', select: 'name phone email' })
        .populate({
            path: 'estimate',
            select: 'total items note status customer company createdBy'
        }).exec();

    if (!invoices) {
        return res.json({ status: Status.Success, invoices: '' });
    }

    return res.json({ status: Status.Success, invoices });

};

export const unVoidInvoice = async (req: Request, res: Response) => {

    const params = req.body;
    let invoice = await Invoice.findById(params.invoiceId);
    const company = <ICompany>req.company;
    const user = <IUser>req.user;

    if (!invoice) {

        return res.json({ status: Status.Error, message: 'Invoice not found.' });
    }
    if (invoice.isVoid == false) {

        return res.json({ status: Status.Error, message: 'Invoice already un-voided.' });
    }

    // TODO: Check more properly for all possible payments ?
    // const payment = await Payment.findOne({invoice: invoice._id});
    // if (payment || invoice.status !== InvoiceStatus.UNPAID) {
    if (invoice.status !== InvoiceStatus.UNPAID) {

        return res.json({
            status: Status.Error,
            message: 'Invoice already paid or partially paid, cannot void this invoice.'
        });
    }
    const oldInoviceId = invoice._id;
    invoice = invoice.toObject();
    delete invoice._id;
    delete invoice.createdAt;
    delete invoice.updatedAt;
    const invoiceNumber = (company.currentInvoiceId + 1);
    invoice.invoiceId = (company.currentInvoiceId + 1).toString();
    invoice.invoiceId = `Invoice ${invoice.invoiceId}`;
    invoice.isVoid = false;
    invoice = await new Invoice(invoice).save();
    if (invoice) {

        const invoiceLogsObj:any={ invoiceId: invoice.invoiceId, invoice: invoice._id, type: logType.DUPLICATE, oldInvoiceId: params.invoiceId, customer: invoice.customer, companyLocation: invoice.companyLocation, workType: invoice.workType, company: invoice.company, createdBy: user._id };
        InvoiceLogController.create(invoiceLogsObj);

    }

    const invoiceCommission = await InvoiceCommission.findOne({ invoice: invoice._id });
    // add commission to invoice

    if (!invoice.isDraft) {

        if (invoice.job) {
            const customer = await Customer.findById(invoice.customer);
            const job = await Job.findById(invoice.job);
            customer.balance += invoice.total;
            await customer.save();

            const invoiceCommissionEntry = [];
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
                        };

                        if (contractor && contractor.commissionType != 'fixed') {

                            contractor.balance += Number(commission.toFixed(2));
                            contractor.save();
                        }
                        invoiceCommissionEntry.push(contractorEntry);
                    }

                    if (task.technician && !task.contractor) {
                        const technician = await User.findOne({ _id: task.technician }).exec();
                        const commission = (invoice.total / totalTechnician) * (technician.commission ?? DefaultCommission.EMPLOYEE_COMMISSION) / 100;
                        const invoiceTechnicianEntry: any = {
                            technician: technician._id,
                            commission: technician.commission,
                            commissionAmount: Number(commission.toFixed(2))
                        };

                        if (technician) {
                            technician.balance += Number(commission.toFixed(2));
                            technician.save();
                        }

                        invoiceCommissionEntry.push(invoiceTechnicianEntry);
                    }
                }
            }

            const invoiceCommission = await new InvoiceCommission({
                invoice: invoice._id,
                technicians: invoiceCommissionEntry
            }).save();

            invoice.commission = invoiceCommission._id;

            await invoice.save();

            const jobReport = await JobReport.findOne({ job: invoice.job });
            if (jobReport) {
                jobReport.invoiceCreated = true;
                jobReport.invoiceVoid = false;
                jobReport.invoice = invoice._id;
                await jobReport.save();
            }
            if (company.qbAuthorized && !invoice.isDraft) {
                /**
                 * Check Customer & Job Locations data on QBooks,
                 * if not found, create them on QBooks
                 */
                {
                    // Create new Invoice in QuickBooks
                    _createQBInvoice(req, res, company, invoice, (err, errMsg, qbInvoice) => {
                        if (err || errMsg) {
                            return res.json({
                                status: Status.Success,
                                message: 'Duplicate Job invoice created successfully.',
                                invoice,
                                quickbookInvoice: null,
                                quickbookInvoiceError: errMsg
                            });
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
                            message: 'Duplicate Job invoice created successfully.',
                            invoice,
                            quickbookInvoice: qbInvoice
                        });
                    });
                }

            } else {
                return res.json({ status: Status.Success, message: 'Duplicate Job invoice created successfully.', invoice });
            }

        }
        // @ts-ignore
        else if (invoice.hasOwnProperty('purchaseOrder') && invoice.purchaseOrder != null && invoice.purchaseOrder != '""') {

            console.log('is a PO');

            const companyUpdate = await company.updateOne({ currentInvoiceId: invoiceNumber });
            const poUpdate = PurchaseOrder.updateOne({ _id: invoice.purchaseOrder }, { invoiceCreated: true });

            const customer = await Customer.findById(invoice.customer);
            customer.balance += invoice.total;
            await customer.save();
            if (company.qbAuthorized && !invoice.isDraft) {
                /**
                 * Check Customer & Job Locations data on QBooks,
                 * if not found, create them on QBooks
                 */
                const customerId = invoice.customer.toString();

                {
                    // Create new Invoice in QuickBooks
                    _createQBInvoice(req, res, company, invoice, (err, errMsg, qbInvoice) => {
                        if (err || errMsg) {
                            return res.json({
                                status: Status.Success,
                                message: 'Duplicate Purchase order invoice created successfully.',
                                invoice,
                                quickbookInvoice: null,
                                quickbookInvoiceError: errMsg
                            });
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
                            message: 'Duplicate Purchase order invoice created successfully.',
                            invoice,
                            quickbookInvoice: qbInvoice
                        });
                    });
                }

            } else {
                return res.json({
                    status: Status.Success,
                    message: 'Duplicate Purchase order invoice created successfully.',
                    invoice
                });
            }
        }
        // @ts-ignore
        else if (invoice.hasOwnProperty('estimate') && invoice.estimate != null && invoice.estimate != '""') {

            console.log('is a estimate');

            const companyUpdate = await company.updateOne({ currentInvoiceId: invoiceNumber });
            const estimateUpdate = Estimate.updateOne({ _id: invoice.estimate }, { invoiceCreated: true });

            if (!invoice.isDraft) {
                const customer = await Customer.findById(invoice.customer);
                customer.balance += invoice.total;
                await customer.save();

            }
            if (company.qbAuthorized && !invoice.isDraft) {
                /**
                 * Check Customer & Job Locations data on QBooks,
                 * if not found, create them on QBooks
                 */

                {
                    // Create new Invoice in QuickBooks
                    _createQBInvoice(req, res, company, invoice, (err, errMsg, qbInvoice) => {
                        if (err || errMsg) {
                            return res.json({
                                status: Status.Success,
                                message: 'Duplicate Estimate invoice created successfully.',
                                invoice,
                                quickbookInvoice: null,
                                quickbookInvoiceError: errMsg
                            });
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
                            message: 'Duplicate Estimate invoice created successfully.',
                            invoice,
                            quickbookInvoice: qbInvoice
                        });
                    });
                }

            } else {
                return res.json({
                    status: Status.Success,
                    message: 'Duplicate Estimate invoice created successfully.',
                    invoice
                });
            }
        }
        else {
            console.log('is a something else');

            company.updateOne({ currentInvoiceId: invoiceNumber })
                .exec(async (companyError: any) => {
                    if (companyError) {
                        return res.json({ status: Status.Error, message: Messages.GenericError });
                    }

                    const customer = await Customer.findById(invoice.customer);
                    if (!invoice.isDraft) {
                        customer.balance += invoice.total;
                        await customer.save();
                    }

                    if (company.qbAuthorized && !invoice.isDraft) {
                        /**
                         * Check Customer & Job Locations data on QBooks,
                         * if not found, create them on QBooks
                         */

                        {
                            // Create new Invoice in QuickBooks
                            _createQBInvoice(req, res, company, invoice, (err, errMsg, qbInvoice) => {
                                if (err || errMsg) {
                                    return res.json({
                                        status: Status.Success,
                                        message: 'Duplicate Invoice created successfully.',
                                        invoice: invoice,
                                        quickbookInvoice: null,
                                        quickbookInvoiceError: errMsg
                                    });
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
                                    message: 'Duplicate Invoice created successfully.',
                                    invoice: invoice,
                                    quickbookInvoice: qbInvoice
                                });
                            });
                        }
                        //});
                    } else {
                        return res.json({
                            status: Status.Success,
                            message: 'Duplicate Invoice created successfully.',
                            invoice: invoice
                        });
                    }
                });
        }


    }



};

export const voidInvoice = async (req: Request, res: Response) => {

    const params = req.body;
    const invoice = await Invoice.findById(params.invoiceId);
    const company = <ICompany>req.company;
    const user = <IUser>req.user;

    if (!invoice) {
        return res.json({ status: Status.Error, message: 'Invoice not found.' });
    }
    if (invoice.isVoid) {
        return res.json({ status: Status.Error, message: 'Invoice already voided.' });
    }

    // TODO: Check more properly for all possible payments ?
    // const payment = await Payment.findOne({invoice: invoice._id});
    // if (payment || invoice.status !== InvoiceStatus.UNPAID) {
    if (invoice.status !== InvoiceStatus.UNPAID) {
        return res.json({
            status: Status.Error,
            message: 'Invoice already paid or partially paid, cannot void this invoice.'
        });
    }

    const invoiceCommission = await InvoiceCommission.findOne({ invoice: invoice._id });
    // remove invoice commission if exsists
    if (invoiceCommission) {
        await InvoiceCommission.deleteOne({ _id: invoiceCommission._id });
    }

    invoice.isVoid = true;
    invoice.commission = null;
    await invoice.save();

    const customer = await Customer.findById(invoice.customer);
    if (customer) {
        customer.balance -= invoice.total;
        customer.balance = Math.round(customer.balance * 100) / 100;
        await customer.save();
    }

    const jobReport = await JobReport.findOne({ invoice: invoice._id });
    // remove invoice and invoiceCreated in job report if exsists
    if (jobReport) {
        await jobReport.updateOne({ $set: { invoiceVoid: true } });
    }

    if (company.qbAuthorized && invoice.quickbookId) {
        // Delete Invoice in QuickBooks when invoice have quickbook id
        await _voidQBInvoice(req, res, company, invoice);
    }
    
    const invoiceLogsObj:any={ invoiceId: invoice.invoiceId, invoice: invoice._id, type: logType.VOID, customer: invoice.customer, companyLocation: invoice.companyLocation, workType: invoice.workType, company: invoice.company, createdBy: user._id };
    InvoiceLogController.create(invoiceLogsObj);
    return res.json({ status: Status.Success, message: 'Invoice voided successfully', invoice });

};

export const generateInvoicePdf = async (req: Request, res: Response) => {
    const params = req.query;
    const company = <ICompany>req.company;
    const invoice = await Invoice
        .findOne({ _id: params.invoiceId, customer: params.customerId, company: company._id })
        .populate({
            path: 'job',
            populate: [
                { path: 'type', select: 'title description sku' },
                { path: 'tasks.jobTypes.jobType', select: 'title description sku' },
                {
                    path: 'customer',
                    select: 'info.email auth.email profile.firstName profile.lastName profile.displayName address.street address.city address.state address.unit address.zipCode contact.phone contact.fax vendorId contactName contactEmail'
                },
                { path: 'tasks.technician', select: 'profile.displayName auth.email contact.phone permissions.role' },
                {
                    path: 'tasks.contractor',
                    select: 'info.companyName info.logoUrl info.companyEmail address contact.phone contact.fax',
                    populate: { path: 'admin', select: 'profile.displayName auth.email contact.phone permissions.role' }
                },
                { path: 'ticket', populate: { path: 'ticket', populate: 'customerContactId' } },
                { path: 'jobLocation', select: 'name location address' },
                { path: 'jobSite', select: 'name location address' },
                { path: 'customerContactId', select: '-__v' }
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
        .populate({ path: 'jobLocation', select: 'name address location' })
        .populate({ path: 'jobSite', select: 'name address location' })
        .populate({
            path: 'paymentTerm',
            select: '-company -__v'
        })
        .populate({
            path: 'items.item',
            select: 'name description sku isJobType isFixed charges tax',
            populate: [{ path: 'jobType' }]
        })
        .populate({
            path: 'companyLocation',
            select: 'isAddressAsBillingAddress address billingAddress'
        });

    if (!invoice) {
        return res.json({ status: Status.NotFound, message: 'Invoice not found' });
    }

    const filepath = `${INVOICE_PDF_PATH}/${invoice.invoiceId}.pdf`;

    // Generate Invoice PDF
    await _generateInvoicePdf(company, invoice);
    const invoiceUrl = await uploadFileInS3(filepath, 'pdf');
    return res.json({ status: Status.Success, message: 'Invoice Successfully Generated', invoiceUrl: invoiceUrl });
};

// PARTIAL METHODS

/**
 * Partial method to check whether or not need to retrieve all record,
 * if no filter provided, BE will return the last 90 days records,
 * otherwise, all records shall be returned
 */
const _getIsAllRecordsByParams = async (params: any): Promise<boolean> => {
    // Default is only send the last 90 days records
    let isAllRecords = false;

    if (params.recentOnly) {
        return isAllRecords;
    }

    if (
        params.keyword ||
        params.invoiceId ||
        params.dueDate ||
        params.status ||
        (params.startAmount && params.endAmount) ||
        params.customerPO ||
        params.customerId ||
        params.customerContactId ||
        params.jobId ||
        params.jobLocationId ||
        params.jobAddress ||
        params.jobCity ||
        params.jobState ||
        params.jobZip ||
        params.technicianId ||
        (params.isDraft !== undefined && params.isDraft !== null) ||
        (params.isVoid !== undefined && params.isVoid !== null) ||
        (params.startDate && params.endDate) ||
        (params.lastEmailStartDate && params.lastEmailEndDate)
    ) {
        isAllRecords = true;
    }

    return isAllRecords;
};

export const updateJobCommission = async (req: Request, res: Response) => {
    const body = req.body;
    const user = <IUser>req.user;
    const balance = Number(body.balance);

    Company.findByIdAndUpdate(
        req.params.id,
        { balance: balance },
        { new: true }
    ).then(async (comp) => {
        const commissionHistory = new CommissionHistory({
            technicianOrContractor: req.params.id,
            job: body.job,
            commission: balance,
            addition: body.addition,
            deduction: body.deduction,
            type: 'additions & deductions',
            editedBy: {
                id: user._id,
                displayName: user.profile.displayName,
            },
        });
        await commissionHistory.save();

        const jobDetail = await Job.findById(body.job);

        const commission = await JobCommission.findById(jobDetail.commission);
        if (commission) {
            if (commission.technicians) {
                // Find the vendor on the invoice commisison object
                commission.technicians = commission.technicians.map(technician => {
                    if (technician?.contractor?.toString() === req.params.id) {
                        technician.commissionAmount = Number(balance.toFixed(2));
                    }
                    return technician;
                });

                await commission.save();
            }
        } else {
            const contractorCommissionEntry = {
                contractor: req.params.id,
                commission: body.balance,
                commissionAmount: body.balance
            };

            const jobCommisssion = await new JobCommission({
                job: body.job,
                technicians: [contractorCommissionEntry]
            }).save();

            await Job.findByIdAndUpdate(body.job, { commission: jobCommisssion }).exec();
        }

    }).then(() => res.json({ status: Status.Success, message: 'Update successful' }))
        .catch(err => res.json({ status: Status.Error, message: err.message }));
};