import mongoose, { Document, Schema } from 'mongoose'

export interface ICompanyEquipmentHistory extends Document {

    action: Number
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

})

export const CompanyEquipmentHistory = mongoose.model<ICompanyEquipmentHistory>('CompanyEquipmentHistory', CompanyEquipmentHistorySchema)