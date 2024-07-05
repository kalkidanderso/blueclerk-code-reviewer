import mongoose, { Document, Schema } from 'mongoose';

export interface IWindowGlass extends Document {
    size?: string;
    windowType?: string;
    description?: string;
    isActive?: boolean;
}

const WindowGlassSchema = new Schema(
    {
        size: {
            type: String,
            required: true,
        },
        windowType: String,
        desription: String,
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: { createdAt: true, updatedAt: true } },
);

export const WindowGlass = mongoose.model<IWindowGlass>('WindowGlass', WindowGlassSchema);
