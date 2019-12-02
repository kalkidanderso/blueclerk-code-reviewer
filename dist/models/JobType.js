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
const JobTypeSchema = new mongoose_1.Schema({
    title: String,
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Company'
    }
});
exports.JobType = mongoose_1.default.model('JobType', JobTypeSchema);
//# sourceMappingURL=JobType.js.map