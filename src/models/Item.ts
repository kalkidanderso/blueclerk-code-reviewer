import mongoose, { Document, Schema } from 'mongoose'

export interface IItem extends Document {

    name: string
    description: string
    type: string
    price: number
    tax: number
    company: Schema.Types.ObjectId

}

const ItemSchema = new Schema({

    name: String,
    description: {
        type: String,
        required: false
    },
    type: String,
    price: {
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