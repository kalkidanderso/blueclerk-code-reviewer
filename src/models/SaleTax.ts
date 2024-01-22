import mongoose, { Document, Schema } from 'mongoose';

export interface ISaleTax extends Document {

    state: string
    tax: number
    company: Schema.Types.ObjectId
    createdBy: Schema.Types.ObjectId
    createdAt: Date
}

const SaleTaxSchema = new Schema({

    state: String,
    tax : Number,
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date
    }

});

export const SaleTax = mongoose.model<ISaleTax>('SaleTax', SaleTaxSchema);