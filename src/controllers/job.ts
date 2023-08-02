import { Request, Response } from 'express'
import { ObjectId } from 'mongodb';
import { CronJob } from 'cron';
import moment from 'moment';
import momentTz from 'moment-timezone';
import * as _ from 'lodash';
import * as helper from '../services/helper';
import { Status, Messages, JobStatus, ServiceTicketStatus, SocketEvents, DefaultPageSize, JobRequestStatus } from '../common/constants'
import {
    sendJobEmailToAssignee,
    sendJobEmailToCustomer, 
    sendReportEmailToCustomer, 
    sendSMS,
} from '../services/aws'
import { IContact } from '../common/contact';

import { Job, IJob, ITask, ITaskJobType, TaskEntry } from '../models/Job'
import { EmailSchedule } from '../models/EmailSchedule'
import { Company, ICompany } from '../models/Company'
import { IUser, User } from '../models/User'
import { ServiceTicket, IServiceTicket } from '../models/ServiceTicket'
import { Scan } from '../models/Scan'
import { PurchaseOrder } from '../models/PurchaseOrder'
import { IJobReport, JobReport } from '../models/JobReport'
import { Item, IItem } from '../models/Item'
import { Customer, ICustomer } from '../models/Customer';
import { CompanyCustomer } from '../models/CompanyCustomer';
import { INotificationJob, NotificationJob } from '../models/NotificationDiscriminator'
import { IJobType, JobType } from '../models/JobType';
import { JobRoute } from '../models/JobRoute';
import { _handleJobTypesJson } from '../controllers/item';
import { _addOrRemoveJobRoutes } from '../controllers/jobRoute';
import { _handleNotification } from '../controllers/notification';
import { IJobRequest, JobRequest } from '../models/JobRequest';
import { NotificationTypes } from '../models/Notification';
import { JobLocation } from '../models/JobLocation';
import { JobSite } from '../models/JobSite';
import { HomeOwner } from '../models/HomeOwner';
import * as Sentry from '@sentry/node';
import { standarizePhoneNumberE164 } from '../utils/phoneNumberUtil';
import { ACCOUNT_RECEIVABLE_REPORT_PDF_PATH, FONT_SETS } from '../common/config';
import fs from 'fs';
import { handleJobReportPdf } from '../services/pdf';
import { JobCommission } from '../models/JobCommission';
import { CommissionHistory } from '../models/CommissionHistory';

const PdfPrinter = require('pdfmake')
/**
 * 04-22-2022
 * To be deprecated
 * */
// export const createJob = (req: Request, res: Response) => {

//     const params = req.body;
//     const imagesUrl: string[] = [];
//     if (req.files) {
//         const paramsImageFile = JSON.parse(JSON.stringify(req.files));

//         // Push image location from req.files to imagesUrl
//         paramsImageFile?.image?.forEach((image: any) => imagesUrl.push(image.location));
//         paramsImageFile?.images?.forEach((image: any) => imagesUrl.push(image.location));
//     }

//     const company = <ICompany>req.company;

//     if (params.employeeType == 0 && !params.technicianId) {
//         return res.json({ status: Status.Error, message: 'technicianId must be provided when employeeType is employee' });
//     }

//     if (params.employeeType == 1 && !params.contractorId) {
//         return res.json({ status: Status.Error, message: 'contractorId must be provided when employeeType is contractor' });
//     }

//     ServiceTicket.findOne({ _id: params.ticketId, company })
//         .then((serviceTicket: IServiceTicket) => {
//             if (!serviceTicket) {
//                 throw new Error('Service Ticket not found');
//             }
//             if (serviceTicket.status == ServiceTicketStatus.ARCHIVED) {
//                 throw new Error(`You can't create a job using canceled ticket.`);
//             }
//             if (serviceTicket.jobCreated) {
//                 throw new Error('Job already created for this ticket.');
//             }

//             let jobId = serviceTicket.ticketId.replace('Ticket', 'Job');

//             if (params.scheduledStartTime && params.scheduledEndTime) {
//                 let newStartTime: any = null
//                 let newEndTime: any = null
//                 let date;
//                 if (params.scheduledStartTime) {
//                     date = new Date(params.scheduleDate)
//                     newStartTime = new Date(date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + params.scheduledStartTime)
//                 }
//                 if (params.scheduledEndTime) {
//                     date = new Date(params.scheduleDate)
//                     newEndTime = new Date(date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + params.scheduledEndTime)
//                 }

//                 return new Promise((resolve, reject) => {
//                     Job.findOne({
//                         $or: [
//                             {
//                                 company: company._id,
//                                 tasks: { technician: params.technicianId },
//                                 scheduleDate: new Date(params.scheduleDate),
//                                 scheduledStartTime: { $lte: newStartTime },
//                                 scheduledEndTime: { $gte: newStartTime }
//                             },
//                             {
//                                 company: company._id,
//                                 tasks: { technician: params.technicianId },
//                                 scheduleDate: new Date(params.scheduleDate),
//                                 scheduledStartTime: { $lte: newEndTime },
//                                 scheduledEndTime: { $gte: newEndTime }
//                             }
//                         ]
//                     }, (err: any, job: IJob) => {
//                         if (job) {
//                             reject(new Error(`Technician is scheduled at time you selected, try scheduling after ${job.scheduledEndTime}`));
//                         } else {
//                             resolve([jobId, serviceTicket])
//                         }
//                     });
//                 });
//             } else {
//                 return [jobId, serviceTicket]
//             }

//         })
//         .then(async (response: any) => {
//             const jobId = response[0]
//             const serviceTicket = response[1]

//             const createJob = await _createJob(req, res, undefined, jobId, imagesUrl, serviceTicket);
//             return res.json({ status: Status.Success, message: 'Job created successfully.', createJob });
//         })
//         .catch((error: any) => {
//             return res.json({ status: Status.Error, message: error.message ?? Messages.GenericError });
//         });

// }

export const createJob = async (req: Request, res: Response) => {

    const params = req.body;
    const imagesUrl: string[] = [];
    const company = <ICompany>req.company;
    if (req.files) {
        const paramsImageFile = JSON.parse(JSON.stringify(req.files));

        // Push image location from req.files to imagesUrl
        paramsImageFile?.image?.forEach((image: any) => imagesUrl.push(image.location));
        paramsImageFile?.images?.forEach((image: any) => imagesUrl.push(image.location));
    }

    if (!params.ticketId && !params.jobRequestId) {
        return res.json({ status: Status.Error, message: 'ticketId or jobRequestId must be provided' })
    }

    if (params.ticketId && params.jobRequestId) {
        return res.json({ status: Status.Error, message: 'Can only use one of the ticketId or jobRequestId' })
    }

    if (params.employeeType == 0 && !params.technicianId) {
        return res.json({ status: Status.Error, message: 'technicianId must be provided when employeeType is employee' });
    }

    if (params.employeeType == 1 && !params.contractorId) {
        return res.json({ status: Status.Error, message: 'contractorId must be provided when employeeType is contractor' });
    }

    if (!params.isHomeOccupied && !params.customerId) {
        return res.json({ status: Status.Error, message: 'Customer is required' });
    }

    if (params.isHomeOccupied && !params.homeOwnerId) {
        return res.json({ status: Status.Error, message: 'Home Owner is required when home is occupied'});
    }

    if (!params.customerName && !(!params.customerPhone && !params.customerEmail)) {
        return res.json({ status: Status.Error, message: 'Name, Email or Phone must be provided'});
    }

    if (params.scheduledStartTime && params.scheduledEndTime) {
        try {
            handleScheduledTime({
                company,
                scheduleDate: params.scheduleDate,
                scheduledStartTime: params.scheduledStartTime,
                scheduledEndTime: params.scheduledEndTime,
                technicianId: params.technicianId
            });
        } catch (err) {
            Sentry.captureException(err);
            return res.json({ status: Status.Error, message: err });
        }
    }

    if (params.ticketId) {
        await createServiceTicketJob(req, res, params.ticketId, imagesUrl, company);
    }

    if (params.jobRequestId) {
        await createJobRequestJob(req, res, params.jobRequestId, imagesUrl, company);
    }
}

/**
 * For Vendor to be able to create sub job for its Sub Vendor
 */
export const createSubJob = async (req: Request, res: Response) => {

    const params = req.body;
    const companyId = req.companyId;

    if (params.employeeType == 0 && !params.technicianId) {
        return res.json({ status: Status.Error, message: 'technicianId must be provided when employeeType is employee' });
    }

    if (params.employeeType == 1 && !params.contractorId) {
        return res.json({ status: Status.Error, message: 'contractorId must be provided when employeeType is contractor' });
    }

    // Search and check if Parent Job existed
    const parentJob: IJob = await Job.findOne({ _id: params.parentJobId, 'tasks.contractor': companyId, status: JobStatus.PENDING });
    if (!parentJob) {
        return res.json({ status: Status.Error, message: 'Parent Job not found' });
    }

    // Count the existing sub job for the same parent job
    const jobCount: number = await Job.countDocuments({ parentJob: params.parentJobId });
    // Rename the job and the unique count on the end
    const jobId = `${parentJob.jobId} - ${jobCount + 1}`;

    const serviceTicket = await ServiceTicket.findById(parentJob.ticket);
    const createJob = await _createJob(req, res, parentJob, jobId, undefined, serviceTicket);
    return res.json({ status: Status.Success, message: 'Job created successfully.', createJob });

}

const _createJob = async (
    req: Request,
    res: Response,
    parentJob: IJob,
    jobId: string,
    imagesUrl: string[],
    serviceTicket: IServiceTicket,
) => {

    const params = req.body
    const invalidJobType: any[] = []
    let paramTasks: TaskEntry[] = params.tasks ?? [];
    const images = [];
    let newJob: IJob;

    // To handle any over-stringified strings
    if (!Array.isArray(paramTasks)) {
        paramTasks = JSON.parse(params.tasks);
    }

    const user = <IUser>req.user
    var companyId = req.companyId;

    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    const customer = params.customerId || parentJob && parentJob.customer;
    const homeOwner = params.homeOwnerId || parentJob && parentJob.homeOwner;

    let tasks;
    try {
        tasks = await _handleMutltipleTechniciansTasks({ req, res, parentJob, paramTasks, serviceTicket });
    } catch (error) {
        Sentry.captureException(error);
        return res.json({ status: Status.Error, message: error.message });
    }

    let track: any = [];
    let trackedServiceTicket: { user: any; action: string; date: Date; }[] = [];
    let action = '|Created A Job|';
    track.push({
        user: user._id,
        action,
        date: new Date()
    });

    if (params.ticketId) {
        serviceTicket = await ServiceTicket.findById(params.ticketId);
        if (serviceTicket) {
            if (!serviceTicket.jobLocation && params.jobLocation && customer) {
                serviceTicket.jobLocation = params.jobLocation;
            }
            if (!serviceTicket.jobSite && params.jobSite && customer) {
                serviceTicket.jobSite = params.jobSite;
            }
            if (!serviceTicket.homeJobLocation && params.homeJobLocationId && homeOwner) {
                serviceTicket.homeJobLocation = params.homeJobLocationId;
            }
            if (!serviceTicket.homeJobSite && params.homeJobSiteId && homeOwner) {
                serviceTicket.homeJobSite = params.homeJobSiteId;
            }

            if (customer) {
                serviceTicket.homeJobLocation = null;
                serviceTicket.homeJobSite = null;
                serviceTicket.homeOwner = null;
            }

            //To handle old schema tickets without any type
            if(!serviceTicket.type || serviceTicket.type != "Ticket"){
                serviceTicket.type = "Ticket";
            }

            trackedServiceTicket = serviceTicket.track;

            await serviceTicket.save();

            // Set the job's work type and company location to match the information provided in the ticket
            params.workType = serviceTicket.workType;
            params.companyLocation = serviceTicket.companyLocation;
        }

        const ticketImages = parentJob?.images?.length
            ? parentJob?.images
            : serviceTicket?.images?.length
                ? serviceTicket?.images
                : [];

        images.push(...ticketImages)
    }

    if (params.jobRequestId) {
        const jobRequest = await JobRequest.findOne({ _id: params.jobRequestId, company: companyId });

        if (!jobRequest) {
            return res.json({ status: Status.NotFound, message: 'Job request not found' });
        }

        if (jobRequest.status === JobRequestStatus.REJECTED) {
            return res.json({ status: Status.Error, message: 'Cannot create this job using rejected job request' });
        }

        if (!jobRequest.jobLocation && params.jobLocation) {
            jobRequest.jobLocation = params.jobLocation;
        }

        if (!jobRequest.jobSite && params.jobSite) {
            jobRequest.jobSite = params.jobSite;
        }

        jobRequest.status = JobRequestStatus.SCHEDULED;
        await jobRequest.save();
        jobRequest?.requests.forEach(request => {
            const requestImages = parentJob?.images?.length
                ? parentJob?.images
                : request.images?.length
                    ? request?.images
                    : []

            images.push(...requestImages);
        })
    }


    const job = new Job({
        parentJob: parentJob?._id,
        scheduleDate: params.scheduleDate ? moment(params.scheduleDate).format("YYYY-MM-DD") : parentJob?.scheduleDate,
        jobId: jobId,
        ticket: params.ticketId ?? parentJob?.ticket ?? null,
        request: params.jobRequestId ?? null,
        isHomeOccupied: params.isHomeOccupied,
        customerPhone: params.customerPhone || '',
        customerEmail: params.customerEmail || '',
        customerName: params.customerName,
        customer,
        homeOwner,
        jobLocation: params.jobLocationId ?? parentJob?.jobLocation,
        jobSite: params.jobSiteId ?? parentJob?.jobSite,
        homeJobLocation: params.homeJobLocationId ?? parentJob?.homeJobLocation,
        homeJobSite: params.homeJobSiteId ?? parentJob?.homeJobSite,
        customerContactId: params.customerContactId ?? parentJob?.customerContactId,
        customerPO: params.customerPO ?? parentJob?.customerPO,
        images: images,
        tasks,
        company: companyId,
        description: params.description ?? parentJob?.description,
        createdAt: Date.now(),
        createdBy: user._id,
        track: track,
        scheduleTimeAMPM: params.scheduleTimeAMPM || 0,
        scheduledStartTime: params.scheduledStartTime,
        scheduledEndTime: params.scheduledEndTime,
    })

    let newStartTime: any = null
    let newEndTime: any = null
    if (imagesUrl?.length) {
        imagesUrl.forEach(imageUrl => job.images.push({ imageUrl, uploadedBy: user.id, createdAt: new Date() }));
    }

    // if (params.scheduledStartTime) {
    //     let date = new Date(params.scheduleDate)
    //     newStartTime = new Date(date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + params.scheduledStartTime)
    //     job.scheduledStartTime = newStartTime

    // }
    // if (params.scheduledEndTime) {
    //     let date = new Date(params.scheduleDate)
    //     newEndTime = new Date(date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + params.scheduledEndTime)
    //     job.scheduledEndTime = newEndTime
    // }
    if (params.equipmentId) {
        job.equipmentId = params.equipmentId
    }

    if (params.companyLocation) {
        job.companyLocation = params.companyLocation;    
    }

    if (params.workType) {
        job.workType = params.workType;
    }

    newJob = await job.save();

    trackedServiceTicket.push({
        user: user._id,
        action: `|Job created by ${user.profile.displayName}|`,
        date: new Date()
    });

    if (serviceTicket) {
        await serviceTicket.updateOne({ jobCreated: true, track: trackedServiceTicket });
    }

    if (params.jobRequestId) {
        await JobRequest.findByIdAndUpdate(params.jobRequestId, {
            jobCreated: true,
            job: newJob._id,
            track: trackedServiceTicket
        });
    }

    for (const task of job.tasks) {
        await _addOrRemoveJobRoutes(task.technician, job.scheduleDate, 'ADD', job._id);
    }

    scheduleEmails(req, res, job, (req: Request, res: Response, newJob: IJob) => { })
    return { job: newJob, invalidJobTypes: invalidJobType };
}


const scheduleEmails = (req: Request, res: Response, jobCreated: IJob, next: (req: Request, res: Response, job: IJob) => void) => {
    const params = req.body
    const company = <ICompany>req.company

    Job.findById(jobCreated._id)
        // .populate({
        //     path: 'technician',
        //     select: 'profile contact auth.email emailPreferences'
        // })
        // .populate({
        //     path: 'contractor',
        //     select: 'info.companyName info.companyEmail type'
        // })
        .populate({
            path: 'customer',
            select: 'profile.displayName info.email emailPreferences'
        })
        .populate({
            path: 'homeOwner',
            select: 'profile.displayName info.email emailPreferences'
        })
        .populate({
            path: 'createdBy',
            select: 'profile.displayName'
        })
        // .populate({
        //     path: 'type',
        //     select: 'title description sku'
        // })
        .populate({
            path: 'tasks.contractor',
            select: 'info.companyName info.companyEmail type'
        })
        .populate({
            path: 'tasks.technician',
            select: 'profile contact auth.email emailPreferences'
        })
        .populate({
            path: 'tasks.jobTypes.jobType',
            select: 'title description sku'
        })
        .populate({
            path: 'tasks.jobTypes.timeUpdatedBy',
            select: 'profile.displayName'
        })
        .populate('jobSite')
        .populate({
            path: 'jobLocation',
            populate: 'contacts'
        })
        .populate('ticket')
        .then(async (job: IJob) => {
            var tech: any;
            var contractor: any;
            var assigneeName: any;
            var cust: any = job.customer
            var homeOwner: any = job.homeOwner;
            var type: any = job.type && job.type.title
            const tasks: string[] = [];
            // let tasks: string[] = job.tasks.map(task => {
            //     const jt = <ITaskJobType>task.jobTypes;
            //     return jt.title
            // });
            job.tasks.forEach(task => {
                task.jobTypes.forEach((jobType: any) => {
                    tasks.push(jobType.title)
                });
            });

            const jobTitles = tasks.length > 0 ? tasks.join(', ') : type;
            var creator: any = job.createdBy
            for (const task of job.tasks) {

                if (params.technicianId) {
                    tech = task.technician
                    assigneeName = tech.profile?.displayName
                }
                if (params.contractorId) {
                    contractor = task.contractor
                    assigneeName = contractor.info?.companyName
                }
                let techEmailPreferences = tech?.emailPreferences?.preferences ?? null;
                let contractorEmailPreferences = contractor?.emailPreferences?.preferences ?? null;
                if (params.employeeType == 0) {
                    switch (techEmailPreferences) {
                        case 0: {
                            sendJobEmailToAssignee({ to: tech.auth?.email, assigneeName: assigneeName, companyName: company.info.companyName, replyTo: company.info.companyEmail, customerName: cust.profile.displayName, homeOwnerName: homeOwner.profile.displayName, jobTitles, notes: job.description, location: job.jobLocation, site: job.jobSite, ticket: job.ticket, dateTime: job.scheduleDate });
                            break;
                        }
                        case 1: {
                            /*    let techSchedule = tech.emailPreferences.time;
                                let currentDate = momentTz().tz(tech.emailPreferences.timeZone);
                                let sendDate = momentTz().tz(tech.emailPreferences.timeZone).hours(techSchedule.getHours()).minutes(techSchedule.getMinutes()).seconds(58);
                                const checkEmailSentOrNot = currentDate.diff(sendDate) < 0;
                                */

                            let emailSchedule = await EmailSchedule.findOne({ user: tech._id, pulled: false });
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
                        case 2: {
                            break;
                        }
                        default: {
                            break;
                        }
                    }

                }
                if (params.employeeType == 1) {
                    switch (contractorEmailPreferences) {
                        case 0: {
                            sendJobEmailToAssignee({ to: contractor.info.companyEmail, assigneeName: assigneeName, companyName: company.info.companyName, replyTo: company.info.companyEmail, customerName: cust.profile.displayName, homeOwnerName: homeOwner.profile.displayName, jobTitles, notes: job.description, location: job.jobLocation, site: job.jobSite, ticket: job.ticket, dateTime: job.scheduleDate })
                            break;
                        }
                        case 1: {
                            let emailSchedule = await EmailSchedule.findOne({ user: contractor.admin, pulled: false });
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
                            break;
                        }
                        case 2: {
                            break;
                        }
                        default: {
                            break;
                        }


                    }
                    // For now we shouldn't spam company admins everytime a job is scheduled
                    // sendJobEmailToCompanyAdmin({to: company.info.companyEmail, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate, vendorName: creator.profile.displayName})
                }
            }

            /**
             * Kristono's remark (April 30th, 2021):
             * Commented as we don't want to send email to customer,
             * TODO: To revert or to remove entirely
             */
            // //Get admin preferences to send an email to customer or not
            // let customerEmailPreferences = cust ? cust.emailPreferences.preferences : null;
            // switch (customerEmailPreferences) {
            //     case 0: {
            //         sendJobEmailToCustomer({to: cust.info.email, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate});
            //         break;
            //     }
            //     case 1: {
            //         let emailSchedule = await EmailSchedule.findOne({user: cust._id, pulled: false});
            //         if (emailSchedule) {
            //             emailSchedule.jobs.push(job._id)
            //         } else {
            //             emailSchedule = new EmailSchedule({
            //                 user: cust._id,
            //                 type: 2,
            //                 jobs: [job._id]
            //             });
            //         }
            //         await emailSchedule.save();
            //         break;
            //     }
            //     default: {
            //         sendJobEmailToCustomer({to: cust.info.email, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate})
            //         // User has deactivated the email notification for job schedule
            //         break;
            //     }

            // }
            next(req, res, jobCreated)
            return
        }).catch((err) => {
            Sentry.captureException(err);
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
            path: 'technician',
            select: 'profile.displayName auth.email emailPreferences'
        })
        .populate({
            path: 'tasks.technician',
            select: 'profile auth.email contact'
        })
        .populate({
            path: 'contractor',
            select: 'info.companyName info.companyEmail type'
        })
        .populate({
            path: 'customer',
            select: 'profile.displayName info.email emailPreferences'
        })
        .populate({
            path: 'createdBy',
            select: 'profile.displayName'
        })
        .populate({
            path: 'type',
            select: 'title description sku'
        })
        .populate({
            path: 'tasks.jobType',
            select: 'title description sku'
        })
        .populate({
            path: 'tasks.jobTypes.jobType',
            select: 'title description sku'
        })
        .populate({
            path: 'tasks.timeUpdatedBy',
            select: 'profile.displayName'
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

            var tech: any;
            var contractor: any;
            var assigneeName: any;
            var cust: any = job.customer
            var type: any = job.type && job.type.title
            const tasks: string[] = [];
            job.tasks.forEach(task => {
                task.jobTypes.forEach((jobType: any) => {
                    tasks.push(jobType.title)
                });
            });
            const jobTitles = tasks.length > 0 ? tasks.join(', ') : type;
            var creator: any = job.createdBy
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
            if (params.employeeType == 0) {
                switch (techEmailPreferences) {
                    case 0: {
                        sendJobEmailToAssignee({ to: tech.auth.email, assigneeName: assigneeName, companyName: company.info.companyName, replyTo: company.info.companyEmail, customerName: cust.profile.displayName, jobTitles, notes: job.description, location: job.jobLocation, site: job.jobSite, ticket: job.ticket, dateTime: job.scheduleDate });
                        break;
                    }
                    case 1: {
                        let sendDate;
                        if (techEmailPreferences) {
                            let techEmailTimeHours = tech.emailPreferences.time ? tech.emailPreferences.time.getHours() : 21;
                            let techEmailTimeMinutes = tech.emailPreferences.time ? tech.emailPreferences.time.getMinutes() : 0;
                            sendDate = momentTz().tz('America/Chicago').hours(techEmailTimeHours).minutes(techEmailTimeMinutes);
                        } else {
                            sendDate = momentTz().tz('America/Chicago').hours(21).minutes(0);

                        }
                        new CronJob(sendDate, function () {
                            sendJobEmailToAssignee({ to: tech.auth.email, assigneeName: assigneeName, companyName: company.info.companyName, replyTo: company.info.companyEmail, customerName: cust.profile.displayName, jobTitles, location: job.jobLocation, site: job.jobSite, ticket: job.ticket, notes: job.description, dateTime: job.scheduleDate });
                        }, null, true);
                        break;
                    }
                    default: {
                        sendJobEmailToAssignee({ to: tech.auth.email, assigneeName: assigneeName, companyName: company.info.companyName, replyTo: company.info.companyEmail, customerName: cust.profile.displayName, jobTitles, location: job.jobLocation, site: job.jobSite, ticket: job.ticket, notes: job.description, dateTime: job.scheduleDate });
                        break;
                    }
                }

            }
            if (params.employeeType == 1) {
                switch (contractorEmailPreferences) {
                    case 0: {
                        sendJobEmailToAssignee({ to: contractor.info.companyEmail, assigneeName: assigneeName, companyName: company.info.companyName, replyTo: company.info.companyEmail, customerName: cust.profile.displayName, jobTitles, notes: job.description, dateTime: job.scheduleDate })
                        break;
                    }
                    case 1: {
                        let sendDate;
                        if (contractorEmailPreferences) {
                            let contractorEmailTimeHours = contractor.emailPreferences.time ? contractor.emailPreferences.time.getHours() : 21;
                            let contractorEmailTimeMinutes = contractor.emailPreferences.time ? contractor.emailPreferences.time.getMinutes() : 0;
                            sendDate = momentTz().tz('America/Chicago').hours(contractorEmailTimeHours).minutes(contractorEmailTimeMinutes);
                        } else {
                            sendDate = momentTz().tz('America/Chicago').hours(21).minutes(0);
                        }
                        new CronJob(sendDate, function () {
                            sendJobEmailToAssignee({ to: contractor.info.companyEmail, assigneeName: assigneeName, companyName: company.info.companyName, replyTo: company.info.companyEmail, customerName: cust.profile.displayName, jobTitles, notes: job.description, dateTime: job.scheduleDate })
                        }, null, true);
                        break;
                    }
                    default: {
                        sendJobEmailToAssignee({ to: contractor.info.companyEmail, assigneeName: assigneeName, companyName: company.info.companyName, replyTo: company.info.companyEmail, customerName: cust.profile.displayName, jobTitles, notes: job.description, dateTime: job.scheduleDate })
                        break;
                    }


                }
                // For now we shouldn't spam company admins everytime a job is scheduled
                // sendJobEmailToCompanyAdmin({to: company.info.companyEmail, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate, vendorName: creator.profile.displayName})
            }

            /**
             * Kristono's remark (April 30th, 2021):
             * Commented as we don't want to send email to customer,
             * TODO: To revert or to remove entirely
             */
            // //Get admin preferences to send an email to customer or not
            // let customerEmailPreferences = cust ? cust.emailPreferences.preferences : null;
            //     switch (customerEmailPreferences) {
            //         case 0: {
            //             sendJobEmailToCustomer({to: cust.info.email, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate});
            //             break;
            //         }
            //         case 1: {
            //             let sendDate;
            //             if (cust.emailPreferences) {
            //                 let customerEmailTimeHours = cust.emailPreferences.time ? cust.emailPreferences.time.getHours() : 21;
            //                 let customerEmailTimeMinutes = cust.emailPreferences.time ? cust.emailPreferences.time.getMinutes() : 0;
            //                 sendDate = momentTz().tz('America/Chicago').hours(customerEmailTimeHours).minutes(customerEmailTimeMinutes);

            //             } else {
            //                 sendDate = momentTz().tz('America/Chicago').hours(21).minutes(0);
            //             }
            //             new CronJob(sendDate, function() {
            //                 sendJobEmailToCustomer({to: cust.info.email, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate})
            //             }, null, true);
            //             break;
            //         }
            //         default: {
            //             sendJobEmailToCustomer({to: cust.info.email, assigneeName: assigneeName, companyName: company.info.companyName, customerName: cust.profile.displayName, jobType: type.title, notes: job.description, dateTime: job.scheduleDate})
            //             // User has deactivated the email notification for job schedule
            //             break;
            //         }

            //     }
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
    query['$or'] = [{ contractor: companyId }, { 'tasks.contractor': companyId }, { company: companyId }];
    if (todaysJobs === "true") {
        let date = moment().startOf('day');
        let endDate = moment().endOf('day');
        query.scheduleDate = { $gte: date, $lte: endDate };
    }

    if (customerNames && customerNames.length) {
        customers = await CompanyCustomer.find({}).select('customer -_id');
        let customersIds = customers.reduce((acc: any, v: any) => {
            acc.push(v.customer);
            return acc;
        }, [])
        filteredCustomers = await User.find({ _id: { $in: customersIds }, 'profile.displayName': { $in: customerNames } }).select('_id');
        filteredCustomers = filteredCustomers.length ? filteredCustomers : [];
        query.customer = { $in: filteredCustomers };
    }
    if (jobId) {
        if (jobId.match(/\d/g)) {
            jobId = 'Job ' + jobId.match(/\d/g).join("");
        }
        query.jobId = { $regex: jobId, $options: 'i' }
    }
    let count = await Job.find(query).countDocuments();
    await Job.find(query).sort({ _id: -1 })
        .populate('ticket')
        .populate('request')
        .populate({
            // TODO: To be deprecated
            path: 'technician',
            select: 'profile contact auth.email'
        })
        .populate({
            // TODO: To be deprecated
            path: 'contractor',
            select: 'info type contact'
        })
        .populate({
            path: 'tasks.technician',
            select: 'profile contact auth.email'
        })
        .populate({
            path: 'tasks.contractor',
            select: 'info type contact'
        })
        .populate({
            path: 'customer',
            select: 'info.email auth.email profile address location contactName contact'
        })
        .populate({
            // TODO: To be deprecated
            path: 'type',
            select: 'title description sku'
        })
        .populate({
            // TODO: To be deprecated
            path: 'tasks.jobType',
            select: 'title description sku'
        })
        .populate({
            // TODO: To be deprecated
            path: 'tasks.timeUpdatedBy',
            select: 'profile.displayName'
        })
        .populate({
            path: 'tasks.jobTypes.jobType',
            select: 'title description sku'
        })
        .populate({
            path: 'tasks.jobTypes.timeUpdatedBy',
            select: 'profile.displayName'
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
            select: 'name address location'
        })
        .populate({
            path: 'images.uploadedBy',
            select: 'profile.displayName'
        })
        .populate({
            path: 'technicianImages.uploadedBy',
            select: 'profile.displayName'
        })
        .populate({
            path: 'homeOwner',
            select: 'profile info contact'
        })
        .populate({
            path: 'jobSite',
            select: 'name address location'
        }).skip((currentPage - 1) * pageSize)
        .limit(pageSize)
        .exec((err: any, jobs: IJob[]) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': err.message })
            }
            return res.json({ 'status': Status.Success, 'jobs': jobs, 'total': count });
        }
        )

}
export const getJobs = async (req: Request, res: Response) => {
    const params = req.body;
    const workType = req.query.workType;
    const companyLocation = req.query.companyLocation;
    let technicianIds: any[];
    let companyId = req.otherCompanyId || req.companyId;
    let currentPage = params.currentPage || 0;
    let pageSize = params.pageSize || DefaultPageSize;

    // Return error when all cursors are provided
    if (params.nextCursor && params.previousCursor) {
        return res.json({ status: Status.Error, message: 'Provided cursor could only be one of either nextCursor or previousCursor.' });
    }

    // Data query that used to search Jobs and available previous/next page
    const filterQuery: any = {
        $and: [{
            $or: [
                { 'tasks.contractor': companyId },
                { contractor: companyId },
                { company: companyId }
            ]
        }]
    };

    if (params.technicianIds) {
        // Validate is technician ids is already array or object
        if (Array.isArray(params.technicianIds)) {
            technicianIds = params.technicianIds
        } else if (typeof params.technicianIds === 'string') {
            technicianIds = params.technicianIds.split(',').filter((element: any) => element)
        }
    }

    if (technicianIds?.length) {
        // convert technician Id from string to objectId and remove falsy value 
        const technicians = technicianIds.map(technicianId => {
            if (ObjectId.isValid(technicianId)) return new ObjectId(technicianId);
        }).filter(tech => tech);
        filterQuery['$and'].push({
            $or: [
                { 'tasks.technician': { $in: technicians } },
                { 'tasks.contractor': { $in: technicians } }
            ]
        });
    }

    if (params.status !== undefined && params.status !== null) {
        filterQuery['$and'].push({ status: params.status });
    }
    if (params.startDate && params.endDate) {
        const startDate = moment(params.startDate).format('YYYY-MM-DD');
        const endDate = moment(params.endDate).format('YYYY-MM-DD');
        filterQuery['$and'].push({ scheduleDate: { $gte: new Date(startDate), $lte: new Date(endDate) } });
    }
    if (params.customerId) {
        filterQuery['$and'].push({ customer: new ObjectId(params.customerId) });
    }

    if (workType) {
        let workTypeIds: any[] = [];
        try {
            let workTypeArr = JSON.parse(workType);
            workTypeIds = workTypeArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id)
            })
        } catch (error) {};
        filterQuery['$and'].push({ workType: { $in : workTypeIds }});
    }
    if (companyLocation) {
        let companyLocationIds: any[] = [];
        try {
            let companyLocationArr = JSON.parse(companyLocation);
            companyLocationIds = companyLocationArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id)
            })
        } catch (error) {}
        filterQuery['$and'].push({ companyLocation: { $in : companyLocationIds }});
    }

    // Deep clone filterQuery
    const query: any = { $and: [] };
    filterQuery['$and'].map((q: any) => { query['$and'].push({ ...q }) });

    // Filter jobs using aggregate to be search to another collection
    let ids: any[] = [];
    if(params.keyword){
        const keywordRegex = { $regex: params.keyword, $options: 'i' };
        ids =  await Job.aggregate([
            {/*search in jobs*/
                $match: {
                    $text: { $search: params.keyword }
                }
            },{$project: {jobId:1}}, 
            {$group: { _id:0, job_ids: {$addToSet:"$_id"}}},
            {$project: {_id:0, job_ids:1}
            },
            {/*customer*/
                $unionWith: { 
                    coll: "customers", 
                    pipeline: [
                       {
                        $match: {
                          "profile.displayName": keywordRegex,
                                    }
                    }
            ,{$group: { _id:0, "customer": {$addToSet:"$_id"}}},
                {$project: {_id:0, "customer":1}}]}
            },
             {/*Joblocation*/
                $unionWith: { 
                    coll: "joblocations", 
                    pipeline: [
                        {
                        $match: {
                          name: keywordRegex,
                                    }
                    },{$group: { _id:0, jobLocation: {$addToSet:"$_id"}}},
                {$project: {_id:0, jobLocation:1}}]}
            },
            {/*technician*/
                $unionWith: { 
                    coll: "users", 
                    pipeline: [
                       {
                        $match: {
                          "profile.displayName":keywordRegex,
                                    }
                    },{$group: { _id:0, "technician": {$addToSet:"$_id"}}},
                {$project: {_id:0, "technician":1}}]}
            },
            {/*jobsite*/
                $unionWith: { 
                    coll: "jobsites", 
                    pipeline: [
                       {
                        $match: {
                          name: keywordRegex,
                                    }
                    },{$group: { _id:0, "jobSite": {$addToSet:"$_id"}}},
                {$project: {_id:0, "jobSite":1}}]}
            },
            {/*company*/
                $unionWith: {
                    coll: "companies", 
                    pipeline: [
                       {
                        $match: {
                            "info.companyName": keywordRegex,
                                    }
                    },{$group: { _id:0, "companyName": {$addToSet:"$_id"}}},
                {$project: {_id:0, "companyName":1}}]}
            }
            
            ]);
    }
    const result = ids.reduce((acc, curr) => {
        const key = Object.keys(curr)[0];
        const value = curr[key];
        acc[key] = value;
        return acc;
      }, {});
      
      if (!result.customer) result.customer = [];
      if (!result.jobLocation) result.jobLocation = [];
      if (!result.technician) result.technician = [];
      if (!result.jobSite) result.jobSite = [];
      
    // Create an empty $or query array
const orQuery = [];

// Add $in operators for each field in ids array with checks for empty arrays
if (result?.customer?.length > 0) {
  orQuery.push({ "customer": { $in: result?.customer } });
}
if (result?.jobLocation?.length > 0) {
  orQuery.push({ "jobLocation": { $in: result?.jobLocation } });
}
if (result?.technician?.length > 0) {
  orQuery.push({ "tasks.technician": { $in: result?.technician } });
}
if (result?.jobSite?.length > 0) {
  orQuery.push({ "jobSite": { $in: result?.jobSite } });
}
if (orQuery.length > 0) {
    filterQuery['$and'].push({ $or: orQuery });
}
const matchStage = { $match: filterQuery };
    const jobsAggregate: IJob[] = await Job.aggregate([
        {
            $lookup: {
                from: 'customers',
                localField: 'customer',
                foreignField: '_id',
                as: 'customerObj',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            profile: 1,
                            info: 1,
                        },
                    },
                ],
            }
        },
        {
            $lookup: {
                from: 'servicetickets',
                localField: 'ticket',
                foreignField: '_id',
                as: 'ticketObj'
            }
        },
        {
            $lookup: {
                from: 'joblocations',
                localField: 'jobLocation',
                foreignField: '_id',
                as: 'jobLocationObj',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            address: 1,
                            location: 1,
                        },
                    },
                ],
            }
        },
        {
            $lookup: {
                from: 'jobsites',
                localField: 'jobSite',
                foreignField: '_id',
                as: 'jobSiteObj'
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'tasks.technician',
                foreignField: '_id',
                as: 'technicianObj',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            profile: 1,
                            info: 1,
                        },
                    },
                ],
            }
        },
        {
            $lookup: {
                from: 'companies',
                localField: 'tasks.contractor',
                foreignField: '_id',
                as: 'contractorsObj'
            }
        },
        {
            $lookup: {
                from: 'homeowners',
                localField: 'homeOwner',
                foreignField: '_id',
                as: 'homeOwnerObj'
            }
        },
        {
            $lookup: {
                from: 'jobtypes',
                localField: 'tasks.jobTypes.jobType',
                foreignField: '_id',
                as: 'jobTypeObj'
            }
        },
        matchStage,
        {
            $sort:{"updatedAt":-1}
        },
        { $skip : (currentPage  * pageSize) },
        { $limit: params.pageSize || DefaultPageSize },
        {
            $project: {
                "_id":1,
                "jobId":1,
                "status":"$status",
                "isHomeOccupied":"$isHomeOccupied",
                "createdBy":"$createdBy",
                "description":"$description",
                "tasks":"$tasks",
                "track":"$track",
                "customerObj":"$customerObj",
                "homeOwnerObj":"$homeOwnerObj",
                "jobLocationObj":"$jobLocationObj",
                "jobSiteObj":"$jobSiteObj",
                "scheduledStartTime":"$scheduledStartTime",
                "scheduledEndTime":"$scheduledEndTime",
                "technicianObj":"$technicianObj",
                "contractorsObj":"$contractorsObj",
                "jobTypeObj":"$jobTypeObj",
                "ticketObj":"$ticketObj",
                "scheduleDate":"$scheduleDate",
                "scheduleTimeAMPM":"$scheduleTimeAMPM",
                "customerContactId": "$customerContactId"
            }
        }
    ]);

    const totalJobs = await Job.aggregate([
        matchStage,
        {
            $count: "count"
        }
    ]);

    return res.json({
        status: Status.Success,
        jobs: jobsAggregate,
        total: totalJobs[0]?.count,
        filterQuery,
    });
} 



export const getJobsByTechnicianId = (req: Request, res: Response) => {

    const params = req.body;
    const filterQuery: any = {$and: [{$or: [{ "tasks.technician": params.employeeId }, { technician: params.employeeId }]}] };
    if (params.startDate && params.endDate) {
        const startDate = moment(params.startDate).format('YYYY-MM-DD');
        const endDate = moment(params.endDate).format('YYYY-MM-DD');
        filterQuery['$and'].push({ scheduleDate: { $gte: new Date(startDate), $lte: new Date(endDate) } });
    }

    Job.find(filterQuery)
        .populate({
            path: 'ticket',
            select: '-__v',
            populate: [
                { path: 'track', select: 'track.user track.action track.date' },
                { path: 'jobLocation' },
                { path: 'jobSite' },
                { path: 'customerContactId' },
                { path: 'createdBy', select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode contactName' },
                { path: 'tasks.jobType', select: 'title description sku' }
            ]
        })
        .populate({
            path: 'request',
            select: '-__v',
            populate: [
                { path: 'track', select: 'track.user track.action track.date' },
                { path: 'jobLocation' },
                { path: 'jobSite' },
                { path: 'customerContact' },
                { path: 'createdBy', select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode contactName' },
            ]
        })
        .populate({
            // TODO: To be deprecated
            path: 'technician',
            select: 'profile contact auth.email'
        })
        .populate({
            path: 'jobLocation',
            select: 'name address location'
        })
        .populate({
            path: 'jobSite',
            select: 'name address location'
        })
        .populate({
            path: 'customer',
            select: 'info.email auth.email profile.displayName address location contactName notes'
        })
        .populate({
            path: 'customerContactId',
            select: '-id -__v'
        })
        .populate({
            // TODO: To be deprecated
            path: 'type',
            select: 'title description sku'
        })
        .populate({
            path: 'homeOwner'
        })
        .populate({
            // TODO: To be deprecated
            path: 'tasks.jobType',
            select: 'title description sku'
        })
        .populate({
            path: 'tasks.jobTypes.jobType',
            select: 'title description sku'
        })
        .populate({
            path: 'tasks.technician',
            select: 'profile contact auth.email'
        })
        .populate({
            path: 'tasks.timeUpdatedBy',
            select: 'profile.displayName'
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
            path: 'images.uploadedBy',
            select: 'profile.displayName'
        })
        .populate({
            path: 'technicianImages.uploadedBy',
            select: 'profile.displayName'
        })
        .exec((err: any, jobs: IJob[]) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            return res.json({ 'status': Status.Success, 'jobs': jobs })

        }
        )
}

export const getJobsStream = async (req: Request, res: Response, sio: any) => {

    const company = <ICompany>req.company;
    const user = <IUser>req.user;
    const actionId = req.query.actionId;

    // Initialize started count & total of the jobs
    let count = 1;
    let countAlt = 1;
    const totalJobs = await Job.find({
        $or: [
            { 'tasks.contractor': company._id },
            { contractor: company._id },
            { company: company._id }
        ],
    }).countDocuments();

    // Return the HTTP request directly to avoid timed-out issue
    res.json({ status: Status.Success, total: totalJobs, message: `All jobs will be returned to Socket.io, make sure to listen to event 'all_jobs'` });

    /**
     * Retrieve all jobs with all populated info,
     * and return it as a stream via socket.io
     */
    const jobCursor = Job.find({
        $or: [
            { 'tasks.contractor': company._id },
            { contractor: company._id },
            { company: company._id }
        ],
    }).sort({ _id: -1 })
        .populate({
            path: 'ticket',
            select: '-__v',
            populate: [
                { path: 'track', select: 'track.user track.action track.date' },
                { path: 'jobLocation' },
                { path: 'jobSite' },
                { path: 'customerContactId' },
                { path: 'createdBy', select: 'info auth.email profile address contactName' },
                { path: 'tasks.jobType', select: 'title description sku' }
            ]
        })
        .populate({
            path: 'request',
            select: '-__v',
            populate: [
                { path: 'track', select: 'track.user track.action track.date' },
                { path: 'jobLocation' },
                { path: 'jobSite' },
                { path: 'customerContact' },
                { path: 'createdBy', select: 'info auth.email profile.displayName address contactName' },
            ]
        })
        // .populate({
        //     // TODO: To be deprecated
        //     path: 'technician',
        //     select: 'profile contact auth.email'
        // })
        .populate({
            path: 'tasks.technician',
            select: 'profile contact auth.email'
        })
        // .populate({
        //     // TODO: To be deprecated
        //     path: 'contractor',
        //     select: 'info.companyName info.companyEmail type'
        // })
        .populate({
            path: 'tasks.contractor',
            select: 'info.companyName info.companyEmail type'
        })
        .populate({
            path: 'customer',
            select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode contactName'
        })
        .populate({
            path: 'customerContactId',
            select: '-id -__v'
        })
        // .populate({
        //     // TODO: To be deprecated
        //     path: 'type',
        //     select: 'title description sku'
        // })
        // .populate({
        //     // TODO: To be deprecated
        //     path: 'tasks.jobType',
        //     select: 'title description sku'
        // })
        // .populate({
        //     // TODO: To be deprecated
        //     path: 'tasks.timeUpdatedBy',
        //     select: 'profile.displayName'
        // })
        .populate({
            path: 'tasks.jobTypes.jobType',
            select: 'title description sku'
        })
        .populate({
            path: 'tasks.jobTypes.timeUpdatedBy',
            select: 'profile.displayName'
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
            select: 'name location address'
        })
        .populate({
            path: 'jobSite',
            select: 'name location address'
        })
        .populate({
            path: 'images.uploadedBy',
            select: 'profile.displayName'
        })
        .populate({
            path: 'technicianImages.uploadedBy',
            select: 'profile.displayName'
        })
        .cursor();

    // Iterate all the cursor and send it to company's room socket.io
    for (let job = await jobCursor.next(); job != null; job = await jobCursor.next()) {

        // set roomId for terminating socket connection
        let roomId = actionId?.toString() || company._id?.toString() + user._id?.toString();
        let clientExist = sio.sockets?.adapter?.rooms?.get(roomId);
        if (!clientExist) {
            // client disconnect, stop sending data
            break;
        }

        if (actionId) {
            // new way , get actionID from FE and send it privately
            await sio.to(actionId?.toString()).emit(SocketEvents.ALL_JOBS, {
                job,
                count: count++,
                total: totalJobs
            });
        } else {
            // old way , sending to room and disconnect
            // Send the job via socket.io
            await sio.to(company._id?.toString() + user._id?.toString()).emit(SocketEvents.ALL_JOBS, {
                job,
                count: count++,
                total: totalJobs
            });

            // TODO: to be deprecated
            await sio.to(company._id?.toString() + user._id?.toString()).emit(SocketEvents.ALL_SCHEDULED_JOBS, {
                job,
                count: countAlt++,
                total: totalJobs
            });
        }
    }

    return;

}

const createJobReport = async (jobId: any, companyId: any, customerName: string | null, technicianName: string | null, date: any, contractor?: any) => {
    const job = await Job.findOne({ _id: jobId, $or: [{ contractor: companyId }, { 'tasks.contractor': companyId }, { company: companyId }], status: JobStatus.FINISHED }).select('_id').exec();
    if (job) {
        const scans = await Scan.find({ job: job }, 'comment timeOfScan').select('_id').exec();
        const purchaseOrders = await PurchaseOrder.find({ job: job }).select('_id').exec();
        await JobReport.deleteMany({ job: job });
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
            // jobReport.contractor = contractor;
            jobReport.contractor = null;
        }
        return jobReport.save().then((jobReport: IJobReport) => jobReport);
    }
}

export const getAllJobReports = async (req: Request, res: Response) => {

    const params = req.query;
    const workType = req.query.workType;
    const companyLocation = req.query.companyLocation;
    let companyId = req.otherCompanyId || req.companyId;
    let currentPage = params.currentPage || 0;
    let pageSize = params.pageSize || DefaultPageSize;

    // Return error when all cursors are provided
    if (params.nextCursor && params.previousCursor) {
        return res.json({ status: Status.Error, message: 'Provided cursor could only be one of either nextCursor or previousCursor.' });
    }

    // Data query that used to search Job Reports and available previous/next page
    const filterQuery: any = {
        $and: [{
            $or: [
                { contractor: companyId },
                { company: companyId }
            ]
        }]
    };

    // Check and add if params filter provided
    if (params.keyword) {
        const keywordRegex = { $regex: params.keyword, $options: 'i' };
        filterQuery['$and'].push({
            $or: [
                { 'jobObj.jobId': keywordRegex },
                { customerName: keywordRegex },
                { technicianName: keywordRegex },
                { 'customerObj.profile.displayName': keywordRegex },
                { 'jobLocationObj.name': keywordRegex },
                { 'jobLocationObj.address.street': keywordRegex },
                { 'jobLocationObj.address.city': keywordRegex },
                { 'jobSiteObj.name': keywordRegex },
                { 'jobSiteObj.address.street': keywordRegex },
                { 'jobSiteObj.address.city': keywordRegex },
                { 'technicianObj.profile.displayName': keywordRegex },
                { 'contractorsObj.info.companyName': keywordRegex },
            ]
        })
    }
    if (params.startDate && params.endDate) {
        const startDate = moment(params.startDate).format('YYYY-MM-DD');
        const endDate = moment(params.endDate).format('YYYY-MM-DD');
        filterQuery['$and'].push({ jobDate: { $gte: new Date(startDate), $lte: new Date(endDate) } });
    }

    if (workType) {
        let workTypeIds: any[] = [];
        try {
            let workTypeArr = JSON.parse(workType);
            workTypeIds = workTypeArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id)
            })
        } catch (error) {};
        filterQuery['$and'].push({ "jobObj.workType": { $in : workTypeIds }});
    }
    if (companyLocation) {
        let companyLocationIds: any[] = [];
        try {
            let companyLocationArr = JSON.parse(companyLocation);
            companyLocationIds = companyLocationArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id)
            })
        } catch (error) {}
        filterQuery['$and'].push({ "jobObj.companyLocation": { $in : companyLocationIds }});
    }

    // Deep clone filterQuery
    const query: any = { $and: [] };
    filterQuery['$and'].map((q: any) => { query['$and'].push({ ...q }) });
    // Pagination query that default to nothing
    let paginationQuery = {};
    // Sort query that default to sort by the recent ones
    let sortQuery = { createdAt: -1, _id: -1 };

    const aggregateLookups = [
        {
            $lookup: {
                from: 'jobs',
                localField: 'job',
                foreignField: '_id',
                as: 'jobObj'
            }
        },
        {
            $lookup: {
                from: 'invoices',
                localField: 'invoice',
                foreignField: '_id',
                as: 'invoiceObj'
            }
        },
        {
            $lookup: {
                from: 'customers',
                localField: 'jobObj.customer',
                foreignField: '_id',
                as: 'customerObj',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            profile: 1,
                            info: 1,
                        },
                    },
                ],
            }
        },
        {
            $lookup: {
                from: 'joblocations',
                localField: 'jobObj.jobLocation',
                foreignField: '_id',
                as: 'jobLocationObj',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            address: 1,
                        },
                    },
                ],
            }
        },
        {
            $lookup: {
                from: 'jobsites',
                localField: 'jobObj.jobSite',
                foreignField: '_id',
                as: 'jobSiteObj'
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'jobObj.tasks.technician',
                foreignField: '_id',
                as: 'technicianObj',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            profile: 1,
                            info: 1,
                        },
                    },
                ],
            }
        },
        {
            $lookup: {
                from: 'companies',
                localField: 'jobObj.tasks.contractor',
                foreignField: '_id',
                as: 'contractorsObj'
            }
        },
        {
            $lookup: {
                from: 'companies',
                localField: 'company',
                foreignField: '_id',
                as: 'companyObj'
            }
        },
        {
            $lookup: {
                from: 'jobtypes',
                localField: 'jobObj.tasks.jobTypes.jobType',
                foreignField: '_id',
                as: 'jobTypeObj'
            }
        }
    ]

    // Filter jobs using aggregate to be search to another collection
    const jobReportsAggregate: IJobReport[] = await JobReport.aggregate([
        ...aggregateLookups,
        { $match: { ...query } },
        { $sort: sortQuery },
        { $skip : (currentPage  * pageSize) },
        { $limit: params.pageSize || DefaultPageSize },
    ]);

    const totalJobReports = await JobReport.aggregate([
        ...aggregateLookups,
        { $match: { ...filterQuery } },
        { $count: 'count' }
    ])
    return res.json({
        status: Status.Success,
        reports: jobReportsAggregate,
        total: totalJobReports[0]?.count,
    });
}


export const getJobReportDetails = (req: Request, res: Response) => {
    const jobReportId = req.query.jobReportId;
    let companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    JobReport.findOne({ _id: jobReportId, $or: [{ contractor: companyId }, { company: companyId }] })
        .populate({
            path: 'job',
            populate: [
                {
                    path: 'ticket',
                    select: '-__v',
                    populate: [
                        { path: 'track', select: 'track.user track.action track.date' },
                        { path: 'jobLocation' },
                        { path: 'jobSite' },
                        { path: 'customerContactId' },
                        { path: 'createdBy', select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode contactName' },
                    ]
                },
                {
                    path: 'request',
                    select: '-__v',
                    populate: [
                        { path: 'track', select: 'track.user track.action track.date' },
                        { path: 'jobLocation' },
                        { path: 'jobSite' },
                        { path: 'customerContact' },
                        { path: 'createdBy', select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode contactName' },
                    ]
                },
                // TODO: To be deprecated
                { path: 'technician', select: 'profile.displayName auth.email contact.phone permissions.role' },
                { path: 'tasks.technician', select: 'profile auth.email contact' },
                { path: 'customer', select: 'info.email auth.email profile.displayName permissions.role address.street address.city address.state address.zipCode contact.phone contactName notes' },
                { path: 'customerContactId', select: '-id -__v' },
                { path: 'type', select: 'title description sku' },
                // TODO: To be deprecated
                { path: 'tasks.jobType', select: 'title description sku' },
                { path: 'tasks.jobTypes.jobType', select: 'title description sku' },
                { path: 'tasks.timeUpdatedBy', select: 'profile.displayName' },
                { path: 'company', select: 'info.companyName info.logoUrl auth.email permissions.role address.street address.city address.state address.zipCode contact.phone contact.fax' },
                { path: 'createdBy', select: 'info.companyName auth.email profile.displayName permissions.role address.street address.city address.state address.zipCode contact.phone' },
                { path: 'homeOwner', select: 'profile info contact' },
                'jobSite', 'jobLocation'
            ]
        })
        .populate({
            path: 'scans',
            populate: [{
                path: 'equipment',
                select: 'info.model info.serialNumber info.nfcTag images info.location',
                populate: [
                    { path: 'brand', select: 'title' },
                    { path: 'type', select: 'title' }
                ]
            }]
        })
        .populate('PurchaseOrder')
        .populate({
            path: 'invoice',
            populate: [
                { path: 'paymentTerm', select: '-__v' },
                { path: 'customerContactId', select: '-__v' }
            ]
        })
        .exec()
        .then((report: IJobReport) => {
            if (report) {
                return res.json({ 'status': Status.Success, 'report': report });
            }
            return res.json({ 'status': Status.Success, 'message': 'No report was found!' });
        }).catch((err) => {
            Sentry.captureException(err);
            return res.json({ 'status': Status.Error, 'message': err.message });
        });
}


export const deleteJobReportById = async (req: Request, res: Response) => {
    const jobReportId = req.query.jobReportId;
    let companyId = req.companyId;

    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    JobReport.deleteOne({ _id: new ObjectId(jobReportId), $or: [{ contractor: companyId }, { company: companyId }] }).then(() => {
        return res.json({ 'status': Status.Success, 'message': 'Job Report Has Been Deleted Successfully!' });
    }).catch((err) => {
        Sentry.captureException(err);
        return res.json({ 'status': Status.Error, 'message': err.message });
    });
}

export const updateJob = (req: Request, res: Response, sio: any) => {

    const params = req.body
    let companyId = req.companyId;
    let jobType: ITaskJobType;

    const user = <IUser>req.user;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    const imagesUrl: string[] = [];
    if (req.files) {
        const paramsImageFile = JSON.parse(JSON.stringify(req.files));

        // Push image location from req.files to imagesUrl
        paramsImageFile?.image?.forEach((image: any) => imagesUrl.push(image.location));
        paramsImageFile?.images?.forEach((image: any) => imagesUrl.push(image.location));
    }

    if ([JobStatus.RESCHEDULED, JobStatus.INCOMPLETE].includes(Number(params.status)) && !params.note) {
        return res.json({ status: Status.Error, message: 'Note is required when you reschedule or make the job incomplete' });
    }

    Job.findOne({ _id: params.jobId, $or: [{ company: companyId }, { 'tasks.contractor': companyId }, { contractor: companyId }, { company: companyId }] })
        // .select('_id customer ticket technician scheduleDate company comment track')
        .populate({
            path: 'customer',
            select: 'profile.displayName itemTier'
        })
        .populate({
            path: 'homeOwner',
            select: 'profile'
        })
        .populate({
            path: 'technician',
            select: 'profile.displayName'
        })
        .populate({
            path: 'tasks.technician',
            select: 'profile.displayName'
        })
        .populate({
            path: 'tasks.contractor',
        })
        .populate({
            path: 'ticket',
            select: 'customer',
            populate: { path: 'customer', select: 'profile.displayName' }
        })
        .populate({
            path: 'request',
            select: '-__v',
            populate: [
                { path: 'track', select: 'track.user track.action track.date' },
                { path: 'jobLocation' },
                { path: 'jobSite' },
                { path: 'customerContact' },
                { path: 'createdBy', select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode contactName' },
            ]
        })
        .populate({ path: 'customerContactId'})
        .populate({ path: 'company', select: 'info.companyName'})
        .populate({ path: 'jobLocation', select: 'name'})
        .populate({ path: 'jobSite', select: 'name'})
        .then((job: IJob) => {

            if (job == undefined) {
                throw new Error("Invalid job id")
            }

            // const pendingStartedTasks = job.tasks.find(task => {
            //     jobType = <ITaskJobType>task.jobTypes.find(jobTypeTask => [JobStatus.PENDING, JobStatus.STARTED].includes(jobTypeTask.status));
            //     return jobType
            // });

            // if (Number(params.status) === JobStatus.FINISHED && pendingStartedTasks) {
            //     throw new Error(`You can't finish this job, it still has a PENDING or STARTED tasks`);
            // }

            const itemPromise = Item.findOne({ jobType: job.type })
            let linkedJobPromise;
            if (job.parentJob) {
                // linkedJob = parent job
                linkedJobPromise = Job.findById(job.parentJob)
            } else {
                // linkedJob = sub job
                linkedJobPromise = Job.findOne({ parentJob: job._id });
            }

            return Promise.all([job, itemPromise, linkedJobPromise])
        })
        .then(async (result: any) => {
            const job = result[0]
            const item = result[1]
            const linkedJob = result[2]

            if (linkedJob) {
                await linkedJob
                    .populate({
                        path: 'customer',
                        select: 'profile.displayName itemTier'
                    })
                    .populate({
                        path: 'homeOwner',
                        select: 'profile'
                    })
                    .populate({
                        path: 'technician',
                        select: 'profile.displayName'
                    })
                    .populate({
                        path: 'tasks.technician',
                        select: 'profile.displayName'
                    })
                    .populate({
                        path: 'ticket',
                        select: 'customer',
                        populate: { path: 'customer', select: 'profile.displayName' }
                    })
                    .populate({
                        path: 'request',
                        select: 'customer',
                        populate: { path: 'customer', select: 'profile.displayName' }
                    })
                    .execPopulate();
            }

            let timeSpent: number = 0
            let newcharges: number = 0
            if (item != null && item.charges > 0) {

                if (params.status == 2 && !item?.isFixed) {
                    let starting: any = new Date(job.startTime)
                    let ending: any = Date.now()

                    let diffMs = (ending - starting);
                    let interval = 15 * 60 * 1000;
                    timeSpent = ((Math.ceil(diffMs / interval) * interval) / 60000) / 60
                    newcharges = item.charges * timeSpent

                } else if (params.status == 2 && item?.isFixed) {
                    newcharges = item.charges
                }

            }
            let finishedOnTime = false
            let currentTime = Date.now()
            if (job.scheduledEndTime >= currentTime) {
                finishedOnTime = true
            }

            let data: any = {}
            let dataLinked: any = {};
            let track = job.track ? job.track : [];
            let tasks: ITask[] = job.tasks ? job.tasks : [];
            let trackLinked = linkedJob && linkedJob.track || [];
            let tasksLinked = linkedJob && linkedJob.tasks || [];
            let action = '';
            let ticketAction = '';

            if (params.status && params.status != job.status) {
                if (params.status == JobStatus.PENDING) {
                    action = '|Scheduling the job|';
                }
                if (params.status == JobStatus.STARTED) {
                    if (job.status == JobStatus.CANCELED) {
                        action = '|Re-starting the job|';
                        await ServiceTicket.findOneAndUpdate({ _id: job.ticket }, { jobCreated: true });
                        await JobRequest.findOneAndUpdate({ _id: job.request }, { jobCreated: true });
                    } else {
                        action = '|Starting the job|';
                    }
                }
                if (params.status == JobStatus.FINISHED) {
                    action = '|Finishing the job|';
                    ticketAction = `|Job finished by ${user.profile.displayName}|`;
                }
                if (params.status == JobStatus.CANCELED) {
                    action = '|Canceling the job|';
                    ticketAction = `|Job cancelled by ${user.profile.displayName}|`;
                    await ServiceTicket.findOneAndUpdate({ _id: job.ticket }, { jobCreated: false })
                    await JobRequest.findOneAndUpdate({ _id: job.request }, { jobCreated: false, status: JobRequestStatus.ACCEPTED });
                }
                if (params.status == JobStatus.RESCHEDULED) {
                    action = '|Rescheduling the job|';
                }
                if (params.status == JobStatus.PAUSED) {
                    action = '|Pausing the job|';
                }
                if (params.status == JobStatus.INCOMPLETE) {
                    action = '|Update the job to Incomplete|'
                }
            }

            let userComment = '';
            if (params.comment !== 'undefined') {
                userComment = params.comment;
            } else {
                userComment = job.comment ? job.comment : 'N/A';
            }
            data = { comment: userComment, status: params.status, endTime: Date.now(), timeSpent: timeSpent, charges: newcharges, completeOnTime: finishedOnTime, images: job.images ?? [] }
            dataLinked = { comment: userComment, status: params.status, endTime: Date.now(), timeSpent: timeSpent, charges: newcharges, completeOnTime: finishedOnTime, images: linkedJob?.images ?? [] }
            if (params.jobLocationId) {
                data.jobLocation = params.jobLocationId
            }
            if (params.jobSiteId) {
                data.jobSite = params.jobSiteId
            }
            if (params.isHomeOccupied
                || params.isHomeOccupied === false 
                || params.isHomeOccupied === true) {
                data.isHomeOccupied = params.isHomeOccupied;
                //data.jobLocation = null;
                //data.jobSite = null;
            }
            if(data?.isHomeOccupied && data?.isHomeOccupied === true) {
                if(params.homeOwnerId) {
                    const newHomeOwner = await HomeOwner.findOne({ _id: params.homeOwnerId });
                    if(!newHomeOwner) {
                        return res.json({ 'status': Status.NotFound, 'message': 'Provided homeOwnerId does not correspond with any home owner' });
                    }
                    data.homeOwner = new ObjectId(params.homeOwnerId);
                }
                else {
                    if(data.isHomeOccupied === true && !job.homeOwner) {
                        return res.json({ 'status': Status.Error, 'message': 'Home Owner is required when home is occupied' });
                    }
                }
            }
            if (params.homeJobLocationId) {
                data.homeJobLocation = params.homeJobLocationId
            }
            if (params.homeJobSiteId) {
                data.homeJobSite = params.homeJobSiteId
            }
            if (imagesUrl?.length) {
                if (JSON.stringify(imagesUrl) !== JSON.stringify(job.images)) {
                    action += '|Updated image|';
                }

                imagesUrl.forEach(imageUrl => {
                    data.images.push({ imageUrl, uploadedBy: user.id, createdAt: Date.now() });
                    if (linkedJob) { dataLinked.images.push({ imageUrl, uploadedBy: user.id, createdAt: Date.now() }) }
                });
            }
            if (
                job.comment != params.comment ||
                job.jobLocation != params.jobLocationId ||
                job.jobSite != params.jobSiteId ||
                job.homeJobLocation != params.homeJobLocationId ||
                job.homeJobSite != params.homeJobSiteId
            ) {
                action += '|Job Info Updated|';
            }
            track.push({
                user: user._id,
                action,
                note: params.note,
                date: new Date()
            })
            trackLinked.push({
                user: user._id,
                action,
                note: params.note,
                date: new Date()
            })
            data.track = track;
            dataLinked.track = trackLinked;

            const allTaskJobTypeStatus: Number[] = [];
            for (const jobTask of job.tasks) {
                for (const jobType of jobTask.jobTypes) {
                    allTaskJobTypeStatus.push(jobType.status);
                }
            }

            switch (Number(params.status)) {
                case JobStatus.FINISHED:
                    const startedPausedTasks: ITaskJobType[] = tasks.filter(task =>
                        [JobStatus.STARTED, JobStatus.PAUSED].includes(Number(task.status))
                    );

                    for (const task of startedPausedTasks) {
                        task.status = JobStatus.FINISHED;
                    };
                    
                    let invoiceCommissionEntry: any[] = [];
                    
                    for (const task of job?.tasks) {
                        task.status = JobStatus.FINISHED;
                        let contractorCommissionEntry = {
                            contractor: task.contractor._id,
                            technician: task.contractor.admin,
                            commission: 0,
                            commissionAmount: 0
                        }
                        
                        let contractor = task.contractor as ICompany;
                        if(contractor && contractor.commissionType == "fixed"){
                            for (const j of task.jobTypes) {
                                let balance = 0;
    
                                const jobType = await Item.findOne({ jobType: j.jobType })
                                const commissionTierId = contractor.commissionTier
                                if (commissionTierId) {
                                    const commissionTier = jobType.costing.find(({ tier }) => String(tier) == String(commissionTierId))
                                    if (commissionTier?.charge){
                                        balance += commissionTier.charge * (j.quantity || 1);
                                        contractorCommissionEntry.commission += commissionTier.charge * (j.quantity || 1);
                                        contractorCommissionEntry.commissionAmount += commissionTier.charge * (j.quantity || 1);
                                    }
                                }
                                await Company.findByIdAndUpdate(
                                    contractor._id,
                                    { $inc: { balance } },
                                    { new: true }
                                ).exec()
                            }
                            invoiceCommissionEntry.push(contractorCommissionEntry);
                        }
                    }
                    
                    if (invoiceCommissionEntry.length) {
                        const jobCommisssion = await new JobCommission({
                            job: job._id,
                            technicians: invoiceCommissionEntry
                        }).save();
                        data.commission = jobCommisssion;
                    }
                    break;

                case JobStatus.PAUSED:
                    const startedTasks: ITaskJobType[] = tasks.filter(taskJobType =>
                        ![JobStatus.FINISHED, JobStatus.RESCHEDULED, JobStatus.CANCELED].includes(Number(taskJobType.status))
                    );

                    for (const task of startedTasks) {
                        task.status = JobStatus.PAUSED;
                    };

                    break;

                case JobStatus.CANCELED:
                    const notFinishedTasks: ITaskJobType[] = tasks.filter(task =>
                        ![JobStatus.FINISHED].includes(Number(task.status))
                    )

                    for (const task of notFinishedTasks) {
                        task.status = JobStatus.CANCELED
                    }

                    break;

                case JobStatus.RESCHEDULED:
                    const pendingPausedTasks = tasks.filter(task =>
                        [JobStatus.PENDING, JobStatus.PAUSED].includes(task.status)
                    );

                    for (const task of pendingPausedTasks) {
                        task.status = JobStatus.RESCHEDULED;
                    };

                    break;

                case JobStatus.INCOMPLETE:
                    // Search any started tasks on this job and update the status to PAUSED or STARTED
                    const pendingStartedPausedTasks = tasks.filter(task =>
                        [JobStatus.PENDING, JobStatus.STARTED, JobStatus.PAUSED].includes(Number(task.status))
                    );

                    // Iterate all started tasks
                    for (const task of pendingStartedPausedTasks) {
                        task.status = JobStatus.INCOMPLETE;
                    }

                    // if (linkedJob) {
                    //     // Search any started tasks on this parent/sub job
                    //     const linkedStartedTasks: ITask[] = tasksLinked.filter((task: ITask) => task.jobTypes.filter(jobType => jobType.status === JobStatus.STARTED));
                    //     // Iterate all started tasks and update the status to PAUSED
                    //     for (const task of linkedStartedTasks) {
                    //         await _updateTask({ job: linkedJob, taskJobType: jobType, user, params, status: JobStatus.PAUSED });
                    //     }

                    //     dataLinked.tasks = tasksLinked;
                    // }
                    break;
            }

            try {
                data.tasks = tasks;
                await job.updateOne(data);
                const updatedJob = await Job.findById(job.id);
                if (linkedJob) {
                    await linkedJob.updateOne(dataLinked);
                }

                if (job?.ticket && ticketAction) {
                    const serviceTicket = await ServiceTicket.findById(job.ticket);
                    serviceTicket.track.push({
                        user: user._id,
                        action: ticketAction,
                        date: new Date()
                    });

                    await serviceTicket.save();
                }

                if (job?.request && ticketAction) {
                    const jobRequest = await JobRequest.findById(job.request);
                    jobRequest.track.push({
                        user: user._id,
                        action: ticketAction,
                        date: new Date()
                    });

                    await jobRequest.save();
                }

                let date = job.scheduleDate;
                let technicianName = null;
                let technicianNameLinkedJob = null;
                let customerName = job.customer ?
                    job.customer.profile?.displayName :
                    (job.ticket ? (job.ticket.customer ? job.ticket.customer?.profile?.displayName : null) : null);

                if (tasks.length > 1) {
                    technicianName = 'Multiple Techs';
                    technicianNameLinkedJob = 'Multiple Techs';
                } else {
                    technicianName = tasks[0].technician.profile.displayName;
                    technicianNameLinkedJob = tasks[0].technician.profile.displayName;
                }

                const jobReport = await createJobReport(job._id, job.company, customerName, technicianName, date, companyId);
                if (params.status == JobStatus.FINISHED) {
                    try {
                        if(job.customerContactId?.phone) {
                            const standarizedPhone = standarizePhoneNumberE164(job.customerContactId.phone);
                            const today = new Date()
                            const todayDate = `${today.getMonth() + 1}/${today.getDate()}`;
                            // If job is finished a SMS is sent
                            const message = `BlueClerk: Dear ${job.customerContactId.name}, ${job.company?.info?.companyName || 'N/A'} has completed ${job.jobId} at ${job.jobSite?.name || job.jobLocation?.name || 'N/A'} on ${todayDate}.\n\nText STOP to opt-out.`
                            await sendSMS(standarizedPhone, message);
                        }
                    }
                    catch(err) {
                        Sentry.captureException(err);
                    }     
                }
                if (linkedJob) {
                    await createJobReport(linkedJob._id, linkedJob.company, customerName, technicianNameLinkedJob, date, companyId);
                }

                // Send notification when a job is RESCHEDULED
                if (params.status == JobStatus.RESCHEDULED) {
                    // Construct notification entry to be saved
                    let notificationEntry: INotificationJob = new NotificationJob({
                        company: job.company,
                        notificationType: NotificationTypes.JOB_RESCHEDULED,
                        message: {
                            title: 'Job rescheduled',
                            body: `${job.jobId} recheduled`
                        },
                        metadata: job._id
                    })

                    // Save the notification with Service Ticket as the metadata
                    notificationEntry.save(async (err: any, notification: INotificationJob) => {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        await notification.populate('metadata').execPopulate();
                        await sio.to(job.company && job.company.toString()).emit(SocketEvents.NOTIFICATION_CENTER, notification);
                    })
                };

                return res.json({ 'status': Status.Success, 'message': 'Job updated successfully.', job: updatedJob });
            } catch (err) {
                Sentry.captureException(err);
                return res.json({ 'status': Status.Error, 'message': err.message });
            }
        }).catch((err) => {
            Sentry.captureException(err);
            return res.json({ 'status': Status.Error, 'message': err.message });
        })

}

export const startJob = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user;
    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    Job.findOne(
        { _id: params.jobId, $or: [{ contractor: companyId }, { 'tasks.contractor': companyId }, { company: companyId }] },
        async (err: any, job: IJob) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (job == undefined) {
                return res.json({ 'status': Status.Error, 'message': "Invalid job id" })
            }

            if (job.status == JobStatus.FINISHED) {
                return res.json({ 'status': Status.Error, 'message': "You can't start this job, it is already finished" })
            }

            if (job.status == JobStatus.CANCELED) {
                return res.json({ 'status': Status.Error, 'message': "You can't start this job, it is already canceled" })
            }

            let linkedJob: IJob;
            if (job.parentJob) {
                // linkedJob = parent job
                linkedJob = await Job.findById(job.parentJob);
            } else {
                // linkedJob = sub job
                linkedJob = await Job.findOne({ parentJob: job._id });
            }

            let track = job.track ? job.track : [];
            let trackLinkedJob = linkedJob && linkedJob.track || [];
            let action = '';
            if (job.status != JobStatus.STARTED) {
                action = '|Started The Job|';
            }
            track.push({
                user: user._id,
                action,
                date: new Date()
            });
            trackLinkedJob.push({
                user: user._id,
                action,
                date: new Date()
            });
            job.updateOne(
                { status: JobStatus.STARTED, track: track, startTime: Date.now() },
                (err: any, raw: any) => {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    if (!linkedJob) {
                        return res.json({ 'status': Status.Success, 'message': 'Job started successfully.' })
                    }

                    linkedJob.updateOne(
                        { status: JobStatus.STARTED, track: track, startTime: Date.now() },
                        (err: any, raw: any) => {
                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                            }

                            return res.json({ 'status': Status.Success, 'message': 'Job started successfully.' })
                        }
                    );
                }
            )
        }
    )
}

export const startJobTask = async (req: Request, res: Response) => {

    const user = <IUser>req.user;
    const companyId = req.otherCompanyId || req.companyId;
    const params = req.body;
    const startedJobTypes: IJobType[] = [];
    const timeStart = params.time_start ? new Date(params.time_start) : new Date();
    let taskJobType: ITaskJobType;
    let newJobType: IJobType;
    let actionStatus: string;
    let history;

    // TODO: Move to job's middleware
    // Find job and populate the tasks' jobType
    const job = await Job.findOne({
        _id: params.jobId,
        $or: [{ company: companyId }, { 'tasks.contractor': companyId }, { contractor: companyId }]
    }).populate({ path: 'tasks.jobType', select: 'title' }).populate({ path: 'tasks.jobTypes.jobType', select: 'title' });

    // Check if job exist and job status is not FINISHED or CANCELED
    if (!job)
        return res.json({ status: Status.Error, message: 'Job not found' });

    if (job.status === JobStatus.FINISHED)
        return res.json({ status: Status.Error, message: `${Messages.JobCannotBeStarted} finished.` });

    if (job.status === JobStatus.CANCELED)
        return res.json({ status: Status.Error, message: `${Messages.JobCannotBeStarted} canceled.` });

    // Retrieve the tasks of the technician
    const tasks = job.tasks.find(task => task.technician.toString() === params.technicianId);
    // Find jobType to start
    if (params.jobTypeId && !params.taskJobTypeId) {
        taskJobType = tasks?.jobTypes.find(jobType => {
            newJobType = <IJobType>jobType.jobType;
            return newJobType._id?.toString() === params.jobTypeId;
        });
    }

    if (params.taskJobTypeId) {
        taskJobType = tasks?.jobTypes.find(jobType => {
            newJobType = <IJobType>jobType.jobType;
            return jobType._id?.toString() === params.taskJobTypeId;
        });
    }

    if (!tasks || !taskJobType)
        return res.json({ status: Status.Error, message: Messages.TaskNotFound });

    if (taskJobType) {
        if (taskJobType.status === JobStatus.STARTED)
            return res.json({ status: Status.Error, message: `${Messages.TaskCannotBeStarted} started.` })

        if (taskJobType.status === JobStatus.FINISHED)
            return res.json({ status: Status.Error, message: `${Messages.TaskCannotBeStarted} finished` });

        // Check if technician has s a started task, cannot process to start another task
        const startedTask = tasks?.jobTypes?.find(jobType => jobType.status === JobStatus.STARTED);
        if (startedTask) {
            const startedTaskJobType = <IJobType>startedTask.jobType;
            return res.json({ status: Status.Error, message: `You can't start this task, you already have a started task: ${startedTaskJobType?.title}.` });
        }

        // Update the task start time and status
        let actionStatus: string;
        if (taskJobType.status === JobStatus.PAUSED) {
            taskJobType.tempStartTime = timeStart;
            actionStatus = 'Re-starting';
        }
        else {
            taskJobType.startTime = timeStart;
            actionStatus = 'Started';
        }
        // Update the task status
        tasks.status = JobStatus.STARTED;
        taskJobType.status = JobStatus.STARTED;
        taskJobType.timeUpdatedBy = user;
        taskJobType.timeUpdatedAt = new Date();

        if (job.status !== JobStatus.STARTED) {
            job.startTime = timeStart;
        }

        history = {
            user: user._id,
            action: `|${actionStatus} the Job's task: ${newJobType?.title}|`,
            date: new Date()
        }
    }

    job.status = JobStatus.STARTED;
    job.track.push(history);

    // Save the job and the tasks inside
    await job.save((err) => {
        if (err)
            return res.json({ status: Status.Error, message: err.message });
    });

    // HANDLE PARENT/SUB JOB
    // Find the parent or sub job to be updated as well
    let linkedJob = await Job.findOne({
        $or: [{ _id: job.parentJob }, { parentJob: job._id }]
    });
    let linkedJobType: ITaskJobType;
    let linkedTask = linkedJob && linkedJob.tasks.find(task => {
        linkedJobType = <ITaskJobType>task.jobTypes.find(jobType => jobType.jobType.toString() === params.jobTypeId);
        return linkedJobType
    });

    // Update linked job's track, task status, & startTime
    if (linkedTask) {
        // linkedTask.startTime = new Date();
        if (linkedJobType.status === JobStatus.PAUSED) {
            linkedJobType.tempStartTime = timeStart;
        }
        else {
            linkedJobType.startTime = timeStart;
        }
        linkedJobType.status = JobStatus.STARTED;
        linkedJobType.timeUpdatedBy = user;
        linkedJobType.timeUpdatedAt = new Date();
        linkedJob.status = JobStatus.STARTED;
        linkedJob.track.push(history);

        // Save the parent/sub job if exist
        await linkedJob.save((err) => {
            if (err)
                return res.json({ status: Status.Error, message: err.message });
        });
    }

    return res.json({ status: Status.Success, message: 'Job Task started successfully.', job, startedTask: tasks });

}

export const updateJobTask = async (req: Request, res: Response) => {

    const user = <IUser>req.user;
    const companyId = req.otherCompanyId || req.companyId;
    const params = req.body;

    // TODO: Move to job's middleware
    // Find job and populate the tasks' jobType
    const job = await Job.findOne({
        _id: params.jobId,
        $or: [{ company: companyId }, { 'tasks.contractor': companyId }, { contractor: companyId }]
    })
        // TODO: To be deprecated
        .populate({ path: 'tasks.jobType', select: 'title' })
        .populate({ path: 'tasks.jobTypes.jobType', select: 'title' })
        .populate({ path: 'customer', select: 'profile.displayName itemTier' })
        .populate({ path: 'homeOwner', select: 'profile.displayName' })
        .populate({ path: 'tasks.technician', select: 'profile.displayName' })
        .populate({ path: 'tasks.contractor' })
        // TODO: To be deprecated
        .populate({ path: 'technician', select: 'profile.displayName' })
        .populate({ path: 'ticket.customer', select: 'profile.displayName' })
        .populate({ path: 'request.customer', select: 'profile.displayName' })
        .populate({ path: 'customerContactId'})
        .populate({ path: 'company', select: 'info.companyName'})
        .populate({ path: 'jobLocation', select: 'name'})
        .populate({ path: 'jobSite', select: 'name'})

    // Check if job exist and job status is not FINISHED or CANCELED
    if (!job)
        return res.json({ status: Status.Error, message: 'Job not found' });

    if (job.status === JobStatus.CANCELED)
        return res.json({ status: Status.Error, message: `${Messages.JobCannotBeStarted} canceled.` });

    let taskJobType: ITaskJobType;
    let statusAction: string;
    let action;
    let jobStatus = job.status;

    // Find the job type in tasks object to be started
    const task = job.tasks.find(task => task?.technician?._id.toString() === params.technicianId);

    if (params.jobTypeId && !params.taskJobTypeId) {
        taskJobType = task?.jobTypes.find((taskJobType: any) => taskJobType?.jobType?._id?.toString() === params.jobTypeId);
    }

    if (params.taskJobTypeId) {
        taskJobType = task?.jobTypes.find(taskJobType => taskJobType?._id?.toString() === params.taskJobTypeId);
    }

    let taskStatus = task.status;
    // Return error when jobType isn't available
    if (!task || !taskJobType)
        return res.json({ status: Status.Error, message: Messages.TaskNotFound });

    if (params.endTime && taskJobType.status !== JobStatus.FINISHED)
        return res.json({ status: Status.Error, message: 'Only able to update endTime for a FINISHED task.' });
    if (!params.endTime && Number(params.status) === taskJobType.status)
        return res.json({ status: Status.Error, message: `${Messages.TaskCannotBeUpdated} on that state.` });

    // To update manual endTime only
    if (params.endTime) {
        const item = await Item.findOne({ jobType: taskJobType.jobType });
        const customer = <ICustomer>job.customer;

        // Remove excessed timeSpent and charges
        await _handleTaskCharges({ job, taskJobType, item, customer, params, isDeduct: true });

        await job.save();
        // Return directly to avoid unnecessary changes
        return res.json({ status: Status.Success, message: `Job Task updated successfully.`, job, updatedTask: task });
    }
    await _updateTask({ job, taskJobType, user, params, status: undefined });
    switch (Number(params.status)) {
        case JobStatus.PAUSED:
            statusAction = 'Paused';
            break;
        case JobStatus.FINISHED:
            statusAction = 'Finished';
            break;
    }

    const jobType = await JobType.findById(taskJobType.jobType);

    action = `|${statusAction} the Job's task: ${jobType.title}|`;
    // To update Job's status based on cummulative of tasks status
    // const allTaskStatus = task.jobTypes.map(newTask => newTask.status);
    const allTaskJobTypeStatus: Number[] = [];
    const techAllJobTypesStatus: Number[] = []
    for (const jobTask of job.tasks) {
        for (const jobType of jobTask.jobTypes) {
            allTaskJobTypeStatus.push(jobType.status);
        }
    }

    for (const taskJobType of task.jobTypes) {
        techAllJobTypesStatus.push(taskJobType.status);
    }

    if (taskJobType.status === JobStatus.FINISHED) {
        taskJobType.isSelfFinished = true;
    }

    if (techAllJobTypesStatus.every(status => status === JobStatus.FINISHED)) {
        // All new job type task are FINISHED, Job is FINISHED
        taskStatus = JobStatus.FINISHED;
        action += `|Finishing the technician task|`;
    }

    if (allTaskJobTypeStatus.every(status => status === 2)) {
        // All new technician status are FINISHED, Job is FINISHED
        job.endTime = new Date();
        job.timeSpent = moment().diff(moment(job.startTime), 'minutes');
        job.completeOnTime = !job.scheduledEndTime ? true : job.scheduledEndTime >= job.endTime;
        jobStatus = JobStatus.FINISHED;
        action += `|Finishing the job|`;
        // Send SMS if job is finished
        try {
            if(job.customerContactId?.phone) {
                const standarizedPhone = standarizePhoneNumberE164(job.customerContactId.phone);
                const today = new Date()
                const todayDate = `${today.getMonth() + 1}/${today.getDate()}`;
                const message = `BlueClerk: Dear ${job.customerContactId.name}, ${job.company?.info?.companyName || 'N/A'} has completed ${job.jobId} at ${job.jobSite?.name || job.jobLocation?.name || 'N/A'} on ${todayDate}.\n\nText STOP to opt-out.`
                // If job is finished a SMS is sent
                await sendSMS(standarizedPhone, message);
            }
        }
        catch(err) {
            Sentry.captureException(err);
        }     
    }

    // Log a track history
    const history = {
        user: user._id,
        action,
        date: new Date()
    };

    if (jobStatus == JobStatus.FINISHED) {
        //Commission Calculation
        let invoiceCommissionEntry: any[] = [];

        for (const task of job?.tasks) {
            let contractor = task.contractor as ICompany;
            if(contractor && contractor.commissionType == "fixed"){
                let contractorCommissionEntry = {
                    contractor: contractor._id,
                    technician: contractor.admin,
                    commission: 0,
                    commissionAmount: 0
                }
                
                for (const j of task.jobTypes) {
                    let balance = 0;
    
                    const jobType = await Item.findOne({ jobType: j.jobType })
                    const commissionTierId = contractor.commissionTier
                    if (commissionTierId) {
                        const commissionTier = jobType.costing.find(({ tier }) => String(tier) == String(commissionTierId))
                        if (commissionTier?.charge){
                            balance += commissionTier.charge * (j.quantity || 1);
                            contractorCommissionEntry.commission += commissionTier.charge * (j.quantity || 1);
                            contractorCommissionEntry.commissionAmount += commissionTier.charge * (j.quantity || 1);
                        }
                    }
                    await Company.findByIdAndUpdate(
                        contractor._id,
                        { $inc: { balance } },
                        { new: true }
                    ).exec()
                }
                invoiceCommissionEntry.push(contractorCommissionEntry);
            }
        }

        if (invoiceCommissionEntry.length) {
            const jobCommisssion = await new JobCommission({
                job: job._id,
                technicians: invoiceCommissionEntry
            }).save();
            job.commission = jobCommisssion;
        }
    }

    job.timeUpdatedBy = user._id;
    job.timeUpdatedAt = new Date();
    job.status = jobStatus;
    task.status = taskStatus;
    job.track.push(history);

    try {
        // Save the job and the tasks inside
        await job.save();
    } catch (err) {
        Sentry.captureException(err);
        if (err) return res.json({ status: Status.Error, message: err.message });
    }

    // Create Job Report for Job
    const customerName = job.customer?.profile?.displayName || job.ticket?.customer?.profile?.displayName || job.request?.customer?.profile?.displayName;
    await createJobReport(job._id, job.company, customerName, task.technician?.profile?.displayName, job.scheduleDate, task.contractor || companyId);

    // HANDLE PARENT/SUB JOB
    // Find the parent or sub job to be updated as well
    let linkedJob = await Job.findOne({
        $or: [{ _id: job.parentJob }, { parentJob: job._id }]
    });
    let linkedTask = linkedJob && linkedJob.tasks.find(task => {
        const jobType = task.jobTypes.find(jobTypeTask => jobTypeTask.jobType.toString() === params.jobTypeId);
        return jobType;
    });

    // Update linked job's track & task properties
    if (linkedTask) {
        // To update Task's property when paused, finished, or update the endTime
        await _updateTask({ job: linkedJob, taskJobType, user, params, status: undefined });
        linkedJob.timeUpdatedBy = user._id;
        linkedJob.timeUpdatedAt = new Date();
        linkedJob.status = jobStatus;
        linkedJob.track.push(history);

        try {
            // Save the linked job and the tasks inside
            await linkedJob.save();
        } catch (err) {
            Sentry.captureException(err);
            if (err) return res.json({ status: Status.Error, message: err.message });
        }

        // Create Job Report for parent/sub Job
        await createJobReport(linkedJob._id, linkedJob.company, customerName, linkedJob.technician?.profile?.displayName, linkedJob.scheduleDate, linkedJob.contractor || companyId);
    }

    return res.json({ status: Status.Success, message: `Job Task ${statusAction.toLowerCase()} successfully.`, job, updatedTask: task });

}

export const editJob = async (req: Request, res: Response) => {

    const params = req.body;
    const imagesUrl: string[] = [];
    let paramTasks = params.tasks ?? [];

    // To handle any over-stringified strings
    if (!Array.isArray(paramTasks)) {
        paramTasks = JSON.parse(params.tasks);
    }

    if (req.files) {
        const paramsImageFile = JSON.parse(JSON.stringify(req.files));

        // Push image location from req.files to imagesUrl
        // paramsImageFile.forEach((image:any) => imagesUrl.push(image.location));
        paramsImageFile?.image?.forEach((image: any) => imagesUrl.push(image.location));
        paramsImageFile?.images?.forEach((image: any) => imagesUrl.push(image.location));
    }

    var companyId = req.companyId;
    const user = <IUser>req.user;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    if (params.employeeType == 0 && !params.technicianId) {
        return res.json({ status: Status.Error, message: 'technicianId must be provided when employeeType is employee' });
    }

    if (params.employeeType == 1 && !params.contractorId) {
        return res.json({ status: Status.Error, message: 'contractorId must be provided when employeeType is contractor' });
    }

    Job.findOne(
        { _id: params.jobId, $or: [{ contractor: companyId }, { 'tasks.contractor': companyId }, { company: companyId }] },
        async (err: any, job: IJob) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (job == undefined) {
                return res.json({ 'status': Status.Error, 'message': "Invalid job id" })
            }

            let linkedJob: IJob;
            let isParentJob = true;
            if (job.parentJob) {
                // linkedJob = parent job
                linkedJob = await Job.findOne({ _id: job.parentJob, status: { $nin: [JobStatus.CANCELED] } });
                isParentJob = false;
            } else {
                // linkedJob = sub job
                linkedJob = await Job.findOne({ parentJob: job._id, status: { $nin: [JobStatus.CANCELED] } });
            }

            let action = '';
            let track = job.track ? job.track : [];
            let trackLinkedJob = linkedJob && linkedJob.track || [];
            let isJobTypesUpdated = false;
            const jobTypes: ITaskJobType[] = [];
            const invalidJobTypes: string[] = [];

            // Get service ticket
            const serviceTicket = await ServiceTicket.findById(job.ticket);
            const oldScheduleDate = job.scheduleDate;
            const oldTechnicians: string[] = job.tasks.map(task => task.technician.toString());

            // Proceed tasks when params.tasks is available and check the job status
            if (params.tasks) {
                if (![JobStatus.PENDING, JobStatus.RESCHEDULED, JobStatus.INCOMPLETE].includes(job.status)) {
                    return res.json({ 'status': Status.Error, 'message': 'Cannot update for a non PENDING/RESCHEDULED/INCOMPLETE job' });
                }

                // Handle param technician
                let tasks;
                try {
                    tasks = await _handleMutltipleTechniciansTasks({ req, res, parentJob: job, paramTasks, serviceTicket });
                } catch (error) {
                    Sentry.captureException(error);
                    return res.json({ status: Status.Error, message: error.message });
                }
                job.tasks = tasks;
                action += `|Updated Tasks|`;
            }

            job.scheduleDate = params.scheduleDate;
            job.description = params.description;
            if (linkedJob) {
                linkedJob.scheduleDate = params.scheduleDate;
                linkedJob.description = params.description;
            }

            let newStartTime: any = null
            let newEndTime: any = null
            let date;

            if (params.scheduledStartTime) {
                date = new Date(params.scheduleDate)
                newStartTime = new Date(params.scheduledStartTime)
                if (newStartTime != job.scheduledStartTime) {
                    action += '|Updated ScheduledStartTime|';
                }
                job.scheduledStartTime = newStartTime
                if (linkedJob) { linkedJob.scheduledStartTime = newStartTime; }
            }

            if (params.scheduledEndTime) {
                date = new Date(params.scheduleDate)
                newEndTime = new Date(params.scheduledEndTime)
                if (newEndTime != job.scheduledEndTime) {
                    action += '|Updated ScheduledEndTime|';
                }
                job.scheduledEndTime = newEndTime
                if (linkedJob) { linkedJob.scheduledEndTime = newEndTime; }
            }

            if (params.equipmentId != undefined && params.equipmentId !== '""') {
                if (params.equipmentId != job.equipmentId) {
                    action += '|Updated EquipmentId|';
                }
                job.equipmentId = params.equipmentId
                if (linkedJob) { linkedJob.equipmentId = params.equipmentId; }
            }

            if (params.jobLocationId) {
                if (params.jobLocationId != job.jobLocation) {
                    action += '|Updated JobLocationId|';
                }
                job.jobLocation = params.jobLocationId
                if (linkedJob) { linkedJob.jobLocation = params.jobLocationId; }
            }

            if (params.jobSiteId) {
                if (params.jobSiteId != job.jobSite) {
                    action += '|Updated JobSiteId|';
                }
                job.jobSite = params.jobSiteId
                if (linkedJob) { linkedJob.jobSite = params.jobSiteId; }
            }

            if (params.homeJobLocationId) {
                if (params.homeJobLocationId != job.homeJobLocation) {
                    action += '|Updated HomeJobLocationId|';
                }
                job.homeJobLocation = params.homeJobLocationId
                if (linkedJob) { linkedJob.homeJobLocation = params.homeJobLocationId; }
            }

            if (params.homeJobSiteId) {
                if (params.homeJobSiteId != job.homeJobSite) {
                    action += '|Updated HomeJobSiteId|';
                }
                job.homeJobSite = params.homeJobSiteId
                if (linkedJob) { linkedJob.homeJobSite = params.homeJobSiteId; }
            }

            if (params.isHomeOccupied 
                || params.isHomeOccupied === false 
                || params.isHomeOccupied === true) {

                if (params.isHomeOccupied !== job.isHomeOccupied) {
                    action  += '|Updated Home Occupied Status|'
                }

                job.isHomeOccupied = params.isHomeOccupied;
                if (linkedJob) { 
                    linkedJob.isHomeOccupied = params.isHomeOccupied; 
                }
            }

            if(params.isHomeOccupied === true) {
                if(params.homeOwnerId && params.homeOwnerId !== job.homeOwner) {
                    const newHomeOwner = await HomeOwner.findOne({ _id: params.homeOwnerId });
                    if(!newHomeOwner) {
                        return res.json({ 'status': Status.NotFound, 'message': 'Provided homeOwnerId does not correspond with any home owner' });
                    }
                    job.homeOwner = params.homeOwnerId;
                    action  += '|Updated Home Owner|'
                }
                else {
                    if(params.isHomeOccupied === true && !job.homeOwner) {
                        return res.json({ 'status': Status.Error, 'message': 'Home Owner is required when home is occupied' });
                    }
                }
            }
            else if(params.isHomeOccupied === false) {
                job.homeOwner = null;
                action  += '|Updated Home Owner|'
            }

            if (params.customerContactId) {
                if (params.customerContactId !== job.customerContactId) {
                    action += '|Updated Contact Associated|';
                }
                job.customerContactId = params.customerContactId;
                if (linkedJob) { linkedJob.customerContactId = params.customerContactId; }
            }

            if (params.customerPO) {
                if (params.customerPO !== job.customerPO) {
                    action += '|Updated Customer PO|';
                }
                job.customerPO = params.customerPO;
                if (linkedJob) { linkedJob.customerPO = params.customerPO; }
            }

            if (imagesUrl?.length) {
                if (JSON.stringify(imagesUrl) !== JSON.stringify(job.images)) {
                    action += '|Updated image|';
                }

                imagesUrl.forEach(imageUrl => {
                    job.images.push({ imageUrl, uploadedBy: user.id, createdAt: new Date() });
                    if (linkedJob) { linkedJob.images.push({ imageUrl, uploadedBy: user.id, createdAt: new Date() }) }
                });
            }

            if (params.scheduleTimeAMPM) {
                if (params.scheduleTimeAMPM !== job.scheduleTimeAMPM) {
                    action += '|Updated ScheduleTimeAMPM|';
                }
                job.scheduleTimeAMPM = params.scheduleTimeAMPM;
                if (linkedJob) { linkedJob.scheduleTimeAMPM = params.scheduleTimeAMPM; }    
            }

            if (job.status == JobStatus.RESCHEDULED) {
                job.status = JobStatus.PENDING;
                if (linkedJob) { linkedJob.status = JobStatus.PENDING; }
                action += '|Job rescheduled|';
            }

            if (action !== '') {
                track.push({
                    user: user._id,
                    action,
                    date: new Date()
                });
            }

            job.track = track;
            if (linkedJob) { linkedJob.track = trackLinkedJob; }
            if (job.ticket) {
                ServiceTicket.findOne({ _id: new ObjectId(job.ticket) }).then((t) => {
                    if (t) {
                        if (!t.jobLocation && params.jobLocation) {
                            t.jobLocation = params.jobLocation;
                        }
                        if (!t.jobSite && params.jobSite) {
                            t.jobSite = params.jobSite;
                        }
                        if (!t.homeJobSite && params.homeJobSite) {
                            t.homeJobSite = params.homeJobSite;
                        }
                        if (!t.homeJobLocation && params.homeJobLocation) {
                            t.homeJobLocation = params.homeJobLocation;
                        }
                        t.save().then(() => { }).catch((err) => {
                            Sentry.captureException(err);
                            return res.json({ 'status': Status.Error, 'message': err.message });
                        })
                    }
                }).catch((err) => {
                    Sentry.captureException(err);
                    return res.json({ 'status': Status.Error, 'message': err.message });
                });
            }

            job.updateOne(
                job,
                async (err: any, raw: any) => {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    // Get the updated technicians and handle
                    const newTechnicians = job?.tasks.map(task => task.technician.toString());
                    const removedTechnicians: string[] = _.difference(oldTechnicians, newTechnicians);
                    const addedTechnicians: string[] = _.difference(newTechnicians, oldTechnicians);

                    /**
                     * Check if there are update to scheduleDate or technicians,
                     * and update the Job Route for the technician if exist
                     */
                    if (
                        !moment(oldScheduleDate).isSame(moment(job.scheduleDate), 'day')
                        || removedTechnicians.length || addedTechnicians.length
                    ) {
                        removedTechnicians.forEach(async (oldTechnician) => {
                            await _addOrRemoveJobRoutes(oldTechnician, new Date(oldScheduleDate), 'REMOVE', job._id);
                        });

                        addedTechnicians.forEach(async (newTechnician) => {
                            await _addOrRemoveJobRoutes(newTechnician, new Date(job.scheduleDate), 'ADD', job._id);
                        });
                    }

                    if (!linkedJob) {
                        return res.json({ status: Status.Success, message: 'Job edited successfully.', invalidJobTypes, job });
                    }

                    linkedJob.updateOne(linkedJob, async (err: any, raw: any) => {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        // Update service ticket related to this job is jobTypes updated
                        if (isJobTypesUpdated) {
                            const serviceTicket = await ServiceTicket.findById(job.ticket);
                            if (serviceTicket) {
                                // Update service ticket's track
                                const ticketTrack = serviceTicket.track;
                                ticketTrack.push({
                                    user: user._id,
                                    action: '|Updated JobTypes|',
                                    date: new Date()
                                })
                                // Save the service ticket
                                await serviceTicket.updateOne({
                                    tasks: jobTypes,
                                    track: ticketTrack
                                })
                            }
                        }

                        return res.json({ status: Status.Success, message: 'Job edited successfully.', invalidJobTypes, job });
                    });
                }
            )
        }
    );
}

export const updateJobRequestStatus = async (req: Request, res: Response) => {
    const params = req.body;
    let companyId = req.companyId;
    let jobRequestAction = '';

    const user = <IUser>req.user;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    const jobRequest = await JobRequest.findOne({ _id: params.jobRequestId, company: companyId });
    if (!jobRequest || jobRequest?.status === JobRequestStatus.CANCELLED) {
        return res.json({ status: Status.NotFound, message: 'Job request not found' });
    }

    // if (jobRequest.status !== JobRequestStatus.PENDING) {
    //     return res.json({ status: Status.Error, message: 'Cannot update non pending job request' });
    // }

    const job = await Job.findOne({ request: jobRequest._id });
    if (job && jobRequest.jobCreated) {
        return res.json({
            status: Status.Error,
            message: 'Cannot reject or accept again a job request that has been scheduled or finished.',
            job
        });
    }

    switch (params.status) {
        case JobRequestStatus.REJECTED:
            if (!params.note) {
                return res.json({ status: Status.Error, message: 'Note is required when you reject job request' });
            }

            jobRequestAction = `|Rejecting the job request by ${user.profile.displayName}|`;
            jobRequest.status = params.status;
            break;

        case JobRequestStatus.ACCEPTED:
            jobRequestAction = `|Accepting the job request by ${user.profile.displayName}|`;
            jobRequest.status = params.status;
            break;
        default:
            return res.json({ status: Status.Error, message: 'Param status is required' })
    }

    jobRequest.track.push({ action: jobRequestAction, date: new Date(), note: params.note, user: user._id });
    await jobRequest.save();

    return res.json({ status: Status.Success, message: 'job request status updated', jobRequest });
}


export const getJobDetails = (req: Request, res: Response) => {

    const params = req.body

    var companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    Job.findOne({ _id: params.jobId, $or: [{ contractor: companyId }, { 'tasks.contractor': companyId }, { company: companyId }] })
        .populate({
            path: 'ticket',
            select: '-__v',
            populate: [
                { path: 'track', select: 'track.user track.action track.date' },
                { path: 'jobLocation' },
                { path: 'jobSite' },
                { path: 'customerContactId' },
                { path: 'createdBy', select: 'info auth.email profile address.state address.city address.state address.zipCode contactName' },
                { path: 'tasks.jobType', select: 'title' }
            ]
        })
        .populate({
            path: 'request',
            select: '-__v',
            populate: [
                { path: 'track', select: 'track.user track.action track.date' },
                { path: 'jobLocation' },
                { path: 'jobSite' },
                { path: 'customerContact' },
                { path: 'createdBy', select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode contactName' },
            ]
        })
        .populate({
            // TODO: To be deprecated
            path: 'technician',
            select: 'profile contact auth.email'
        })
        .populate({
            // TODO: To be deprecated
            path: 'contractor',
            select: 'info.companyName info.companyEmail type'
        })
        .populate({
            path: 'customer',
            populate: 'contacts'
        })
        .populate({
            path: 'homeOwner',
            select: 'profile info contact'
        })
        .populate({
            path: 'customerContactId',
            select: '-id -__v'
        })
        .populate({
            // TODO: To be deprecated
            path: 'type',
            select: 'title description sku'
        })
        .populate({
            path: 'tasks.technician',
            select: 'profile contact auth.email'
        })
        .populate({
            path: 'tasks.contractor',
            select: 'info.companyName info.companyEmail type'
        })
        .populate({
            path: 'tasks.jobTypes.jobType',
            select: 'title description sku'
        })
        .populate({
            path: 'tasks.jobTypes.timeUpdatedBy',
            select: 'profile.displayName'
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
            select: 'name location address'
        })
        .populate({
            path: 'jobSite',
            select: 'name location address'
        })
        .populate({
            path: 'images.uploadedBy',
            select: 'profile.displayName'
        })
        .populate({
            path: 'technicianImages.uploadedBy',
            select: 'profile.displayName'
        })
        .then(async (job: any) => {

            if (job == undefined) {
                throw new Error('Invalid job id')
                // return res.json({'status': Status.Error, 'message': "Invalid job id"})
            }
            const scansPrmoise = Scan.find({ job: job._id }, 'comment timeOfScan')
                .populate({
                    path: 'equipment',
                    select: 'info.model info.serialNumber info.nfcTag images info.location',
                    populate: [{ path: 'brand', select: 'title' }, { path: 'type', select: 'title' }],

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
            Sentry.captureException(error);
            if (error.message != undefined) {
                return res.json({ 'status': Status.Error, 'message': error.message })
            } else {
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
    const user = <IUser>req.user;
    let companyId = req.companyId;
    const company = <ICompany>req.company;

    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    JobReport.findOne({ _id: params.jobReportId, $or: [{ contractor: companyId }, { company: companyId }] })
        .populate({
            path: 'job',
            populate: [
                { path: 'ticket', select: 'ticketId note scheduleDateTime' },
                {
                    path: 'request',
                    select: '-__v',
                    populate: [
                        { path: 'track', select: 'track.user track.action track.date' },
                        { path: 'jobLocation' },
                        { path: 'jobSite' },
                        { path: 'customerContact' },
                        { path: 'createdBy', select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode contactName' },
                    ]
                },
                // TODO: To be deprecated
                { path: 'technician', select: 'profile.displayName auth.email contact.phone permissions.role' },
                { path: 'tasks.technician', select: 'profile auth.email contact' },
                { path: 'customer', select: 'info.email auth.email profile.displayName permissions.role address.street address.city address.state address.zipCode contact.phone contactName' },
                { path: 'customerContactId', select: '-id -__v' },
                { path: 'type', select: 'title description sku' },
                { path: 'tasks.jobType', select: 'title description sku' },
                { path: 'tasks.jobTypes.jobType', select: 'title description sku' },
                { path: 'tasks.timeUpdatedBy', select: 'profile.displayName' },
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
                const jobTypes: any = [];

                report.job.tasks?.forEach((task: ITask) => {
                    task?.jobTypes?.forEach((taskJobType: any) => {
                        let fullJobTitle = `${taskJobType?.jobType?.title}`;
                        fullJobTitle += taskJobType?.jobType?.description
                            ? ` (${taskJobType?.jobType?.description})`
                            : '';

                        jobTypes.push(fullJobTitle);
                    });
                });

                const customer = <ICustomer>report.job?.customer;
                const customerContact = <IContact>report.job?.customerContactId;

                let paramRecipients: string[];
                let recipientEmails: string[];
                let ccEmails: string[] = [];
                let copyToMyself: boolean;
                try {
                    // Handle the stringify array of recipients value
                    if (params.recipients && !Array.isArray(params.recipients)) {
                        paramRecipients = JSON.parse(params.recipients);
                    }

                    // Handle the stringify boolean value
                    copyToMyself = params.copyToMyself
                        ? params.copyToMyself === 'false' || params.copyToMyself === false
                            ? false
                            : !!params.copyToMyself
                        : false;

                    /**
                     * Construct list of recipients if providef from FE,
                     * othwerwise using customerContact or customer
                     */
                    recipientEmails = paramRecipients?.length > 0
                        ? paramRecipients
                        : [(customerContact?.email?.length > 0
                            ? customerContact.email
                            : customer?.info?.email
                        )];

                    // Add the user's email himself if he want to receive copy email
                    if (copyToMyself) {
                        ccEmails.push(user.auth?.email);
                    }
                } catch (error) {
                    Sentry.captureException(error);
                    return res.json({ status: Status.Error, message: Messages.GenericError });
                }

                sendReportEmailToCustomer({
                    companyName: company.info?.companyName,
                    companyEmail: company.info?.companyEmail,
                    customerName: report.job.customer?.profile?.displayName,
                    customerEmail: report.job.customer?.info?.email,
                    recipientEmails,
                    ccEmails,
                    reportNumber: report.job.jobId,
                    jobTypes: [...new Set(jobTypes)].join(', ') ?? report.job?.jobType?.title,
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
                    Sentry.captureException(err);
                    return res.json({ 'status': Status.Error, 'message': err.message });
                });
            } else {
                return res.json({ 'status': Status.Error, 'message': "Report was not found" });
            }
        }).catch((err) => {
            Sentry.captureException(err);
            return res.json({ 'status': Status.Error, 'message': err.message });
        });
}

export const getJobReportPDF = (req: Request, res: Response) => {

    const params = req.params;
    const user = <IUser>req.user;
    let companyId = req.companyId;
    const company = <ICompany>req.company;

    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    JobReport.findOne({ _id: params.jobReportId, $or: [{ contractor: companyId }, { company: companyId }] })
        .populate({
            path: 'job',
            populate: [
                { path: 'ticket', select: 'ticketId note scheduleDateTime' },
                {
                    path: 'request',
                    select: '-__v',
                    populate: [
                        { path: 'track', select: 'track.user track.action track.date' },
                        { path: 'jobLocation' },
                        { path: 'jobSite' },
                        { path: 'customerContact' },
                        { path: 'createdBy', select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode contactName' },
                    ]
                },
                // TODO: To be deprecated
                { path: 'technician', select: 'profile.displayName auth.email contact.phone permissions.role' },
                { path: 'tasks.technician', select: 'profile auth.email contact' },
                { path: 'customer', select: 'info.email auth.email profile.displayName permissions.role address.street address.city address.state address.zipCode contact.phone contactName' },
                { path: 'customerContactId', select: '-id -__v' },
                { path: 'type', select: 'title description sku' },
                { path: 'tasks.jobType', select: 'title description sku' },
                { path: 'tasks.jobTypes.jobType', select: 'title description sku' },
                { path: 'tasks.timeUpdatedBy', select: 'profile.displayName' },
                { path: 'company', select: 'info.companyName info.logoUrl auth.email permissions.role address.street address.city address.state address.zipCode contact.phone contact.fax' },
                { path: 'createdBy', select: 'info.companyName auth.email profile.displayName permissions.role address.street address.city address.state address.zipCode contact.phone' },
                { path: 'homeOwner' },
                { path: 'jobLocation', select: 'name' },
                { path: 'jobSite', select: 'name' },
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
                // Initialize PDF Make
                const pdfMake = new PdfPrinter(FONT_SETS.ROBOTO);
                // Generate the PDF content
                const generatePdf = await handleJobReportPdf(report);
                // Construct the PDF full path
                const fullPath = `${ACCOUNT_RECEIVABLE_REPORT_PDF_PATH}/${Date.now()}.pdf`;
                // Check if folder path exist, create if not
                if (!fs.existsSync(ACCOUNT_RECEIVABLE_REPORT_PDF_PATH)) {
                    fs.mkdirSync(ACCOUNT_RECEIVABLE_REPORT_PDF_PATH);
                }
                // Check if existing Invoice PDF exist, remove if any
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
                const pdfDoc = pdfMake.createPdfKitDocument(generatePdf);
                const writeStream = fs.createWriteStream(fullPath);
                pdfDoc.pipe(writeStream);
                pdfDoc.end();
                writeStream.on('finish', () => {
                    let file = fs.createReadStream(fullPath);
                    let stat = fs.statSync(fullPath);
                    res.setHeader('Content-Length', stat.size);
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', 'attachment; filename=quote.pdf');
                    file.pipe(res);
                });
            } else {
                return res.json({ 'status': Status.Error, 'message': "Report was not found" });
            }
        }).catch((err) => {
            Sentry.captureException(err);
            return res.json({ 'status': Status.Error, 'message': err.message });
        });
}

export const getTodaysJobsByTechnicianId = (req: Request, res: Response) => {

    const params = req.body;
    let date = new Date()
    date.setHours(0, 0, 0, 0)
    let endDate = new Date()
    endDate.setHours(23, 59, 59, 59)
    const startOfDay = moment().startOf('day').utc().format();
    const endOfDay = moment().endOf('day').utc().format();
    const scheduleDate = moment(params.scheduleDate).format('YYYY-MM-DD');
    const scheduleDateQuery = params.scheduleDate ? new Date(scheduleDate) : { $gte: date, $lte: endDate }

    // Job.find({ $or: [{ "tasks.technician": params.employeeId }, { technician: params.employeeId }], scheduleDate: { $gte: date, $lte: endDate } })
    Job.find({ $or: [{ "tasks.technician": params.employeeId }, { technician: params.employeeId }], scheduleDate: scheduleDateQuery })
        .populate({
            path: 'ticket',
            select: '-__v',
            populate: [
                { path: 'track', select: 'track.user track.action track.date' },
                { path: 'jobLocation' },
                { path: 'jobSite' },
                { path: 'customerContactId' },
                { path: 'createdBy', select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode contactName' },
                { path: 'tasks.jobType', select: 'title description sku' }
            ]
        })
        .populate({
            path: 'request',
            select: '-__v',
            populate: [
                { path: 'track', select: 'track.user track.action track.date' },
                { path: 'jobLocation' },
                { path: 'jobSite' },
                { path: 'customerContact' },
                { path: 'createdBy', select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode contactName' },
            ]
        })
        .populate({
            // TODO: To be deprecated
            path: 'technician',
            select: 'profile contact auth.email'
        })
        .populate({
            path: 'tasks.technician',
            select: 'profile contact auth.email'
        })
        .populate({
            path: 'jobLocation',
            select: 'name address location'
        })
        .populate({
            path: 'jobSite',
            select: 'name address location'
        })
        .populate({
            path: 'customer',
            select: 'info.email auth.email profile.displayName address location contactName notes'
        })
        .populate({
            path: 'customerContactId',
            select: '-id -__v'
        })
        .populate({
            // TODO: To be deprecated
            path: 'type',
            select: 'title description sku'
        })
        .populate({
            // TODO: To be deprecated
            path: 'tasks.jobType',
            select: 'title description sku'
        })
        .populate({
            path: 'tasks.jobTypes.jobType',
            select: 'title description sku'
        })
        .populate({
            // TODO: To be deprecated
            path: 'tasks.timeUpdatedBy',
            select: 'profile.displayName'
        })
        .populate({
            path: 'tasks.jobTypes.timeUpdatedBy',
            select: 'profile.displayName'
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
            path: 'images.uploadedBy',
            select: 'profile.displayName'
        })
        .populate({
            path: 'technicianImages.uploadedBy',
            select: 'profile.displayName'
        })
        .exec(async (err: any, jobs: IJob[]) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            // const scheduleDateQuery = params.scheduleDate ? new Date(scheduleDate) : { $gte: startOfDay, $lte: endOfDay }
            const scheduleDateQuery = params.scheduleDate
                ? {
                    $or: [
                        { scheduleDate: new Date(scheduleDate) },
                        { scheduleDate: { $gte: new Date(startOfDay), $lte: new Date(endOfDay) } }]
                }
                : { scheduleDate: { $gte: new Date(startOfDay), $lte: new Date(endOfDay) } };

            // Retrieve today's jobRoute by the technician
            const jobRoutes = await JobRoute.findOne({
                technician: params.employeeId,
                ...scheduleDateQuery
            })
                .populate({
                    path: 'routes.job',
                    select: '-__v -track -comment -charges -salesTax -equipment_scanned -no_of_equipment_scanned',
                    populate: [
                        { path: 'customer', select: 'profile vendorId address location' },
                        // TODO: To be deprecated
                        { path: 'tasks.jobType', select: 'title description sku' },
                        { path: 'tasks.jobTypes.jobType', select: 'title description sku' },
                        { path: 'type', select: 'title description sku' },
                        { path: 'ticket', select: '-__v -track' },
                        {
                            path: 'request',
                            select: '-__v',
                            populate: [
                                { path: 'track', select: 'track.user track.action track.date' },
                                { path: 'jobLocation' },
                                { path: 'jobSite' },
                                { path: 'customerContact' },
                                { path: 'createdBy', select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode contactName' },
                            ]
                        },
                        { path: 'jobLocation', select: '-__v -contacts -jobSites -customerId -companyId -quickbookId' },
                        { path: 'jobSite', select: '-__v -locationId -customerId' }
                    ]
                })
                .populate({ path: 'technician', select: 'profile' })
                .populate({ path: 'createdBy', select: 'profile' })
                .populate({ path: 'updatedBy', select: 'profile' });

            return res.json({ status: Status.Success, jobs, jobRoutes });

        })

}

export const updateJobTime = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user
    let companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    Job.findOne({ _id: params.jobId, company: companyId })
        .then((job: IJob) => {
            if (job == undefined) {
                throw new Error("Invalid job id")
            }

            if (job.status == JobStatus.FINISHED) {
                throw new Error("Edit job is not allowed once it is finished")
            }

            if (job.status == JobStatus.CANCELED) {
                throw new Error("Edit job is not allowed once it is canceled")
            }

            if ((params.startTime == undefined) && (params.endTime == undefined)) {
                throw new Error('Start time or end time is required')
            }

            const itemPromise = Item.findOne({ jobType: job.type })

            return Promise.all([job, itemPromise])
        })
        .then((result: any) => {
            const job = result[0]
            const item = result[1]

            let timeSpent: number = 0
            let newcharges: number = 0
            let startTime: Date = job.startTime
            let endTime: Date = job.startTime

            if (params.startTime != undefined && params.startTime != '""') {
                startTime = params.startTime
            }

            if (params.endTime != undefined && params.endTime != '""') {
                endTime = params.endTime
            }

            if (item != null && item.charges > 0) {

                if (params.status == 2 && !item.isFixed) {
                    let starting: any = new Date(startTime)
                    let ending: any = new Date(endTime)

                    let diffMs = (ending - starting);
                    let interval = 15 * 60 * 1000;
                    timeSpent = ((Math.ceil(diffMs / interval) * interval) / 60000) / 60
                    newcharges = item.charges * timeSpent

                } else if (params.status == 2 && item.isFixed) {
                    newcharges = item.charges
                }
            }
            let track = job.track ? job.track : [];
            let action = '';
            if (job.startTime != startTime) {
                action += '|Updated Start Time|';
            }
            if (job.endTime != endTime) {
                action += '|Updated End Time|';
            }
            track.push({
                user: user._id,
                action,
                date: new Date()
            });
            return job.updateOne({ startTime: startTime, endTime: endTime, timeSpent: timeSpent, charges: newcharges, track: track, timeUpdatedBy: user._id, timeUpdatedAt: Date.now() })

        })
        .then(() => {
            return res.json({ 'status': Status.Success, 'message': 'Job time updated successfully.' })
        })
        .catch((err: any) => {
            Sentry.captureException(err);
            if (err.message != undefined) {
                return res.json({ 'status': Status.Error, 'message': err.message })

            } else {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }
        })
}

export const updateJobTechnicianStatus = async (req: Request, res: Response, sio: any) => {

    const params = req.body;
    const user = <IUser>req.user;
    const companyId = req.companyId;

    const job = await Job.findOne({
        _id: params.jobId,
        $or: [
            { company: companyId },
            { 'tasks.contractor': companyId },
            { contractor: companyId }
        ]
    })
        .populate({
            path: 'customer',
            select: 'profile.displayName itemTier'
        })
        .populate({
            path: 'technician',
            select: 'profile.displayName'
        })
        .populate({
            path: 'tasks.technician',
            select: 'profile.displayName'
        })
        .populate({
            path: 'tasks.contractor',
            select: 'commissionTier'
        })
        .populate({
            path: 'ticket',
            select: 'customer',
            populate: { path: 'customer', select: 'profile.displayName' }
        })
        .populate({
            path: 'request',
            select: '-__v',
            populate: [
                { path: 'track', select: 'track.user track.action track.date' },
                { path: 'jobLocation' },
                { path: 'jobSite' },
                { path: 'customerContact' },
                { path: 'createdBy', select: 'info.email auth.email profile.displayName address.state address.city address.state address.zipCode contactName' },
                { path: 'customer', select: 'profile.displayName' }]
        })
        .populate({
            path: 'images.uploadedBy',
            select: 'profile.displayName'
        })
        .populate({
            path: 'technicianImages.uploadedBy',
            select: 'profile.displayName'
        });

    let action = '';
    const task = job.tasks.find(task => task?.technician?._id.toString() === params.technicianId);
    const technician = <IUser>task.technician;

    if (params.status) {
        if (params.status === JobStatus.RESCHEDULED && !params.note) {
            return res.json({ status: Status.Error, message: 'Note is required when you reschedule or make the job incomplete' });
        }

        switch (params.status) {
            case JobStatus.FINISHED:
                // Cannot FINISHED technician task with FINISHED status
                if (task.status === JobStatus.FINISHED) {
                    return res.json({ status: Status.Error, message: `You can't finish this technician task, it is already finished` });
                }

                // Update technician task status and add Job's history track
                task.status = JobStatus.FINISHED;
                action += `|Technician: ${technician?.profile?.displayName} finishing his/her task|`;

                // FINISHED all STARTED and PAUSED task jobTypes
                const startedPausedTaskJobTypes: ITaskJobType[] = task.jobTypes.filter(taskJobType =>
                    [JobStatus.STARTED, JobStatus.PAUSED].includes(Number(taskJobType.status))
                );
                for (const taskJobType of startedPausedTaskJobTypes) {
                    await _updateTask({ job, taskJobType, user, params, status: params.status });
                };

                break;

            case JobStatus.CANCELED:
                // Cannot CANCELED technician task with FINISHED status
                if (task.status === JobStatus.FINISHED) {
                    return res.json({ status: Status.Error, message: `You can't cancel this technician task, it is already finished` });
                }

                // Update technician task status and add Job's history track
                task.status = JobStatus.CANCELED;
                action += `|Technician: ${technician?.profile?.displayName} canceling his/her task|`;

                break;

            case JobStatus.RESCHEDULED:
                // Cannot RESCHEDULED technician task with FINISHED status
                if (task.status === JobStatus.FINISHED) {
                    return res.json({ status: Status.Error, message: `You can't rechedule this technician task, it is already finished` });
                }

                // Update technician task status and add Job's history track
                task.status = JobStatus.RESCHEDULED;
                action += `|Technician: ${technician?.profile?.displayName} rescheduling his/her task|`;

                // PAUSED all STARTED task jobTypes
                const startedTaskJobTypes = task.jobTypes.filter(taskJobType => taskJobType.status === JobStatus.STARTED);
                for (const taskJobType of startedTaskJobTypes) {
                    await _updateTask({ job, taskJobType, user, params, status: params.status });
                }

                break;

            default:
                return res.json({ status: Status.Error, message: `Only status: FINISHED (2), CANCELED (3), and RESCHEDULED (4) that supported by this API` });
        }

        // To update Job's status based on cummulative of tasks status
        let allTechnicianStatus: JobStatus[] = [];
        allTechnicianStatus = job.tasks.map(task => task.status);

        // Check if all technician statuses are FINISHED as well and update job's status
        if (allTechnicianStatus.every(status => status === JobStatus.FINISHED)) {
            job.status = JobStatus.FINISHED;
            action += `|Finishing the job|`;
        }

        /**
         * Check if there no more PENDING, STARTED, or PAUSED technician statuses,
         * if it does, update job's status to CANCELED as well
         */
        if (
            allTechnicianStatus.includes(JobStatus.CANCELED)
            && !allTechnicianStatus.includes(JobStatus.PENDING)
            && !allTechnicianStatus.includes(JobStatus.STARTED)
            && !allTechnicianStatus.includes(JobStatus.PAUSED)
        ) {
            job.status = JobStatus.CANCELED;
            action += `|Canceling the job|`;
        }

        /**
         * Check if there no more PENDING, STARTED, or PAUSED technician statuses,
         * if it does, update job's status to RESCHEDULED as well
         */
        if (
            allTechnicianStatus.includes(JobStatus.RESCHEDULED)
            && !allTechnicianStatus.includes(JobStatus.PENDING)
            && !allTechnicianStatus.includes(JobStatus.STARTED)
            && !allTechnicianStatus.includes(JobStatus.PAUSED)
        ) {
            job.status = JobStatus.RESCHEDULED;
            action += `|Rescheduling the job|`;
        }
    }

    job.track.push({ user: user._id, action, note: params.note, date: new Date() });

    try {
        task.comment = params.comment;
        if (req.files) {
            const paramsImageFile = JSON.parse(JSON.stringify(req.files));
            // Push images from req.files to technicianImages
            paramsImageFile?.images?.forEach((image: any) =>
                job.technicianImages.push({ imageUrl: image.location, uploadedBy: user._id, createdAt: new Date() })
            );
        }

        await job.save();
    } catch (err) {
        Sentry.captureException(err);
        return res.json({ status: Status.Error, message: err.message });
    }

    res.json({ status: Status.Success, message: `Technician task status updated successfully.`, job, technicianTask: task });

    if (params.status === JobStatus.RESCHEDULED) {
        // Save notification to DB and send through SocketIO
        await _handleNotification({
            sio,
            companyId: job.company,
            notificationType: NotificationTypes.JOB_RESCHEDULED,
            messageTitle: 'Job Task rescheduled',
            messageBody: `Technician: ${technician?.profile?.displayName} rescheduling his/her task on Job: ${job.jobId}`,
            metadataId: job._id
        })
    }

    return;

}

// PRIVATE METHODS

/**
 * To update Task's property when pause, finish, or update the endTime
 */
const _updateTask = async ({ job, taskJobType, user, params, status }: { job: IJob, taskJobType: ITaskJobType, user: IUser, params: any, status: number }) => {

    /**
     * Find item information related to the task/job type,
     * to get the item charges based on customer's price tier
     */
    let item: IItem;
    let customer: ICustomer;

    if (taskJobType) {
        // Update the jobType tasks properties
        item = await Item.findOne({ jobType: taskJobType.jobType });
        customer = <ICustomer>job.customer;
        await _handleTaskCharges({ job, taskJobType, item, customer, params });

        taskJobType.status = status ?? params.status;
        taskJobType.tempStartTime = null;
        taskJobType.pausedCount = Number(status ?? params.status) === JobStatus.PAUSED ? taskJobType.pausedCount + 1 : taskJobType.pausedCount;
        taskJobType.timeUpdatedBy = user;
        taskJobType.timeUpdatedAt = new Date();
    }

    return;

}

/**
 * To handle task charges and timeSpent,
 * either pause, finish, or update the endTime of FINISHED task
 */
const _handleTaskCharges = async ({ job, taskJobType, item, customer, params, isDeduct }: { job: IJob, taskJobType: ITaskJobType, item: IItem, customer: ICustomer, params: any, isDeduct?: boolean }) => {

    // Find the item tier based on customer assigned item tier
    const tier = item?.tiers?.find(t => t.tier?.toString() === customer.itemTier?.toString());
    // Find the tier charge and use tier number 1 and item's charges as the fallback
    const tierCharge = tier?.charge || item?.tiers[0]?.charge || item?.charges;
    let charges = taskJobType.charges || 0;

    if (!isDeduct) {
        /**
         * Get the timeSpent based on the difference task's time,
         * current time as the endTime and the startTime or tempStartTime (for PAUSED task)
         */
        const timeSpent = moment().diff(moment(taskJobType.tempStartTime || taskJobType.startTime), 'minutes');

        /**
         * If item isFixed, charges will not sum up over and over,
         * if item hourly, charges will be sum up each time it is paused/finished
         */
        charges = item?.isFixed ? tierCharge : charges + (tierCharge * (timeSpent / 60));

        taskJobType.timeSpent += timeSpent;
        taskJobType.endTime = Number(params.status) === JobStatus.FINISHED ? new Date() : undefined;
        taskJobType.charges = Math.round(charges * 100) / 100;
        job.timeSpent += timeSpent;
    } else {
        // Remove excessed timeSpent
        /**
         * Get the timeSpentToDeduct based on the difference task's time,
         * the wrong endTime and the new endTime from params
         */
        const timeSpentToDeduct = moment(taskJobType.endTime).diff(moment(params.endTime), 'minutes');

        /**
         * If item isFixed, charges will not be deducted,
         * if item hourly, charges will be deducted
         */
        charges = item?.isFixed ? tierCharge : charges - (tierCharge * (timeSpentToDeduct / 60));

        taskJobType.timeSpent -= timeSpentToDeduct;
        taskJobType.endTime = new Date(params.endTime);
        taskJobType.charges = Math.round(charges * 100) / 100;
        job.timeSpent -= timeSpentToDeduct;
        const endTime: any[] = [];
        job.tasks.forEach(task => {
            task.jobTypes.forEach(jobType => endTime.push(jobType.endTime.getTime()))
        });
        job.endTime = new Date(Math.max(...endTime));
    }

    return;
}

const _handleMutltipleTechniciansTasks = async ({
    req,
    res,
    parentJob,
    paramTasks,
    serviceTicket
}: {
    req: Request,
    res: Response,
    parentJob: IJob,
    paramTasks: TaskEntry[],
    serviceTicket: IServiceTicket
}): Promise<ITask[] | any> => {

    const params = req.body;
    const invalidJobType: any[] = []
    let jobTypes = serviceTicket?.tasks;
    let invalidJobTypes: string[];
    const tasks: ITask[] = [];

    const customer = params.customerId || parentJob && parentJob.customer;
    const homeOwner = params.homeOwnerId || parentJob && parentJob.homeOwner

    for (const paramTask of paramTasks) {
        let taskContractor
        let taskTechnician: any
        let contractorCommissionTier: any

        if (!paramTask.contractorId && !paramTask.technicianId) {
            // return res.json({ status: Status.Error, message: "contractorId or technicianId must be provided" });
            throw new Error("contractorId or technicianId must be provided");
        }

        if (paramTask.contractorId && !paramTask.technicianId) {
            taskContractor = await Company.findOne({ _id: paramTask.contractorId });
        }

        if (paramTask.technicianId && !paramTask.contractorId) {
            const technician = await User.findOne({ _id: paramTask.technicianId });
            taskTechnician = technician?._id;
        }

        const paramsemployeeType = paramTask.employeeType === undefined || paramTask.employeeType === null
            ? false
            : paramTask.employeeType === 'false' || paramTask.employeeType === '0'
                ? false
                : !!paramTask.employeeType;

        if (taskContractor && !taskTechnician) {
            contractorCommissionTier = taskContractor?.commissionTier
            taskTechnician = taskContractor?.admin
        }

        if (!taskContractor && !taskTechnician) {
            // return res.json({ status: Status.Error, message: "Contractor/Technician not found!" })
            throw new Error("Contractor/Technician not found!");
        }

        const taskEntry: any = {
            employeeType: paramsemployeeType,
            technician: taskTechnician,
            contractor: taskContractor?._id,
            contractorCommissionTier: contractorCommissionTier,
        };

        //=== HANDLE params jobTypes
        try {
            ({ jobTypes, invalidJobTypes } = await _handleJobTypesJson(customer, JSON.stringify(paramTask.jobTypes), jobTypes));
            invalidJobType.push(...invalidJobTypes);
            taskEntry.jobTypes = jobTypes;
            tasks.push(taskEntry);
        } catch (error) {
            Sentry.captureException(error);
            // return res.json({ 'status': Status.Error, 'message': error.message });
            throw new Error(error.message);
        }
        //=== END HANDLE params jobTypes
    }

    // Check duplicated contractorId from param task
    const contractorIds = paramTasks.filter(task => task.contractorId && task.employeeType === '1').map(technician => technician.contractorId);
    const isDuplicateContractor = contractorIds.some((contractorId, i) => contractorIds.indexOf(contractorId) !== i)

    if (isDuplicateContractor) {
        throw new Error("Cannot use same contractor in the same job");
    }

    // Check duplicated technicianId from param task
    const technicianIds = paramTasks.filter(task => task.technicianId && task.employeeType === '0').map(technician => technician.technicianId);
    const isDuplicateTech = technicianIds.some((techId, i) => technicianIds.indexOf(techId) !== i);

    if (isDuplicateTech) {
        throw new Error("Cannot use same technician in the same job");
    }

    return tasks;

}

export const createServiceTicketJob = async (
    req: Request,
    res: Response,
    serviceTicketId: string,
    imagesUrl: string[],
    company: ICompany
) => {

    const serviceTicket = await ServiceTicket.findOne({ _id: serviceTicketId, company });
    if (!serviceTicket) {
        return res.json({ status: Status.Error, message: 'Service Ticket not found!' });
    }

    if (serviceTicket.status == ServiceTicketStatus.ARCHIVED) {
        return res.json({ status: Status.Error, message: `You can't create a job using canceled ticket.` });
    }
    if (serviceTicket.jobCreated) {
        return res.json({ status: Status.Error, message: 'Job already created for this ticket.' });
    }

    const jobId = serviceTicket.ticketId.replace('Ticket', 'Job');
    const createJob = await _createJob(req, res, undefined, jobId, imagesUrl, serviceTicket);
    return res.json({ status: Status.Success, message: 'Job created successfully.', createJob });
}

export const createJobRequestJob = async (
    req: Request,
    res: Response,
    jobRequestId: string,
    imagesUrl: string[],
    company: ICompany
) => {

    const jobRequest = await JobRequest.findOne({ _id: jobRequestId, company });
    if (!jobRequest) {
        return res.json({ status: Status.Error, message: 'Job Request not found!' });
    }

    if (jobRequest.status === JobRequestStatus.CANCELLED || jobRequest.status === JobRequestStatus.FINISHED) {
        return res.json({ status: Status.Error, message: 'You can`t create a job using either cancelled or finished request' });
    }

    if (jobRequest.jobCreated) {
        return res.json({ status: Status.Error, message: 'Job already created for this request.' });
    }

    const jobId = jobRequest.requestId.replace('Request', 'Job');
    const createJob = await _createJob(req, res, undefined, jobId, imagesUrl, undefined);
    return res.json({ status: Status.Success, message: 'Job created successfully.', createJob });
}

export const handleScheduledTime = async ({
    company,
    scheduleDate,
    scheduledStartTime,
    scheduledEndTime,
    technicianId
}: {
    company: ICompany,
    scheduleDate: string,
    scheduledStartTime: string,
    scheduledEndTime: string,
    technicianId: string
}) => {

    const job = await Job.findOne({
        $or: [
            {
                company: company._id,
                tasks: { technician: technicianId },
                scheduleDate: new Date(scheduleDate),
                scheduledStartTime: { $lte: scheduledStartTime || null },
                scheduledEndTime: { $gte: scheduledStartTime || null}
            },
            {
                company: company._id,
                tasks: { technician: technicianId },
                scheduleDate: new Date(scheduleDate),
                scheduledStartTime: { $lte: scheduledEndTime || null },
                scheduledEndTime: { $gte: scheduledEndTime || null }
            }
        ]
    });

    if (job) {
        throw new Error(`Technician is scheduled at time you selected, try scheduling after ${job.scheduledEndTime}`);
    }

    return;
}