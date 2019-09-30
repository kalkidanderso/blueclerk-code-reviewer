import {Request, Response} from 'express'
import { Status, Role, Messages } from '../common/constants'

import { EquipmentBrand, IEquipmentBrand } from '../models/EquipmentBrand'
import { IUser } from '../models/User'
import { IEmployee } from '../models/Employee'

export const createEquipmentBrand = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user

    const brand = new EquipmentBrand({
        title: params.title,
        createdBy:  user.permissions.role == Role.COMPANY ? user._id : null
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
    const employee = <IEmployee>user
    
    var createdBy
    if (employee.company) {
        createdBy = employee.company
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