import mongoose, { Document, Schema } from 'mongoose';

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

});

//Indexes
IndustrySchema.index({ title: 1 });
IndustrySchema.index({ createdBy: 1 });

export const Industry = mongoose.model<IIndustry>('Industry', IndustrySchema);