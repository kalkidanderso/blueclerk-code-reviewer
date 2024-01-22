import mongoose, { Document, Schema } from 'mongoose';

export interface ICompanyEquipmentHistory extends Document {

    action: number
    dateTime: Date
    companyEquipment: Schema.Types.ObjectId
    createdBy: Schema.Types.ObjectId
    
}

const CompanyEquipmentHistorySchema = new Schema({
    
    action:Number,
    dateTime:Date,
    companyEquipment: {
        type: Schema.Types.ObjectId,
        ref: 'CompanyEquipment',
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },

});

CompanyEquipmentHistorySchema.index({ companyEquipment: 1 });
CompanyEquipmentHistorySchema.index({ createdBy: 1 });

export const CompanyEquipmentHistory = mongoose.model<ICompanyEquipmentHistory>('CompanyEquipmentHistory', CompanyEquipmentHistorySchema);