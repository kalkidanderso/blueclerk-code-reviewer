import { stripeConfig } from '../common/config' 
import Stripe from 'stripe';

export const createCustomer = (email: string, description: string, token: string, callback: Function) => {

    const stripe = new Stripe(stripeConfig.sk_secret);
    stripe.customers.create({
        email: email,
        description: description,
        // source: token // obtained with Stripe.js
    
    }).then(function( customer: any) {
        // asynchronously called
        return callback(1, customer);
        
    }).catch(function(err: any) {
        // asynchronously called

        var message= "";
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
    })
}

export const detachCustomerSource = (stripeId: String, cardId: String, callback: Function) => {

    const stripe = require("stripe")(stripeConfig.sk_secret);

    stripe.customers.deleteSource(stripeId, cardId)
    .then(function( raw: any) {
        return callback(0);
        
    }).catch(function(err: any) {
        var message= "";
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
    })
}

export const addCustomerSource = (stripeId: String, token: String, callback: Function) => {

    const stripe = require("stripe")(stripeConfig.sk_secret);

        stripe.customers.createSource(stripeId, {
            source: token // obtained with Stripe.js
        
        }).then(function( source: any) {
            // asynchronously called
            return callback(1, source, '');
            
        }).catch(function(err: any) {
            // asynchronously called

            var message= "";
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
        }
    )
}

export const chargeSubscription = function (amount: any, customerId: String, callback: Function) {
    const stripe = require("stripe")(stripeConfig.sk_secret);
    
    let total: number = amount * 100;
    total = Math.ceil(total)
    if(total < 100){
        return callback(0, null, "Total amount must be greater then 1$");    
    }
    
    stripe.charges.create({
        amount: total,
        currency: "usd",
        customer: customerId

    }).then(function( charge: any) {
        // asynchronously called
        return callback(1, charge, '');
        
    }).catch(function(err: any) {
        var message= "";
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
}

export const chargeCustomer = function (amount: any, customerId: String,  cardId: String, callback: Function) {
    const stripe = require("stripe")(stripeConfig.sk_secret);
    
    let total: number = amount * 100;
    total = Math.ceil(total)
    if(total < 100){
        return callback(0, null, "Total amount must be greater then 1$");    
    }
    
    stripe.charges.create({
        amount: total,
        currency: "usd",
        customer: customerId,
        card: cardId

    }).then(function( charge: any) {
        // asynchronously called
        return callback(1, charge, '');
        
    }).catch(function(err: any) {
        var message= "";
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
}

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
export const subscribe = function (customerId: String, cardId: String, planId: String, callback: Function) {

    const stripe = require("stripe")(stripeConfig.sk_secret);

    stripe.customers.update(customerId, {
    default_source: cardId
    }).then(function( customer: any) {
        // asynchronously called
        stripe.subscriptions.create({
            customer: customer.id,
            items: [
                {
                plan: planId,
                },
            ]
        })
        .then(function( subscription: any) {
            // asynchronously called
            return callback(1, subscription, '');
            
        }).catch(function(err: any) {
            
            var message= "";
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
        
    }).catch(function(err: any) {
        var message= "";
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
    
 
}

export const unsubscribe = function (subscriptionId: String, callback: Function) {

    const stripe = require("stripe")(stripeConfig.sk_secret);


    stripe.subscriptions.del(subscriptionId)
    .then(function( raw: any) {
        // asynchronously called
        return callback(1, '');
        
    }).catch(function(err: any) {
        
        var message= "";
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
 
}

export const listSubscriptions = function (callback: Function) {

    const stripe = require("stripe")(stripeConfig.sk_secret);

    stripe.subscriptions.list()
    .then(function( subscriptions: any) {
        // asynchronously called

        var stripeSubscriptions = subscriptions.data.map((subscription: any)=>{
            return {
                id: subscription.id,
                stripeCustomerId: subscription.customer,
                plan: subscription.plan.id,
                planName: subscription.plan.nickname,
                subscriptionDate: new Date(subscription.created*1000),
            }            
        })

        return callback(1, stripeSubscriptions, '');
        
    }).catch(function(err: any) {
        var message= "";
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
 
}




