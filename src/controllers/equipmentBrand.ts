import {Request, Response} from 'express'
import { Status, Role, Messages } from '../common/constants'

import { EquipmentBrand, IEquipmentBrand } from '../models/EquipmentBrand'
import { IUser } from '../models/User'
import { IEmployee } from '../models/Employee'
import { Company, ICompany } from '../models/Company'

export const createEquipmentBrand = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user
    var userId = null
    var industryId = null

    if (user.permissions.role == Role.COMPANY) {
        userId = user._id
    } 

    if (user.permissions.role != Role.GLOBAL_ADMIN){
        userId = req.companyId
    }

      
    if(user.permissions.role == Role.GLOBAL_ADMIN) {
        if(params.industryId == undefined || params.industryId == null) {
            return res.json({ status: Status.Error, message: "Industry Id is required"})
        }else{
            industryId = params.industryId
        }
    }

    const brand = new EquipmentBrand({
        title: params.title,
        industry: industryId,
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

    const user = <IUser>req.user
    if(user.permissions.role == Role.GLOBAL_ADMIN) {
        EquipmentBrand.find(
            { $or: [ {createdBy: null}, {createdBy: req.companyId} ]},
            (err: any, brands: IEquipmentBrand[])=>{
    
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
    
                res.json({'status': Status.Success, 'brands': brands})    
    
            }
        )

    } else{
        Company.findById(req.companyId, 
        (err: any, company: ICompany)=>{
    
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
                
            EquipmentBrand.find(
                { $or : [ {createdBy: req.companyId} , 
                    { $and: [{industry: company.info.industry}, {createdBy: null}, ]}
                ]},
                (err: any, brands: IEquipmentBrand[])=>{
        
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }
        
                    res.json({'status': Status.Success, 'brands': brands})    
        
                }
            )
    
        })
    }

}