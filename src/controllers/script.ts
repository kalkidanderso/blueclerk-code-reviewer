import mongoose from 'mongoose';
import { Request, Response } from 'express';

import { DefaultCommission, JobStatus, Status } from '../common/constants';

import { Company, ICompany } from '../models/Company';
import { Customer } from '../models/Customer';
import { IPriceTier } from '../models/PriceTier';

import { _addItemTier } from '../controllers/company';
import { Job, ITaskJobType } from '../models/Job';
import { ServiceTicket } from '../models/ServiceTicket';
import { JobType } from '../models/JobType';
import { Invoice } from '../models/Invoice';
import { User } from '../models/User';

/**
 * To sync and update all companies and customers to have Item Price Tier,
 * will create 1 new Item Tier to be the default,
 * and assign it to the customers
 */
export const syncItemTier = async (req: Request, res: Response) => {

    const updatedCompanies: string[] = [];
    const updatedCustomers: string[] = [];
    const createdItemTiers: string[] = [];

    // Find all companies from the database
    const companies = await Company.find({}).populate({ path: 'itemTier.list.tier' });

    if (!companies?.length)
        return res.json({ status: Status.OK, message: 'No companies to update' });

    // Iterate all companies
    for (const company of companies) {

        // Take company first active tier if any
        let itemTier = <IPriceTier>company.itemTier?.list?.find(t => {
            const tier = <IPriceTier>t.tier;
            return tier.isActive;
        })?.tier;

        if (!itemTier) {
            // Company doesn't have item tier, create new one
            await _addItemTier(company, (err, createdItemTier) => {
                if (err)
                    return res.json({ status: Status.Error, message: err.message });

                itemTier = createdItemTier;
                updatedCompanies.push(company._id);
                createdItemTiers.push(createdItemTier?._id);
            })
        }

        // Find all customers owned by the company
        const customers = await Customer.find({ company });

        // Iterate all customers
        const custToUpdate: string[] = [];
        for (const customer of customers) {
            const custItemTier = <IPriceTier>company.itemTier?.list?.find(t => {
                const tier = <IPriceTier>t.tier;
                return tier?._id?.toString() === customer?.itemTier?.toString();
            })?.tier;

            // Check if customer has itemTier and the status of itemTier
            if (!custItemTier || !custItemTier?.isActive) {
                custToUpdate.push(customer._id);
            }
        }

        // Update all invalid customers in the company at once
        await Customer.updateMany({ _id: { $in: custToUpdate } }, { itemTier: itemTier?._id });
        // Collect all those updated customers
        updatedCustomers.push(...custToUpdate);
    }

    return res.json({
        status: Status.Success,
        message: 'Companies and customers successfully updated.',
        updatedCompanies, updatedCustomers, createdItemTiers
    });

}

/**
 * To migrate the old job's type and old format tasks,
 * to the new multiple technicians tasks format
 */
export const migrateJobTask = async (req: Request, res: Response) => {

    /**
     * New job with new task structure doesn't have employeeType,
     * so we only find job that have employeeType
     */
    const jobs = await Job.find({ employeeType: { $ne: null } });

    if (!jobs?.length) {
        return res.json({ status: Status.OK, message: 'No jobs to be migrated' });
    }

    for (const job of jobs) {
        // Construct the new taskEntry object
        const taskEntry: any = {
            technician: job.technician,
            employeeType: job.employeeType,
            contractor: job.contractor,
            status: job.status
        }

        // If job has type, it means this is a very old job
        if (job.type) {
            const jobType = await JobType.findById(job.type);
            const taskJobType = [];
            const isSelfFinished = job.status == JobStatus.FINISHED ? true : false;

            taskJobType.push({
                jobType: jobType?._id,
                status: job.status,
                isSelfFinished,
                charges: job.charges,
                timeSpent: job.timeSpent,
                equipmentScanned: job.equipment_scanned,
                noOfEquipmentScanned: job.no_of_equipment_scanned,
            })

            taskEntry.jobTypes = taskJobType;
        }

        // Convert the old tasks to the new multiple technicians format
        if (job.tasks) {
            // Deep copy the old tasks to remove the reference object
            const oldTasks: ITaskJobType[] = JSON.parse(JSON.stringify(job.tasks));
            const taskJobType = [];
            // Backup old tasks to tasksBackup
            job.tasksBackup = job.tasks;

            for (const oldTask of oldTasks) {
                const isSelfFinished = oldTask.status == JobStatus.FINISHED ? true : false;

                taskJobType.push({
                    isSelfFinished,
                    ...oldTask
                })

                taskEntry.jobTypes = taskJobType;
            }
        }

        job.tasks = taskEntry;
        job.save();
    }

    return res.json({
        status: Status.Success,
        message: 'Job task successfully migrated.',
        jobs
    });

}

/**
 * To migrate the old `image` (single string) param to new `images` (array),
 * for Service Ticket and Job
 */
export const migrateTicketAndJobImage = async (req: Request, res: Response) => {

    // Retrieve all serviceTickets and jobs that have `image` property
    const serviceTickets = await ServiceTicket.find({ image: { $ne: null } });
    const jobs = await Job.find({ image: { $ne: null } });

    if (!serviceTickets && !jobs) {
        return res.json({ status: Status.OK, message: 'No service tickets and jobs to be migrated' });
    }

    for (const serviceTicket of serviceTickets) {
        serviceTicket.images = serviceTicket.images ?? [];
        serviceTicket.images.push({
            imageUrl: serviceTicket.image,
            uploadedBy: serviceTicket.createdBy,
            createdAt: serviceTicket.createdAt
        });

        serviceTicket.save();
    }

    for (const job of jobs) {
        job.images = job.images ?? [];
        job.images.push({
            imageUrl: job.image,
            uploadedBy: job.createdBy,
            createdAt: job.createdAt
        });

        job.save();
    }

    return res.json({
        status: Status.Success,
        message: 'Service Ticket and Job image successfully migrated.',
        serviceTickets, jobs
    });

}

export const migrateTechnicianStatus = async (req: Request, res: Response) => {
    const jobs = await Job.find({ 'tasks.jobTypes': { $exists: true } });

    if (!jobs.length) {
        return res.json({ status: Status.OK, message: 'No jobs to be migrated' });
    }

    for (const job of jobs) {
        for (const task of job.tasks) {
            const allTaskJobTypeStatus = task.jobTypes.map(jobType => jobType.status);
            // Add status to technician from job type status
            for (const jobTypeStatus of allTaskJobTypeStatus) {
                if ([JobStatus.STARTED, JobStatus.PENDING, JobStatus.PAUSED].includes(jobTypeStatus)) {
                    task.status = jobTypeStatus
                }

                if (allTaskJobTypeStatus.every(status => status === jobTypeStatus)) {
                    task.status = jobTypeStatus
                }
            }
        }

        job.save()
    }

    return res.json({
        status: Status.Success,
        message: 'Technician status successfully migrated.',
        jobs
    });
}

export const addJobTypeMongooseId = async (req: Request, res: Response) => {

    const jobs = await Job.find({ 'tasks.jobTypes': { $exists: true } });

    if (!jobs.length) {
        return res.json({ status: Status.OK, message: 'No jobs to be migrated' });
    }

    jobs.forEach(job => {
        job.tasks.forEach(task => {
            task._id = new mongoose.Types.ObjectId();
            task.jobTypes.forEach(jobType => {
                jobType._id = new mongoose.Types.ObjectId()
            });
        });

        job.save();
    });

    return res.json({
        status: Status.Success,
        message: 'Job Task _id successfully updated.',
        jobs
    });

}

export const addVendorBalance = async (req: Request, res: Response) => {

    const vendorIds: any = [];
    const technicianIds: any = [];
    const company = <ICompany>req.company
    const jobs = await Job.find({ company, 'tasks.technician': { $exists: true } }).exec();
    const jobIds = jobs.map(job => job._id);
    const invoices = await Invoice.find({ job: { $in: jobIds } }).exec();

    jobs.forEach(job => {
        job.tasks.forEach(task => {
            if (task.contractor && task.technician) {
                vendorIds.push(task.contractor)
            }

            if (task.technician && !task.contractor) {
                technicianIds.push(task.technician)
            }
        });
    });

    const vendors = await Company.find({ _id: { $in: vendorIds } });
    const technicians = await User.find({ _id: { $in: technicianIds } });

    for (const vendor of vendors) {
        for (const invoice of invoices) {
            const commission = invoice.total * (DefaultCommission.VENDOR_COMMISSION / 100);
            vendor.balance += commission;
        }

        vendor.save();
    }

    for (const technician of technicians) {
        for (const invoice of invoices) {
            const commission = invoice.total * (DefaultCommission.EMPLOYEE_COMMISSION / 100);
            technician.balance += commission;
        }

        technician.save();
    }

    return res.json({ status: Status.Success, message: 'Vendor and Technician balance successfully updated.' });
}
