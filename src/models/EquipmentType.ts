import mongoose, { Document, Schema } from 'mongoose'

export interface IEquipmentType extends Document {

    title: string
    createdBy: Schema.Types.ObjectId

}

const EquipmentTypeSchema = new Schema({

    title: String,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Subscriber'
    }

})

export const EquipmentType = mongoose.model<IEquipmentType>('EquipmentType', EquipmentTypeSchema)