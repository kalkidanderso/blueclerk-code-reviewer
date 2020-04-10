import {Request, Response} from 'express'
import { Status, Role, Messages } from '../common/constants'

import { JobType, IJobType } from '../models/JobType'
import { IUser } from '../models/User'

export const createJobType = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user
    var userId: any = null

    if (user.permissions.role == Role.COMPANY_ADMIN) {
        userId = user._id
    } 

    if (user.permissions.role != Role.GLOBAL_ADMIN){
        userId = req.companyId
    }

    JobType.findOne({title: params.title}, (err: any, previousJobType: IJobType) =>{
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }
        
        if(previousJobType != undefined || previousJobType != null) {
            return res.json({'status': Status.Error, 'message': "Job Type created"})
        }

        const jobType = new JobType({
            title: params.title,
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

export const getJobTypes = (req: Request, res: Response) => {

    JobType.find(
        { $or: [ {createdBy: null}, {createdBy: req.companyId} ]},
        (err: any, types: IJobType[])=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            res.json({'status': Status.Success, 'types': types})    

        }
    )

}