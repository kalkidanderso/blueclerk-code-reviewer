import {Request, Response} from 'express'
import { Status, Role, Messages } from '../common/constants'

import { EquipmentBrand, IEquipmentBrand } from '../models/EquipmentBrand'
import { IUser } from '../models/User'
import { IEmployee } from '../models/Employee'

export const createEquipmentBrand = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user
    var userId = null

    if (user.permissions.role == Role.COMPANY) {
        userId = user._id
    } 

    if (user.permissions.role != Role.GLOBAL_ADMIN){
        userId = req.companyId
    }

    const brand = new EquipmentBrand({
        title: params.title,
        createdBy:  userId
    })

    brand.save((err: any) => {

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        return res.json({'status': Status.Success, 'message': 'Equipment brand created successfully.'})

    })

}

export const getEquipmentBrands = (req: Request, res: Response) => {

    EquipmentBrand.find(
        { $or: [ {createdBy: null}, {createdBy: req.companyId} ]},
        (err: any, brands: IEquipmentBrand[])=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            res.json({'status': Status.Success, 'brands': brands})    

        }
    )

}