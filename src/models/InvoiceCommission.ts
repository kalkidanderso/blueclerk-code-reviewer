import mongoose, { Document, Schema } from 'mongoose'
import { ICompany } from './Company';
import { IInvoice } from './Invoice';
import { IUser } from './User';

export interface IInvoiceCommission extends Document {
    invoice: Schema.Types.ObjectId | IInvoice
    technicians: IInvoiceCommissionTechnician[]
}

export interface IInvoiceCommissionTechnician {
    technician: Schema.Types.ObjectId | IUser
    contractor?: Schema.Types.ObjectId | ICompany
    commission: number
    commissionAmount: number
    paid?: boolean
    paidAt?: Date
}

const InvoiceCommissionSchema = new Schema({
    invoice: {
        type: Schema.Types.ObjectId,
        ref: 'Invoice',
        required: true
    },
    technicians: [{
        technician: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: false
        },
        contractor: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: false
        },
        commission: {
            type: Number,
            default: null
        },
        commissionAmount: {
            type: Number,
            default: 0
        },
        paid: {
            type: Boolean,
            default: false
        },
        paidAt: Date
    }, { timestamps: { createdAt: true, updatedAt: true } }]
})

export const InvoiceCommission = mongoose.model<IInvoiceCommission>('InvoiceCommission', InvoiceCommissionSchema)
