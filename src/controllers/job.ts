import {Request, Response} from 'express'
import { Status, Messages, JobStatus, ServiceTicketStatus } from '../common/constants'
import {
    sendJobEmailToAssignee,
    sendJobEmailToCustomer, sendReportEmailToCustomer
} from '../services/aws'

import { Job, IJob } from '../models/Job'
import {EmailSchedule} from '../models/EmailSchedule'
import {Company, ICompany} from '../models/Company'
import {IUser, User} from '../models/User'
import { ServiceTicket ,IServiceTicket } from '../models/ServiceTicket'
import { Scan } from '../models/Scan'
import { PurchaseOrder } from '../models/PurchaseOrder'
import {IJobReport, JobReport} from '../models/JobReport'
import { Item } from '../models/Item'
import {CronJob} from 'cron';
import moment from 'moment-timezone';
import {CompanyCustomer} from '../models/CompanyCustomer';
import { ObjectId } from 'mongodb'

export const createJob = (req: Request, res: Response) => {
    const params = req.body

    if (params.employeeType == 1) {
        if (params.contractorId == undefined) {
            throw new Error('Contractor Id must be specified when employeeType is contractor')
        }
    } else if (params.employeeType == 0) {
        if (params.technicianId == undefined) {
            throw new Error('technicianId Id must be specified when employeeType is employee')
        }
    }
    ServiceTicket.findById(params.ticketId)
    .then((serviceTicket: IServiceTicket) => {
        if (serviceTicket == undefined) {
            throw new Error('Invalid ticket Id')
        }
        if (serviceTicket.status == ServiceTicketStatus.ARCHIVED) {
            throw new Error('You can\'t create a job using canceled ticket.')
        }
        if (serviceTicket.jobCreated) {
            throw new Error('Job already created for this ticket.')
        }
        let jobId = serviceTicket.ticketId.replace("Ticket",'Job')

        if(params.scheduledStartTime && params.scheduledEndTime) {
            let newStartTime: any = null
            let newEndTime: any = null
            let date;
            if(params.scheduledStartTime){
                date = new Date(params.scheduleDate)
                newStartTime = new Date(date.getFullYear()+'-'+(date.getMonth()+1) +'-'+date.getDate()+' '+params.scheduledStartTime)
            }
            if(params.scheduledEndTime){
                date = new Date(params.scheduleDate)
                newEndTime = new Date(date.getFullYear()+'-'+(date.getMonth()+1) +'-'+date.getDate()+' '+params.scheduledEndTime)
            }

            return new Promise((resolve, reject) => {

                Job.findOne( { $or: [ { company: req.companyId, technician:params.technicianId, scheduleDate: new Date(params.scheduleDate), scheduledStartTime: { $lte: newStartTime} , scheduledEndTime: { $gte: newStartTime } },
                     { company: req.companyId, technician:params.technicianId, scheduleDate: new Date(params.scheduleDate), scheduledStartTime: { $lte: newEndTime} , scheduledEndTime: { $gte: newEndTime }} ] }, (err: any, job: IJob) => {
                    if(job != undefined) {
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
    .then(async (response: any) =>{
        const jobId = response[0]
        const serviceTicket = response[1]

        await _createJob(req, res, jobId, serviceTicket, (req: Request, res: Response, err: any, newJob: IJob) => {
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
    let technicianId: any = await User.findOne({_id: params.technicianId});
    if (!contractor && ! technicianId) {
        return next(req, res, "Contractor/Technician not found!", null)
    }
    // Setting vendor admin as the default technician of the job
    if (contractor && !technicianId) {
        technicianId = contractor.admin;
    }
    let track = [];
    let action = '|Created A Job|';
    track.push({
        user: user._id,
        action,
        date: new Date()
    });
    if (params.ticketId) {
        ServiceTicket.findOne({_id: new ObjectId(params.ticketId)}).then((t) => {
            if (t) {
                if (!t.jobLocation && params.jobLocation) {
                    t.jobLocation = params.jobLocation;
                }
                if (!t.jobSite && params.jobSite) {
                    t.jobSite = params.jobSite;
                }
                t.save().then(() => {}).catch((err) => {
                    return res.json({'status': Status.Error, 'message': err.message});
                })
            }
        }).catch((err) => {
           return res.json({'status': Status.Error, 'message': err.message});
        });
    }
    const job = new Job({
        scheduleDate: params.scheduleDate,
        jobId: jobId,
        ticket: params.ticketId,
        technician: technicianId,
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
        let date = new Date(params.scheduleDate)
        newStartTime = new Date(date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + params.scheduledStartTime)
        job.scheduledStartTime = newStartTime

    }
    if (params.scheduledEndTime) {
        let date = new Date(params.scheduleDate)
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
            scheduleEmails(req, res, job, (req: Request, res: Response, newJob: IJob) => {
                    return next(req, res, null, newJob)
                });

        })
    })
}


const scheduleEmails = (req: Request, res: Response, jobCreated: IJob, next: (req: Request, res: Response, job: IJob) => void) => {
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
        .populate('jobSite')
        .populate({
            path: 'jobLocation',
            populate: 'contacts'
        })
        .populate('ticket')
        .then(async (job: IJob) => {
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
            if(params.employeeType == 0) {
                switch (techEmailPreferences) {
                    case 0: {
                        sendJobEmailToAssignee({to: tech.auth.email, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description,location: job.jobLocation, site: job.jobSite,ticket: job.ticket, dateTime: job.scheduleDate});
                        break;
                    }
                    case 1: {
                        /*    let techSchedule = tech.emailPreferences.time;
                            let currentDate = moment().tz(tech.emailPreferences.timeZone);
                            let sendDate = moment().tz(tech.emailPreferences.timeZone).hours(techSchedule.getHours()).minutes(techSchedule.getMinutes()).seconds(58);
                            const checkEmailSentOrNot = currentDate.diff(sendDate) < 0;
                            */

                        let emailSchedule = await EmailSchedule.findOne({user: tech._id, pulled: false});
                        if (emailSchedule) {
                            emailSchedule.jobs.push(job._id)
                        } else {
                            emailSchedule = new EmailSchedule({
                                user: tech._id,
                                type: 0,
                                jobs: [job._id]
                            });
                        }
                        await emailSchedule.save();
                        break;
                    }
                    default: {
                        sendJobEmailToAssignee({to: tech.auth.email, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, location: job.jobLocation, site: job.jobSite,ticket: job.ticket, notes: job.description, dateTime: job.scheduleDate});
                        break;
                    }
                }

            }
            if(params.employeeType == 1) {
                switch (contractorEmailPreferences) {
                    case 0: {
                        sendJobEmailToAssignee({to: contractor.info.companyEmail, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description,location: job.jobLocation, site: job.jobSite,ticket: job.ticket, dateTime: job.scheduleDate})
                        break;
                    }
                    case 1: {
                        let emailSchedule = await EmailSchedule.findOne({user: contractor.admin, pulled: false});
                        if (emailSchedule) {
                            emailSchedule.jobs.push(job._id)
                        } else {
                            emailSchedule = new EmailSchedule({
                                user: contractor.admin,
                                type: 1,
                                jobs: [job._id]
                            });
                        }
                        await emailSchedule.save();
                        break;                    }
                    default: {
                        sendJobEmailToAssignee({to: contractor.info.companyEmail, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, location: job.jobLocation, site: job.jobSite,ticket: job.ticket, dateTime: job.scheduleDate})
                        break;
                    }


                }
                // For now we shouldn't spam company admins everytime a job is scheduled
                // sendJobEmailToCompanyAdmin({to: company.info.companyEmail, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate, vendorName: creator.profile.displayName})
            }

            //Get admin preferences to send an email to customer or not
            let customerEmailPreferences = cust ? cust.emailPreferences.preferences : null;
            switch (customerEmailPreferences) {
                case 0: {
                    sendJobEmailToCustomer({to: cust.info.email, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate});
                    break;
                }
                case 1: {
                    let emailSchedule = await EmailSchedule.findOne({user: cust._id, pulled: false});
                    if (emailSchedule) {
                        emailSchedule.jobs.push(job._id)
                    } else {
                        emailSchedule = new EmailSchedule({
                            user: cust._id,
                            type: 2,
                            jobs: [job._id]
                        });
                    }
                    await emailSchedule.save();
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
        }).catch((err) => {
        return res.json({ 'status': Status.Error, 'message': err.message });
    })

}

/**
 * Unused for now!
 * @param req
 * @param res
 * @param jobCreated
 * @param next
 */
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
    .populate('jobSite')
    .populate({
        path: 'jobLocation',
        populate: 'contacts'
    })
    .populate('ticket')
    .exec((err: any, job: IJob) => {

        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }

        var tech : any;
        var contractor : any;
        var assigneeName: any;
        var cust : any = job.customer
        var type : any = job.type
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
        if(params.employeeType == 0) {
                switch (techEmailPreferences) {
                    case 0: {
                        sendJobEmailToAssignee({to: tech.auth.email, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description,location: job.jobLocation, site: job.jobSite,ticket: job.ticket, dateTime: job.scheduleDate});
                        break;
                    }
                    case 1: {
                        let sendDate;
                        if (techEmailPreferences) {
                            let techEmailTimeHours = tech.emailPreferences.time ? tech.emailPreferences.time.getHours() : 21;
                            let techEmailTimeMinutes = tech.emailPreferences.time ? tech.emailPreferences.time.getMinutes() : 0;
                            sendDate = moment().tz('America/Chicago').hours(techEmailTimeHours).minutes(techEmailTimeMinutes);
                        } else {
                            sendDate = moment().tz('America/Chicago').hours(21).minutes(0);

                        }
                        new CronJob(sendDate, function() {
                            sendJobEmailToAssignee({to: tech.auth.email, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, location: job.jobLocation, site: job.jobSite,ticket: job.ticket, notes: job.description, dateTime: job.scheduleDate});
                        }, null, true);
                        break;
                    }
                    default: {
                        sendJobEmailToAssignee({to: tech.auth.email, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, location: job.jobLocation, site: job.jobSite,ticket: job.ticket, notes: job.description, dateTime: job.scheduleDate});
                        break;
                    }
                }

        }
        if(params.employeeType == 1) {
                switch (contractorEmailPreferences) {
                    case 0: {
                        sendJobEmailToAssignee({to: contractor.info.companyEmail, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate})
                        break;
                    }
                    case 1: {
                        let sendDate;
                        if (contractorEmailPreferences) {
                            let contractorEmailTimeHours = contractor.emailPreferences.time ? contractor.emailPreferences.time.getHours() : 21;
                            let contractorEmailTimeMinutes = contractor.emailPreferences.time ? contractor.emailPreferences.time.getMinutes() : 0;
                            sendDate = moment().tz('America/Chicago').hours(contractorEmailTimeHours).minutes(contractorEmailTimeMinutes);
                        } else {
                            sendDate = moment().tz('America/Chicago').hours(21).minutes(0);
                        }
                        new CronJob(sendDate, function() {
                            sendJobEmailToAssignee({to: contractor.info.companyEmail, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate})
                        }, null, true);
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
            switch (customerEmailPreferences) {
                case 0: {
                    sendJobEmailToCustomer({to: cust.info.email, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate});
                    break;
                }
                case 1: {
                    let sendDate;
                    if (cust.emailPreferences) {
                        let customerEmailTimeHours = cust.emailPreferences.time ? cust.emailPreferences.time.getHours() : 21;
                        let customerEmailTimeMinutes = cust.emailPreferences.time ? cust.emailPreferences.time.getMinutes() : 0;
                        sendDate = moment().tz('America/Chicago').hours(customerEmailTimeHours).minutes(customerEmailTimeMinutes);

                    } else {
                        sendDate = moment().tz('America/Chicago').hours(21).minutes(0);
                    }
                    new CronJob(sendDate, function() {
                        sendJobEmailToCustomer({to: cust.info.email, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate})
                    }, null, true);
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

export const getFilteredJobs = async (req: Request, res: Response) => {


    const pageSize = +req.query.pageSize;
    const todaysJobs = req.body.todaysJobs;
    const currentPage = +req.query.page;
    let customerNames = req.body.customerNames ? req.body.customerNames.split(',') : null;
    let jobId = req.body.jobId ? req.body.jobId : null;
    var companyId = req.companyId;
    let customers: any;
    let filteredCustomers: any;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    let query: any = {};
    query['$or'] = [{ contractor: companyId }, { company: companyId } ];
    if (todaysJobs === "true") {
        let date = new Date()
        date.setHours(0, 0, 0, 0)
        let endDate = new Date()
        endDate.setHours(23, 59, 59, 59)
        query.dateTime = {$gte: date, $lte: endDate};
    }

    if (customerNames && customerNames.length) {
        customers = await CompanyCustomer.find({}).select('customer -_id');
        let customersIds = customers.reduce((acc: any, v: any) => {
            acc.push(v.customer);
            return acc;
        }, [])
        filteredCustomers = await User.find({_id: {$in : customersIds}, 'profile.displayName': {$in: customerNames}}).select('_id');
        filteredCustomers = filteredCustomers.length ? filteredCustomers : [];
            query.customer = {$in : filteredCustomers};
    }
    if (jobId) {
            if (jobId.match(/\d/g)) {
                jobId = 'Job '+jobId.match(/\d/g).join("");
            }
        query.jobId = { $regex: jobId, $options: 'i'}
    }
    let count = await Job.find(query).countDocuments();
    await Job.find(query)
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
            select: 'info.email auth.email profile.displayName address.street address.city address.state address.zipCode contactName contact'
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
        }).skip((currentPage - 1) * pageSize)
        .limit(pageSize)
        .exec((err: any, jobs: IJob[]) => {
                if (err) {
                    return res.json({'status': Status.Error, 'message': err.message})
                }
                return res.json({'status': Status.Success, 'jobs': jobs, 'total': count});
            }
        )

}
export const getJobs = (req: Request, res: Response) => {

    let companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }

    Job.find({ $or:[{ contractor: companyId }, { company: companyId } ]}).populate('ticket')
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
            return res.json({'status': Status.Success, 'jobs': jobs, 'total': jobs.length });
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


const createJobReport = async (jobId: any, companyId: any,customerName: string|null, technicianName: string|null, date: any, contractor?: any) => {
    const job = await Job.findOne({_id: jobId, $or:[{ contractor: companyId }, { company: companyId } ], status: JobStatus.FINISHED}).select('_id').exec();
    if (job) {
        const scans = await Scan.find({ job: job}, 'comment timeOfScan').select('_id').exec();
        const purchaseOrders = await PurchaseOrder.find({job: job}).select('_id').exec();
        await JobReport.deleteMany({job: job});
        const jobReport = new JobReport({
            job: job,
            scans: scans,
            purchaseOrders: purchaseOrders,
            jobDate: date,
            customerName: customerName,
            technicianName: technicianName,
            company: companyId,
            emailHistory: []
        });
        if (contractor) {
            jobReport.contractor = contractor;
        }
        return jobReport.save().then((jobReport: IJobReport) => jobReport);
    }
}

export const getAllJobReports = (req: Request, res: Response) => {
    let companyId = req.companyId;

    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    JobReport.find({$or:[{ contractor: companyId }, { company: companyId } ]}).populate({
        path: 'job',
        select: '_id jobId customer technician',
    }).exec().then((reports: IJobReport[]) => {
        if (reports.length) {
            return res.json({'status': Status.Success, 'reports': reports});
        }
        return res.json({'status': Status.Success, 'reports': [], 'message': 'No reports was found!'});
    }).catch((err) => {
        return res.json({'status': Status.Error, 'message' : err.message});
    });
}


export const getJobReportDetails = (req: Request, res: Response) => {
    const jobReportId = req.query.jobReportId;
    let companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    JobReport.findOne({_id: jobReportId, $or:[{ contractor: companyId }, { company: companyId } ]})
        .populate({
            path: 'job',
            populate: [
                { path: 'ticket', select: 'ticketId note scheduleDateTime image customerPO customerContactId' },
                { path: 'technician', select: 'profile.displayName auth.email contact.phone permissions.role' },
                { path: 'customer', select: 'info.email auth.email profile.displayName permissions.role address.street address.city address.state address.zipCode contact.phone contactName' },
                { path: 'type', select: 'title' },
                { path: 'company', select: 'info.companyName info.logoUrl auth.email permissions.role address.street address.city address.state address.zipCode contact.phone contact.fax' },
                { path: 'createdBy', select: 'info.companyName auth.email profile.displayName permissions.role address.street address.city address.state address.zipCode contact.phone' },
                'jobSite', 'jobLocation'
            ],
        }).populate({
        path: 'scans',
        populate: [
            {
                path: 'equipment',
                select: 'info.model info.serialNumber info.nfcTag images info.location',
                populate: [
                    { path: 'brand', select: 'title' },
                    { path: 'type', select: 'title' }
                    ]
            }
            ]
    }).populate('PurchaseOrder')
        .exec()
        .then((report: IJobReport) => {
            if (report) {
                return res.json({'status': Status.Success, 'report': report});
            }
            return res.json({'status': Status.Success, 'message': 'No report was found!'});
        }).catch((err) => {
        return res.json({'status': Status.Error, 'message' : err.message});
    });
}


export const deleteJobReportById = async (req: Request, res: Response) => {
    const jobReportId = req.query.jobReportId;
    let companyId = req.companyId;

    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    JobReport.deleteOne({_id: new ObjectId(jobReportId), $or:[{ contractor: companyId }, { company: companyId } ] }).then(() => {
        return res.json({'status': Status.Success, 'message': 'Job Report Has Been Deleted Successfully!'});
    }).catch((err) => {
       return res.json({'status': Status.Error, 'message': err.message});
    });
}

export const updateJob = (req: Request, res: Response) => {

    const params = req.body
    let companyId = req.companyId;
    const user = <IUser>req.user;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    Job.findOne({ _id: params.jobId, $or:[{ contractor: companyId }, { company: companyId } ] })
        .select('_id customer ticket technician scheduleDate company comment')
        .populate({
        path: 'customer',
        select: 'profile.displayName'
        })
        .populate({
        path: 'technician',
        select: 'profile.displayName'
        })
        .populate({
        path: 'ticket',
        select: 'customer',
        populate: { path: 'customer', select: 'profile.displayName' }
        })
    .then((job: IJob) => {
        if (job == undefined) {
            throw new Error("Invalid job id")
        }

        const itemPromise = Item.findOne({jobType: job.type})

        return Promise.all([job, itemPromise])
    })
    .then(async (result: any) => {
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
                action = '|Scheduling the job|';
            }
            if (params.status == JobStatus.STARTED) {
                if(job.status == JobStatus.CANCELED) {
                    action = '|Re-starting the job|';
                    await ServiceTicket.findOneAndUpdate({_id: job.ticket}, {jobCreated: true});
                } else {
                    action = '|Starting the job|';
                }
            }
            if (params.status == JobStatus.FINISHED) {
                action = '|Finishing the job|';
            }
            if (params.status == JobStatus.CANCELED) {
                action = '|Canceling the job|';
                await ServiceTicket.findOneAndUpdate({_id: job.ticket}, {jobCreated: false});
            }
        }
        let userComment = '';
        if (params.comment !== 'undefined') {
            userComment = params.comment;
        } else {
            userComment = job.comment ? job.comment : 'N/A';
        }
        data = {comment: userComment, status: params.status, endTime: Date.now(), timeSpent: timeSpent, charges: newcharges, completeOnTime: finishedOnTime}
        if(params.jobLocationId) {
            data.jobLocation = params.jobLocationId
        }
        if(params.jobSiteId) {
            data.jobSite = params.jobSiteId
        }
        if (
            job.comment != params.comment ||
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
            try {
                await job.updateOne(data);

                    let customerName = job.customer ?
                        job.customer.profile.displayName :
                        (job.ticket ? (job.ticket.customer ? job.ticket.customer.profile.displayName : null) : null);
                    let technicianName = job.technician ? job.technician.profile.displayName : null;
                    let date = job.scheduleDate;
                    if (job.contractor) {
                        await createJobReport(job._id, job.company,customerName, technicianName, date, job.contractor);
                    } else {
                        await createJobReport(job._id,job.company, customerName, technicianName, date, companyId);
                    }
                return res.json({'status': Status.Success, 'message': 'Job updated successfully.'})
            } catch (err) {
                return res.json({'status': Status.Error, 'message': err.message});
            }
    }).catch((err) => {
        return res.json({'status': Status.Error, 'message': err.message});
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
        { _id: params.jobId, $or:[{ contractor: companyId }, { company: companyId } ] },
        (err: any, job: IJob)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            if (job == undefined) {
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
        { _id: params.jobId, $or:[{ contractor: companyId }, { company: companyId } ] },
        (err: any, job: IJob)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            if (job == undefined) {
                return res.json({'status': Status.Error, 'message': "Invalid job id"})
            }

            let track = job.track ? job.track : [];
            let action = '';
            if (params.technicianId) {
                job.technician = params.technicianId
            } else {
                if (params.contractorId) {
                    job.contractor = params.contractorId;
                }
            }
            job.scheduleDate = params.scheduleDate;
            let newStartTime: any = null
            let newEndTime: any = null
            let date;
            if(params.scheduledStartTime){
                date = new Date(params.scheduleDate)
                newStartTime = new Date(date.getFullYear()+'-'+(date.getMonth()+1) +'-'+date.getDate()+' '+params.scheduledStartTime)
                if(newStartTime != job.scheduledStartTime) {
                    action +='|Updated ScheduledStartTime|';
                }
                job.scheduledStartTime = newStartTime

            }
            if(params.scheduledEndTime){
                date = new Date(params.scheduleDate)
                newEndTime = new Date(date.getFullYear()+'-'+(date.getMonth()+1) +'-'+date.getDate()+' '+params.scheduledEndTime)
                if(newEndTime != job.scheduledEndTime) {
                    action +='|Updated ScheduledEndTime|';
                }
                job.scheduledEndTime = newEndTime
            }
            if(params.equipmentId != undefined && params.equipmentId !== '""') {
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
            if (job.ticket) {
                ServiceTicket.findOne({_id: new ObjectId(job.ticket)}).then((t) => {
                    if (t) {
                        if (!t.jobLocation && params.jobLocation) {
                            t.jobLocation = params.jobLocation;
                        }
                        if (!t.jobSite && params.jobSite) {
                            t.jobSite = params.jobSite;
                        }
                        t.save().then(() => {}).catch((err) => {
                            return res.json({'status': Status.Error, 'message': err.message});
                        })
                    }
                }).catch((err) => {
                    return res.json({'status': Status.Error, 'message': err.message});
                });
            }
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

    Job.findOne({_id: params.jobId, $or:[{ contractor: companyId }, { company: companyId } ]})
        .populate({
            path: 'ticket',
            populate: 'customerContactId'
        })
        .populate({
            path: 'technician',
            select: 'profile.displayName'
        })
        .populate({
            path: 'customer',
            populate: 'contacts'
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

            if (job == undefined) {
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
        .then(async (result: any) => {

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

/*
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
            select: 'info.companyName info.logoUrl auth.email permissions.role address.street address.city address.state address.zipCode contact.phone contact.fax'
        })
        .populate({
            path: 'createdBy',
            select: 'info.companyName auth.email profile.displayName permissions.role address.street address.city address.state address.zipCode contact.phone'
        })
        .then((job: any)=>{

            if (job == undefined) {
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

 */
export const sendJobReport = (req: Request, res: Response) => {
    const params = req.body
    let companyId = req.companyId;
    const company = <ICompany>req.company;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    JobReport.findOne({_id: params.jobReportId, $or:[{ contractor: companyId }, { company: companyId } ]})
        .populate({
            path: 'job',
            populate: [
                { path: 'ticket', select: 'ticketId note scheduleDateTime' },
                { path: 'technician', select: 'profile.displayName auth.email contact.phone permissions.role' },
                { path: 'customer', select: 'info.email auth.email profile.displayName permissions.role address.street address.city address.state address.zipCode contact.phone contactName' },
                { path: 'type', select: 'title' },
                { path: 'company', select: 'info.companyName info.logoUrl auth.email permissions.role address.street address.city address.state address.zipCode contact.phone contact.fax' },
                { path: 'createdBy', select: 'info.companyName auth.email profile.displayName permissions.role address.street address.city address.state address.zipCode contact.phone' },
            ],
        }).populate({
        path: 'scans',
        populate: [
            {
                path: 'equipment',
                select: 'info.model info.serialNumber info.nfcTag images info.location',
                populate: [
                    { path: 'brand', select: 'title' },
                    { path: 'type', select: 'title' }
                ]
            }
        ]
    }).populate('PurchaseOrder')
        .exec()
        .then(async (report: IJobReport) => {
            if (report) {
                 sendReportEmailToCustomer({
                    companyName: company.info.companyName,
                    companyEmail: company.info.companyEmail,
                    customerName: report.job.customer.profile.displayName,
                    customerEmail: report.job.customer.info.email,
                    reportNumber: report.job.jobId,
                    jobType: report.job.jobType ? report.job.jobType.title : 'N/A',
                    workDate: report.job.scheduleDate,
                });
                let history = report.emailHistory ? report.emailHistory : [];
                let sendingDate = new Date();
                history.push({
                    sentTo: report.job.customer.info.email,
                    sentAt: sendingDate
                });
                report.emailHistory = history;
                report.lastEmailSent = sendingDate;
                await report.save().then((r) => {
                    return res.json({ 'status': Status.Success, 'message': 'Job Report Has Been Sent Successfully!' })
                }).catch((err) => {
                    return res.json({ 'status': Status.Error, 'message': err.message });
                });
            } else {
                return res.json({ 'status': Status.Error, 'message': "Report was not found" });
            }
        }).catch((err) => {
        return res.json({'status': Status.Error, 'message' : err.message});
    });
}

export const getTodaysJobsByTechnicianId = (req: Request, res: Response) => {

    let date = new Date()
    date.setHours(0, 0, 0, 0)
    let endDate = new Date()
    endDate.setHours(23, 59, 59, 59)
    const params = req.body

    Job.find({ technician: params.employeeId, $and: [ { status: { $ne: 2 } }, { status: { $ne: 3 } } ], scheduleDate: {
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
    let companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    Job.findOne({ _id: params.jobId, company: companyId })
    .then((job: IJob) => {
        if (job == undefined) {
            throw new Error("Invalid job id")
        }

        if(job.status == JobStatus.FINISHED) {
            throw new Error("Edit job is not allowed once it is finished")
        }

        if(job.status == JobStatus.CANCELED) {
            throw new Error("Edit job is not allowed once it is canceled")
        }

        if ((params.startTime == undefined) && (params.endTime == undefined)) {
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

        if(params.startTime != undefined && params.startTime != '""') {
            startTime = params.startTime
        }

        if(params.endTime != undefined && params.endTime != '""') {
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
    .then(() => {
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
