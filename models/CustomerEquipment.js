const mongoose = require('mongoose');

const customerEquipmentSchema = new mongoose.Schema({

    description: String,
    manufacturer: String,
    brand: String,
    subBrand: String,
    type: String,
    //Ref to customer
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        required: true
    }
    
});

module.exports = mongoose.model('CustomerEquipment', customerEquipmentSchema);