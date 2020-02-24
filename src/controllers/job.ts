import {Request, Response} from 'express'
import { Status, Messages, JobStatus } from '../common/constants'

import { Job, IJob } from '../models/Job'
import { Company, ICompany } from '../models/Company'
import { CustomerEquipment, ICustomerEquipment } from '../models/CustomerEquipment'
import { IUser } from '../models/User'
// import { CustomerEquipment, ICustomerEquipment } from '../models/CustomerEquipment'

export const createJob = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user
    var companyId = req.companyId;
    var company  = <ICompany>req.company;
    
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    if(params.equipmentId != undefined && params.equipmentId != null) {
        
        CustomerEquipment.findById(params.equipmentId, 
        (err: any, equipment: ICustomerEquipment)=>{
            
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
    
            const job = new Job(
                {
                    dateTime: params.dateTime,
                    jobId: company.currentJobId+1,
                    ticket: params.ticketId,
                    technician: params.technicianId,
                    customer: params.customerId,
                    type: params.jobTypeId,
                    company: companyId,
                    description: params.description,
                    equipmentId: params.equipmentId,
                    createdAt: Date.now(),
                    createdBy: user._id
                }
            )
        
            job.save((err: any) => {
        
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
                
                company.currentJobId = company.currentJobId+1
                Company.updateOne({currentJobId: company.currentJobId+1}, (err: any, raw: any)=>{
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }    
                    return res.json({'status': Status.Success, 'message': 'Job created successfully.'})
                })
                
            })
        })

    }else{
        const job = new Job(
            {
                dateTime: params.dateTime,
                jobId: company.currentJobId+1,
                ticket: params.ticketId,
                technician: params.technicianId,
                customer: params.customerId,
                type: params.jobTypeId,
                company: companyId,
                description: params.description,
                createdAt: Date.now(),
                createdBy: user._id
            }
        )
    
        job.save((err: any) => {
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            company.currentJobId = company.currentJobId+1
            Company.updateOne({currentJobId: company.currentJobId+1}, (err: any, raw: any)=>{
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }    
                return res.json({'status': Status.Success, 'message': 'Job created successfully.'})
            })
        })
    }
}


export const getJobs = (req: Request, res: Response) => {

    var companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    Job.find({ company: companyId })
        .populate({
            path: 'ticket',
        })
        .populate({
            path: 'technician',
            select: 'profile.displayName'
        })
        .populate({
            path: 'customer',
            select: 'info.name'
        })
        .populate({
            path: 'type',
            select: 'title'
        })
        .populate({
            path: 'company',
            select: 'info.companyName'
        })
        .populate({
            path: 'createdBy',
            select: 'profile.displayName'
        })
        .exec((err: any, jobs: IJob[])=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            return res.json({'status': Status.Success, 'jobs': jobs})    

        }
    )

}

export const getJobsByTechnicianId = (req: Request, res: Response) => {

    const params = req.body
    
    Job.find({ technician: params.employeeId })
        .populate({
            path: 'ticket',
        })
        .populate({
            path: 'technician',
            select: 'profile.displayName'
        })
        .populate({
            path: 'customer',
            select: 'info.name'
        })
        .populate({
            path: 'type',
            select: 'title'
        })
        .populate({
            path: 'company',
            select: 'info.companyName'
        })
        .populate({
            path: 'createdBy',
            select: 'profile.displayName'
        })
        .exec((err: any, jobs: IJob[])=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            return res.json({'status': Status.Success, 'jobs': jobs})    

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
            if(job.status == JobStatus.FINISHED) {
                return res.json({'status': Status.Error, 'message': "Edit job is not allowed once it is finished"})
            }
            if(job.status == JobStatus.CANCELED) {
                return res.json({'status': Status.Error, 'message': "Edit job is not allowed once it is canceled"})
            }
            job.updateOne(
                {description: params.comment, status: params.status},
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

export const startJob = (req: Request, res: Response) => {

    const params = req.body

    Job.findOne(
        { _id: params.jobId },
        (err: any, job: IJob)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
            if(job.status == JobStatus.FINISHED) {
                return res.json({'status': Status.Error, 'message': "You can't start this job, it is already finished"})
            }
            if(job.status == JobStatus.CANCELED) {
                return res.json({'status': Status.Error, 'message': "You can't start this job, it is already canceled"})
            }
            job.updateOne(
                {status: JobStatus.STARTED},
                (err: any, raw: any)=> {
                    
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }
    
                    return res.json({'status': Status.Success, 'message': 'Job started successfully.'})
                }
            )
        }
    )
}


export const editJob = (req: Request, res: Response) => {

    const params = req.body

    Job.findOne(
        { _id: params.jobId },
        (err: any, job: IJob)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
            
            if(job.status == JobStatus.CANCELED || job.status == JobStatus.FINISHED) {
                return res.json({'status': Status.Error, 'message': "Edit job is not allowed onece it is cancelled or finished"})
            }

            job.updateOne(
                {technician: params.technicianId, dateTime: params.dateTime},
                (err: any, raw: any)=> {
                    
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }
    
                    return res.json({'status': Status.Success, 'message': 'Job edited successfully.'})
                }
            )
        }
    )
}

export const getJobDetails = (req: Request, res: Response) => {

    const params = req.body
    
    Job.findById(params.jobId)
        .populate({
            path: 'ticket',
        })
        .populate({
            path: 'technician',
            select: 'profile.displayName'
        })
        .populate({
            path: 'customer'
        })
        .populate({
            path: 'type',
            select: 'title'
        })
        .populate({
            path: 'equipmentId',
            select: 'info.model info.serialNumber info.imageUrl'
        })
        .populate({
            path: 'company',
            select: 'info profile address contact'
        })
        .exec((err: any, job: IJob)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            return res.json({'status': Status.Success, 'job': job})    

        }
    )

}

