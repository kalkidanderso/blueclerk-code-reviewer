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
const CustomerEquipmentSchema = new mongoose_1.Schema({
    info: {
        model: String,
        serialNumber: String,
        nfcTag: String,
        imageUrl: String,
        location: String,
    },
    maintenance: {
        interval: String,
        nextDate: Date,
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
    customer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    jobs: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Job'
        }]
});
exports.CustomerEquipment = mongoose_1.default.model('CustomerEquipment', CustomerEquipmentSchema);
//# sourceMappingURL=CustomerEquipment.js.map