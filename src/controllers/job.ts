import {Request, Response} from 'express'
import { Status, Messages } from '../common/constants'

import { Job, IJob } from '../models/Job'
import { ISubscriber } from '../models/Subscriber'
import { INonSubscriber } from '../models/NonSubscriber'

export const createJob = (req: Request, res: Response) => {

    const params = req.body
    const subscriber = <ISubscriber>req.user

    const job = new Job(
        {
            dateTime: params.dateTime,
            technician: params.technicianId,
            customer: params.customerId,
            type: params.jobTypeId,
            subscriber: subscriber._id
        }
    )

    job.save((err: any) => {

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        return res.json({'status': Status.Success, 'message': 'Job created successfully.'})

    })

}

export const getJobs = (req: Request, res: Response) => {

    const user = <INonSubscriber>req.user

    var subscriberId
    if (user.subscriber) {
        subscriberId = user.subscriber
    }else {
        subscriberId = user._id
    }

    Job.find({ subscriber: subscriberId })
    .populate({
        path: 'customer',
    }, 'info.name')
    .populate({
        path: 'technician',
    }, 'profile.displayName')
    .populate({
        path: 'type',
    }, 'title')
        .exec((err: any, jobs: IJob[])=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            res.json({'status': Status.Success, 'jobs': jobs})    

        }
    )

}