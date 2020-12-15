import { Request, Response } from 'express'
import { Status, Messages } from '../common/constants'
import { IUser } from '../models/User'
import { Invoice, IInvoice } from '../models/Invoice'
import { Payment, IPayment } from '../models/Payment'
import { Customer, ICustomer } from '../models/Customer'
import { ObjectId } from 'mongodb'

export const createPayment = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user
    
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

    const payment = new Payment({
        customer: params.customer,
        amountPaid: params.amount,
        referenceNumber : params.referenceNumber,
        paymentType: params.paymentType,
        paidAt: params.paidAt,
        company: req.companyId,
        createdBy: user._id,
        invoices: invoiceIds,
        createdAt: Date.now(),
    });

    payment.save()
    .then((payment: IPayment) => {
        if(payment == undefined || payment == null){
            throw new Error()
        }else{
            return new Promise((resolve, reject) =>{
                Customer.findById(params.customer)
                .then((customer: ICustomer) =>{
                    let remainingBalance = customer.balance - payment.amountPaid
                    customer.updateOne({balance: remainingBalance})
                    .then((res: any) => {
                        resolve()
                    })
                    .catch((err: any) => {
                        reject()
                    })
                })
                .catch((err: any) => {
                    reject()
                })
            })
        }

    })
    .then((res: any) => {

        return Invoice.updateMany({_id: { $in: invoiceIds }}, {paid: true})
        // return new Promise((resolve, reject) => {
        //     Invoice.find({ _id: { $in: invoiceIds } })
        //     .then((invoices: IInvoice[]) => {
        //         const promises = invoices.map((invoice: IInvoice) => udpateInvoice(invoice));
        //         return Promise.all(promises)  
        //     })
        //     .then(responses => {
        //         resolve()
        //     })
        //     .catch((err: any) => {
        //         reject()
        //     })
        // })
    })
    .then((response: any) =>{
        return res.json({ 'status': Status.Success, 'message': "Payment created successfully." })
    })
    .catch((error: any) => {
        if (error.message != undefined) {
            return res.json({ 'status': Status.Error, 'message': error.message })
        } else {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }
    })
}

const udpateInvoice = (invoice: IInvoice) => {
    return new Promise((resolve, reject) => {
      invoice.update({paid: true},(err: any, res: any) => {
        if (err) {
          reject();
        }
        resolve();
      });
    });
  }

export const udpatePayment = (req: Request, res: Response) => {

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
        
        return new Promise((resolve, reject) =>{
        
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
        select: 'info.companyName info.logoUrl auth.email permissions.role address.street address.city address.state address.zipCode contact.phone'
    })
    .populate({
        path: 'customer',
        select: 'info.email auth.email profile.displayName address.street address.city address.state address.zipCode contact.phone contactName'
    })
    .populate({
        path: 'invoices',
        select: 'invoiceId invoiceType charges shippingCost tax paid total'
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
    Payment.find({customer: params.customer})
    .populate({
        path: 'company',
        select: 'info.companyName info.logoUrl auth.email permissions.role address.street address.city address.state address.zipCode contact.phone'
    })
    .populate({
        path: 'customer',
        select: 'info.email auth.email profile.displayName address.street address.city address.state address.zipCode contact.phone contactName'
    })
    .populate({
        path: 'invoices'
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
