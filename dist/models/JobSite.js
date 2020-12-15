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
const JobSiteSchema = new mongoose_1.Schema({
    name: { type: String, required: false },
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
    locationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'JobLocation',
        required: true
    },
    customerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    }
});
exports.JobSite = mongoose_1.default.model('JobSite', JobSiteSchema);
//# sourceMappingURL=JobSite.js.map