import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkType extends Document {
    title: string
}

const WorkTypeSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    }
})

export const WorkType = mongoose.model<IWorkType>('WorkType', WorkTypeSchema);
