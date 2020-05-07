import {Request, Response} from 'express'
import { Status, Role, Messages } from '../common/constants'

import { JobType, IJobType } from '../models/JobType'
import { IUser } from '../models/User'

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
        
                return res.json({'status': Status.Success, 'message': 'Job type created successfully.'})
        
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
        
                return res.json({'status': Status.Success, 'message': 'Job type created successfully.'})
        
            })
        })
    }
   

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