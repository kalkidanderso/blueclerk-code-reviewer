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
const JobLocationSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    contact: {
        name: String,
        phone: String,
        email: String
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: false
        },
        coordinates: {
            type: [Number],
            required: false
        }
    },
    address: {
        city: String,
        state: String,
        street: String,
        zipcode: String
    },
    customerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    companyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    }
});
exports.JobLocation = mongoose_1.default.model('JobLocation', JobLocationSchema);
//# sourceMappingURL=JobLocation.js.map