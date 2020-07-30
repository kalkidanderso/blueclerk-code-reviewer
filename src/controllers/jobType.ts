import {Request, Response} from 'express'
import { Status, Role, Messages } from '../common/constants'

import { JobType, IJobType } from '../models/JobType'
import { IUser } from '../models/User'
import { Item, IItem } from '../models/Item'

export const createJobType = (req: Request, res: Response) => {


    const params = req.body
    const user = <IUser>req.user

    var userId: any = null
    var industryId: any = null

    if (user.permissions.role == Role.COMPANY_ADMIN) {
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
    if (industryId != null && industryId != undefined) { 
        JobType.findOne({title: params.title, industry: industryId, createdBy: null}, (err: any, previousJobType: IJobType) =>{
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
            
            if(previousJobType != undefined || previousJobType != null) {
                return res.json({'status': Status.Error, 'message': "Job Type already created for this industry"})
            }
    
            const jobType = new JobType({
                title: params.title,
                industry: industryId,
                createdBy:  userId
            })
        
            jobType.save((err: any) => {
        
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
                _createItem(req, res, (req: Request, res: Response) => {

                    return res.json({'status': Status.Success, 'message': 'Job type created successfully.'})
                })
        
        
            })
        })
    }else{
        JobType.findOne({title: params.title, createdBy: req.companyId}, (err: any, previousJobType: IJobType) =>{
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
            
            if(previousJobType != undefined || previousJobType != null) {
                return res.json({'status': Status.Error, 'message': "Job Type already created"})
            }
    
            const jobType = new JobType({
                title: params.title,
                industry: industryId,
                createdBy:  userId
            })
        
            jobType.save((err: any) => {
        
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
                console.log("creating item");
                
                _createItem(req, res, (req: Request, res: Response) => {
                    console.log("item created");
                    
                    return res.json({'status': Status.Success, 'message': 'Job type created successfully.'})
                })
        
            })
        })
    }
   

}

const _createItem = (req: Request, res: Response, next: (req: Request, res: Response) => void) => {
    console.log("inside");
    
    const params = req.body
    var companyId = req.companyId;
    
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    
    const item = new Item(
        {
            name: params.title,
            company: companyId
        }
    )

    item.save((err: any) => {
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }
        next(req, res)
        return
    })    
}


export const getJobTypes = (req: Request, res: Response) => {

    const user = <IUser>req.user
    var companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    if(user.permissions.role == Role.GLOBAL_ADMIN) { 
        JobType.find({},
            (err: any, types: IJobType[])=>{
    
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
    
                res.json({'status': Status.Success, 'types': types})    
    
            }
        )
        
    }else{
        JobType.find(
            { $or: [ {createdBy: null, industry: req.company.info.industry}, {createdBy: req.companyId} ]},
            (err: any, types: IJobType[])=>{
    
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
    
                res.json({'status': Status.Success, 'types': types})    
    
            }
        )
    }
}

export const getAllItems = (req: Request, res: Response) => {

    Item.find({company: req.companyId},
        (err: any, items: IItem[])=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            res.json({'status': Status.Success, 'items': items})    

        }
    )
}

export const updateItem = (req: Request, res: Response) => {

    const params = req.body
    Item.findOne({company: req.companyId, _id: params.itemId},
        (err: any, item: IItem)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            if (item == null || item == undefined) {
                return res.json({'status': Status.Error, 'message': 'Invalid item id'})
            }

            item.updateOne({price: params.price, tax: params.tax, description: params.description},
            (err: any, raw: any) => {
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }

                return res.json({'status': Status.Success, 'message': 'Item updated successfully'})
                    
            })

        }
    )
}