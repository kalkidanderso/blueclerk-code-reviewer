import {Request, Response} from 'express'
import { Status, Role, Messages } from '../common/constants'

import { JobType, IJobType } from '../models/JobType'
import { IUser } from '../models/User'

export const createJobType = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user

    const jobType = new JobType({
        title: params.title,
        createdBy:  user.permissions.role == Role.COMPANY ? user._id : null
    })

    jobType.save((err: any) => {

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        return res.json({'status': Status.Success, 'message': 'Job type created successfully.'})

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