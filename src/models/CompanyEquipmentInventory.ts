import mongoose, { Document, Schema } from 'mongoose';

export interface ICompanyEquipmentInventory extends Document {

    dateTime: Date
    noOfItems:number
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

});

//Indexes
CompanyEquipmentInventorySchema.index({ createdBy: 1 });
CompanyEquipmentInventorySchema.index({ companyEquipments: 1 });

export const CompanyEquipmentInventory = mongoose.model<ICompanyEquipmentInventory>('CompanyEquipmentInventory', CompanyEquipmentInventorySchema);