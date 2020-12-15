import mongoose, { Document, Schema } from 'mongoose'

export interface ITag extends Document {

    latitude: string
    longitude: string
    note: string
    address: string
    customer: Schema.Types.ObjectId
    info: {
        nfcTag: String
    },
    company: Schema.Types.ObjectId
    createdBy: Schema.Types.ObjectId
    createdAt: Date    
}

const TagSchema = new Schema({

    info:{
        nfcTag: {
            type: String,
            required: true
        }
    },
    latitude:{
        type: String,
        required: true
    },
    longitude:{
        type: String,
        required: true
    },
    note:{
        type: String,
        required: false
    },
    address:{
        type: String,
        required: false
    },
    customer:{
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    company:{
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    createdBy:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt:{ 
        type: Date,
        default: Date.now()
    }

})

export const Tag = mongoose.model<ITag>('Tag', TagSchema)