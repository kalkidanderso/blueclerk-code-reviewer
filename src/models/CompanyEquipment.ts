import mongoose, { Document, Schema } from 'mongoose';

export interface ICompanyEquipment extends Document {

    
    info: {
        model: string
        serialNumber: string    
        imageUrl: string    
        nfcTag: string
        qrCode: string
    }
    type: Schema.Types.ObjectId
    brand: Schema.Types.ObjectId
    company: Schema.Types.ObjectId
    
}

const CompanyEquipmentSchema = new Schema({
    
    info: {
        model: String,
        serialNumber: String,
        imageUrl: String,
        nfcTag: String,
        qrCode: String,
    },
    type: {
        type: Schema.Types.ObjectId,
        ref: 'EquipmentType',
        required: true
    },
    brand: {
        type: Schema.Types.ObjectId,
        ref: 'EquipmentBrand',
        required: true
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },

});

//Indexes
CompanyEquipmentSchema.index({ company: 1 });
CompanyEquipmentSchema.index({ brand: 1 });
CompanyEquipmentSchema.index({ type: 1 });
CompanyEquipmentSchema.index({ 'info.nfcTag': 1, company: 1 });
CompanyEquipmentSchema.index({ 'info.qrCode': 1, company: 1 });
CompanyEquipmentSchema.index({ 'info.nfcTag': 1, 'info.qrCode': 1 });

export const CompanyEquipment = mongoose.model<ICompanyEquipment>('CompanyEquipment', CompanyEquipmentSchema);