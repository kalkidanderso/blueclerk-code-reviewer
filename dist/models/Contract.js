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
const ContractSchema = new mongoose_1.Schema({
    company: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    contractor: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    status: { type: Number, default: 0 },
    extraPermissions: [Number]
});
exports.Contract = mongoose_1.default.model('Contract', ContractSchema);
//# sourceMappingURL=Contract.js.map