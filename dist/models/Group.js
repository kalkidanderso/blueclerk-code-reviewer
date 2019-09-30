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
const GroupSchema = new mongoose_1.Schema({
    title: String,
    company: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    manager: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Employee',
    },
    members: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee' }],
});
exports.Group = mongoose_1.default.model('Group', GroupSchema);
//# sourceMappingURL=Group.js.map