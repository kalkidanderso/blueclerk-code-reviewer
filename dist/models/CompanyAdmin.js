"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const User_1 = require("./User");
const CompanyAdminSchema = new mongoose_1.Schema({
    company: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    }
});
exports.CompanyAdmin = User_1.User.discriminator('CompanyAdmin', CompanyAdminSchema);
//# sourceMappingURL=CompanyAdmin.js.map