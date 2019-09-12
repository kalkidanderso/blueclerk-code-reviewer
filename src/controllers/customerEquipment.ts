import {Request, Response} from 'express'
import { Status, Messages } from '../common/constants'

import { CustomerEquipment } from '../models/CustomerEquipment'
import { ISubscriber, Subscriber } from '../models/Subscriber'
import { IUser } from '../models/User'
import { ICustomer, Customer } from '../models/Customer'

export const createCustomerEquipment = (req: Request, res: Response) => {

    const params = req.body

    const equipment = new CustomerEquipment(
        {
            info: {
                model: params.model,
                serialNumber: params.serialNumber,    
                nfcTag: params.nfcTag,
                imageUrl: params.imageUrl,
            },        
            type: params.equipmentTypeId,
            brand: params.equipmentBrandId,
            customer: params.customerId,
        }
    )

    equipment.save((err: any) => {

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        Customer.findOne(
            {'_id': params.customerId},
            (err: any, customer: ICustomer) => {
    
                if (err || !customer) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }

                customer.equipments.push(equipment._id)

                customer.update(
                    {equipments: customer.equipments},
                    (err: any, raw: any)=> {
                        
                        if (err) {
                            return res.json({'status': Status.Error, 'message': Messages.GenericError})
                        }
                
                        return res.json({'status': Status.Success, 'message': 'Customer equipment created successfully.'})
                    }
                )
    
            }
        )        

    })

}

export const getCustomerEquipments = (req: Request, res: Response) => {

    const params = req.body
    
    Customer.findOne({_id: params.customerId})
    .populate({
        path: 'equipments',
      })
    .exec((err: any, customer: ICustomer) => {

        if (err || !customer) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        res.json({'status': Status.Success, 'equipments': customer.equipments})    

    })
}