import {Request, Response} from 'express'
import { Status, Role, Messages } from '../common/constants'

import { EquipmentType, IEquipmentType } from '../models/EquipmentType'
import { IUser } from '../models/User'
import { INonSubscriber } from '../models/NonSubscriber'

export const createEquipmentType = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user

    const type = new EquipmentType({
        title: params.title,
        createdBy:  user.permissions.role == Role.SUBSCRIBER ? user._id : null
    })

    type.save((err: any) => {

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        return res.json({'status': Status.Success, 'message': 'Equipment type created successfully.'})

    })

}

export const getEquipmentTypes = (req: Request, res: Response) => {

    const user = <IUser>req.user
    const nonSubscriber = <INonSubscriber>user
    
    var createdBy
    if (nonSubscriber.subscriber) {
        createdBy = nonSubscriber.subscriber
    }else {
        createdBy = user._id
    }

    EquipmentType.find(
        { $or: [ {createdBy: null}, {createdBy: createdBy} ]},
        (err: any, types: IEquipmentType[])=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            res.json({'status': Status.Success, 'types': types})    

        }
    )

}