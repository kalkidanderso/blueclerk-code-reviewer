import { Request, Response } from 'express';
import moment from 'moment';
import { Status, Messages } from '../common/constants';

import { IContact } from '../common/contact';
import { ICompany, Company } from '../models/Company'
import { ICustomer, IQBCustomer } from '../models/Customer'
import { IJobLocation } from '../models/JobLocation';
import { IServiceTicket } from '../models/ServiceTicket';
import { IJob } from '../models/Job';
import { IItem, IQBItem } from '../models/Item';
import { IPaymentTerm } from '../models/PaymentTerm';
import { IInvoice, IQBInvoice, IQBInvoiceLine, LineDetailTypes, Invoice } from '../models/Invoice';
import { _getQbo, _refreshToken } from '../controllers/quickbook';
import { _updateQBCustomer } from '../controllers/quickbook.customer';

// ===================================
// =======[ QUICKBOOK INVOICE ]=======
// ===================================

/**
 * Generic function to create QuickBooks Invoice,
 * this used by Invoice Controller when creating new invoice,
 * and this contoller when syncing invoices
 */
export const _createQBInvoice = async (req: Request, res: Response, company: ICompany, invoice: IInvoice, next: (error: number, errorMessage: string, qbInvoice: IQBInvoice) => void) => {

    // Populate the invoice to have customer and item object
    await invoice
        .populate({ path: 'customer' })
        .populate({ path: 'paymentTerm' })
        .populate({
            path: 'job',
            populate: [{
                path: 'ticket',
                populate: [{ path: 'customerContactId' }]
            }, { path: 'jobLocation' }]
        })
        .populate({ path: 'items.item' })
        .populate({ path: 'customerContactId' })
        .execPopulate();

    // Customer of the invoice
    const customer = <ICustomer>invoice.customer;
    const paymentTerm = <IPaymentTerm>invoice.paymentTerm;
    const job = <IJob>invoice.job;
    const serviceTicket = <IServiceTicket>job?.ticket;
    const jobLocation = <IJobLocation>job?.jobLocation;
    const invCustContact = <IContact>invoice.customerContactId;
    const customerContact = <IContact>serviceTicket?.customerContactId;

    // Always refresh the token first because token valid only for 60 minutes
    _refreshToken(req, res, company, async (err, errMsg, company) => {
        if (err === 0) {
            return res.json({ status: Status.Error, message: errMsg });
        }

        if (err === 400) {
            await Company.findByIdAndUpdate(req.company._id, {
                qbAuthorized: false,
                qbAccessToken: undefined,
                qbRefreshToken: undefined
            });

            return next(Status.QBUnauthorized, Messages.QBUnAuthorized, null);
        }

        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        const qbInvoiceLines: IQBInvoiceLine[] = [];
        // Iterate all items in the invoice and construct is to QB Inv Lines
        for (const invItem of invoice.items) {
            const item = <IItem>invItem.item;

            qbInvoiceLines.push({
                DetailType: LineDetailTypes.SalesItemLineDetail,
                Amount: invItem.subTotal,
                SalesItemLineDetail: {
                    ItemRef: {
                        value: item.quickbookId
                    },
                    Qty: invItem.quantity,
                    UnitPrice: invItem.price,
                }
            });
        }

        if (invoice.subTotal) {
            qbInvoiceLines.push({
                DetailType: LineDetailTypes.SubTotalLineDetail,
                Amount: invoice.subTotal,
                SalesItemLineDetail: {}
            });
        }

        // QB Invoice Object
        const qbInvoiceEntry: IQBInvoice = {
            DocNumber: invoice.invoiceId,
            TxnDate: invoice.issuedDate?.toString(),
            DueDate: invoice.dueDate?.toString() || invoice.createdAt?.toString(),
            Line: qbInvoiceLines,
            SalesTermRef: {
                value: paymentTerm?.quickbookId
            },
            CustomerRef: {
                value: jobLocation?.quickbookId || customer.quickbookId
            },
            BillEmail: { Address: customer.info?.email },
            BillAddr: {
                Line1: customer?.address?.street,
                Line2: customer?.address?.unit,
                City: customer?.address?.city,
                CountrySubDivisionCode: customer?.address?.state,
                PostalCode: customer?.address?.zipCode,
                Long: customer?.location?.coordinates[0]?.toString(),
                Lat: customer?.location?.coordinates[1]?.toString(),
            },
            ShipAddr: {
                Line1: customer?.address?.street,
                Line2: customer?.address?.unit,
                City: customer?.address?.city,
                CountrySubDivisionCode: customer?.address?.state,
                PostalCode: customer?.address?.zipCode,
                Long: customer?.location?.coordinates[0]?.toString(),
                Lat: customer?.location?.coordinates[1]?.toString(),
            },
            CustomField: [
                {
                    DefinitionId: '1',
                    Name: 'Customer PO',
                    Type: 'StringType',
                    StringValue: invoice.customerPO || serviceTicket?.customerPO
                },
                {
                    DefinitionId: '2',
                    Name: 'Vendor Number',
                    Type: 'StringType',
                    StringValue: invoice.vendorId || customer.vendorId
                }
            ]
        };

        if (jobLocation) {
            qbInvoiceEntry.ShipAddr.Line1 = jobLocation.address?.street || null;
            qbInvoiceEntry.ShipAddr.Line2 = null;
            qbInvoiceEntry.ShipAddr.City = jobLocation.address?.city || null;
            qbInvoiceEntry.ShipAddr.CountrySubDivisionCode = jobLocation.address?.state || null;
            qbInvoiceEntry.ShipAddr.PostalCode = jobLocation.address?.zipcode || null;
            qbInvoiceEntry.ShipAddr.Long = jobLocation.location?.coordinates[0]?.toString() || null;
            qbInvoiceEntry.ShipAddr.Lat = jobLocation.location?.coordinates[1]?.toString() || null;
        }

        // Fill in Customer Contact associated if any
        if (invCustContact || customerContact) {
            qbInvoiceEntry.CustomerMemo = {
                value: `ORDERED BY:\n${invCustContact?.name || customerContact?.name}`
            }
        }

        // Create QB Invoice
        qbo.createInvoice(qbInvoiceEntry, async (err: any, qbInvoice: IQBInvoice) => {
            if (err) {
                return next(
                    Status.Error,
                    err.Fault?.Error[0]?.Detail
                    || err.Fault?.Error[0]?.Message
                    || err.fault?.error[0]?.detail
                    || err.fault?.error[0]?.message
                    || Messages.GenericError,
                    null
                );
            }

            return next(null, null, qbInvoice);
        });
    })

}

/**
 * Generic function to update QuickBooks Invoice,
 * this used by Invoice Controller when updating invoice
 */
export const _updateQBInvoice = async (req: Request, res: Response, company: ICompany, invoice: IInvoice, next: (error: number, errorMessage: string, qbInvoice: IQBInvoice) => void) => {

    // Populate the invoice to have customer and item object
    await invoice
        .populate({ path: 'paymentTerm' })
        .populate({ path: 'items.item' })
        .execPopulate();

    // Payment Term of the invoice
    const paymentTerm = <IPaymentTerm>invoice.paymentTerm;

    // Always refresh the token first because token valid only for 60 minutes
    _refreshToken(req, res, company, async (err, errMsg, company) => {
        if (err === 0) {
            return res.json({ status: Status.Error, message: errMsg });
        }

        if (err === 400) {
            await Company.findByIdAndUpdate(req.company._id, {
                qbAuthorized: false,
                qbAccessToken: undefined,
                qbRefreshToken: undefined
            });

            return next(Status.QBUnauthorized, Messages.QBUnAuthorized, null);
        }

        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        const qbInvoiceLines: IQBInvoiceLine[] = [];
        // Iterate all items in the invoice and construct is to QB Inv Lines
        for (const invItem of invoice.items) {
            const item = <IItem>invItem.item;

            qbInvoiceLines.push({
                DetailType: LineDetailTypes.SalesItemLineDetail,
                Amount: invItem.subTotal,
                SalesItemLineDetail: {
                    ItemRef: {
                        value: item.quickbookId
                    },
                    Qty: invItem.quantity,
                    UnitPrice: invItem.price,
                }
            });
        }

        if (invoice.subTotal) {
            qbInvoiceLines.push({
                DetailType: LineDetailTypes.SubTotalLineDetail,
                Amount: invoice.subTotal,
                SalesItemLineDetail: {}
            });
        }

        // Get the QB Invoice object based on invoice quickbookId
        qbo.getInvoice(invoice.quickbookId, async (err: any, qbInvoice: IQBInvoice) => {

            // Set the new value from the updated invoice object
            qbInvoice.TxnDate = moment(invoice.issuedDate).format("YYYY-MM-DD");
            qbInvoice.DueDate = moment(invoice.dueDate).format("YYYY-MM-DD");
            qbInvoice.Line = qbInvoiceLines;
            if (qbInvoice.SalesTermRef) {
                qbInvoice.SalesTermRef.value = paymentTerm?.quickbookId;
            }

            // Set the new value for Custom Fields
            const qbCustomerPO = qbInvoice.CustomField?.find(f => f.Name === 'Customer PO');
            if (qbCustomerPO) {
                qbCustomerPO.StringValue = invoice.customerPO;
            }
            const qbVendorId = qbInvoice.CustomField?.find(f => f.Name === 'Vendor Number');
            if (qbVendorId) {
                qbVendorId.StringValue = invoice.vendorId;
            }

            qbo.updateInvoice(qbInvoice, async (err: any, qbInvoice: IQBInvoice) => {
                if (err) {
                    return next(
                        Status.Error,
                        err.Fault?.Error[0]?.Detail
                        || err.Fault?.Error[0]?.Message
                        || err.fault?.error[0]?.detail
                        || err.fault?.error[0]?.message
                        || Messages.GenericError,
                        null
                    );
                }

                return next(null, null, qbInvoice);
            });
        });
    });

}

/**
 * Generic function to tranfers ownership of QuickBooks Invoices,
 * this used by Customer Controller after merging duplicated customers
 */
export const _transferQBInvoices = async (req: Request, res: Response, company: ICompany, unusedCustomers: ICustomer[], currentCustomer: ICustomer, next: (error: number, errorMessage: string) => void) => {

    // Always refresh the token first because token valid only for 60 minutes
    _refreshToken(req, res, company, async (err, errMsg, company) => {
        if (err === 0) {
            return res.json({ status: Status.Error, message: errMsg });
        }

        if (err === 400) {
            Company.findByIdAndUpdate(req.company._id, {
                qbAuthorized: false,
                qbAccessToken: undefined,
                qbRefreshToken: undefined
            });

            return next(Status.QBUnauthorized, Messages.QBUnAuthorized);
        }

        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        // Get old QB Customer
        qbo.getCustomer(currentCustomer.quickbookId, async (err: any, currentQBCustomer: IQBCustomer) => {

            // Make sure the merged base customer Active
            currentQBCustomer.Active = true;

            qbo.updateCustomer(currentQBCustomer, async (err: any, qbCustomer: IQBCustomer) => {

                if (qbCustomer) {
                    // Iterate all unused customers
                    for (const unusedCustomer of unusedCustomers) {
                        qbo.getCustomer(unusedCustomer.quickbookId, async (err: any, unusedQBCustomer: IQBCustomer) => {

                            // Find the invoices of the unused customer
                            qbo.findInvoices([
                                { field: 'CustomerRef', value: unusedCustomer?.quickbookId },
                            ], async (err: any, data: any) => {
                                const qbInvoices: IQBInvoice[] = data?.QueryResponse?.Invoice;

                                if (qbInvoices?.length) {
                                    // Iterate all QB Invoices
                                    for (const qbInvoice of qbInvoices) {
                                        if (qbInvoice && unusedQBCustomer?.Active) {

                                            // Move invoice to the new customer
                                            // qbInvoice.CustomerRef = qbInvoice.CustomerRef ?? {};
                                            qbInvoice.CustomerRef.value = currentCustomer?.quickbookId;
                                            qbInvoice.CustomerRef.name = currentCustomer?.profile?.displayName;
                                            qbInvoice.BillEmail = qbInvoice.BillEmail ?? {};
                                            qbInvoice.BillEmail.Address = currentCustomer?.info?.email;

                                            qbo.updateInvoice(qbInvoice, async (err: any, qbInvoice: IQBInvoice) => {
                                                // return next(null, null);
                                            });
                                        }
                                    }
                                }
                            });
                        });
                    }
                }

                return next(null, null)
            })
        });
    })
}

/**
 * Generic function to delete QuickBooks Invoice,
 * this used by Invoice Controller when updating invoice to draft
 */
export const _deleteQBInvoice = async (req: Request, res: Response, company: ICompany, invoice: IInvoice, next: (error: number, errorMessage: string, status: string) => void) => {

    // Always refresh the token first because token valid only for 60 minutes
    _refreshToken(req, res, company, async (err, errMsg, company) => {
        if (err === 0) {
            return res.json({ status: Status.Error, message: errMsg });
        }

        if (err === 400) {
            await Company.findByIdAndUpdate(req.company._id, {
                qbAuthorized: false,
                qbAccessToken: undefined,
                qbRefreshToken: undefined
            });

            return next(Status.QBUnauthorized, Messages.QBUnAuthorized, null);
        }

        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        qbo.deleteInvoice(invoice.quickbookId, async (err: any, response: { Invoice: IQBInvoice }) => {
            if (err) {
                return next(
                    Status.Error,
                    err.Fault?.Error[0]?.Detail
                    || err.Fault?.Error[0]?.Message
                    || err.fault?.error[0]?.detail
                    || err.fault?.error[0]?.message
                    || Messages.GenericError,
                    null
                );
            }

            return next(null, null, response.Invoice.status);
        });
    });

}

export const createQBInvoice = async (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;
    const invoice = await Invoice.findOne({ _id: params.invoiceId, company: company._id });

    if (!invoice) {
        return res.json({ status: Status.Error, message: 'Invoice not found.' });
    }

    if (invoice.invoiceType === 3) {
        return res.json({ status: Status.Success, message: 'Manual invoice cannot be synced to QB.' });
    }

    _createQBInvoice(req, res, company, invoice, async (err, errMsg, qbInvoice) => {
        if (err || !qbInvoice) {
            return res.json({
                status: err || Status.Error,
                message: errMsg || Messages.GenericError
            });
        }

        invoice.quickbookId = qbInvoice.Id;
        await invoice.save();

        return res.json({ status: Status.Success, message: 'QuickBooks Invoice successfully created', invoice, quickbookInvoice: qbInvoice });
    })

}

/**
* To syncing payments from BC to QB only
*/
export const syncQBInvoices = async (req: Request, res: Response) => {

    const updatedInvoices: { _id: string, invoiceId: string }[] = [];

    // Always refresh the token first because token valid only for 60 minutes
    _refreshToken(req, res, req.company, async (err, errMsg, company) => {
        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        /**
         * Retrieve all invoices of this company from Database,
         * that not a manual invoice, not draft, and doesn't have quickbookId 
         */
        const invoices = await Invoice.find({
            company: company._id,
            invoiceType: { $ne: 3 },
            $or: [{ isDraft: null }, { isDraft: false }],
            quickbookId: null
        }).sort({ issuedDate: 1 });

        // Return immediately when no invoices to be synced
        if (invoices.length <= 0) {
            return res.json({ status: Status.Success, message: 'No invoices to be synced.' });
        }

        // Find QB payments start from the first invoices date
        qbo.findInvoices([
            { field: 'TxnDate', value: moment(invoices[0]?.issuedDate || invoices[0]?.createdAt).subtract(1, 'days').format('YYYY-MM-DD'), operator: '>=' }
        ], async (err: any, data: any) => {
            if (err) {
                return res.json({
                    status: Status.Error,
                    message: err.Fault?.Error[0]?.Message
                        || err.fault?.error[0]?.detail
                        || err.fault?.error[0]?.message
                        || Messages.GenericError
                })
            }

            const qbInvoices: IQBInvoice[] = data?.QueryResponse?.Invoice;

            // Iterate all invoices from DB
            for (const invoice of invoices) {
                const existQBInvoice = qbInvoices.find(qbInvoice => qbInvoice.DocNumber === invoice.invoiceId);

                if (!existQBInvoice) {
                    // Create invoice on QB
                    _createQBInvoice(req, res, company, invoice, (err, errMsg, qbInvoice) => {
                        if (qbInvoice) {
                            // QB Invoice created, updated DB Invoice quickbookId
                            Invoice.findByIdAndUpdate(invoice, { quickbookId: qbInvoice.Id }).exec();
                        }
                    })
                } else {
                    if (invoice.quickbookId !== existQBInvoice.Id) {
                        // QB Invoice exist, update DB Invoice quickbookId directly
                        Invoice.findByIdAndUpdate(invoice, { quickbookId: existQBInvoice.Id }).exec();

                        updatedInvoices.push({ _id: invoice._id, invoiceId: invoice.invoiceId });
                    }
                }
            }

            company.qbSync.invoicesSynced = true;
            company.qbSync.invoicesSyncedAt = new Date();
            company.save();

            return res.json({ status: Status.Success, message: 'Invoices synced successfully.', updatedInvoices });
        });
    })

}

/**
* Kris' remark (July 21st, 2021):
* These commented below used to sync invoices from QB to BC
*/
// export const syncQBInvoices = async (req: Request, res: Response) => {

//     const user = <IUser>req.user;
//     const createdInvoices: { _id: string, invoiceId: string }[] = [];
//     const updatedInvoices: { _id: string, invoiceId: string }[] = [];
//     const invToCreate: IInvoice[] = [];

//     // Always refresh the token first because token valid only for 60 minutes
//     _refreshToken(req, res, req.company, async (err, errMsg, company) => {
//         if (err === 0)
//             return res.json({ status: Status.Error, message: errMsg });

//         if (err === 400) {
//             await Company.findByIdAndUpdate(req.company._id, {
//                 qbAuthorized: false,
//                 qbAccessToken: undefined,
//                 qbRefreshToken: undefined
//             });

//             return res.json({ status: Status.QBUnauthorized, message: Messages.QBUnAuthorized });
//         }

//         // Initiate node-quickbooks object with the refreshed company token
//         const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

//         // Retrieve all invoices of this company from Database
//         const invoices = await Invoice.find({ company: company._id });
//         const customers = await Customer.find({ company: company._id });
//         const items = await Item.find({ company: company._id });

//         const [qbCustomers, qbItems] = await Promise.all([
//             _getQBCustomers(qbo),
//             _getQBItems(qbo)
//         ])

//         // Retrieve all invoices of this company from QuickBooks
//         qbo.findInvoices({}, async (err: any, data: any) => {
//             if (err) {
//                 return res.json({
//                     status: Status.Error,
//                     message: err.Fault?.Error[0]?.Message
//                         || err.fault?.error[0]?.detail
//                         || err.fault?.error[0]?.message
//                         || Messages.GenericError
//                 })
//             }

//             const qbInvoices: IQBInvoice[] = data?.QueryResponse?.Invoice;

//             // Iterate all invoices from DB
//             for (const invoice of invoices) {
//                 // Invoice not exist on QB, create it
//                 if (invoice.invoiceType !== 3 && !invoice.quickbookId) {
//                     _createQBInvoice(req, res, company, invoice, (err, errMsg, qbInvoice) => {
//                         if (qbInvoice) {
//                             invoice.quickbookId = qbInvoice.Id;
//                             invoice.save();
//                         }
//                     })
//                 }
//             }

//             // Iterate all QuickBooks invoices
//             for (const qbInvoice of qbInvoices) {
//                 // Chevk if there any invoice on QB that not on DB yet
//                 let invoice = invoices.find(invoice => invoice.quickbookId === qbInvoice.Id);

//                 if (!invoice) {
//                     // Invoice not found, create it
//                     const customer = customers.find(customer => customer.quickbookId === qbInvoice.CustomerRef?.value);

//                     const invItems = [];
//                     let subTotal = 0, charges = 0, shippingCost = 0;

//                     for (const qbLine of qbInvoice.Line) {
//                         if (qbLine.DetailType === LineDetailTypes.SubTotalLineDetail) {
//                             subTotal = qbLine.Amount;
//                             continue;
//                         }

//                         const qbItemId = qbLine.SalesItemLineDetail?.ItemRef?.value;
//                         const item = items.find(i => i.quickbookId === qbItemId);

//                         invItems.push({
//                             item: item._id,
//                             name: item.name,
//                             isFixed: item.isFixed,
//                             hourlyRate: qbLine.SalesItemLineDetail?.UnitPrice,
//                             price: qbLine.SalesItemLineDetail?.UnitPrice,
//                             quantity: qbLine.SalesItemLineDetail?.Qty,
//                             tax: qbLine.SalesItemLineDetail?.DiscountRate,
//                             taxAmount: qbLine.SalesItemLineDetail?.DiscountAmt,
//                             subTotal: qbLine.SalesItemLineDetail?.TaxInclusiveAmt || qbLine.Amount
//                         })
//                     }

//                     invToCreate.push(new Invoice({
//                         invoiceId: qbInvoice.DocNumber,
//                         invoiceType: 0,
//                         issuedDate: qbInvoice.TxnDate,
//                         dueDate: qbInvoice.DueDate,
//                         customer: customer._id,
//                         company: company._id,
//                         note: qbInvoice.Notes,
//                         charges: 0,
//                         shippingCost: 0,
//                         taxAmount: qbInvoice.TaxTaxDetail?.TotalTax,
//                         subTotal,
//                         total: qbInvoice.TotalAmt,
//                         createdBy: user._id,
//                         createdAt: qbInvoice.Metadata?.CreateTime,
//                         items: invItems,
//                         emailHistory: [],
//                         lastEmailSent: null,
//                         quickbookId: qbInvoice.Id,
//                     }))
//                 }
//             }

//             if (invToCreate.length > 0) {
//                 const invoicesCreated = await Invoice.create(invToCreate);

//                 for (const invoice of invoicesCreated) {
//                     createdInvoices.push({ _id: invoice._id, invoiceId: invoice.invoiceId });
//                 };

//                 company.qbSync.invoicesSynced = true;
//                 company.qbSync.invoicesSyncedAt = new Date();
//                 company.save();
//             }

//             return res.json({ status: Status.Success, message: 'Invoice synced successfully.', createdInvoices, updatedInvoices });
//         })
//     })

// }

/**
 * Generic function to tranfers ownership of QuickBooks Invoices,
 * this used by Customer Controller after merging duplicated customers
 */
export const _transferQBInvoiceItem = async (
    req: Request,
    res: Response,
    company: ICompany,
    unusedItems: IItem[],
    currentItem: IItem,
    invoice: IInvoice,
    next: (error: number, errorMessage: string) => void
) => {

    // Always refresh the token first because token valid only for 60 minutes
    _refreshToken(req, res, company, async (err, errMsg, company) => {
        if (err === 0) {
            return res.json({ status: Status.Error, message: errMsg });
        }

        if (err === 400) {
            Company.findByIdAndUpdate(req.company._id, {
                qbAuthorized: false,
                qbAccessToken: undefined,
                qbRefreshToken: undefined
            });

            return res.json({ status: Status.QBUnauthorized, message: Messages.QBUnAuthorized });
        }

        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        // Get old QB Customer
        qbo.getItem(currentItem.quickbookId, async (err: any, currentQBItem: IQBItem) => {

            // Make sure the merged base item Active

            currentQBItem.Active = true;

            qbo.updateItem(currentQBItem, async (err: any, qbItem: IQBItem) => {

                if (qbItem) {
                    // Iterate all unused customers
                    for (const unusedItem of unusedItems) {
                        qbo.getItem(unusedItem.quickbookId, async (err: any, unusedQBItem: IQBItem) => {
                            // Find the invoices of the unused customer
                            if (unusedQBItem?.Active) {
                                qbo.getInvoice(invoice.quickbookId, async (err: any, qbInvoice: IQBInvoice) => {
                                    if (qbInvoice) {
                                        qbInvoice.Line.forEach(qbInvoiceLine => {
                                            if (qbInvoiceLine.DetailType === LineDetailTypes.SalesItemLineDetail && qbInvoiceLine?.SalesItemLineDetail?.ItemRef?.value === unusedItem.quickbookId) {
                                                qbInvoiceLine.SalesItemLineDetail.ItemRef.value = currentQBItem.Id;
                                                qbInvoiceLine.SalesItemLineDetail.ItemRef.name = currentQBItem.Name;
                                            }
                                        });

                                        qbo.updateInvoice(qbInvoice, async (err: any, qbInvoice: IQBInvoice) => {
                                            if (err) {
                                                throw new Error(
                                                    err.Fault?.Error[0]?.Detail
                                                    || err.Fault?.Error[0]?.Message
                                                    || err.fault?.error[0]?.detail
                                                    || err.fault?.error[0]?.message
                                                    || Messages.GenericError
                                                )
                                            }
                                        });

                                        // return next(null, null);
                                    }
                                })
                            }
                        });
                    }
                }

                return next(null, null);
            })
        });
    })
}