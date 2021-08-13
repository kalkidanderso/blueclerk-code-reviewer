import { Request, Response } from 'express';
import { Status, Messages } from '../common/constants';

import { IContact } from '../common/contact';
import { ICompany, Company } from '../models/Company'
import { ICustomer, IQBCustomer } from '../models/Customer'
import { IJobLocation } from '../models/JobLocation';
import { IServiceTicket } from '../models/ServiceTicket';
import { IJob } from '../models/Job';
import { IItem } from '../models/Item';
import { IPaymentTerm } from '../models/PaymentTerm';
import { IInvoice, IQBInvoice, IQBInvoiceLine, LineDetailTypes, Invoice } from '../models/Invoice';
import { _getQbo, _refreshToken } from '../controllers/quickbook';

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

export const syncQBInvoices = async (req: Request, res: Response) => {

    const company = <ICompany>req.company;

    /**
     * Retrieve all invoices of this company from Database,
     * that not a manual invoice and doesn't have quickbookId 
     */ 
    const invoices = await Invoice.find({
        company: company._id,
        invoiceType: { $ne: 3 },
        quickbookId: { $exists: false }
    });

    // Return immediately when no invoices to be synced
    if (invoices.length <= 0) {
        return res.json({ status: Status.Success, message: 'No invoices to be synced.' });
    }

    // Iterate all invoices from DB
    for (const invoice of invoices) {
        // Invoice not exist on QB, create it
        _createQBInvoice(req, res, company, invoice, (err, errMsg, qbInvoice) => {
            if (qbInvoice) {
                invoice.quickbookId = qbInvoice.Id;
                invoice.save();
            }
        })
    }

    company.qbSync.invoicesSynced = true;
    company.qbSync.invoicesSyncedAt = new Date();
    company.save();

    return res.json({ status: Status.Success, message: 'Invoice synced successfully.' });

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