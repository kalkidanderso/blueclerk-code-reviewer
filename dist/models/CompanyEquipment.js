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
const CompanyEquipmentSchema = new mongoose_1.Schema({
    info: {
        model: String,
        serialNumber: String,
        imageUrl: String,
        nfcTag: String,
        qrCode: String,
    },
    type: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'EquipmentType',
        required: true
    },
    brand: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'EquipmentBrand',
        required: true
    },
    company: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
});
exports.CompanyEquipment = mongoose_1.default.model('CompanyEquipment', CompanyEquipmentSchema);
//# sourceMappingURL=CompanyEquipment.js.map