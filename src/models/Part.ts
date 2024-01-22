import mongoose, { Document, Schema } from 'mongoose';

export interface IPart extends Document {

    name: string
    itemCode: string
    description: string
    totalQuantity: number
    availableQuantity: number
    cost: number
    price: number
    company: Schema.Types.ObjectId
    createdBy: Schema.Types.ObjectId
    createdAt: Date
}

const PartSchema = new Schema({

    name: String,
    itemCode: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: false
    },
    cost: {
        type: Number
    },
    price: {
        type: Number
    },
    totalQuantity: {
        type: Number
    },
    availableQuantity: {
        type: Number
    },
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

//Indexes
PartSchema.index({ company: 1 });
PartSchema.index({ company: 1, itemCode: 1 });

export const Part = mongoose.model<IPart>('Part', PartSchema);