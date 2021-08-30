import mongoose, { Document, Schema } from 'mongoose';
import { ICompany } from './Company';
import { IUser } from './User';

export interface IEmailDefault extends Document {

    subject?: string
    message: string
    company: Schema.Types.ObjectId | ICompany
    createdAt?: Date
    updatedAt?: Date
    updatedBy?: Schema.Types.ObjectId | IUser

}

export const DefaultEmailTemplate = {
    subject: '${invoice_number} from our company',
    message: '<div style=\"font-family:roboto; padding:10px\"><div style=\"background-color:#EAECF3; padding:10px; text-align:center\"><p><img style=\"height:150px\" src=\"${company_logo}\" alt=\"${company_name}\" /></p><p><strong>${company_name}</strong></p></div><div style=\"text-align:center\"><h1>${invoice_number}</h1></div><div><p>Dear ${customer_name},</p><p>Please see your invoice <strong>${invoice_number}</strong> attached with <strong>$${invoice_amount}</strong> due on <strong>${invoice_due_date}</strong>.</p><br /><p>Thank you for doing business with <strong>${company_name}</strong></p><img style=\"width:150px\" src=\"${company_logo}\" alt=\"${company_name}\" /></div></div>'
  }

const EmailDefaultSchema = new Schema(
    
    {
        subject: String,
        message: {
            type: String,
            required: true
        },
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    { timestamps: { createdAt: true, updatedAt: true } }
    
)

export const EmailDefault = mongoose.model<IEmailDefault>('EmailDefault', EmailDefaultSchema);
