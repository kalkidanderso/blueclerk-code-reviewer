"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const User_1 = require("./User");
const SubscriberSchema = new mongoose_1.Schema({
    company: {
        companyName: String,
        industry: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Industry' },
        logoUrl: String,
    },
    other: {
        tenantId: String,
        hasCardOnFile: { type: Boolean, default: false }
    },
    users: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'NonSubscriber' }],
    customers: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer' }],
});
exports.Subscriber = User_1.User.discriminator('Subscriber', SubscriberSchema);
//# sourceMappingURL=Subscriber.js.map