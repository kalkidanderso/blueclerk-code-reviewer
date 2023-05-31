import Stripe from 'stripe';
import * as Sentry from '@sentry/node';

/**
 * @param number
 * @param expiration
 * @param cvc
 * @param name
 * @param address
 * @param city
 * @param state
 * @param zipcode
 */
export const createCard = async (
    number: string,
    expiration: string,
    cvc: string,
    name: string,
    address: string,
    city: string,
    state: string,
    zipcode: string
) => {

    const { STRIPE_SK_SECRET } = process.env;

    const stripe = require('stripe')(STRIPE_SK_SECRET);
    let expirationData = expiration.split('/');
    let card: any = {
        number: number,
        exp_month: expirationData[0],
        exp_year: expirationData[1],
        cvc: cvc,
        name: name,
        address_line1: address,
        address_city: city,
        address_state: state,
        address_zip: zipcode,
    };
    return await stripe.tokens.create({
        card: card
    });

}

export const checkCardExist = async (token: any, customerId: any) => {
    const { STRIPE_SK_SECRET } = process.env;

    const stripe = require('stripe')(STRIPE_SK_SECRET);

    const tokenObj = await stripe.tokens.retrieve(
        token.id
    );
    const cardFingerPrint = tokenObj.card.fingerprint;
    const customerCards = await stripe.customers.listSources(
        customerId,
        {object: 'card'}
    );
    return customerCards.data.filter((cc: any) => {return JSON.stringify(cc.fingerprint)=== JSON.stringify(cardFingerPrint);}).length > 0;

}

export const createCustomer = (email: string, description: string, token: string, callback: Function) => {

    const { STRIPE_SK_SECRET } = process.env;

    const stripe = new Stripe(STRIPE_SK_SECRET);
    stripe.customers.create({
        email: email,
        description: description,
        source: token

    }).then(function( customer: any) {
        // asynchronously called
        return callback(1, customer);

    }).catch(function(err: any) {
        Sentry.captureException(err);
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

export const addCustomerAndCharge = (email: string, description: string, token: string, amount: number, callback: Function) => {

    const { STRIPE_SK_SECRET } = process.env;

    const stripe = new Stripe(STRIPE_SK_SECRET);
    stripe.customers.create({
        email: email,
        description: description,
        source: token

    }).then(function( customer: any) {
        // asynchronously called

        let total: number = amount * 100;
        total = Math.ceil(total)
        if(total < 100){
            return callback(0, null, "Total amount must be greater then 1$");
        }

        stripe.charges.create({
            amount: total,
            currency: "usd",
            customer: customer.id

        }).then(function( charge: any) {
            // asynchronously called
            return callback(1, customer, charge, '');

        }).catch(function(err: any) {
            Sentry.captureException(err);
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
            return callback(0, null, null, message);
        });

        // return callback(1, customer);

    }).catch(function(err: any) {
        // asynchronously called
        Sentry.captureException(err);
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
        return callback(0, null, null, message);
    })

}

export const detachCustomerSource = (stripeId: String, cardId: String, callback: Function) => {

    const { STRIPE_SK_SECRET } = process.env;

    const stripe = require("stripe")(STRIPE_SK_SECRET);

    stripe.customers.deleteSource(stripeId, cardId)
    .then(function( raw: any) {
        return callback(0);

    }).catch(function(err: any) {
        Sentry.captureException(err);
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

    const { STRIPE_SK_SECRET } = process.env;

    const stripe = require("stripe")(STRIPE_SK_SECRET);

        stripe.customers.createSource(stripeId, {
            source: token // obtained with Stripe.js

        }).then(function( source: any) {
            // asynchronously called
            return callback(1, source, '');

        }).catch(function(err: any) {
            Sentry.captureException(err);
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

    const { STRIPE_SK_SECRET } = process.env;

    const stripe = require("stripe")(STRIPE_SK_SECRET);
    let tax = (amount * 0.8)*0.0825;
    let total: number = (amount + tax) * 100;
    total = Math.ceil(total);
    if(total < 100){
        total = 100;
    }

    stripe.charges.create({
        amount: total,
        currency: "usd",
        customer: customerId

    }).then(function( charge: any) {
        // asynchronously called
        return callback(1, charge,tax, '');

    }).catch(function(err: any) {
        Sentry.captureException(err);
        let message= "";
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

export const chargeCustomer = function (amount: any, customerId: String, cardId: String, callback: Function) {

    const { STRIPE_SK_SECRET } = process.env;

    const stripe = require("stripe")(STRIPE_SK_SECRET);

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
        Sentry.captureException(err);
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

//     const { STRIPE_SK_SECRET } = process.env;

//     const stripe = require("stripe")(STRIPE_SK_SECRET);

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

    const { STRIPE_SK_SECRET } = process.env;

    const stripe = require("stripe")(STRIPE_SK_SECRET);

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
            Sentry.captureException(err);
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
        Sentry.captureException(err);
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

    const { STRIPE_SK_SECRET } = process.env;

    const stripe = require("stripe")(STRIPE_SK_SECRET);

    stripe.subscriptions.del(subscriptionId)
    .then(function( raw: any) {
        // asynchronously called
        return callback(1, '');

    }).catch(function(err: any) {
        Sentry.captureException(err);
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

    const { STRIPE_SK_SECRET } = process.env;

    const stripe = require("stripe")(STRIPE_SK_SECRET);

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
        Sentry.captureException(err);
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


// STRIPE INVOICE STUFF BELLOW

/**
 * To list all invoices by the company's stripeId,
 * the invoices are returned sorted by creation date,
 * with the most recently created invoices appearing first
 */
export const getStripeInvoices = async (stripeCustId: string): Promise<any> => {

    const { STRIPE_SK_SECRET } = process.env;
    const stripe = require('stripe')(STRIPE_SK_SECRET);

    const invoices = await stripe.invoices.list({ customer: stripeCustId });

    return invoices;

}

/**
 * To list all pending invoice items by the company's stripeId,
 * invoice items are returned sorted by creation date,
 * with the most recently created invoice items appearing first
 */
export const getStripeInvoiceItems = async (stripeCustId: string): Promise<any> => {

    const { STRIPE_SK_SECRET } = process.env;
    const stripe = require('stripe')(STRIPE_SK_SECRET);

    const invoiceItems = await stripe.invoiceItems.list({ customer: stripeCustId });

    return invoiceItems;

}

/**
 * To create a pending invoice items,
 * in the end of each day cron job will run to create the invoice,
 * then finalize it
 */
export const createStripeInvoiceItem = async (stripeCustId: string, amount: number, vendorName: string): Promise<any> => {

    const { STRIPE_SK_SECRET } = process.env;
    const stripe = require('stripe')(STRIPE_SK_SECRET);

    const invoiceItem = await stripe.invoiceItems.create({
        customer: stripeCustId,
        amount: ~~(amount * 100), // Send the amount as integer cents
        currency: 'usd',
        description: `Contractor/vendor added: ${vendorName}`
    });

    return invoiceItem;

}

/**
 * To create invoice for any pending invoice items on Stripe,
 * then pay the invoice to pay & finalize on Stripe
 */
export const createStripeInvoice = async (stripeCustId: string): Promise<any> => {

    const { STRIPE_SK_SECRET } = process.env;
    const stripe = require('stripe')(STRIPE_SK_SECRET);

    // Create a draft Stripe invoice based on company's stripeId
    const stripeInvoice = await stripe.invoices.create({ customer: stripeCustId });

    return stripeInvoice;

}

/**
 * To pay invoice on Stripe,
 * using payment method stored in Stripe
 */
export const payStripeInvoice = async (stripeInvId: string): Promise<any> => {

    const { STRIPE_SK_SECRET } = process.env;
    const stripe = require('stripe')(STRIPE_SK_SECRET);

    // Pay stripe invoice
    const paidInvoice = await stripe.invoices.pay(stripeInvId);

    return paidInvoice;

}

export const _getCustomerCard = async (stripeCustomer: string, stripeCardId: string): Promise<any> => {

    const { STRIPE_SK_SECRET } = process.env;
    const stripe = require("stripe")(STRIPE_SK_SECRET);

    return await stripe.customers.retrieveSource(
        stripeCustomer,
        stripeCardId
    );
}