import mongoose, { Document, Schema } from 'mongoose'

export const enum logType {
    CREATED= 'CREATED ',
    UPDATED= 'UPDATED ',
    VOID= 'VOID ',
    DUPLICATE= 'DUPLICATE '
}
export interface IInvoiceLogs extends Document {

    invoiceId:String
    invoice:Schema.Types.ObjectId,
    company:Schema.Types.ObjectId,
    createdAt?: Date
    createdBy: Schema.Types.ObjectId
    updatedAt?: Date
    type:logType

}


const InvoiceLogsSchema = new Schema({
invoiceId:String,
invoice:Schema.Types.ObjectId,
company:Schema.Types.ObjectId,
type:String,
createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
}


}, { timestamps: { createdAt: true, updatedAt: true } }
)

//Indexes
InvoiceLogsSchema.index({ company: 1, isActive: 1 });
InvoiceLogsSchema.index({ company: 1, isActive: 1 });
InvoiceLogsSchema.index({ company: 1, name: 1 });
InvoiceLogsSchema.index({ company: 1, isActive: 1, isDiscountInvoiceLogs: 1 });
InvoiceLogsSchema.index({ type: 1 });
InvoiceLogsSchema.index({ invoice: 1 });
InvoiceLogsSchema.index({ invoiceId: 1 });

export const InvoiceLogs = mongoose.model<IInvoiceLogs>('InvoiceLogs', InvoiceLogsSchema)