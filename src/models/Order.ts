import mongoose, {Document, Schema} from 'mongoose';

export interface IOrder extends Document {
    info: {
        noOfTags: string
        dateTime:  Date
        total: string
        tax: string
        status: number
    }
    address: {
        street: string
        city: string
        status: string
        zipCode: string
    }
    company: Schema.Types.ObjectId
    stripeChargeId: string
}

const OrderSchema = new Schema({

    info: {
        noOfTags: String,
        dateTime: {
            type: Date,
            default: Date.now
        },
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
    stripeChargeId: String
});


//Indexes
OrderSchema.index({ company: 1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema );