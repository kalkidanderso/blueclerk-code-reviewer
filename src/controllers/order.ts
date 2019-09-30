import {Request, Response} from 'express'
import { Status, Messages } from '../common/constants'

import {  Order, IOrder } from '../models/Order'
import { OrderStatus } from '../common/constants'
import { stripeConfig } from '../common/config' 


export const createCustomer = (req: Request, res: Response) => {

    const stripe = require("stripe")(stripeConfig.sk_secret);

        stripe.customers.create({
            email: 'testuser@demo.com',
            description: 'Customer for testuser@demo.com',
            source: "tok_visa" // obtained with Stripe.js
        }, function(err: any, customer: any) {
            // asynchronously called

            if (err) {
                console.log('error'+ err);
            }

            console.log(customer);
            return res.json({'status': Status.Success, 'message': 'Stripe customer created successfully.'})
        }
    )



    // const params = req.body
    // var stripeUser= {}
    // stripe.customers
    // .create({
    //     email: 'foo-customer@example.com',
    // })
    // .then((customer) => {
    //     stripeUser = customer
    //     return stripe.customers.createSource(customer.id, {
    //     source: 'tok_visa',
    //     });
    // })
    // .then((source) => {
    //     return stripe.charges.create({
    //     amount: 1600,
    //     currency: 'usd',
    //     customer: source.customer,
    //     });
    // })
    // .then((charge) => {
    //     // New charge created on a new customer
    // })
    // .catch((err) => {
    //     // Deal with an error
    // });

}

export const placeOrder = (req: Request, res: Response) => {

    const params = req.body

    const order = new Order(
        {
            info:{
                dateTime: params.dateTime,
                noOfTags: params.noOfTags,
                total: params.total,
                tax: params.tax,
                Status: OrderStatus.PLACED
            },
            address: {
                street: params.street,
                city: params.city,
                status: params.state,
                zipCode: params.zipCode
            },
            company: req.companyId,
        }
    )

    order.save((err: any) => {

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        return res.json({'status': Status.Success, 'message': 'Order placed successfully.'})

    })

}

export const getOrders = (req: Request, res: Response) => {

    Order.find(
        { company: req.companyId },
        (err: any, orders: IOrder[])=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            res.json({'status': Status.Success, 'orders': orders})    

        }
    )

}


export const updateOrder = (req: Request, res: Response) => {

    const params = req.body

    Order.findOne(
        { _id: params.orderId, company: req.companyId },
        (err: any, order: IOrder)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            order.updateOne(
                {status: params.orderStatus},
                (err: any, raw: any)=> {
                    
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }
    
                    return res.json({'status': Status.Success, 'message': 'Order updated successfully.'})
                }
            )
        }
    )
}
