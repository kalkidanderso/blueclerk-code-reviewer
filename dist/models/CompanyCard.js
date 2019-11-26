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
const CompanyCardSchema = new mongoose_1.Schema({
    ending: String,
    expiryMonth: String,
    expiryYear: String,
    cardType: String,
    name: String,
    token: String,
    cardStripeId: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    company: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    }
});
exports.CompanyCard = mongoose_1.default.model('CompanyCard', CompanyCardSchema);
//# sourceMappingURL=CompanyCard.js.map