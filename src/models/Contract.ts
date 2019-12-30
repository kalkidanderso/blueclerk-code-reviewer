import mongoose, { Document, Schema } from 'mongoose'

export interface IContract extends Document {

    company: Schema.Types.ObjectId
    contractor: Schema.Types.ObjectId
    status: number
    extraPermissions: [number]
}

const ContractSchema = new Schema({

    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    contractor: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    status: {type: Number, default: 0},
    extraPermissions: [Number]


})

export const Contract = mongoose.model<IContract>('Contract', ContractSchema)