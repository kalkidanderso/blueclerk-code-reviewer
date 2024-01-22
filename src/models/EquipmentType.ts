import mongoose, { Document, Schema } from 'mongoose';

export interface IEquipmentType extends Document {

    title: string
    industry: string
    createdBy: Schema.Types.ObjectId

}

const EquipmentTypeSchema = new Schema({

    title: String,
    industry: {
        type: Schema.Types.ObjectId,
        ref: 'Industry',
        default: null
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Company'
    }

});

//Indexes
EquipmentTypeSchema.index({ industry: 1 });
EquipmentTypeSchema.index({ createdBy: 1 });
EquipmentTypeSchema.index({ title: 1, industry: 1, createdBy: 1 });
EquipmentTypeSchema.index({ title: 1, createdBy: 1 });
EquipmentTypeSchema.index({ createdBy: 1, industry: 1 });

export const EquipmentType = mongoose.model<IEquipmentType>('EquipmentType', EquipmentTypeSchema);