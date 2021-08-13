import { Request, Response } from 'express'
import { ObjectId } from 'mongodb'

import { Status, Messages, InvoiceStatus } from '../common/constants'
import { ICompany } from '../models/Company'
import { IUser } from '../models/User'
import { Invoice, IInvoice } from '../models/Invoice'
import { Payment, IPayment } from '../models/Payment'
import { Customer, ICustomer } from '../models/Customer'
import { _createQBPayment } from './quickbook.payment'

export const getPayments = (req: Request, res: Response) => {

    Payment.find({company: req.companyId})
    .populate({
        path: 'company',
        select: 'info.companyName info.logoUrl auth.email permissions.role address contact'
    })
    .populate({
        path: 'customer',
        select: 'info.email auth.email profile.displayName address contact contactName vendorId'
    })
    .populate({
        path: 'invoices',
        select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost tax paid total'
    })
    .populate({
        path: 'createdBy',
        select: 'profile.displayName auth.email'
    })
    .then((payments: IPayment[] | null) =>{

        return res.json({ 'status': Status.Success, 'payment': payments })
    })
    .catch((error: any) => {
        if (error.message != undefined) {
            return res.json({ 'status': Status.Error, 'message': error.message })
        } else {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }
    })

}

export const getPaymentsByCustomerId = (req: Request, res: Response) => {

    const params = req.query;

    Payment.find({company: req.companyId, customer: params.customerId})
    .populate({
        path: 'company',
        select: 'info.companyName info.logoUrl auth.email permissions.role address contact'
    })
    .populate({
        path: 'customer',
        select: 'info.email auth.email profile.displayName address contact contactName vendorId'
    })
    .populate({
        path: 'invoices',
        select: 'invoiceId invoiceType purchaseOrder job issuedDate dueDate charges shippingCost tax paid total'
    })
    .populate({
        path: 'createdBy',
        select: 'profile.displayName auth.email'
    })
    .then((payments: IPayment[] | null) =>{

        return res.json({ 'status': Status.Success, 'payment': payments })
    })
    .catch((error: any) => {
        if (error.message != undefined) {
            return res.json({ 'status': Status.Error, 'message': error.message })
        } else {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }
    })

}

/**
 * Create payment for single invoice
 */
export const createPayment = async (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;
    const user = <IUser>req.user;

    // Find and check if customer existed
    const customer = await Customer.findOne({
        _id: params.customerId,
        company: company._id
    });

    if (!customer) {
        return res.json({ status: Status.Error, message: 'Customer not found.' });
    }

    // Find and check if invoice exited and belongs to the customer
    const invoice = await Invoice.findOne({
        _id: params.invoiceId,
        customer: customer._id,
        company: company._id
    });

    if (!invoice) {
        return res.json({ status: Status.Error, message: 'Invoice not found or does not belong to the customer.' });
    }
    if (invoice.status === InvoiceStatus.PAID) {
        return res.json({ status: Status.Success, message: 'Invoice already paid off.' });
    }

    // Construct payment entry
    const payment = new Payment({
        customer,
        invoice,
        amountPaid: params.amount,
        referenceNumber: params.referenceNumber,
        paymentType: params.paymentType,
        paidAt: params.paidAt ? new Date(params.paidAt) : Date.now(),
        company,
        createdBy: user,
        createdAt: Date.now()
    });

    try {
        // Save the new payment
        await payment.save();

        // Handle underpayment and overpayment
        if (parseFloat(params.amount) >= invoice.balanceDue) {
            /**
             * This will handle overpayment/exact payment
             */

            // Deduct the customer balance
            customer.balance -= invoice.balanceDue;
            // Add on the customer credit if any
            customer.credit += (parseFloat(params.amount) - invoice.balanceDue);

            // Update invoice paymentApplied, balanceDue, and status
            invoice.paymentApplied += invoice.balanceDue;
            invoice.balanceDue = 0;
            invoice.status = InvoiceStatus.PAID;
            invoice.paid = true;
        } else {
            /**
             * This will handle underpayment
             */

            // Deduct the customer balance
            customer.balance -= parseFloat(params.amount);

            // Fix default paymentApplied and balanceDue for old invoice
            invoice.paymentApplied = invoice.paymentApplied ?? 0;
            invoice.balanceDue = invoice.balanceDue ?? invoice.total;

            // Update invoice paymentApplied, balanceDue, and status
            invoice.paymentApplied += parseFloat(params.amount);
            invoice.balanceDue -= parseFloat(params.amount);
            invoice.status = InvoiceStatus.PARTIALLY_PAID;
        }

        // Save the customer's changes
        customer.save();
        // Save the invoice's changes
        invoice.save();

        if (company.qbAuthorized) {
            // Create new Payment in QuickBooks
            _createQBPayment(req, res, company, payment, (err, errMsg, qbPayment) => {
                if (err) {
                    return res.json({ status: err, message: errMsg });
                }

                if (qbPayment) {
                    payment.quickbookId = qbPayment.Id;
                    payment.save();
                }

                return res.json({
                    status: Status.Success,
                    message: 'Payment successfully created.',
                    payment, quickbookPayment: qbPayment,
                    customer, invoice
                });
            });
        } else {
            return res.json({ status: Status.Success, message: 'Payment successfully created.', payment, customer, invoice });
        }

    } catch (error) {
        return res.json({ status: Status.Error, message: error.message || Messages.GenericError });
    }

}

export const createPaymentMultipleInvoices = async (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    
    let invoicesPaid: any = [];
    let invoiceIds: any = [];
    const invoiceWrongIds: any = [];

    if (params.invoices) {
        invoicesPaid = params.invoices.split(',');
    } 
    if (invoicesPaid.length > 0) {
        invoiceIds = invoicesPaid.map((invoiceID: string) => {
            invoiceID = invoiceID.trim();

            // Check if invoiceID is a valid ObjectID
            if (ObjectId.isValid(invoiceID)) {
                return new ObjectId(invoiceID);
            } else {
                invoiceWrongIds.push(invoiceID);
            }
        })

        // Check if there any not valid invoiceIds
        if (invoiceWrongIds.length > 0) {
            return res.json({ status: Status.Error, message: `These invoiceIds are not a valid ObjectID: ${invoiceWrongIds}` });
        }
    }

    // Find and check if customer exist
    const customer = await Customer.findById(params.customerId);
    if (!customer) {
        return res.json({ status: Status.Error, message: 'Customer not found' });
    }

    const payment = new Payment({
        customer,
        amountPaid: params.amount,
        referenceNumber: params.referenceNumber,
        paymentType: params.paymentType,
        paidAt: params.paidAt ? new Date(params.paidAt) : Date.now(),
        company: req.companyId,
        createdBy: user._id,
        invoices: invoiceIds,
        createdAt: Date.now(),
    });

    try {
        // Save the new payment
        await payment.save();

        // Deduct the customer balance
        customer.balance -= payment.amountPaid;
        await customer.save();

        // Update all invoices status to paid=true
        await Invoice.updateMany({ _id: { $in: invoiceIds } }, { paid: true });

        return res.json({ status: Status.Success, message: 'Payment created successfully.' });

    } catch (error) {
        return res.json({ status: Status.Error, message: error.message || Messages.GenericError });
    };

}

const updateInvoice = (invoice: IInvoice) => {
    return new Promise<void>((resolve, reject) => {
      invoice.update({paid: true},(err: any, res: any) => {
        if (err) {
          reject();
        }
        resolve();
      });
    });
  }

export const updatePayment = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user
    let previousDedeuctedBalance: number = 0
    let invoicesPaid: any =[]
    let invoiceIds: any =[]
    if (params.invoices != undefined) {
        invoicesPaid = params.invoices.split(',')
    } 

    if(invoicesPaid.length > 0) {
        invoiceIds = invoicesPaid.map((invoiceID: string) => (
            new ObjectId(invoiceID.trim())
        ))
    }
    
    Payment.findById(params.paymentId)
    .then((payment: IPayment | null) =>{
        
        if(payment == undefined || payment == null){
            throw new Error('Invalid payment Id.')
        }else{
            previousDedeuctedBalance = payment.amountPaid
            return payment.updateOne({amountPaid: params.amount, referenceNumber: params.referenceNumber, paymentType: params.paymentType, paidAt: params.paidAt, invoices: invoiceIds, udpatedBy: user._id, udpatedAt: Date.now()})
        }
    })
    .then((response: any) => {
        
        return new Promise<void>((resolve, reject) =>{
        
            Customer.findById(params.customerId)
            .then((customer: ICustomer) =>{
        
                let newBalance = customer.balance + previousDedeuctedBalance
                newBalance = newBalance - params.amount
        
                customer.updateOne({balance: newBalance})
                .then((res: any) => {
                    resolve()
                })
                .catch((err: any) => {
                    reject(err)
                })
            })
            .catch((err: any) => {
                reject(err)
            })
        })
    })
    .then((result: any) => {
        return Invoice.updateMany({ _id: { $in: invoiceIds } }, {paid: true})
    })
    .then((response: any) =>{
        return res.json({ 'status': Status.Success, 'message': "Payment update successfully." })
    })
    .catch((error: any) => {
        if (error != undefined && error.message != undefined) {
            return res.json({ 'status': Status.Error, 'message': error.message })
        } else {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }
    })
}
