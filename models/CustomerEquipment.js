const mongoose = require('mongoose');

const customerEquipmentSchema = new mongoose.Schema({

    description: String,
    manufacturer: String,
    brand: String,
    subBrand: String,
    model:String,
    serialNumber: String,
    type: String,
    nfcTag: String,
    maintenanceHistory:{ type: Array },
    maintenanceInterval: String,
    nextMaintenanceDate: Date,
    //Ref to customer
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        required: true
    }
});

module.exports = mongoose.model('CustomerEquipment', customerEquipmentSchema);