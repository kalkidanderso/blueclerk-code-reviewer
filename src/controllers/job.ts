import {Request, Response} from 'express'
import { Status, Messages, JobStatus, ServiceTicketStatus } from '../common/constants'
import { sendJobEmailToAssignee, sendJobEmailToCustomer, sendJobEmailToCompanyAdmin } from '../services/aws'

import { Job, IJob } from '../models/Job'
import { Company, ICompany } from '../models/Company'
import { CustomerEquipment, ICustomerEquipment } from '../models/CustomerEquipment'
import { IUser } from '../models/User'
import { ServiceTicket ,IServiceTicket } from '../models/ServiceTicket'
import { Scan ,IScan } from '../models/Scan'
import { JobCharges ,IJobCharges } from '../models/JobCharges'

export const createJob = (req: Request, res: Response) => {

    const params = req.body
    
    ServiceTicket.findById(params.ticketId, (err: any, serviceTicket: IServiceTicket)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            if (serviceTicket == undefined || serviceTicket == null) {
                return res.json({'status': Status.Error, 'message': 'Invalid ticket Id'})
            }
            
            if (serviceTicket.status == ServiceTicketStatus.CANCELED) {
                return res.json({'status': Status.Error, 'message': 'You can\'t create a job using canceled ticket.'})
            }
            
            if (serviceTicket.jobCreated) {
                return res.json({'status': Status.Error, 'message': 'Job aleady created for this ticket.'})
            }

            JobCharges.findOne({'company': req.companyId, 'jobType': params.jobTypeId }, (err: any, charges: IJobCharges) => {
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
    
                if ((charges == undefined || charges == null) && (params.charges == undefined || params.charges == null)) {
                    return res.json({'status': Status.Error, 'message': 'Job Charges are required'})
                }

                var jobId = serviceTicket.ticketId.replace("Ticket",'Job')

                _createJob(req, res, jobId, serviceTicket, charges, (req: Request, res: Response, newJob: IJob) => {
                    return res.json({'status': Status.Success, 'message': 'Job created successfully.'})
                })

            })
           
        }
    )
}

const _createJob = (req: Request, res: Response, jobId: string, serviceTicket: IServiceTicket, charges: IJobCharges, next: (req: Request, res: Response, job: IJob) => void) => {

    const params = req.body
    console.log(params);
    const user = <IUser>req.user
    var companyId = req.companyId;
    
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
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
            createdAt: Date.now(),
            createdBy: user._id,
            employeeType: params.employeeType,
            isFixed: params.isFixed
        }
    )

    if(params.equipmentId != undefined && params.equipmentId !== null && params.equipmentId !== '""') {
        job.equipmentId = params.equipmentId
    }
    

    if(params.isFixed == 'false') {
        if(params.charges != undefined && params.charges !== null && params.charges !== '""') {
            job.hourlyRate = params.charges
        
        }else{
            job.hourlyRate = charges.charges
        }
    }else{
        if(params.charges != undefined && params.charges !== null && params.charges !== '""') {
            job.charges = params.charges
        
        }else{
            job.charges = charges.charges
        }
    }
    

    job.save((err: any) => {
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        serviceTicket.updateOne({jobCreated: true}, (err: any, raw: any) => { 
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            _sendJobEmails(req, res, job, (req: Request, res: Response, newJob: IJob) => { 
                next(req, res, newJob)
                return
            } )

        })
    })    
}


const _sendJobEmails = (req: Request, res: Response, jobCreated: IJob, next: (req: Request, res: Response, job: IJob) => void) => {

    const params = req.body
    const company = <ICompany>req.company


    Job.findById(jobCreated._id)
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

        // sendJobEmailToAssignee({to: tech.auth.email, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.dateTime})

        // sendJobEmailToCustomer({to: cust.info.email, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.dateTime})
        
        // if(params.employeeType == 1) {
        //     sendJobEmailToCompanyAdmin({to: company.info.companyEmail, assigneeName: tech.profile.displayName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.dateTime, vendorName: creator.profile.displayName})
        // }
        next(req, res, jobCreated)
        return 

    })
    
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
            select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode'
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
            select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode'
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
            
            let timeSpent: number = 0
            let newcharges:  number = job.charges
            if(params.status == 2 && !job.isFixed) {
                let starting: any = new Date(job.startTime)
                let ending: any = Date.now()
                
                let diffMs = ( ending - starting);
                let interval = 15 * 60 * 1000;
                timeSpent = ((Math.ceil(diffMs / interval)*interval)/60000)/60;
                newcharges = job.hourlyRate * timeSpent
            }

            job.updateOne(
                {description: params.comment, status: params.status, endTime: Date.now(), timeSpent: timeSpent, charges: newcharges},
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
                {status: JobStatus.STARTED, startTime: Date.now()},
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
            
            JobCharges.findOne({'company': req.companyId, 'jobType': job.type }, (err: any, charges: IJobCharges) => {
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
    
                if ((charges == undefined || charges == null) && (params.charges == undefined || params.charges == null)) {
                    return res.json({'status': Status.Error, 'message': 'Job Charges are required'})
                }

                if(params.charges != undefined && params.charges != null){
                    job.charges = params.charges
                }

                job.isFixed = params.isFixed
                job.technician = params.technicianId
                job.dateTime = params.dateTime
                
                job.updateOne(
                    job,
                    (err: any, raw: any)=> {
                        
                        if (err) {
                            return res.json({'status': Status.Error, 'message': Messages.GenericError})
                        }
        
                        return res.json({'status': Status.Success, 'message': 'Job edited successfully.'})
                    }
                )
            })
            
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
            select: 'info.companyName info.logoUrl auth.email permissions.role address.street address.city address.state address.zipCode contact.phone'
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
                select: 'info.model info.serialNumber info.nfcTag images info.location',
                populate: [{ path: 'brand', select: 'title' },{ path: 'type', select: 'title' }],
                
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

export const getTodaysJobsByTechnicianId = (req: Request, res: Response) => {

    var date = new Date()
    date.setHours(0, 0, 0, 0)
    var endDate = new Date()
    endDate.setHours(23, 59, 59, 59)
    
    const params = req.body
    
    Job.find({ technician: params.employeeId, $and: [ { status: { $ne: 2 } }, { status: { $ne: 3 } } ], dateTime: {
        $gte: date,
        $lte: endDate
    } })
        .populate({
            path: 'ticket',
        })
        .populate({
            path: 'technician',
            select: 'profile.displayName'
        })
        .populate({
            path: 'customer',
            select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode'
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

export const updateJobTime = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user
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

            JobCharges.findOne({'company': req.companyId, 'jobType': job.type }, (err: any, charges: IJobCharges) => {
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
    
                if ((params.startTime == undefined || params.startTime == null) && (params.endTime == undefined || params.endTime == null)) {
                    return res.json({'status': Status.Error, 'message': 'Start time or end time is required'})
                }

                let timeSpent: number = 0
                let newcharges:  number = job.charges
                if(job.status == 2 && !job.isFixed) {
                    let starting: any = new Date(job.startTime)
                    let ending: any = Date.now()
                    
                    let diffMs = ( ending - starting);
                    let interval = 15 * 60 * 1000;
                    timeSpent = ((Math.ceil(diffMs / interval)*interval)/60000)/60;
                    newcharges = job.hourlyRate * timeSpent

                    job.timeSpent = timeSpent
                    job.charges = newcharges
                }


                if(params.startTime != undefined && params.startTime != null && params.startTime != '""') {
                    job.startTime = params.startTime
                    job.timeUpdatedBy = user._id
                    job.timeUpdatedAt = new Date() 
                }

                if(params.endTime != undefined && params.endTime != null && params.endTime != '""') {
                    job.endTime = params.endTime
                    job.timeUpdatedBy = user._id
                    job.timeUpdatedAt = new Date() 
                }
                
                job.updateOne(
                    job,
                    (err: any, raw: any)=> {
                        
                        if (err) {
                            return res.json({'status': Status.Error, 'message': Messages.GenericError})
                        }
        
                        return res.json({'status': Status.Success, 'message': 'Job time updated successfully.'})
                    }
                )
            })
            
        }
    )
}
