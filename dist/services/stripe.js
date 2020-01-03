"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../common/config");
const stripe_1 = __importDefault(require("stripe"));
exports.createCustomer = (email, description, token, callback) => {
    const stripe = new stripe_1.default(config_1.stripeConfig.sk_secret);
    stripe.customers.create({
        email: email,
        description: description,
    }).then(function (customer) {
        // asynchronously called
        return callback(1, customer);
    }).catch(function (err) {
        // asynchronously called
        var message = "";
        switch (err.type) {
            case 'StripeCardError':
                // A declined card error
                message = err.message;
                break;
            default:
                message = err.message;
                break;
        }
        return callback(0, message);
    });
};
exports.detachCustomerSource = (stripeId, cardId, callback) => {
    const stripe = require("stripe")(config_1.stripeConfig.sk_secret);
    stripe.customers.deleteSource(stripeId, cardId)
        .then(function (raw) {
        return callback(0);
    }).catch(function (err) {
        var message = "";
        switch (err.type) {
            case 'StripeCardError':
                // A declined card error
                message = err.message;
                break;
            default:
                message = err.message;
                break;
        }
        return callback(message);
    });
};
exports.addCustomerSource = (stripeId, token, callback) => {
    const stripe = require("stripe")(config_1.stripeConfig.sk_secret);
    stripe.customers.createSource(stripeId, {
        source: token // obtained with Stripe.js
    }).then(function (source) {
        // asynchronously called
        return callback(1, source, '');
    }).catch(function (err) {
        // asynchronously called
        var message = "";
        switch (err.type) {
            case 'StripeCardError':
                // A declined card error
                message = err.message;
                break;
            default:
                message = err.message;
                break;
        }
        return callback(0, null, message);
    });
};
exports.chargeSubscription = function (amount, customerId, callback) {
    const stripe = require("stripe")(config_1.stripeConfig.sk_secret);
    let total = amount * 100;
    total = Math.ceil(total);
    if (total < 100) {
        return callback(0, null, "Total amount must be greater then 1$");
    }
    stripe.charges.create({
        amount: total,
        currency: "usd",
        customer: customerId
    }).then(function (charge) {
        // asynchronously called
        return callback(1, charge, '');
    }).catch(function (err) {
        var message = "";
        switch (err.type) {
            case 'StripeCardError':
                // A declined card error
                message = err.message;
                break;
            default:
                message = err.message;
                break;
        }
        return callback(0, null, message);
    });
};
exports.chargeCustomer = function (amount, customerId, cardId, callback) {
    const stripe = require("stripe")(config_1.stripeConfig.sk_secret);
    let total = amount * 100;
    total = Math.ceil(total);
    if (total < 100) {
        return callback(0, null, "Total amount must be greater then 1$");
    }
    stripe.charges.create({
        amount: total,
        currency: "usd",
        customer: customerId,
        card: cardId
    }).then(function (charge) {
        // asynchronously called
        return callback(1, charge, '');
    }).catch(function (err) {
        var message = "";
        switch (err.type) {
            case 'StripeCardError':
                // A declined card error
                message = err.message;
                break;
            default:
                message = err.message;
                break;
        }
        return callback(0, null, message);
    });
};
// export const getPlans = function (callback: Function) {
//     const stripe = require("stripe")(stripeConfig.sk_secret);
//     stripe.plans.list()
//     .then(function( plans: any) {
//         // asynchronously called
//         var stripePlans = plans.data.map((plan: any)=>{
//             return {
//                 id: plan.id,
//                 amount: plan.amount,
//                 interval: plan.interval,
//                 planDuration: plan.interval_count,
//                 planName: plan.nickname,
//             }            
//         })
//         return callback(1, stripePlans, '');
//     }).catch(function(err: any) {
//         var message= "";
//         switch (err.type) {
//             case 'StripeCardError':
//                 // A declined card error
//                 message = err.message;
//                 break;
//             default:
//                 message = err.message;
//                 break;
//         }
//         return callback(0, null, message);
//     });
// }
exports.subscribe = function (customerId, cardId, planId, callback) {
    const stripe = require("stripe")(config_1.stripeConfig.sk_secret);
    stripe.customers.update(customerId, {
        default_source: cardId
    }).then(function (customer) {
        // asynchronously called
        stripe.subscriptions.create({
            customer: customer.id,
            items: [
                {
                    plan: planId,
                },
            ]
        })
            .then(function (subscription) {
            // asynchronously called
            return callback(1, subscription, '');
        }).catch(function (err) {
            var message = "";
            switch (err.type) {
                case 'StripeCardError':
                    // A declined card error
                    message = err.message;
                    break;
                default:
                    message = err.message;
                    break;
            }
            return callback(0, null, message);
        });
        // return callback(1, customer, '');
    }).catch(function (err) {
        var message = "";
        switch (err.type) {
            case 'StripeCardError':
                // A declined card error
                message = err.message;
                break;
            default:
                message = err.message;
                break;
        }
        return callback(0, null, message);
    });
};
exports.unsubscribe = function (subscriptionId, callback) {
    const stripe = require("stripe")(config_1.stripeConfig.sk_secret);
    stripe.subscriptions.del(subscriptionId)
        .then(function (raw) {
        // asynchronously called
        return callback(1, '');
    }).catch(function (err) {
        var message = "";
        switch (err.type) {
            case 'StripeCardError':
                // A declined card error
                message = err.message;
                break;
            default:
                message = err.message;
                break;
        }
        return callback(0, message);
    });
};
exports.listSubscriptions = function (callback) {
    const stripe = require("stripe")(config_1.stripeConfig.sk_secret);
    stripe.subscriptions.list()
        .then(function (subscriptions) {
        // asynchronously called
        var stripeSubscriptions = subscriptions.data.map((subscription) => {
            return {
                id: subscription.id,
                stripeCustomerId: subscription.customer,
                plan: subscription.plan.id,
                planName: subscription.plan.nickname,
                subscriptionDate: new Date(subscription.created * 1000),
            };
        });
        return callback(1, stripeSubscriptions, '');
    }).catch(function (err) {
        var message = "";
        switch (err.type) {
            case 'StripeCardError':
                // A declined card error
                message = err.message;
                break;
            default:
                message = err.message;
                break;
        }
        return callback(0, null, message);
    });
};
//# sourceMappingURL=stripe.js.map