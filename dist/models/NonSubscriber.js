"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const User_1 = require("./User");
const NonSubscriberSchema = new mongoose_1.Schema({
    subscriber: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Subscriber',
        required: true
    }
});
exports.NonSubscriber = User_1.User.discriminator('NonSubscriber', NonSubscriberSchema);
//# sourceMappingURL=NonSubscriber.js.map