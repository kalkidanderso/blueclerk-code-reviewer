import {Request, Response} from 'express'
import { Status, Role, Messages } from '../common/constants'

import { EquipmentType, IEquipmentType } from '../models/EquipmentType'
import { IUser } from '../models/User'

export const createEquipmentType = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user

    var userId = null

    if (user.permissions.role == Role.COMPANY) {
        userId = user._id
    } 

    if (user.permissions.role != Role.GLOBAL_ADMIN){
        userId = req.companyId
    }


    const type = new EquipmentType({
        title: params.title,
        createdBy:  userId
    })

    type.save((err: any) => {

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        return res.json({'status': Status.Success, 'message': 'Equipment type created successfully.'})

    })

}

export const getEquipmentTypes = (req: Request, res: Response) => {

    EquipmentType.find(
        { $or: [ {createdBy: null}, {createdBy: req.companyId} ]},
        (err: any, types: IEquipmentType[])=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            res.json({'status': Status.Success, 'types': types})    

        }
    )

}