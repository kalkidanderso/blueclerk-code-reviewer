"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const User_1 = require("./User");
const EmployeeSchema = new mongoose_1.Schema({
    company: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    status: {
        type: Number,
        default: 1
    },
    extraPermissions: {
        on: [Number],
        off: [Number]
    }
});
exports.Employee = User_1.User.discriminator('Employee', EmployeeSchema);
//# sourceMappingURL=Employee.js.map