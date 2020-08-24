import mongoose, { Document, Schema } from 'mongoose'

export interface IItem extends Document {

    name: string
    isFixed: boolean
    charges: number
    tax: number
    company: Schema.Types.ObjectId

}

const ItemSchema = new Schema({

    name: String,
    // hourly fixed
    isFixed: {
        type: Boolean,
        default: true
    },
    charges: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
    },

})

export const Item = mongoose.model<IItem>('Item', ItemSchema)