import {Request, Response} from 'express'
import { Status, Messages, JobStatus } from '../common/constants'
import { sendJobEmailToAssignee, sendJobEmailToCustomer, sendJobEmailToCompanyAdmin } from '../services/aws'

import { Job, IJob } from '../models/Job'
import { Company, ICompany } from '../models/Company'
import { CustomerEquipment, ICustomerEquipment } from '../models/CustomerEquipment'
import { IUser } from '../models/User'
import { ServiceTicket ,IServiceTicket } from '../models/ServiceTicket'
import { Scan ,IScan } from '../models/Scan'
// import { CustomerEquipment, ICustomerEquipment } from '../models/CustomerEquipment'

export const createJob = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user
    var companyId = req.companyId;
    var company  = <ICompany>req.company;
    
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    ServiceTicket.findById(params.ticketId, (err: any, serviceTicket: IServiceTicket)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
            if (serviceTicket == undefined || serviceTicket == null) {
                return res.json({'status': Status.Error, 'message': 'Invalid ticket Id'})
            }
            if (serviceTicket.jobCreated) {
                return res.json({'status': Status.Error, 'message': 'Job aleady created for this ticket.'})
            }
 
            var jobId = serviceTicket.ticketId.replace("Ticket",'Job')

            if(params.equipmentId != undefined && params.equipmentId !== null && params.equipmentId !== '""') {
        
                CustomerEquipment.findById(params.equipmentId, 
                (err: any, equipment: ICustomerEquipment)=>{
                    
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError, 'error1' : err})
                    }
                    if (equipment == null || equipment == undefined) {
                        return res.json({'status': Status.Error, 'message': "Invalid equipment id"})
                    }
            
                    const job = new Job(
                        {
                            dateTime: params.dateTime,
                            jobId: jobId,
                            ticket: params.ticketId,
                            technician: params.technicianId,
                            customer: params.customerId,
                            type: params.jobTypeId,
                            company: companyId,
                            description: params.description,
                            equipmentId: params.equipmentId,
                            createdAt: Date.now(),
                            createdBy: user._id,
                            employeeType: params.employeeType
                        }
                    )
                
                    job.save((err: any) => {
                
                        if (err) {
                            return res.json({'status': Status.Error, 'message': Messages.GenericError, 'error2' : err})
                        }
                        
                        serviceTicket.updateOne({jobCreated: true}, (err: any, raw: any) => {
                            if (err) {
                                return res.json({'status': Status.Error, 'message': Messages.GenericError})
                            }

                            Job.findById(job.id)
                            .populate({
                                path:'technician',
                                select:'profile.displayName auth.email'
                            })
                            .populate({
                                path:'customer',
                                select:'profile.displayName info.email'
                            })
                            .populate({
                                path:'createdBy',
                                select:'profile.displayName'
                            })
                            .populate({
                                path:'type',
                                select:'title'
                            })
                            .exec((err: any, job: IJob) => {
            
                                if (err) {
                                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError , 'error4' : err})
                                }
            
                                var tech : any = job.technician
                                var cust : any = job.customer
                                var type : any = job.type
                                var creator : any = job.createdBy
                                
                                sendJobEmailToAssignee({to: tech.auth.email, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.dateTime})
        
                                sendJobEmailToCustomer({to: cust.info.email, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.dateTime})
        
                                if(params.employeeType == 1) {
                                    sendJobEmailToCompanyAdmin({to: company.auth.email, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.dateTime, vendorName: creator.profile.displayName})
                                }
                                
                                return res.json({'status': Status.Success, 'message': 'Job created successfully.'})
                    
                            })
                        })
                        
                    })
                })
        
            }else{
                const job = new Job(
                    {
                        dateTime: params.dateTime,
                        jobId: jobId,
                        ticket: params.ticketId,
                        technician: params.technicianId,
                        customer: params.customerId,
                        type: params.jobTypeId,
                        company: companyId,
                        description: params.description,
                        createdAt: Date.now(),
                        createdBy: user._id,
                        employeeType: params.employeeType
                    }
                )
            
                job.save((err: any) => {
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }
        
                    serviceTicket.updateOne({jobCreated: true}, (err: any, raw: any) => { 
                        if (err) {
                            return res.json({'status': Status.Error, 'message': Messages.GenericError})
                        }

                        Job.findById(job.id)
                        .populate({
                            path:'technician',
                            select:'profile.displayName auth.email'
                        })
                        .populate({
                            path:'customer',
                            select:'profile.displayName info.email'
                        })
                        .populate({
                            path:'createdBy',
                            select:'profile.displayName'
                        })
                        .populate({
                            path:'type',
                            select:'title'
                        })
                        .exec((err: any, job: IJob) => {
        
                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                            }
        
                            var tech : any= job.technician
                            var cust : any= job.customer
                            var type : any= job.type
                            var creator : any = job.createdBy
        
                            sendJobEmailToAssignee({to: tech.auth.email, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.dateTime})
        
                            sendJobEmailToCustomer({to: cust.info.email, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.dateTime})
                            
                            if(params.employeeType == 1) {
                                sendJobEmailToCompanyAdmin({to: company.auth.email, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.dateTime, vendorName: creator.profile.displayName})
                            }
        
                            return res.json({'status': Status.Success, 'message': 'Job created successfully.'})
                
                        })
                    })
                   
                })
            }
        }
    )

   
}


export const getJobs = (req: Request, res: Response) => {

    var companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    Job.find({ company: companyId })
        .populate({
            path: 'ticket',
            select: 'scheduleDateTime note ticketId'
        })
        .populate({
            path: 'technician',
            select: 'profile.displayName'
        })
        .populate({
            path: 'customer',
            select: 'info.email auth.email profile.displayName'
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
            select: 'info.email profile.displayName'
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
    var companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    Job.findOne(
        { _id: params.jobId, company: companyId },
        (err: any, job: IJob)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            if (job == undefined || job == null) {
                return res.json({'status': Status.Error, 'message': "Invalid job id"})
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
    
    var companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    Job.findOne(
        { _id: params.jobId, company: companyId },
        (err: any, job: IJob)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            if (job == undefined || job == null) {
                return res.json({'status': Status.Error, 'message': "Invalid job id"})
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
    var companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    Job.findOne(
        { _id: params.jobId, company: companyId },
        (err: any, job: IJob)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
            
            if (job == undefined || job == null) {
                return res.json({'status': Status.Error, 'message': "Invalid job id"})
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

    var companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    Job.findOne({_id: params.jobId, company: companyId})
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
            
            if (job == undefined || job == null) {
                return res.json({'status': Status.Error, 'message': "Invalid job id"})
            }

            return res.json({'status': Status.Success, 'job': job})    

        }
    )

}


export const getJobReport = (req: Request, res: Response) => {
    const params = req.body
    var companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
     
    Job.findOne({_id: params.jobId, company: companyId})
        .populate({
            path: 'ticket',
            select: 'ticketId note scheduleDateTime'
        })
        .populate({
            path: 'technician',
            select: 'profile.displayName auth.email contact.phone permissions.role'
        })
        .populate({
            path: 'customer',
            select: 'info.email auth.email profile.displayName permissions.role address.street address.city address.state address.zipCode contact.phone'
        })
        .populate({
            path: 'type',
            select: 'title'
        })
        .populate({
            path: 'company',
            select: 'info.companyName auth.email permissions.role address.street address.city address.state address.zipCode contact.phone'
        })
        .populate({
            path: 'createdBy',
            select: 'info.companyName auth.email profile.displayName permissions.role address.street address.city address.state address.zipCode contact.phone'
        })
        .exec((err: any, job: IJob)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            if (job == undefined || job == null) {
                return res.json({'status': Status.Error, 'message': "Invalid job id"})
            }

            if (job.status != JobStatus.FINISHED) {
                return res.json({'status': Status.Error, 'message': "Job is not finished yet"})
            }

            // scans
            Scan.find({ job: job._id}, 'comment timeOfScan')
            .populate({
                path: 'equipment',
                select: 'info.model info.serialNumber info.nfcTag info.imageUrl info.location',
                populate: { path: 'EquipmentType', select: 'title' }
            })
            .exec ((err: any, scans: IScan[]) => {
                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                }
                
                if (scans.length == 0) {
                    return res.json({ 'status': Status.Error, 'message': "No equipment scanned for this job."})
                }

                return res.json({ 'status': Status.Success, 'job': job, 'scans': scans  })
            })
        }
    )
}
