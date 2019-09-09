import {Request, Response} from 'express'
import { Status, Messages } from '../common/constants'

import { Customer } from '../models/Customer'
import { ISubscriber, Subscriber } from '../models/Subscriber'
import { INonSubscriber } from '../models/NonSubscriber'

export const createCustomer = (req: Request, res: Response) => {

    const params = req.body
    const subscriber = <ISubscriber>req.user

    const customer = new Customer(
        {
            info: {
                name: params.name,
                email: params.email,
            },
            address: {
                street: params.street,
                city: params.city,
                state: params.state,
                zipCode: params.zipCode,
            },
            contact: {
                name: params.contactName,
                phone: params.phone,
            },
            subscriber: subscriber._id
        }
    )

    customer.save((err: any) => {

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        subscriber.customers.push(customer._id)
            
        subscriber.update(
            {customers: subscriber.customers},
            (err: any, raw: any)=> {
                
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
        
                return res.json({'status': Status.Success, 'message': 'Customer created successfully.'})
            }
        )

    })

}

export const getCustomers = (req: Request, res: Response) => {

    const params = req.body
    const user = <INonSubscriber>req.user
    
    var subscriberId
    if (user.subscriber) {
        subscriberId = user.subscriber
    }else {
        subscriberId = user._id
    }

    var filter
    if (params.includeActive == 'true' && params.includeNonActive == 'true') {
        filter = {}
    }else if (params.includeActive == 'true') {
        filter = {'isActive': { $eq: true }}
    }else {
        filter = {'isActive': { $eq: false }}
    }

    Subscriber.findOne({_id: subscriberId})
    .populate({
        path: 'customers',
        match: filter,
      })
    .exec((err: any, subscriber: ISubscriber) => {

        if (err || !subscriber) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        res.json({'status': Status.Success, 'customers': subscriber.customers})    

    })
    
}