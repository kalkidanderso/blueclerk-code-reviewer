import { Request, Response } from 'express';

import { Status } from '../common/constants';

import { Company } from '../models/Company';
import { Customer } from '../models/Customer';
import { IPriceTier } from '../models/PriceTier';

import { _addItemTier } from '../controllers/company';
import { Job } from '../models/Job';
import { ServiceTicket } from '../models/ServiceTicket';

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
        status: Status.OK,
        message: 'Companies and customers successfully updated.',
        updatedCompanies, updatedCustomers, createdItemTiers
    });

}

export const syncJobTask = async (req: Request, res: Response) => {
    const jobs = await Job.find({});

    if (!jobs?.length)
        return res.json({ status: Status.OK, message: 'No jobs to update' });

    for (const job of jobs) {
        // Hanlde job tasks
        if (job.technician) {
            // Move old tasks to tasksBackup
            job.tasks.forEach(task => {
                job.tasksBackup.push(task);
            });

            const jobEntry: any = {
                technician: job.technician,
                employeeType: job.employeeType,
                contractor: job.contractor,
                jobTypes: job.tasks
            }

            // Remove old task in tasks object
            await Job.updateMany({
                _id: job._id
            }, { $pull: { tasks: { $exists: true } } });

            // Convert old task to new tasks
            job.tasks.push(jobEntry);
        }

        // Handle job image
        if (job.image) {
            job.images.push({ imageUrl: job.image, uploadedBy: job.createdBy });
        }

        job.save();
    }

    return res.json({
        status: Status.OK,
        message: 'Job successfully updated.',
        jobs
    })
}

export const updateServiceTicketImage = async (req: Request, res: Response) => {
    const serviceTickets = await ServiceTicket.find({});

    if (!serviceTickets)
        return res.json({ status: Status.OK, message: 'No service tickets to update' });

    for (const serviceTicket of serviceTickets) {
        if (serviceTicket.image) {
            serviceTicket.images.push({
                imageUrl: serviceTicket?.image,
                uploadedBy: serviceTicket?.createdBy
            });
        }

        serviceTicket.save()
    }

    return res.json({
        status: Status.OK,
        message: 'images on service ticket updated',
        serviceTickets
    })
}