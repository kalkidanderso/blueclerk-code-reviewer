"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const User_1 = require("./User");
const CustomerSchema = new mongoose_1.Schema({
    isActive: { type: Boolean, default: true },
    info: {
        email: String
    },
    contactName: {
        type: String,
        required: false
    },
    company: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    equipments: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'CustomerEquipment' }],
    jobSites: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'CustomerJobSite',
            required: false
        }],
    quickbookId: {
        type: String,
        default: null
    },
    balance: {
        type: Number,
        default: 0
    }
});
exports.Customer = User_1.User.discriminator('Customer', CustomerSchema);
//# sourceMappingURL=Customer.js.map