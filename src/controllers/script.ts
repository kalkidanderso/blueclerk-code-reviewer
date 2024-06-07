/* eslint-disable no-console */
import mongoose from 'mongoose';
import { Request, Response } from 'express';

import { DefaultCommission, InvoiceStatus, JobStatus, Role, Status, UserPermissions } from '../common/constants';

import { Company, CompanyTypes, ICompany } from '../models/Company';
import { Customer, ECustomerTypes, ICustomer } from '../models/Customer';
import { IPriceTier } from '../models/PriceTier';

import { _addItemTier } from '../controllers/company';
import { Job, ITaskJobType, IJob } from '../models/Job';
import { ServiceTicket } from '../models/ServiceTicket';
import { JobType } from '../models/JobType';
import { Invoice } from '../models/Invoice';
import { User } from '../models/User';
import { Payment, PaymentCustomer } from '../models/Payment';
import { InvoiceCommission } from '../models/InvoiceCommission';
import { IContact } from '../common/contact';
import { CustomerAdmin } from '../models/CustomerAdmin';
import { CustomerContact, ICustomerContact } from '../models/CustomerContact';
import { JobLocation } from '../models/JobLocation';
import { _updateQBCustomerJob } from '../controllers/quickbook.customer';

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
            });
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

};

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
        };

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
            });

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
                });

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

};

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

};

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
                    task.status = jobTypeStatus;
                }

                if (allTaskJobTypeStatus.every(status => status === jobTypeStatus)) {
                    task.status = jobTypeStatus;
                }
            }
        }

        job.save();
    }

    return res.json({
        status: Status.Success,
        message: 'Technician status successfully migrated.',
        jobs
    });
};

export const addJobTypeMongooseId = async (req: Request, res: Response) => {

    const jobs = await Job.find({ 'tasks.jobTypes': { $exists: true } });

    if (!jobs.length) {
        return res.json({ status: Status.OK, message: 'No jobs to be migrated' });
    }

    jobs.forEach(job => {
        job.tasks.forEach(task => {
            task._id = new mongoose.Types.ObjectId();
            task.jobTypes.forEach(jobType => {
                jobType._id = new mongoose.Types.ObjectId();
            });
        });

        job.save();
    });

    return res.json({
        status: Status.Success,
        message: 'Job Task _id successfully updated.',
        jobs
    });

};

export const addVendorBalance = async (req: Request, res: Response) => {

    const company = <ICompany>req.company;
    const jobs = await Job.find({ company, 'tasks.technician': { $exists: true } }).exec();

    for (const job of jobs) {
        const invoice = await Invoice.findOne({ job: job._id });
        if (job.tasks) {
            const totalTechnician = job.tasks.length;
            for (const task of job.tasks) {
                const contractor = await Company.findById(task.contractor);
                const technician = await User.findById(task.technician);
                if (invoice) {
                    if (contractor) {
                        const contractorCommission = (invoice.total / totalTechnician) * (contractor.commission ?? DefaultCommission.VENDOR_COMMISSION) / 100;
                        contractor.balance = Number(contractorCommission.toFixed(2));
                        await contractor.save();
                    }

                    if (technician) {
                        const technicianCommission = (invoice.total / totalTechnician) * (technician.commission ?? DefaultCommission.EMPLOYEE_COMMISSION) / 100;
                        technician.balance = Number(technicianCommission.toFixed(2));
                        await technician.save();
                    }
                }
            }
        }
    }

    return res.json({ status: Status.Success, message: 'Vendor and Technician balance successfully updated.' });
};

export const addPaymentType = async (req: Request, res: Response) => {

    const payments = await Payment.find({ company: { $ne: null }, __t: { $nin: ['PaymentVendor', 'PaymentEmployee'] } }).exec();
    if (payments.length) {
        for (const payment of payments) {
            await new PaymentCustomer(payment).save();
        }
    }

    return res.json({ status: Status.Success, message: 'Payment type successfully added.' });
};

export const addInvoiceCommission = async (req: Request, res: Response) => {

    const invoices = await Invoice.find({
        isDraft: { $ne: true },
        job: { $ne: null }
    }).populate({ path: 'job' });

    if (!invoices.length) {
        return res.json({ status: Status.Success, message: 'No invoices to be processed.' });
    } else {
        res.json({ status: Status.Success, message: 'Invoice Commission will be processed in the background. Please check in several minutes' });
    }

    for (const invoice of invoices) {
        const invoiceCommission = await InvoiceCommission.findOne({ invoice });
        const job = <IJob>invoice.job;

        if (invoiceCommission || !job) {
            continue;
        }

        if (job.tasks) {
            const invoiceCommissionEntry = [];
            const totalTechnician = job.tasks.length;

            for (const task of job.tasks) {
                if (task.contractor) {
                    const contractor = await Company.findById(task.contractor);
                    const contractorCommissionAmount = (invoice.total / totalTechnician) * (contractor.commission ?? DefaultCommission.VENDOR_COMMISSION) / 100;
                    invoiceCommissionEntry.push({
                        contractor: contractor._id,
                        technician: contractor.admin,
                        commission: contractor.commission,
                        commissionAmount: Number(contractorCommissionAmount.toFixed(2)),
                        paid: task.paid,
                    });
                }

                if (task.technician && !task.contractor) {
                    const technician = await User.findById(task.technician).exec();
                    const technicianCommissionAmount = (invoice.total / totalTechnician) * (technician.commission ?? DefaultCommission.EMPLOYEE_COMMISSION) / 100;
                    invoiceCommissionEntry.push({
                        technician: technician._id,
                        commission: technician.commission,
                        commissionAmount: Number(technicianCommissionAmount.toFixed(2)),
                        paid: task.paid,
                    });
                }
            }

            const invoiceCommission = await new InvoiceCommission({
                invoice: invoice._id,
                technicians: invoiceCommissionEntry
            }).save();

            invoice.commission = invoiceCommission._id;
            invoice.save();
        }
    }

    console.log('Invoice Commission script finished');
    return;
};

export const updatePaidTechnicians = async (req: Request, res: Response) => {

    const payments = await Payment.find({ __t: { $in: ['PaymentVendor', 'PaymentEmployee'] } }).exec();
    await Job.updateMany({ 'tasks.paid': true }, { $set: { 'tasks.$[].paid': false, 'tasks.$[].paidAt': null } }).exec();

    if (!payments.length) {
        return res.json({ status: Status.NotFound, message: 'Payment not found' });
    } else {
        res.json({ status: Status.Success, message: 'Payment technician has been updated successfully' });
    }

    for (const payment of payments) {
        for (const paymentInvoice of payment.invoices) {
            const invoice = await Invoice.findById(paymentInvoice).exec();
            if (invoice) {
                const job = await Job.findById(invoice.job).exec();
                const contractor = job?.tasks.find(task => task?.contractor?.toString() === payment?.contractor?.toString());
                const technician = job?.tasks.find(task => task?.technician?.toString() === payment?.employee?.toString());

                if (contractor) {
                    contractor.paid = true;
                    contractor.paidAt = payment.paidAt;
                }

                if (technician) {
                    technician.paid = true;
                    technician.paidAt = payment.paidAt;
                }

                await job.save();
            }
        }
    }

    return;
};

export const migrateCustomer = async (req: Request, res: Response) => {
    const customers: any[] = await User.find({ __t: 'Customer' });
    if (!customers.length) {
        return res.json({ status: Status.NotFound, message: 'Customer not found' });
    }

    res.json({ status: Status.Success, message: 'Customer migration successfully' });

    for (const userCustomer of customers) {
        const customer: ICustomer = userCustomer.toObject();
        const customerEntry: any = {
            isActive: customer?.isActive,
            info: customer?.info,
            contactName: customer?.contactName,
            equipments: customer?.equipments,
            jobLocations: customer?.jobLocations,
            quickbookId: customer?.quickbookId,
            balance: customer?.balance,
            credit: customer?.credit,
            itemTier: customer?.itemTier,
            isCustomPrice: customer?.isCustomPrice,
            customPrices: customer?.customPrices,
            discountPrices: customer?.discountPrices,
            paymentTerm: customer?.paymentTerm,
            vendorId: customer?.vendorId,
            inactiveAt: customer?.inactiveAt,
            inactiveBy: customer?.inactiveBy,
            address: customer?.address,
            location: customer?.location,
            emailPreferences: customer?.emailPreferences,
            profile: customer.profile,
            contact: customer.contact,
            permissions: customer.permissions,
            commission: customer.commission,
            contactEmail: customer.contactEmail,
            contacts: customer.contacts
        };

        // Create customer admin in user
        const customerUser = await new CustomerAdmin({
            ...customerEntry,
            auth: {
                email: customer?.info?.email
            },
            customer: customer._id
        }).save();

        customerEntry.admin = customerUser._id;
        customerEntry._id = customer._id;
        // Remove old customer
        // await CustomerAdmin.findByIdAndDelete(customerCompanyEntry._id).exec();
        // const contacts = await Contact.find({ _id: { $in: customer.contacts } }).exec();
        // const customerContacts = [];
        // for (const contact of contacts) {
        //     const customerContact = await createCustomerContact({ contact, customer: customer });
        //     customerContacts.push(customerContact._id);
        // }

        // customerEntry.contacts = customerContacts;
        await new Customer(customerEntry).save();
        // await new CompanyCustomer({
        //     // company: companyId,
        //     company: userCustomer.company,
        //     customer: customerUser._id,
        //     createdAt: Date.now()
        // }).save();
    }

    return;
};

// Create customer contact in user collection
export const createCustomerContact = async ({
    contact,
    customer,
}: {
    contact: IContact,
    customer: ICustomer,
}): Promise<ICustomerContact> => {

    let customerContact = await CustomerContact.findOne({
        $or: [{ 'info.email': contact.email }, { 'auth.email': contact.email }]
    });

    if (!customerContact) {
        const contactName = contact.name?.split(' ');
        const customerContactEntry: any = {
            info: { email: contact.email },
            profile: { firstName: contactName && contactName[0], lastName: contactName?.length > 1 ? contactName && contactName[contactName.length - 1] : '', displayName: contact.name },
            address: customer?.address ?? {},
            contact: { phone: contact.phone },
            company: customer?._id,
            permissions: { role: Role.CUSTOMER_CONTACT, extra: [] },
            contactName: contact.name,
            location: customer?.location ?? {}
        };

        customerContact = await new CustomerContact(customerContactEntry).save();
    }

    contact.userId = customerContact._id;
    contact.save();

    return customerContact;
};

export const updateQBCustomerJob = async (req: Request, res: Response) => {

    const companyId = req.companyId;

    const jobLocations = await JobLocation.find({
        companyId,
        quickbookId: { $ne: null }
    });
    // .limit(300)
    // .skip(300);

    res.json({
        ok: true,
        msg: 'Script running in background',
        companyId,
        jobLocationCount: jobLocations?.length
    });

    for (const jobLocation of jobLocations) {
        const company = await Company.findById(jobLocation.builderId);
        await _updateQBCustomerJob(req, res, company, jobLocation, null, (err, errMsg, qbCustomerJob) => {
            console.log('== qbCustomerJob.Id:', qbCustomerJob?.Id);
            console.log('== qbCustomerJob.BillWithParent:', qbCustomerJob?.BillWithParent);
        });
    }

    console.log('== done ==');

    return;

};

export const revertBackInvoices = async (req: Request, res: Response) => {
    const params = req.body;

    const invoices = await Invoice.find({ _id: { $in: params.invoiceIds } });

    for (const invoice of invoices) {
        console.log('== invoice._id:', invoice._id);
        console.log('===== BEFORE ====');
        console.log('== invoice.total:', invoice.total);
        console.log('== invoice.paymentApplied:', invoice.paymentApplied);
        console.log('== invoice.balanceDue:', invoice.balanceDue);
        console.log('== invoice.paid:', invoice.paid);
        console.log('== invoice.status:', invoice.status);

        invoice.paymentApplied += 2000;
        invoice.balanceDue -= 2000;

        if (invoice.balanceDue > 0) {
            invoice.paid = false;

            if (invoice.paymentApplied > 0) {
                invoice.status = InvoiceStatus.PARTIALLY_PAID;
            } else {
                invoice.status = InvoiceStatus.UNPAID;
            }
        } else {
            invoice.paid = true;
            invoice.status = InvoiceStatus.PAID;
        }

        if (params.saveNow) {
            await invoice.save();
        }

        console.log('===== AFTER ====');
        console.log('== invoice.total:', invoice.total);
        console.log('== invoice.paymentApplied:', invoice.paymentApplied);
        console.log('== invoice.balanceDue:', invoice.balanceDue);
        console.log('== invoice.paid:', invoice.paid);
        console.log('== invoice.status:', invoice.status);
        console.log('===== \n');
    }

    return res.json({ ok: true, invoices });
};

export const createCustomersBuilderCompany = async() => {
    console.log('<---- CREATING BUILDER COMPANY FOR CUSTOMER ---->');
    const customers = await Customer.find({});
    for(const customer of customers) {
        console.log(`Customer name: ${customer.profile.displayName}`);
        if(!customer.companyId) {
            customer.type = ECustomerTypes.BUILDER;
            const chargeDate = new Date();   
            chargeDate.setDate(chargeDate.getDate() + 30);
            const company = new Company(
                {
                    info: {
                        companyName: customer.profile.displayName,  
                        industry: null,
                        logoUrl: '',
                        companyEmail: customer.info.email, 
                    },
                    address: {
                        street: '',
                        city: '',
                        state: '',
                        zipCode: '',
                    },
                    contact: {
                        phone: customer.contact.phone,
                    },
                    userPermissions: UserPermissions,
                    chargeDate: chargeDate,
                    maxTechnicians: 0,
                    maxAdmins: 1,
                    maxManagers: 0,
                    maxOfficeAdmins: 0,
                    type: CompanyTypes.BUILDER
                }
            );

            console.log('- Saving new company for customer');
            await company.save(async (err: any, result: ICompany) => {
                if (err) {
                    console.log(`- Error creating company for customer ${customer._id}`);
                }
                else {
                    console.log(`- Company created for customer ${customer.profile.displayName}: ${result._id}`);
                    customer.companyId = result._id;
                    console.log('- Updating customer');
                    await customer.save(async(err: any) => {
                        console.log('- Customer updated');
                        if (err) {
                            console.log(`- Error updating customer ${customer._id}`);
                        }
                    });
                }
            });
        }
        else {
            console.log(`- Company ID: ${customer.companyId}`);
        }
    }
};

export const moveJobLocationsFromCustomersToCompany = async() => {
    console.log('<---- MOVING JOB LOCATIONS FROM CUSTOMER TO COMPANY ---->');
    const customers = await Customer.find({});
    for(const customer of customers) {
        if(customer.companyId && customer.jobLocations && customer.jobLocations.length > 0) {
            console.log(`Customer name: ${customer.profile.displayName}`);
            const company = await Company.findById(customer.companyId);
            company.jobLocations = customer.jobLocations;

            console.log('- Saving company for customer');
            await company.save(async (err: any) => {
                if (err) {
                    console.log(`- Error updating company for customer ${customer._id}`);
                }
                for(const locationId of customer.jobLocations) {
                    console.log(`- Updating Location: ${locationId}`);
                    const jobLocation = await JobLocation.findById(locationId);
                    jobLocation.builderId = company._id;
                    await jobLocation.save(async (err: any) => {
                        if (err) {
                            console.log(`- Error updating location ${locationId}`);
                        }
                    });
                }
            });
        }
        else {
            console.log(`Do nothing for customer: ${customer.profile.displayName}`);
        }
    }
};
