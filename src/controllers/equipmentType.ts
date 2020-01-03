import {Request, Response} from 'express'
import { Status, Role, Messages } from '../common/constants'

import { EquipmentType, IEquipmentType } from '../models/EquipmentType'
import { IUser } from '../models/User'
import { Company, ICompany } from '../models/Company'

export const createEquipmentType = (req: Request, res: Response) => {

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

    const type = new EquipmentType({
        title: params.title,
        industry: industryId,
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

    const user = <IUser>req.user

    if(user.permissions.role == Role.GLOBAL_ADMIN) {

        EquipmentType.find(
            { $or: [ {createdBy: null}, {createdBy: req.companyId} ]},
            (err: any, types: IEquipmentType[])=>{
    
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
    
                res.json({'status': Status.Success, 'types': types})    
    
            }
        )

    } else {

        Company.findById(req.companyId, 
        (err: any, company: ICompany)=>{
    
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
                
            EquipmentType.find(
                { $or : [ {createdBy: req.companyId} , 
                    { $and: [{industry: company.info.industry}, {createdBy: null}, ]}
                ]},
                (err: any, types: IEquipmentType[])=>{
        
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }
        
                    res.json({'status': Status.Success, 'types': types})    
        
                }
            )
    
        })

    }
}
