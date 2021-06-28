import { Request, Response } from 'express'
import { Status, Messages } from '../common/constants'
import { IUser } from '../models/User'
import { Invoice, IInvoice } from '../models/Invoice'
import { Payment, IPayment } from '../models/Payment'
import { Customer, ICustomer } from '../models/Customer'
import { ObjectId } from 'mongodb'

export const createPayment = async (req: Request, res: Response) => {

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
    const customer = await Customer.findById(params.customer);
    if (!customer) {
        return res.json({ status: Status.Error, message: 'Customer not found' });
    }

    const payment = new Payment({
        customer: params.customer,
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
        
            Customer.findById(params.customer)
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

    const params = req.body
    Payment.find({company: req.companyId, customer: params.customer})
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
