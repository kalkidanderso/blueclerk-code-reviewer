import {Request, Response} from 'express'
import { Status, Role, Messages } from '../common/constants'

import { JobType, IJobType } from '../models/JobType'
import { IUser } from '../models/User'
import { INonSubscriber } from '../models/NonSubscriber'

export const createJobType = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user

    const jobType = new JobType({
        title: params.title,
        createdBy:  user.permissions.role == Role.SUBSCRIBER ? user._id : null
    })

    jobType.save((err: any) => {

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        return res.json({'status': Status.Success, 'message': 'Job type created successfully.'})

    })

}

export const getJobTypes = (req: Request, res: Response) => {

    const user = <IUser>req.user
    const nonSubscriber = <INonSubscriber>user
    
    var createdBy
    if (nonSubscriber.subscriber) {
        createdBy = nonSubscriber.subscriber
    }else {
        createdBy = user._id
    }

    JobType.find(
        { $or: [ {createdBy: null}, {createdBy: createdBy} ]},
        (err: any, types: IJobType[])=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            res.json({'status': Status.Success, 'types': types})    

        }
    )

}