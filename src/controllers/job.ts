import {Request, Response} from 'express'
import { Status, Messages, JobStatus, ServiceTicketStatus } from '../common/constants'
import { sendJobEmailToAssignee, sendJobEmailToCustomer, sendJobEmailToCompanyAdmin } from '../services/aws'

import { Job, IJob } from '../models/Job'
import {Company, ICompany} from '../models/Company'
import {IUser, User} from '../models/User'
import { ServiceTicket ,IServiceTicket } from '../models/ServiceTicket'
import { Scan } from '../models/Scan'
import { PurchaseOrder } from '../models/PurchaseOrder'
import { Item } from '../models/Item'
import {Contract} from '../models/Contract';
import {CronJob} from 'cron';
import request from 'request';
import {CompanyAdmin} from '../models/CompanyAdmin';

export const createJob = (req: Request, res: Response) => {
    const params = req.body

    if (params.employeeType == 1) {
        if (params.contractorId == undefined || params.contractorId == null) {
            throw new Error('Contractor Id must be specified when employeeType is contractor')
        }
    } else if (params.employeeType == 0) {
        if (params.technicianId == undefined || params.technicianId == null) {
            throw new Error('technicianId Id must be specified when employeeType is employee')
        }
    }
    ServiceTicket.findById(params.ticketId)
    .then((serviceTicket: IServiceTicket) => {
        if (serviceTicket == undefined || serviceTicket == null) {
            throw new Error('Invalid ticket Id')
        }
        if (serviceTicket.status == ServiceTicketStatus.ARCHIVED) {
            throw new Error('You can\'t create a job using canceled ticket.')
        }
        if (serviceTicket.jobCreated) {
            throw new Error('Job aleady created for this ticket.')
        }
        var jobId = serviceTicket.ticketId.replace("Ticket",'Job')

        if(params.scheduledStartTime && params.scheduledEndTime) {
            let newStartTime: any = null
            let newEndTime: any = null
            if(params.scheduledStartTime){
                var date = new Date(params.scheduleDate)
                newStartTime = new Date(date.getFullYear()+'-'+(date.getMonth()+1) +'-'+date.getDate()+' '+params.scheduledStartTime)
            }
            if(params.scheduledEndTime){
                var date = new Date(params.scheduleDate)
                newEndTime = new Date(date.getFullYear()+'-'+(date.getMonth()+1) +'-'+date.getDate()+' '+params.scheduledEndTime)
            }

            return new Promise((resolve, reject) => {

                Job.findOne( { $or: [ { company: req.companyId, technician:params.technicianId, scheduleDate: new Date(params.scheduleDate), scheduledStartTime: { $lte: newStartTime} , scheduledEndTime: { $gte: newStartTime } },
                     { company: req.companyId, technician:params.technicianId, scheduleDate: new Date(params.scheduleDate), scheduledStartTime: { $lte: newEndTime} , scheduledEndTime: { $gte: newEndTime }} ] }, (err: any, job: IJob) => {
                    if(job != undefined && job != null) {
                        reject(new Error('Technician is scheduled at time you selected, try scheduling after '+ job.scheduledEndTime))
                    }else{
                        resolve([jobId, serviceTicket])
                    }
                })
            })
        }else{
            return [jobId, serviceTicket]
        }

    })
    .then((response: any) =>{
        const jobId = response[0]
        const serviceTicket = response[1]

        _createJob(req, res, jobId, serviceTicket, (req: Request, res: Response, err: any, newJob: IJob) => {
            if(err != null){
                return res.json({'status': Status.Error, 'message': err})
            }

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

}

const _createJob = async (req: Request, res: Response, jobId: string, serviceTicket: IServiceTicket, next: (req: Request, res: Response, err: any, job: IJob) => void) => {

    const params = req.body

    const user = <IUser>req.user
    var companyId = req.companyId;

    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    let contractor = await Company.findOne({_id: params.contractorId});
    let technicianId = await User.findOne({_id: params.technicianId});
    if (!contractor && ! technicianId) {
        return next(req, res, "Contractor/Technician not found!", null)
    }
    let track = [];
    let action = '|Created A Job|';
    track.push({
        user: user._id,
        action,
        date: new Date()
    });
    const job = new Job({
        scheduleDate: params.scheduleDate,
        jobId: jobId,
        ticket: params.ticketId,
        technician: params.technicianId,
        contractor: params.contractorId,
        customer: params.customerId,
        jobLocation: params.jobLocationId,
        jobSite: params.jobSiteId,
        type: params.jobTypeId,
        company: companyId,
        description: params.description,
        createdAt: Date.now(),
        createdBy: user._id,
        track: track,
        employeeType: params.employeeType,
    })

    let newStartTime: any = null
    let newEndTime: any = null
    if (params.scheduledStartTime) {
        var date = new Date(params.scheduleDate)
        newStartTime = new Date(date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + params.scheduledStartTime)
        job.scheduledStartTime = newStartTime

    }
    if (params.scheduledEndTime) {
        var date = new Date(params.scheduleDate)
        newEndTime = new Date(date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + params.scheduledEndTime)
        job.scheduledEndTime = newEndTime
    }
    if (params.equipmentId) {
        job.equipmentId = params.equipmentId
    }

    await job.save((err: any) => {
        if (err) {
            return next(req, res, Messages.GenericError, null)
        }

        serviceTicket.updateOne({jobCreated: true}, (serviceTicketError: any, raw: any) => {
            if (serviceTicketError) {
                return next(req, res, Messages.GenericError, null)
            }
             _sendJobEmails(req, res, job, (req: Request, res: Response, newJob: IJob) => {
                    return next(req, res, null, newJob)
                })

        })
    })
}

const _sendJobEmails = (req: Request, res: Response, jobCreated: IJob, next: (req: Request, res: Response, job: IJob) => void) => {

    const params = req.body
    const company = <ICompany>req.company


    Job.findById(jobCreated._id)
    .populate({
        path:'technician',
        select:'profile.displayName auth.email emailPreferences'
    })
    .populate({
        path: 'contractor',
        select: 'info.companyName info.companyEmail type'
    })
    .populate({
        path:'customer',
        select:'profile.displayName info.email emailPreferences'
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

        var tech : any;
        var contractor : any;
        var assigneeName: any;
        var cust : any= job.customer
        var type : any= job.type
        var creator : any = job.createdBy
        if (params.technicianId) {
            tech = job.technician
            assigneeName = tech.profile.displayName
        }
        if (params.contractorId) {
            contractor = job.contractor
            assigneeName = contractor.info.companyName
        }
        let techEmailPreferences = tech ? tech.emailPreferences.preferences : null;
        let contractorEmailPreferences = contractor ? contractor.emailPreferences.preferences : null;
        let currentDate = new Date();
        if(params.employeeType == 0) {
                currentDate = new Date();
                switch (techEmailPreferences) {
                    case 0: {
                        sendJobEmailToAssignee({to: tech.auth.email, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate});
                        break;
                    }
                    case 1: {
                        if (techEmailPreferences) {
                            let techEmailTimeHours = tech.emailPreferences.time ? tech.emailPreferences.time.getHours() : 21;
                            let techEmailTimeMinutes = tech.emailPreferences.time ? tech.emailPreferences.time.getMinutes() : 0;
                            let techEmailTimeSeconds = tech.emailPreferences.time ? tech.emailPreferences.time.getSeconds() : 0;
                            currentDate.setHours(techEmailTimeHours, techEmailTimeMinutes, techEmailTimeSeconds);
                        }
                        currentDate.setHours(21, 0, 0);
                        new CronJob(currentDate, function() {
                            sendJobEmailToAssignee({to: tech.auth.email, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate});
                        }, null, true, 'America/Los_Angeles');
                        break;
                    }
                    default: {
                        sendJobEmailToAssignee({to: tech.auth.email, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate});
                        break;
                    }
                }

        }
        currentDate = new Date();
        if(params.employeeType == 1) {
                switch (contractorEmailPreferences) {
                    case 0: {
                        sendJobEmailToAssignee({to: contractor.info.companyEmail, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate})
                        break;
                    }
                    case 1: {
                        if (contractorEmailPreferences) {
                            let contractorEmailTimeHours = contractor.emailPreferences.time ? contractor.emailPreferences.time.getHours() : 21;
                            let contractorEmailTimeMinutes = contractor.emailPreferences.time ? contractor.emailPreferences.time.getMinutes() : 0;
                            let contractorEmailTimeSeconds = contractor.emailPreferences.time ? contractor.emailPreferences.time.getSeconds() : 0;
                            currentDate.setHours(contractorEmailTimeHours, contractorEmailTimeMinutes, contractorEmailTimeSeconds);
                        } else {
                            currentDate.setHours(21, 0, 0);
                        }
                        new CronJob(currentDate, function() {
                            sendJobEmailToAssignee({to: contractor.info.companyEmail, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate})
                        }, null, true, 'America/Los_Angeles');
                        break;
                    }
                    default: {
                        sendJobEmailToAssignee({to: contractor.info.companyEmail, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate})
                        break;
                    }


            }
           // For now we shouldn't spam company admins everytime a job is scheduled
            // sendJobEmailToCompanyAdmin({to: company.info.companyEmail, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate, vendorName: creator.profile.displayName})
        }

        //Get admin preferences to send an email to customer or not
        let customerEmailPreferences = cust ? cust.emailPreferences.preferences : null;
        currentDate = new Date();
            switch (customerEmailPreferences) {
                case 0: {
                    sendJobEmailToCustomer({to: cust.info.email, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate});
                    break;
                }
                case 1: {
                    if (cust.emailPreferences) {
                        let customerEmailTimeHours = cust.emailPreferences.time ? cust.emailPreferences.time.getHours() : 21;
                        let customerEmailTimeMinutes = cust.emailPreferences.time ? cust.emailPreferences.time.getMinutes() : 0;
                        let customerEmailTimeSeconds = cust.emailPreferences.time ? cust.emailPreferences.time.getSeconds() : 0;
                        currentDate.setHours(customerEmailTimeHours, customerEmailTimeMinutes, customerEmailTimeSeconds);
                    } else {
                        currentDate.setHours(21,0 ,0);
                    }
                    new CronJob(currentDate, function() {
                        sendJobEmailToCustomer({to: cust.info.email, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate})
                    }, null, true, 'America/Los_Angeles');
                    break;
                }
                default: {
                    sendJobEmailToCustomer({to: cust.info.email, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate})
                    // User has deactivated the email notification for job schedule
                    break;
                }

            }
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
        .populate('ticket')
        .populate({
            path: 'technician',
            select: 'profile.displayName'
        })
        .populate({
            path: 'contractor',
            select: 'info.companyName info.companyEmail type'
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
        .populate({
            path: 'jobLocation',
            select: 'name location'
        })
        .populate({
            path: 'jobSite',
            select: 'name location'
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
    const user = <IUser>req.user;
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
        if(job.scheduledEndTime >= currentTime) {
            finishedOnTime = true
        }

        let data: any = {}
        let track = job.track ? job.track : [];
        let action = '';
        if (params.status && params.status != job.status) {
            if(params.status == JobStatus.PENDING) {
                action = '|Pending the job|';
            }
            if (params.status == JobStatus.STARTED) {
                action = '|Starting the job|';
            }
            if (params.status == JobStatus.FINISHED) {
                action = '|Finishing the job|';
            }
            if (params.status == JobStatus.CANCELED) {
                action = '|Canceling the job|';
            }
            if (params.status == JobStatus.ARCHIVED) {
                action = '|Archiving the job|';
            }
        }
        data = {comment: params.comment, status: params.status, endTime: Date.now(), timeSpent: timeSpent, charges: newcharges, completeOnTime: finishedOnTime}

        if(params.jobLocationId) {
            data.jobLocation = params.jobLocationId
        }
        if(params.jobSiteId) {
            data.jobSite = params.jobSiteId
        }
        if (
            job.command != params.comment ||
            job.jobLocation != params.jobLocationId ||
            job.jobSite != params.jobSiteId
        ) {
            action+='|Job Info Updated|';
        }
        track.push({
            user: user._id,
            action,
            date: new Date()
        })
        data.track = track;
        return job.updateOne(data)
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
    const user = <IUser>req.user;
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
            let track = job.track ? job.track : [];
            let action = '';
            if (job.status != JobStatus.STARTED) {
                action = '|Started The Job|';
            }
            track.push({
                user: user._id,
                action,
                date: new Date()
            });
            job.updateOne(
                {status: JobStatus.STARTED, track: track, startTime: Date.now()},
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
    const user = <IUser>req.user;
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
            let track = job.track ? job.track : [];
            let action = '';

            job.technician = params.technicianId
            job.scheduleDate = params.scheduleDate

            let newStartTime: any = null
            let newEndTime: any = null
            if(params.scheduledStartTime){
                var date = new Date(params.scheduleDate)
                newStartTime = new Date(date.getFullYear()+'-'+(date.getMonth()+1) +'-'+date.getDate()+' '+params.scheduledStartTime)
                if(newStartTime != job.scheduledStartTime) {
                    action +='|Updated ScheduledStartTime|';
                }
                job.scheduledStartTime = newStartTime

            }
            if(params.scheduledStartTime){
                var date = new Date(params.scheduleDate)
                newEndTime = new Date(date.getFullYear()+'-'+(date.getMonth()+1) +'-'+date.getDate()+' '+params.scheduledEndTime)
                if(newEndTime != job.scheduledEndTime) {
                    action +='|Updated ScheduledEndTime|';
                }
                job.scheduledEndTime = newEndTime
            }
            if(params.equipmentId != undefined && params.equipmentId !== null && params.equipmentId !== '""') {
                if (params.equipmentId != job.equipmentId) {
                    action +='|Updated EquipmentId|';
                }
                job.equipmentId = params.equipmentId
            }
            if(params.jobLocationId) {
                if (params.jobLocationId != job.jobLocation) {
                    action +='|Updated JobLocationId|';
                }
                job.jobLocation = params.jobLocationId
            }
            if(params.jobSiteId) {
                if (params.jobSiteId != job.jobSite) {
                    action +='|Updated JobSiteId|';
                }
                job.jobSite = params.jobSiteId
            }
            track.push({
                user: user._id,
                action,
                date: new Date()
            });
            job.track = track;
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
        .populate({
            path: 'jobLocation',
            select: 'name location'
        })
        .populate({
            path: 'jobSite',
            select: 'name location'
        })
        .then(async (job: any)=>{

            if (job == undefined || job == null) {
                throw new Error ('Invalid job id')
                // return res.json({'status': Status.Error, 'message': "Invalid job id"})
            }
            await job.populate('customer.contacts').execPopulate();
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
        let track = job.track ? job.track : [];
        let action = '';
        if (job.startTime != startTime) {
            action +='|Updated Start Time|';
        }
        if (job.endTime != endTime) {
            action +='|Updated End Time|';
        }
        track.push({
            user: user._id,
            action,
            date: new Date()
        });
        return job.updateOne({ startTime: startTime, endTime: endTime, timeSpent: timeSpent, charges: newcharges, track: track, timeUpdatedBy: user._id, timeUpdatedAt: Date.now() })

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
