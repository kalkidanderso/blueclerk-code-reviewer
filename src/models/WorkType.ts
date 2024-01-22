import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkType extends Document {
    title: string
    createdAt: Date
}

const WorkTypeSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    createdAt: Date
});

export const WorkType = mongoose.model<IWorkType>('WorkType', WorkTypeSchema);
