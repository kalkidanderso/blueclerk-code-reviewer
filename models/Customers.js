const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({

    customerId: String,
    customerName: String,
    contact:{
        firstName: String,
        lastName: String,
        title: String,
        phoneNumber: String,
        email: String
    },
    address: {
        street: String,
        city: String,
        state: String,
        zip: String
    },
    //Subscriber Reference
    subscriber:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subscriber",
        required: true
    }

});

module.exports = mongoose.model('Customer', customerSchema);