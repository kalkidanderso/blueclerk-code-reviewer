import mongoose, { Document, Schema } from 'mongoose'

export interface IIndustry extends Document {

    title: string
    createdBy: Schema.Types.ObjectId

}

const IndustrySchema = new Schema({

    title: String,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }

})

export const Industry = mongoose.model<IIndustry>('Industry', IndustrySchema)