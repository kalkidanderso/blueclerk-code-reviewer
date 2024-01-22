import mongoose, { Document, Schema } from 'mongoose';
import { ICustomer } from './Customer';
import { ICompanyLocation } from './CompanyLocation';
import { IWorkType } from './WorkType';

export const enum logType {
    CREATED = 'INVOICE_CREATED',
    UPDATED = 'INVOICE_UPDATED',
    VOID = 'INVOICE_VOID',
    DUPLICATE = 'INVOICE_DUPLICATE',
    PAID = 'INVOICE_PAID',
    PAYMENT_RECORDED = 'PAYMENT_RECORDED',
    PAYMENT_UPDATED = 'PAYMENT_UPDATED',
    PAYMENT_VOID = 'PAYMENT_VOID',
    EMAIL_SENT = 'EMAIL_SENT'
}
export interface IInvoiceLogs extends Document {

    invoiceId: string
    invoice: Schema.Types.ObjectId,
    oldInvoiceId:Schema.Types.ObjectId,
    company: Schema.Types.ObjectId,
    companyLocation: Schema.Types.ObjectId|ICompanyLocation,
    workType: Schema.Types.ObjectId|IWorkType,
    customer: Schema.Types.ObjectId|ICustomer,
    createdAt?: Date
    createdBy: Schema.Types.ObjectId
    updatedAt?: Date,
    amountPaid:string,
    type: logType,
    info:string

}


const InvoiceLogsSchema = new Schema({
    invoiceId: String,
    invoice: Schema.Types.ObjectId,

    oldInvoiceId: {
        type: Schema.Types.ObjectId,
        ref: 'Invoice',
        required: false
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    workType: {
        type: Schema.Types.ObjectId,
        ref: 'WorkType',
    },
    companyLocation: {
        type: Schema.Types.ObjectId,
        ref: 'CompanyLocation',
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    type: String,
    info:String,
    amountPaid:String,

    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }


}, { timestamps: { createdAt: true, updatedAt: true } }
);

//Indexes
InvoiceLogsSchema.index({ company: 1 });
InvoiceLogsSchema.index({ type: 1 });
InvoiceLogsSchema.index({ invoice: 1 });
InvoiceLogsSchema.index({ customer: 1 });
InvoiceLogsSchema.index({ companyLocation: 1 });
InvoiceLogsSchema.index({ workType: 1 });
InvoiceLogsSchema.index({ invoiceId: 1 });

export const InvoiceLogs = mongoose.model<IInvoiceLogs>('InvoiceLogs', InvoiceLogsSchema);