import {Request, Response} from 'express'
import { Status, Messages } from '../common/constants'

import { Job, IJob } from '../models/Job'

export const createJob = (req: Request, res: Response) => {

    const params = req.body

    const job = new Job(
        {
            dateTime: params.dateTime,
            technician: params.technicianId,
            customer: params.customerId,
            type: params.jobTypeId,
            company: req.companyId,
            comment: ''
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

    Job.find(
        { company: req.companyId },
        (err: any, jobs: IJob[])=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            res.json({'status': Status.Success, 'jobs': jobs})    

        }
    )

}



export const updateJob = (req: Request, res: Response) => {

    const params = req.body

    Job.findOne(
        { _id: params.jobId },
        (err: any, job: IJob)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            job.updateOne(
                {comment: params.comment, status: params.status},
                (err: any, raw: any)=> {
                    
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }
    
                    return res.json({'status': Status.Success, 'message': 'Job updated successfully.'})
                }
            )
        }
    )
}
