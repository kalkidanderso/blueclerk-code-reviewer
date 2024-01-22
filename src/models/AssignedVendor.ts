import mongoose, { Document, Schema } from 'mongoose';
import { ICompany } from './Company';
import { IWorkType } from './WorkType';

export interface IAssignedVendor extends Document {
    vendor: Schema.Types.ObjectId | ICompany
    workTypes: [Schema.Types.ObjectId | IWorkType]
}

export const AssignedVendorSchema = new Schema({
    vendor: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    workTypes: [{ type: Schema.Types.ObjectId, ref: 'WorkType' }]
});

AssignedVendorSchema.index({ vendor: 1 });

export const AssignedVendor = mongoose.model<IAssignedVendor>('AssignedVendor', AssignedVendorSchema);
