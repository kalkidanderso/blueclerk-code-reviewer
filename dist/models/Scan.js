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
const ScanSchema = new mongoose_1.Schema({
    job: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    equipment: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'CustomerEquipment',
        required: true
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    comment: {
        type: String,
        default: null
    },
    timeOfScan: {
        type: Date
    }
});
exports.Scan = mongoose_1.default.model('Scan', ScanSchema);
//# sourceMappingURL=Scan.js.map