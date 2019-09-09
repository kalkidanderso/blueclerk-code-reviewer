import {Request, Response} from 'express'
import { Status, Role, Messages } from '../common/constants'

import { EquipmentBrand, IEquipmentBrand } from '../models/EquipmentBrand'
import { IUser } from '../models/User'
import { INonSubscriber } from '../models/NonSubscriber'

export const createEquipmentBrand = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user

    const brand = new EquipmentBrand({
        title: params.title,
        createdBy:  user.permissions.role == Role.SUBSCRIBER ? user._id : null
    })

    brand.save((err: any) => {

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        return res.json({'status': Status.Success, 'message': 'Equipment brand created successfully.'})

    })

}

export const getEquipmentBrands = (req: Request, res: Response) => {

    const user = <IUser>req.user
    const nonSubscriber = <INonSubscriber>user
    
    var createdBy
    if (nonSubscriber.subscriber) {
        createdBy = nonSubscriber.subscriber
    }else {
        createdBy = user._id
    }

    EquipmentBrand.find(
        { $or: [ {createdBy: null}, {createdBy: createdBy} ]},
        (err: any, brands: IEquipmentBrand[])=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            res.json({'status': Status.Success, 'brands': brands})    

        }
    )

}