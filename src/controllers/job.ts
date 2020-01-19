import {Request, Response} from 'express'
import { Status, Messages, JobStatus } from '../common/constants'

import { Job, IJob } from '../models/Job'
import { Company, ICompany } from '../models/Company'
import { CustomerEquipment, ICustomerEquipment } from '../models/CustomerEquipment'

export const createJob = (req: Request, res: Response) => {

    const params = req.body
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
                    technician: params.technicianId,
                    customer: params.customerId,
                    type: params.jobTypeId,
                    company: companyId,
                    comment: '',
                    description: params.description,
                    equipmentId: params.equipmentId,
                    createdAt: Date.now(),
                }
            )
        
            job.save((err: any) => {
        
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
                
                equipment.jobs.push(job._id)
                equipment.updateOne({jobs: equipment.jobs}, (err:any, raw: any)=> {
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }   
                    company.currentJobId = company.currentJobId+1
                    Company.updateOne(company, (err: any, raw: any)=>{
                        if (err) {
                            return res.json({'status': Status.Error, 'message': Messages.GenericError})
                        }    
                        return res.json({'status': Status.Success, 'message': 'Job created successfully.'})
                    })

                    // return res.json({'status': Status.Success, 'message': 'Job created successfully.'})
                });
        
            })
        })

    }else{
        const job = new Job(
            {
                dateTime: params.dateTime,
                jobId: company.currentJobId+1,
                technician: params.technicianId,
                customer: params.customerId,
                type: params.jobTypeId,
                company: companyId,
                comment: '',
                description: params.description,
                equipmentId: params.equipmentId,
                createdAt: Date.now(),
            }
        )
    
        job.save((err: any) => {
            if (err) {
                console.log(err);
                
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            company.currentJobId = company.currentJobId+1
            Company.updateOne(company, (err: any, raw: any)=>{
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }    
                return res.json({'status': Status.Success, 'message': 'Job created successfully.'})
            })
            
            // return res.json({'status': Status.Success, 'message': 'Job created successfully.'})
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
                return res.json({'status': Status.Error, 'message': "Edit job is not allowed onece it is finished"})
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

export const startJob = (req: Request, res: Response) => {

    const params = req.body

    Job.findOne(
        { _id: params.jobId },
        (err: any, job: IJob)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
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

