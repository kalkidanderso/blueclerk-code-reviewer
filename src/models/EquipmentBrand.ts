import mongoose, { Document, Schema } from 'mongoose'

export interface IEquipmentBrand extends Document {

    title: string
    industry: string
    createdBy: Schema.Types.ObjectId

}

const EquipmentBrandSchema = new Schema({

    title: String,
    industry: {
        type: Schema.Types.ObjectId,
        ref: 'Industry',
        default: null
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Company'
    }

})

export const EquipmentBrand = mongoose.model<IEquipmentBrand>('EquipmentBrand', EquipmentBrandSchema)