import mongoose, { Document, Schema } from 'mongoose'

export interface ICompanyEquipmentInventory extends Document {

    dateTime: Date
    noOfItems:Number
    createdBy: Schema.Types.ObjectId
    companyEquipments: [Schema.Types.ObjectId]
    
}

const CompanyEquipmentInventorySchema = new Schema({
    
    dateTime:Date,
    noOfItems:Number,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    companyEquipments:[{ 
        type: Schema.Types.ObjectId,
        ref: 'CompanyEquipment'
    }]

})

export const CompanyEquipmentInventory = mongoose.model<ICompanyEquipmentInventory>('CompanyEquipmentInventory', CompanyEquipmentInventorySchema)