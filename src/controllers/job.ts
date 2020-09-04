import {Request, Response} from 'express'
import { Status, Messages, JobStatus, ServiceTicketStatus } from '../common/constants'
import { sendJobEmailToAssignee, sendJobEmailToCustomer, sendJobEmailToCompanyAdmin } from '../services/aws'

import { Job, IJob } from '../models/Job'
import { ICompany } from '../models/Company'
import { IUser } from '../models/User'
import { ServiceTicket ,IServiceTicket } from '../models/ServiceTicket'
import { Scan } from '../models/Scan'
import { PurchaseOrder } from '../models/PurchaseOrder'
import { Item } from '../models/Item'

export const createJob = (req: Request, res: Response) => {
    const params = req.body
   
    ServiceTicket.findById(params.ticketId)
    .then((serviceTicket: IServiceTicket) => {
        if (serviceTicket == undefined || serviceTicket == null) {
            throw new Error('Invalid ticket Id')
        }
        if (serviceTicket.status == ServiceTicketStatus.CANCELED) {
            throw new Error('You can\'t create a job using canceled ticket.')
        }
        if (serviceTicket.jobCreated) {
            throw new Error('Job aleady created for this ticket.')
        }

        var jobId = serviceTicket.ticketId.replace("Ticket",'Job')
        return new Promise((resolve, reject) => {
            
            Job.findOne({company: req.companyId, technician:params.technicianId, dateTime: { $lte: new Date(params.dateTime)} , endsAt: { $gte: new Date(params.dateTime) } }, (err: any, job: IJob) => {
                if(job != undefined && job != null) {
                    reject(new Error('Technician is scheduled at time you selected, try scheduling after '+ job.endsAt))
                }else{
                    resolve([jobId, serviceTicket])
                }
            })
        })
    })
    .then((response: any) =>{
        const jobId = response[0]
        const serviceTicket = response[1]
        
        _createJob(req, res, jobId, serviceTicket, (req: Request, res: Response, newJob: IJob) => {
            return res.json({'status': Status.Success, 'message': 'Job created successfully.'})
        })

    })
    .catch((error: any) => {
        if (error.message != undefined) {
            return res.json({ 'status': Status.Error, 'message': error.message })
        } else {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }
    })

    // ServiceTicket.findById(params.ticketId, (err: any, serviceTicket: IServiceTicket)=>{

            // if (err) {
            //     return res.json({'status': Status.Error, 'message': Messages.GenericError})
            // }

            // if (serviceTicket == undefined || serviceTicket == null) {
            //     return res.json({'status': Status.Error, 'message': 'Invalid ticket Id'})
            // }
            
            // if (serviceTicket.status == ServiceTicketStatus.CANCELED) {
            //     return res.json({'status': Status.Error, 'message': 'You can\'t create a job using canceled ticket.'})
            // }
            
            // if (serviceTicket.jobCreated) {
            //     return res.json({'status': Status.Error, 'message': 'Job aleady created for this ticket.'})
            // }

            // var jobId = serviceTicket.ticketId.replace("Ticket",'Job')

            // _createJob(req, res, jobId, serviceTicket, (req: Request, res: Response, newJob: IJob) => {
            //     return res.json({'status': Status.Success, 'message': 'Job created successfully.'})
            // })
            
            // JobCharges.findOne({'company': req.companyId, 'jobType': params.jobTypeId }, (err: any, charges: IJobCharges) => {
            //     if (err) {
            //         return res.json({'status': Status.Error, 'message': Messages.GenericError})
            //     }
    
            //     if ((charges == undefined || charges == null) && (params.charges == undefined || params.charges == null)) {
            //         return res.json({'status': Status.Error, 'message': 'Job Charges are required'})
            //     }

            //     var jobId = serviceTicket.ticketId.replace("Ticket",'Job')

            //     _createJob(req, res, jobId, serviceTicket, charges, (req: Request, res: Response, newJob: IJob) => {
            //         return res.json({'status': Status.Success, 'message': 'Job created successfully.'})
            //     })

            // })
           
        // }
    // )
}

const _createJob = (req: Request, res: Response, jobId: string, serviceTicket: IServiceTicket, next: (req: Request,res: Response, err: any, job: IJob) => void) => {

    const params = req.body
    
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
            endsAt: params.endsAt
            // salesTax: charges.salesTax
        }
    )

    if(params.equipmentId != undefined && params.equipmentId !== null && params.equipmentId !== '""') {
        job.equipmentId = params.equipmentId
    }

    job.save((err: any) => {
        if (err) {
            return next(req, res, Messages.GenericError, null )
        }
        
        serviceTicket.updateOne({jobCreated: true}, (err: any, raw: any) => { 
            if (err) {
                return next(req, res, Messages.GenericError, null )
            }

            _sendJobEmails(req, res, job, (req: Request, res: Response, newJob: IJob) => { 
                return next(req, res, null, newJob)
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
            select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode contactName'
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
            select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode contactName'
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

    Job.findOne({ _id: params.jobId, company: companyId })
    .then((job: IJob) => {
        if (job == undefined || job == null) {
            throw new Error("Invalid job id")
        }

        if(job.status == JobStatus.FINISHED) {
            throw new Error("Update job is not allowed once it is finished")
        }

        if(job.status == JobStatus.CANCELED) {
            throw new Error("Update job is not allowed once it is canceled")
        }

        const itemPromise = Item.findOne({jobType: job.type})

        return Promise.all([job, itemPromise])
    })
    .then((result: any) => {
        const job = result[0]
        const item = result[1]
        
        let timeSpent: number = 0
        let newcharges:  number = 0
        if(item != null && item.charges > 0) {
            
            if(params.status == 2 && !item.isFixed) {
                let starting: any = new Date(job.startTime)
                let ending: any = Date.now()
                
                let diffMs = ( ending - starting);
                let interval = 15 * 60 * 1000;
                timeSpent = ((Math.ceil(diffMs / interval)*interval)/60000)/60
                newcharges = item.charges * timeSpent
            
            } else if(params.status == 2 && item.isFixed) {
                newcharges = item.charges
            }

        }
        let finishedOnTime = false
        let currentTime = Date.now()
        if(job.endsAt >= currentTime) {
            finishedOnTime = true
        }

        return job.updateOne({comment: params.comment, status: params.status, endTime: Date.now(), timeSpent: timeSpent, charges: newcharges, completeOnTime: finishedOnTime})
        
    })
    .then((response: any) => {
        return res.json({'status': Status.Success, 'message': 'Job updated successfully.'})
    })
    .catch((err: any) => {
        if(err.message != undefined) {
            return res.json({'status': Status.Error, 'message': err.message})

        }else{

            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }
    })
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
        .then((job: any)=>{

            if (job == undefined || job == null) {
                throw new Error ('Invalid job id')
                // return res.json({'status': Status.Error, 'message': "Invalid job id"})
            }


            const scansPrmoise = Scan.find({ job: job._id}, 'comment timeOfScan')
            .populate({
                path: 'equipment',
                select: 'info.model info.serialNumber info.nfcTag images info.location',
                populate: [{ path: 'brand', select: 'title' },{ path: 'type', select: 'title' }],
                
            })
            
            const POPromise = PurchaseOrder.find({
                job: params.jobId
            })

            return Promise.all([job, scansPrmoise, POPromise])
        })
        .then((result: any) => {

            const job = result[0]
            const scans = result[1]
            const POs = result[2]
            return res.json({ 'status': Status.Success, 'job': job, 'scans': scans, 'purchaseOrders': POs })

        })
        .catch((error: any) => {
            if(error.message != undefined) {
                return res.json({ 'status': Status.Error, 'message': error.message })
            }else{
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }
        })

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
            select: 'info.email auth.email profile.displayName permissions.role address.street address.city address.state address.zipCode contact.phone contactName'
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
        .then((job: any)=>{

            if (job == undefined || job == null) {
                throw new Error ('Invalid job id')
            }

            if (job.status != JobStatus.FINISHED) {
                throw new Error ('Job is not finished yet')
            }

            const scansPrmoise = Scan.find({ job: job._id}, 'comment timeOfScan')
            .populate({
                path: 'equipment',
                select: 'info.model info.serialNumber info.nfcTag images info.location',
                populate: [{ path: 'brand', select: 'title' },{ path: 'type', select: 'title' }],
            })
            
            const POPromise = PurchaseOrder.find({
                job: params.jobId
            })

            return Promise.all([job, scansPrmoise, POPromise])
        })
        .then((result: any) => {
            const job = result[0]
            const scans = result[1]
            const POs = result[2]

            if(scans.length == 0) {
                return res.json({ 'status': Status.Error, 'message': "No equipment scanned for this job."})
            }else{
                return res.json({ 'status': Status.Success, 'job': job, 'scans': scans, 'purchaseOrders': POs })
            }
        })
        .catch((error: any) => {
            if(error.message != undefined) {
                return res.json({ 'status': Status.Error, 'message': error.message })
            }else{
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }
        })
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
            select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode contactName'
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

    Job.findOne({ _id: params.jobId, company: companyId })
    .then((job: IJob) => {
        if (job == undefined || job == null) {
            throw new Error("Invalid job id")
        }

        if(job.status == JobStatus.FINISHED) {
            throw new Error("Edit job is not allowed once it is finished")
        }

        if(job.status == JobStatus.CANCELED) {
            throw new Error("Edit job is not allowed once it is canceled")
        }

        if ((params.startTime == undefined || params.startTime == null) && (params.endTime == undefined || params.endTime == null)) {
            throw new Error('Start time or end time is required')
        }

        const itemPromise = Item.findOne({jobType: job.type})

        return Promise.all([job, itemPromise])
    })
    .then((result: any) => {
        const job = result[0]
        const item = result[1]
        
        let timeSpent: number = 0
        let newcharges:  number = 0
        let startTime: Date = job.startTime
        let endTime: Date = job.startTime
        
        if(params.startTime != undefined && params.startTime != null && params.startTime != '""') {
            startTime = params.startTime    
        }

        if(params.endTime != undefined && params.endTime != null && params.endTime != '""') {
            endTime = params.endTime    
        }

        if(item != null && item.charges > 0) {
            
            if(params.status == 2 && !item.isFixed) {
                let starting: any = new Date(startTime)
                let ending: any = new Date(endTime)
                
                let diffMs = ( ending - starting);
                let interval = 15 * 60 * 1000;
                timeSpent = ((Math.ceil(diffMs / interval)*interval)/60000)/60
                newcharges = item.charges * timeSpent
            
            } else if(params.status == 2 && item.isFixed) {
                newcharges = item.charges
            }
        }

        const user = <IUser>req.user
        return job.updateOne({ startTime: startTime, endTime: endTime, timeSpent: timeSpent, charges: newcharges, timeUpdatedBy: user._id, timeUpdatedAt: Date.now() })
        
    })
    .then((response: any) => {
        return res.json({'status': Status.Success, 'message': 'Job time updated successfully.'})
    })
    .catch((err: any) => {
        if(err.message != undefined) {
            return res.json({'status': Status.Error, 'message': err.message})

        }else{

            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }
    })
}
