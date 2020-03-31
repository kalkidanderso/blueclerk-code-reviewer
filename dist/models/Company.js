"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const User_1 = require("./User");
const CompanySchema = new mongoose_1.Schema({
    info: {
        companyName: String,
        industry: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Industry' },
        logoUrl: String,
    },
    other: {
        tenantId: String,
        hasCardOnFile: { type: Boolean, default: false }
    },
    employees: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee' }],
    customers: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer' }],
    stripeId: String,
    paid: {
        type: Boolean,
        default: false
    },
    // type 0 for company
    // type 1 for contractor
    type: {
        type: Number,
        default: 0
    },
    chargeDate: Date,
    maxTechnicians: {
        type: Number,
        default: 0
    },
    maxManagers: {
        type: Number,
        default: 0
    },
    maxOfficeAdmins: {
        type: Number,
        default: 0
    },
    userPermissions: {
        0: {
            on: [Number],
            off: [Number],
        },
        1: {
            on: [Number],
            off: [Number],
        },
        2: {
            on: [Number],
            off: [Number],
        },
        3: {
            on: [Number],
            off: [Number],
        },
    },
    currentJobId: {
        type: Number,
        default: 0
    },
    prefix: {
        type: String
    }
});
exports.Company = User_1.User.discriminator('Company', CompanySchema);
//# sourceMappingURL=Company.js.map