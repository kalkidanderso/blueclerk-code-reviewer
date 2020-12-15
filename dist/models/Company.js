"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const CompanySchema = new mongoose_1.Schema({
    info: {
        companyName: String,
        industry: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Industry' },
        logoUrl: String,
        companyEmail: String,
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
    },
    contact: {
        phone: String,
        fax: String,
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
    },
    admin: { type: mongoose_1.Schema.Types.ObjectId, ref: 'CompanyAdmin' },
    qbAccessToken: String,
    qbRefreshToken: String,
    realmId: String,
    customersSynced: {
        type: Boolean,
        default: false
    },
    customersSyncedAt: Date,
    socketId: String,
    qbAuthorized: {
        type: Boolean,
        default: false
    },
    qbRefeshTokenExpiry: Date,
    currentInvoiceId: {
        type: Number,
        default: 0
    },
    invoicePrefix: String,
    currentPOId: {
        type: Number,
        default: 0
    },
    currentEstimateId: {
        type: Number,
        default: 0
    }
});
// export const Company = User.discriminator<ICompany>('Company', CompanySchema)
exports.Company = mongoose_1.default.model('Company', CompanySchema);
//# sourceMappingURL=Company.js.map