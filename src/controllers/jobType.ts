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
                _createItem(req, res, jobType, null, (req: Request, res: Response) => {

                    return res.json({'status': Status.Success, 'message': 'Job type created successfully.'})
                })
        
        
            })
        })
    }else{
        var searchTitle = params.title.toLowerCase()
        JobType.findOne({ title: { $regex : new RegExp(searchTitle, "i") }, createdBy: req.companyId}, (err: any, previousJobType: IJobType) =>{
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
                
                _createItem(req, res, jobType, req.companyId, (req: Request, res: Response) => {
                    return res.json({'status': Status.Success, 'message': 'Job type created successfully.'})
                })
        
            })
        })
    }
}

const _createItem = (req: Request, res: Response, jobType: IJobType, companyId: any, next: (req: Request, res: Response) => void) => {
    
    const params = req.body
    
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    
    const item = new Item(
        {
            name: params.title,
            company: companyId,
            jobType: jobType._id,
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
            { $or: [ {createdBy: null, industry: req.company.info.industry, isActive: true}, {createdBy: req.companyId, isActive: true} ]},
            (err: any, types: IJobType[])=>{
    
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
    
                res.json({'status': Status.Success, 'types': types})    
    
            }
        )
    }
}

export const editJobType = (req: Request, res: Response) => {

    const params = req.body

    JobType.findOne({_id: params.jobTypeId}, (err: any, jobType: IJobType) =>{
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }
        
        if(jobType == undefined || jobType == null) {
            return res.json({'status': Status.Error, 'message': "Invalid job Type id"})
        }
        
        if(!jobType.isActive) {
            return res.json({'status': Status.Error, 'message': "Job type is inactive activate to edit."})
        }

        if(jobType.title == params.title) {
            return res.json({'status': Status.Error, 'message': "Job type with title "+ params.title + " already exists."})
        }

        
        jobType.updateOne({title: params.title},(err: any, raw: any) => {
    
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
            
            _updateItem(req, res, jobType, params.title, (req: Request, res: Response) => {
                return res.json({'status': Status.Success, 'message': 'Job type update successfully.'})
            })
    
        })
    })
}

const _updateItem = (req: Request, res: Response, jobType: IJobType, jobTitle: string, next: (req: Request, res: Response) => void) => {
    
    var companyId = req.companyId;
    
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    Item.findOne({jobType: jobType._id}, (err: any, item: IItem) => {
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        if(item != undefined && item != null) {
            let name = jobTitle
            if(item.isFixed) {
                name = jobTitle + ' - fixed'
            }else{
                name = jobTitle + ' - hourly'
            }
    
            item.updateOne({name: name}, (err: any, raw: any) => {
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
    
                next(req, res)
                return
            })
        } else {
            const item = new Item(
                {
                    name: jobType.title,
                    company: companyId,
                    jobType: jobType._id,
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
    })
}

export const changeJobTypeStatus = (req: Request, res: Response) => {

    const params = req.body

    JobType.findOne({_id: params.jobTypeId}, (err: any, jobType: IJobType) =>{
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }
        
        if(jobType == undefined || jobType == null) {
            return res.json({'status': Status.Error, 'message': "Invalid job Type id"})
        }
        
        jobType.updateOne({isActive: params.status},(err: any, raw: any) => {
    
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
            
            _updateItemStatus(req, res, jobType, params.status, (req: Request, res: Response) => {
                return res.json({'status': Status.Success, 'message': 'Job type status update successfully.'})
            })
    
        })
    })
}

const _updateItemStatus = (req: Request, res: Response, jobType: IJobType, itemStatus: boolean, next: (req: Request, res: Response) => void) => {
    
    Item.findOne({jobType: jobType._id}, (err: any, item: IItem) => {
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        if(item != undefined && item != null) {
            let name = jobType.title
            if(item.isFixed) {
                name = name + ' - fixed'
            }else{
                name = name + ' - hourly'
            }
    
            item.updateOne({isActive: itemStatus}, (err: any, raw: any) => {
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
    
                next(req, res)
                return
            })
        } else {
            return res.json({'status': Status.Error, 'message': 'Item for this job type not found'})
        }  
    })
}

export const getAllItems = (req: Request, res: Response) => {

    Item.find(
        { $or: [ {company: null, isActive: true}, {company: req.companyId, isActive: true} ]},
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
    Item.findOne({_id: params.itemId},
        (err: any, item: IItem)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            if (item == null || item == undefined) {
                return res.json({'status': Status.Error, 'message': 'Invalid item id'})
            }

            let name
            if(params.isFixed) {
                name = item.name + ' - hourly'
            }else{
                name = item.name + ' - fixed'
            }
            
            item.updateOne({name: name, charges: params.charges, tax: params.tax, isFixed: params.isFixed},
            (err: any, raw: any) => {
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }

                return res.json({'status': Status.Success, 'message': 'Item updated successfully'})
                    
            })

        }
    )
}