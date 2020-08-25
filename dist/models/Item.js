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
const ItemSchema = new mongoose_1.Schema({
    name: String,
    // hourly fixed
    isFixed: {
        type: Boolean,
        default: true
    },
    charges: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    jobType: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'JobType',
    },
    company: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Company',
    },
});
exports.Item = mongoose_1.default.model('Item', ItemSchema);
//# sourceMappingURL=Item.js.map