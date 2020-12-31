import mongoose, { Document, Schema } from 'mongoose'

export interface ITag extends Document {

    // latitude: string
    // longitude: string
    note: string
    address: string
    customer: Schema.Types.ObjectId
    info: {
        nfcTag: String
    },
    jobLocation: Schema.Types.ObjectId | string
    jobSite?: Schema.Types.ObjectId | string
    company: Schema.Types.ObjectId | string
    createdBy: Schema.Types.ObjectId | string
    createdAt: Date | number  
}

const TagSchema = new Schema({

    info:{
        nfcTag: {
            type: String,
            required: true
        }
    },
    jobLocation: {
        type: Schema.Types.ObjectId,
        ref: 'JobLocation',
        required: true 
    },
    jobSite: {
        type: Schema.Types.ObjectId,
        ref: 'JobSite'
    },
    // latitude:{
    //     type: String,
    //     required: true
    // },
    // longitude:{
    //     type: String,
    //     required: true
    // },
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