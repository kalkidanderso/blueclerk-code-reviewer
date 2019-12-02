import mongoose, { Document, Schema } from 'mongoose'

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

})

export const CompanyEquipment = mongoose.model<ICompanyEquipment>('CompanyEquipment', CompanyEquipmentSchema)