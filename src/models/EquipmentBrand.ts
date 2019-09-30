import mongoose, { Document, Schema } from 'mongoose'

export interface IEquipmentBrand extends Document {

    title: string
    createdBy: Schema.Types.ObjectId

}

const EquipmentBrandSchema = new Schema({

    title: String,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Company'
    }

})

export const EquipmentBrand = mongoose.model<IEquipmentBrand>('EquipmentBrand', EquipmentBrandSchema)