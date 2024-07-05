import mongoose, { Document, Schema } from 'mongoose';

export interface IWindowFrameColor extends Document {
    name: string;
    hexColor: string;
    description: string;
    isActive: boolean;
}

const WindowFrameColorSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        hexColor: String,
        description: String,
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: { createdAt: true, updatedAt: true } },
);

export const WindowFrameColor = mongoose.model<IWindowFrameColor>('WindowFrameColor', WindowFrameColorSchema);
