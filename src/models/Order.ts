import mongoose, {Document, Schema} from 'mongoose'

export interface IOrder extends Document {
    info: {
        noOfTags: Number
        date:  Date
        total: String
        tax: String
        status: Number
    }
    address: {
        street: string
        city: string
        status: string
        zipCode: string
    }
    company: Schema.Types.ObjectId
}

const OrderSchema = new Schema({

    info: {
        noOfTags: Number,
        date: Date,
        total: String,
        tax: String,
        status: Number,
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
})

export const Order = mongoose.model<IOrder>('Order', OrderSchema )