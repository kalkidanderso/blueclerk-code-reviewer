import mongoose, { Document, Schema } from 'mongoose'

export interface IContract extends Document {

    company: Schema.Types.ObjectId | any
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
    status: {type: Number, default: 0}, // 0 for pending 1 For Active 2 For disabled
    extraPermissions: [Number]


})

export const Contract = mongoose.model<IContract>('Contract', ContractSchema)
