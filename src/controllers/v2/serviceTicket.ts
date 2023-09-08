import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import moment from 'moment';

import { DefaultPageSize, Messages, Status } from '../../common/constants';
import {
    splitArray, fillQueryCommon, getFilteredCustomerIds,
    getFilteredJobLocationsIds, getFilteredJobSitesIds, getFilteredTechniciansIds
} from './common';
import { Contact } from '../../models/Contact';
import { HomeOwner } from '../../models/HomeOwner';
import * as helper from '../../services/helper';
import { IServiceTicket, ServiceTicket } from '../../models/ServiceTicket';
import {FONT_SETS, INVOICE_IMAGE_PATH, PO_REQUEST_PATH} from '../../common/config';
import {Layouts, Styles} from '../../common/constants.pdf';
import { Customer, ICustomer } from 'src/models/Customer';
import { ICompany } from '../../models/Company';
import { ICompanyLocation } from '../../models/CompanyLocation';
import { IContact } from '../../common/contact';
import { downloadFileToPath } from '../invoice';
import { IItem, Item } from '../../models/Item';
import { IUser } from '../../models/User';
import { IJobType } from '../../models/JobType';
import { IPriceTier } from '../../models/PriceTier';
import { IJobLocation } from '../../models/JobLocation';
import { IJobSite } from '../../models/JobSite';
import fs from 'fs';
import { sendPORequestEmailToCustomer } from '../../services/aws';
import { DefaultPORequestEmailTemplate, EmailDefault, EmailTypes } from '../../models/EmailDefault';
import * as Sentry from '@sentry/node';
import { _createCompanyDefaultEmail, getPlaceholderValues, transformPlaceholders } from '../emailDefault';
import { IPORequest, PORequest } from '../../models/PORequest';

const pdfmake = require('pdfmake');

export const getServiceTickets = async (req: Request, res: Response) => {
    const bodyParams = req.body;
    // Return error when all cursors are provided
    if (bodyParams.nextCursor && bodyParams.previousCursor) {
        return res.json({ status: Status.Error, message: 'Provided cursor could only be one of either nextCursor or previousCursor.' });
    }
    const queryParams = req.query;
    const companyId = req.otherCompanyId || req.companyId;
    const currentPage = bodyParams.currentPage || 0;
    const pageSize = bodyParams.pageSize || DefaultPageSize;

    // Data query that used to search Tickets
    const initialQuery: any = {
        $and: [
            { company: companyId }
        ]
    };
    
    _fillInitialQueryTickets(bodyParams, queryParams, initialQuery, "Ticket");

    const filteredInitialJobs = await ServiceTicket.aggregate([
        { $match: initialQuery },
        {
            $project:
            {
                customer: 1,
                customerContactId: 1,
                jobLocation: 1,
                jobSite: 1,
                "tasks.technician": 1,
                HomeOwner: 1
            },
        },
    ]);

    // Split the initial tickets into subarrays with 30,000 length, to do parallel processing
    const filteredInitialTicketsSplited = splitArray(filteredInitialJobs, 30000);
    const parallelFilter = filteredInitialTicketsSplited.map((value: any[]) => _getFilteredTicketsIds(value, bodyParams));
    const finalTicketsIds = (await Promise.all(parallelFilter)).flat()
    const finalQuery: any = {
        $and: [{ _id: { $in: finalTicketsIds } }]
    }

    const finalParallelProcess = [
        ServiceTicket.aggregate([
            { $match: finalQuery },
            {
                $count: "count"
            }
        ]),
        ServiceTicket.aggregate([
            { $match: finalQuery },
            { $sort: { createdAt: -1, _id: -1 } },
            { $skip: (currentPage * pageSize) },
            { $limit: pageSize },
        ])
    ];

    const [total, tickets]: (any[] | IServiceTicket[]) = await Promise.all(finalParallelProcess);

    await ServiceTicket.populate(tickets, [
        {
            path: 'customer',
            select: 'info.email profile.displayName contactName notes',
        },
        {
            path: 'customerContactId'
        },
        {
            path: 'poOverriddenBy',
            select: 'profile.displayName'
        },
        {
            path: 'homeOwner',
            select: 'info profile address location contact'
        },
        {
            path: 'createdBy',
            select: 'profile.displayName'
        },
        {
            path: 'technician',
            select: 'profile.displayName'
        },
        {
            path: 'editedBy',
            select: 'profile.displayName'
        }
    ]);
    
    return res.json({
        status: Status.Success,
        serviceTickets: tickets,
        total: total[0]?.count,
    });
}

export const getPORequest = async (req: Request, res: Response) => {
    const bodyParams = req.body;
    // Return error when all cursors are provided
    if (bodyParams.nextCursor && bodyParams.previousCursor) {
        return res.json({ status: Status.Error, message: 'Provided cursor could only be one of either nextCursor or previousCursor.' });
    }
    const queryParams = req.query;
    const showAll = bodyParams.showAll;
    const companyId = req.otherCompanyId || req.companyId;
    const currentPage = bodyParams.currentPage || 0;
    const pageSize = bodyParams.pageSize || DefaultPageSize;

    const initialQuery: any = {
        $and: [
            { company: companyId }
        ]
    };
   
    
    if (showAll) {
        _fillInitialQueryTickets(bodyParams, queryParams, initialQuery, "All PO Request");
    }else{
        _fillInitialQueryTickets(bodyParams, queryParams, initialQuery, "PO Request");
    }

    const filteredInitialJobs = await PORequest.aggregate([
        { $match: initialQuery },
        {
            $project:
            {
                customer: 1,
                customerContactId: 1,
                jobLocation: 1,
                jobSite: 1,
                "tasks.technician": 1,
                HomeOwner: 1,
            },
        },
    ]);

    // Split the initial tickets into subarrays with 30,000 length, to do parallel processing
    const filteredInitialTicketsSplited = splitArray(filteredInitialJobs, 30000);
    const parallelFilter = filteredInitialTicketsSplited.map((value: any[]) => _getFilteredTicketsIds(value, bodyParams));
    const finalTicketsIds = (await Promise.all(parallelFilter)).flat()
    const finalQuery: any = {
        $and: [{ _id: { $in: finalTicketsIds } }]
    }

    const finalParallelProcess = [
        PORequest.aggregate([
            { $match: finalQuery },
            {
                $count: "count"
            }
        ]),
        PORequest.aggregate([
            { $match: finalQuery },
            { $sort: { createdAt: -1, _id: -1 } },
            { $skip: (currentPage * pageSize) },
            { $limit: pageSize },
        ])
    ];

    const [total, tickets]: (any[] | IPORequest[]) = await Promise.all(finalParallelProcess);

    await PORequest.populate(tickets, [
        {
            path: 'customer',
            select: 'info.email profile.displayName contactName isPORequired notes',
        },
        {
            path: 'customerContactId'
        },
        {
            path: 'homeOwner',
            select: 'info profile address location contact'
        },
        {
            path: 'createdBy',
            select: 'profile.displayName'
        },
        {
            path: 'technician',
            select: 'profile.displayName'
        },
        {
            path: 'editedBy',
            select: 'profile.displayName'
        }
    ]);
    
    return res.json({
        status: Status.Success,
        serviceTickets: tickets,
        total: total[0]?.count,
    });
}


export const getPORequestEmailTemplate = async (req: Request, res: Response) => {
    const params = req.query;
    const company = <ICompany>req.company;
    const user = <IUser>req.user;
    const emailType = EmailTypes.PO_REQUEST;

    // Retrieve company email default
    let emailDefault = await EmailDefault.findOne({ company, emailType });
    // Create email default if company coesn't have one yet
    if (!emailDefault) {
        await _createCompanyDefaultEmail(company, emailType);
        emailDefault = await EmailDefault.findOne({ company, emailType });
    }else if (emailDefault.message != DefaultPORequestEmailTemplate.message || emailDefault.subject != DefaultPORequestEmailTemplate.subject) {
        //This condition is used when we only use the default email message, but if we are using a customized email, we can remove it
        emailDefault.message = DefaultPORequestEmailTemplate.message;
        emailDefault.subject = DefaultPORequestEmailTemplate.subject;
        emailDefault.save();
    }

    /**
     * Transfrom the email default placeholder symbol to fit Javascript Template Literal,
     * '{{' become '${' & '}}' become '}'
     */
    const ticket = await ServiceTicket
        .findOne({ company, _id: params.ticketId })
        .populate("customer")
        .populate("customerContactId")
        .populate({
            path: 'jobLocation',
            select: 'name address location'
        })
        .populate({
            path: 'jobSite',
            select: 'name address location'
        })
        .populate({
            path: 'companyLocation',
            select: 'isAddressAsBillingAddress address billingAddress poRequestEmailSender'
        });
    
    const companyLocation = ticket?.companyLocation as ICompanyLocation;

    await transformPlaceholders(emailDefault);
    // Get available placeholder values for ticket email template
    const { company_name, company_email, customer_name, ticket_id, ticket_due_date, customer_email, ticket_address, type_ticket, ticket_street } = await getPlaceholderValues({ company, ticket, customer: ticket.customer as ICustomer });
        
    const emailList = [
        {
            name: user.profile.displayName,
            email: user.auth?.email
        }
    ];

    if (companyLocation?.poRequestEmailSender) {
        emailList.unshift(
            {
                name: "Default Email From",
                email: companyLocation?.poRequestEmailSender
            }
        )
    }
    return res.json({
        status: Status.Success,
        emailTemplate: {
            from: emailList[0],
            emailList: emailList,
            to: customer_email,
            subject: eval('`' + emailDefault.subject + '`'),
            message: eval('`' + emailDefault.message + '`')
        }
    });

}

export const sendPORequest = async (req: Request, res: Response) => {
    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    const ticket = await ServiceTicket 
        .findOne({company, _id: params.ticketId})
        .populate({ path: 'customer', populate: { path: 'discountPrices.discountItem'}})
        .populate('customerContactId')
        .populate('companyLocation')
        .populate('jobLocation')
        .populate('jobSite')
        .populate('tasks.jobType');

    // Retrieve company email default
    const filepath = req.file?.path ?? `${PO_REQUEST_PATH}/${ticket.ticketId}.pdf`;
    const ticketPdfs = [{ticket, filepath}];
    const emailDefault = await EmailDefault.findOne({company, emailType: EmailTypes.PO_REQUEST});

    await _generatePORequestPdf(company, ticket);

    
    const customer = <ICustomer>ticket.customer;
    const customerContact = <IContact>ticket.customerContactId;

    let paramRecipients: string[];
    let recipientEmails: string[];
    let copyToMyself: boolean;
    try {
        // Handle the stringify array of recipients value
        if (params.recipients) {
            if (Array.isArray(params.recipients)) {
                paramRecipients = params.recipients;
            } else {
                paramRecipients = JSON.parse(params.recipients);
            }
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
            : [(customerContact?.email ?? customer?.info?.email)];

        // Add the user's email himself if he want to receive copy email
        if (copyToMyself) {
            recipientEmails.push(user.auth?.email);
        }
    } catch (error) {
        Sentry.captureException(error);
        console.log('== Send PO Request Error:', error);
        return res.json({status: Status.Error, message: Messages.GenericError});
    }

    const companyLocation = <ICompanyLocation>ticket.companyLocation;

    let message = params.message ?? emailDefault?.message; 
    try {
        message = message.replace(/\n/g, '<br>')
    } catch (error) {}
    // Call AWS SES method
    sendPORequestEmailToCustomer({
        subject: params.subject ?? emailDefault?.subject,
        message: message,
        sender_email: params.sender || companyLocation?.poRequestEmailSender || user.auth?.email,
        company_name: company.info?.companyName,
        company_email: company.info?.companyEmail,
        company_logo: company.info?.logoUrl,
        customer_name: customer.profile?.displayName,
        customer_email: customerContact?.email ?? customer?.info?.email,
        recipient_emails: recipientEmails,
        po_request_number: ticket.ticketId,
        po_request_pdfs: ticketPdfs
    });

    // Update email history and last email sent info
    let track: any[] = ticket?.track ? ticket.track : [];
    track.push({
        user: user._id,
        action: `Sent an email for a PO Request.`,
        date: new Date()
    });
    
    const sendingDate = new Date();
  
    recipientEmails.forEach((item) => {
        ticket.emailHistory.push({
            sentTo: item,
            sentAt: sendingDate,
            sentBy: user._id || null,
            deliveryStatus:true
        });
    });

    ticket.lastEmailSent = sendingDate;
    await ticket.save();

    return res.json({
        status: Status.Success,
        message: "PO Request has been sent successfully."
    });
}

/**
 * ===================================
 * =====[ PRIVATE METHODS BELOW ]=====
 * ===================================
 */

/**
 * Check and add if params filter provided to initial jobs query
 * @param bodyParams params provided on the request body
 * @param queryParams param provided on the request query
 * @param query query to be filled
 */
const _fillInitialQueryTickets = (bodyParams: any, queryParams: any, query: any, type: "Ticket" | "PO Request" | "All PO Request") => {
    const { workType, companyLocation } = queryParams;
    const { technicianIds, status, startDate, endDate, customerId, bouncedEmailFlag , isHomeOccupied} = bodyParams;
    let technicianIdsArr: any[];
    
    if (bouncedEmailFlag) {
        query['$and'].push({ bouncedEmailFlag: true });
    }

    if (isHomeOccupied) {
        query['$and'].push({ isHomeOccupied: true });
    }

    if (technicianIds) {
        // Validate is technician ids is already array or object
        technicianIdsArr = Array.isArray(technicianIds)
            ? technicianIds
            : technicianIds.split(',').filter((element: any) => element)
    }
    if (technicianIdsArr?.length > 0) {
        // convert technician Id from string to objectId and remove falsy value 
        const technicians = technicianIdsArr.map(technicianId => {
            if (ObjectId.isValid(technicianId)) return new ObjectId(technicianId);
        }).filter(tech => tech);
        query['$and'].push({
            $or: [
                { 'tasks.technician': { $in: technicians } },
                { 'tasks.contractor': { $in: technicians } }
            ]
        });
    }
    if (status == 0) {
        query['$and'].push({ status: { $ne: 1 } });
        query['$and'].push({ jobCreated: false });
    }
    if (status == 1) {
        query['$and'].push(
            {
                $or: [
                    {
                        $and: [
                            { status: { $ne: 1 } }
                        ]
                    },
                    {
                        $and: [
                            { status: 1 },
                            { jobCreated: true }
                        ]
                    },
                ]
            });
    }
    if (startDate && endDate) {
        const startDateMoment = moment(startDate).format('YYYY-MM-DD');
        const endDateMoment = moment(endDate).format('YYYY-MM-DD');
        query['$and'].push({ dueDate: { $gte: new Date(startDateMoment), $lte: new Date(endDateMoment) } });
    }
    if (customerId) {
        query['$and'].push({ customer: new ObjectId(customerId) });
    }

    if (type == "Ticket") {
    }else if(type == "PO Request"){
    }
    switch (type) {
        case "Ticket":
            query['$and'].push({type: { $ne: "PO Request" }});
            break;
        case "PO Request":
            query['$and'].push({type: { $eq: "PO Request" }, status: { $ne: 1 }});
            break;
        case "All PO Request":
            query['$and'].push({type: { $eq: "PO Request" }});
            break;
        default:
            break;
    }

    fillQueryCommon({ workType, companyLocation }, query['$and']);
}

const _getFilteredContactsIds = async (contactsIds: ObjectId[], keywordRegex?: any): Promise<ObjectId[]> => {
    //early return
    if (!keywordRegex) {
        return contactsIds;
    }
    const query: any = {
        $and: [{
            _id: {
                $in: contactsIds,
            },
        },]
    };
    query['$and'].push({ "name": keywordRegex });

    const filteredContactsIds = (await Contact.aggregate([
        {
            $match: query
        },
        {
            $project:
            {
                _id: 1,
            },
        },
    ])).map((value) => value._id);
    return filteredContactsIds;
}


const _getFilteredHomeOwnersIds = async (homeOwnersIds: ObjectId[], keywordRegex?: any): Promise<ObjectId[]> => {
    //early return
    if (!keywordRegex) {
        return homeOwnersIds;
    }
    const query: any = {
        $and: [{
            _id: {
                $in: homeOwnersIds,
            },
        },]
    };
    query['$and'].push({ "profile.displayName": keywordRegex });

    const filteredHomeOwnersIds = (await HomeOwner.aggregate([
        {
            $match: query
        },
        {
            $project:
            {
                _id: 1,
            },
        },
    ])).map((value) => value._id);
    return filteredHomeOwnersIds;
}

/**
 * Get the ids of filtered jobs
 * @param filteredInitialJobs the initial filtered jobs
 * @param params params received on the request to filter
 * @param jobSitesFieldsToFilter fields name used to filter on job sites by keyword
 * @param jobLocationsFieldsToFilter fields name used to filter on job locations by keyword
 * @returns Promise<ObjectId[]>
 */
const _getFilteredTicketsIds = async (filteredInitialTickets: any[], params: any): Promise<ObjectId[]> => {
    // Get the ids linked to the jobs and that they are on other collections
    const ticketsIds = filteredInitialTickets.map((value) => value._id);

    // Get fields 
    const { keyword } = params;
    //early return
    if (!keyword) {
        return ticketsIds;
    }
    const query: any = {
        $and: [
            { _id: { $in: ticketsIds } }
        ]
    };

    const jobSitesFieldsToFilter: string[] = ['name', 'address.street', 'address.city'];
    const jobLocationsFieldsToFilter: string[] = ['name', 'address.street', 'address.city'];

    const keywordRegex = helper.getRegex(keyword, 'i');
    const contactsIds = filteredInitialTickets.map((value) => value.customerContactId).filter((value) => value !== undefined);
    const customersIds = filteredInitialTickets.map((value) => value.customer).filter((value) => value !== undefined);
    const jobLocationsIds = filteredInitialTickets.map((value) => value.jobLocation).filter((value) => value !== undefined);
    const jobSitesIds = filteredInitialTickets.map((value) => value.jobSite).filter((value) => value !== undefined);
    const techniciansIds = filteredInitialTickets.flatMap((value) => value.tasks?.map((value: any) => value?.technician).filter((value: any) => value !== undefined));
    const homeOwnerIds = filteredInitialTickets.map((value) => value.homeOwner);

    const [filteredCustomersIds, filteredContactsIds, filteredJobLocationsIds, filteredJobSitesIds,
        filteredTechniciansIds, filteredHomwOwnerIds] = await Promise.all([getFilteredCustomerIds(customersIds, keywordRegex),
        _getFilteredContactsIds(contactsIds, keywordRegex),
        getFilteredJobLocationsIds(jobLocationsIds, keywordRegex, jobLocationsFieldsToFilter),
        getFilteredJobSitesIds(jobSitesIds, keywordRegex, jobSitesFieldsToFilter),
        getFilteredTechniciansIds(techniciansIds, keywordRegex),
        _getFilteredHomeOwnersIds(homeOwnerIds, keywordRegex)]);
    const queryOr: any = {
        $or: [
            { ticketId: keywordRegex },
            { note: keywordRegex },
            { customerPO: keywordRegex },
            { dueDate: keywordRegex },
            { customerContactId: { $in: filteredContactsIds } },
            { homeOwner: { $in: filteredHomwOwnerIds } },
            { customer: { $in: filteredCustomersIds } },
            { jobLocation: { $in: filteredJobLocationsIds } },
            { jobSite: { $in: filteredJobSitesIds } },
            { "tasks.technician": { $in: filteredTechniciansIds } },
        ]
    };
    query['$and'].push(queryOr);
    const values = (await ServiceTicket.aggregate([
        { $match: query },
        {
            $project:
            {
                _id: 1
            },
        },
    ])).map((value: any) => value._id);
    return values;
}

/**
 * Generate PO Request
 * @param company 
 * @param ticket 
 * @returns Promise<unknown>
 */
const _generatePORequestPdf = async (company: ICompany, ticket: IServiceTicket) => {
    const blueclerkLogo = 'assets/images/logo_blue.png';

    // Initialize PDF Make
    const pdfMake = new pdfmake({
        ...FONT_SETS.ROBOTO,
        ...FONT_SETS.FONTELLO
    });

    // Retrieve invoice populated or detailed data
    const customer = <ICustomer>ticket.customer;
    const companyLocation = <ICompanyLocation>ticket?.companyLocation;
    const customerContact = <IContact>ticket.customerContactId;

    // Construct Billing Address object
    const billingAddress = {
        street: ticket.companyLocation ? `${(companyLocation.isAddressAsBillingAddress ? companyLocation.address?.street : companyLocation.billingAddress?.street) ?? ''}` : `${company.address?.street ?? ''}`,
        city: ticket.companyLocation ? `${(companyLocation.isAddressAsBillingAddress ? companyLocation.address?.city : companyLocation.billingAddress?.city) ?? ''}` : `${company.address?.city ?? ''}`,
        state: ticket.companyLocation ? `${(companyLocation.isAddressAsBillingAddress ? companyLocation.address?.state : companyLocation.billingAddress?.state) ?? ''}` : `${company.address?.state ?? ''}`,
        zipCode: ticket.companyLocation ? `${(companyLocation.isAddressAsBillingAddress ? companyLocation.address?.zipCode : companyLocation.billingAddress?.zipCode) ?? ''}` : `${company.address?.zipCode ?? ''}`,
    }

    // Construct Customer Address object
    const customerAddress = {
        street: customer?.address?.street ? `${customer?.address?.street}` : '',
        city: customer?.address?.city ? `, ${customer?.address?.city}` : '',
        state: customer?.address?.state ? `, ${customer?.address?.state}` : '',
        zipCode: customer?.address?.zipCode ? `, ${customer?.address?.zipCode}` : '',
    }

    // Construct default Job Service Address and Job Site Address object
    const jobAddress: any = {...customerAddress};
    const jobSiteAddress: any = {...customerAddress};

    // Take Job Location address if any
    const jobLocation = <IJobLocation>ticket.jobLocation;
    if (jobLocation) {
        jobAddress.name = jobLocation?.name ?? '';
        jobAddress.street = jobLocation?.address?.street ?? '';
        jobAddress.city = jobAddress.street && jobLocation?.address?.city ? ', ' : '';
        jobAddress.city += jobLocation?.address?.city ?? '';
        jobAddress.state = (jobAddress.street || jobAddress.city) && jobLocation?.address?.state ? ', ' : '';
        jobAddress.state += jobLocation?.address?.state ?? '';
        jobAddress.zipCode = (jobAddress.street || jobAddress.city || jobAddress.state) && jobLocation?.address?.zipcode ? ', ' : '';
        jobAddress.zipCode += jobLocation?.address?.zipcode ?? '';
    }

    // Take Job Site address if any
    const site = <IJobSite>ticket.jobSite;
    if (site) {
        jobSiteAddress.name = site?.name ?? '';
        jobSiteAddress.street = jobSiteAddress.name ? '\n' : '';
        jobSiteAddress.street += site?.address?.street ?? '';
        jobSiteAddress.city = jobSiteAddress.street && site?.address?.city ? ', ' : '';
        jobSiteAddress.city += site?.address?.city ?? '';
        jobSiteAddress.state = (jobSiteAddress.street || jobSiteAddress.city) && site?.address?.state ? ', ' : '';
        jobSiteAddress.state += site?.address?.state ?? '';
        jobSiteAddress.zipCode = (jobSiteAddress.street || jobSiteAddress.city || jobSiteAddress.state) && site?.address?.zipcode ? ', ' : '';
        jobSiteAddress.zipCode += site?.address?.zipcode ?? '';
    }

    // Construct default Company Logo image
    let companyImage: any = {
        text: '',
        fillColor: '#cccccc'
    }

    let companyLogoFilePath = '';

    if (company.info?.logoUrl) {
        // Check and download Company Logo to /tmp file
        companyLogoFilePath = await downloadFileToPath(company, company.info.logoUrl, INVOICE_IMAGE_PATH, true);

        companyImage = {
            image: 'companyLogo',
            width: 67,
            height: 52,
            margin: [0, 20, 0, 10],
            border: [false, false, false, true],
            rowSpan: 2
        }
    }

    // Construct the header for the job Items
    const table: any = {
        headerRows: 1,
        widths: [20, 220, 50, 110, 48, 110, 20],
        body: [
            [
                {text: '', style: 'itemTitle'},
                {
                    text: "Service / Product",
                    style: "itemTitle",
                },
                {
                    text: 'Quantity',
                    style: 'itemTitle',
                    alignment: "center"
                },
                {
                    text: 'Price',
                    style: "itemTitle",
                    alignment: "center"
                },
                {
                    text: "Tax",
                    style: "itemTitle",
                    alignment: "center",
                },
                {
                    text: "Amount",
                    style: "itemTitle",
                    alignment: "right",
                },
                {text: '', style: 'itemTitle'},
            ],
        ],
    }

    // Add Job's Items to table template    
    let totalCharge = 0;
    let taskMap: any[] = [];
    let allPromise:Promise<void>[] = [];
    ticket.tasks.forEach(task =>{
        const newTask = async (res: any) => {
            const jobType = <IJobType>res.jobType;
            const item = await Item.findOne({jobType: jobType._id})

            let itemTier;
            if (customer.itemTier) {
                // Find the assigned itemTier of the customer
                itemTier = item.tiers.find(t => t.tier.toString() === customer.itemTier.toString());
            } else {
                // Take the first active tier of Item when customer doesn't have itemTier
                await item.populate({path: 'tiers.tier'}).execPopulate();
                itemTier = item.tiers.find(t => {
                    const tier = <IPriceTier>t.tier;
                    return tier.isActive;
                });
            }

            let obj: any = {}
            let price = task.price ?? itemTier?.charge;
            let itemTax = 0;
            let itemTaxAmount: number = 0;
            let subTotal = price * res.quantity;

            if (item.tax > 0) {
                itemTax = item.tax
                itemTaxAmount = subTotal * itemTax / 100;
            }
            totalCharge += subTotal;
            
            taskMap.push({
                jobType: jobType,
                quantity: res.quantity,
                subTotal: subTotal,
                tax: itemTaxAmount > 0 ? "Yes" : "No",
                price: price
            })
        }
        allPromise.push(newTask(task));
    })

      /**
     * Check if ticket coming from Job and customer has Discount Prices,
     * add the discount price based on the quantity of the ticket item
     */
      if (ticket.tasks?.length > 0 && customer.discountPrices?.length > 0) {
        const newDiscount = async () =>{
            // Sort the customer discount prices and filter any null prices
            let discountPrices = customer.discountPrices?.sort((a, b) => {
                return a.quantity - b.quantity
            });
            discountPrices = discountPrices.filter(disc => disc.discountItem && ((disc.discountItem as IItem)?.isActive ?? true));
            
            //Count All Item Quantity
            let allQty = 0;
            ticket.tasks.forEach(task =>{
                allQty += task.quantity || 1;
            })

            // Get the max quantity that should be discounted
            const maxDiscountQty = discountPrices[discountPrices.length - 1]?.quantity;
            const totalItemDiscounted = allQty > maxDiscountQty ? maxDiscountQty : ticket.tasks.length;
            
            // Find the discount item based on how many item that gonna be discounted
            const customerDiscount = customer.discountPrices?.find(disc => disc.quantity === totalItemDiscounted && ((disc.discountItem as IItem)?.isActive ?? true));
            const discountItem = await Item.findById((customerDiscount?.discountItem as IItem)?._id);
    
            if (discountItem) {
                const discountAmount = discountItem.charges ?? 0;
                const subTotal = Math.round(discountAmount * 100) / 100
                taskMap.push({
                    jobType: discountItem,
                    quantity: 1,
                    subTotal: subTotal,
                    tax: discountItem.tax > 0 ? "Yes" : "No",
                    price:  Math.round(discountAmount * 100) / 100
                })
                totalCharge += subTotal;
            }
        }
        allPromise.push(newDiscount());
    }

    await Promise.all(allPromise)
    const bodyTable: any = [];
    taskMap.forEach(task => {
        const jobType = <IJobType>task.jobType;

        bodyTable.push([
            {},
            {
                stack: [
                    {text: `${jobType.title ?? jobType?.title ?? ''}`, style: 'itemListBold'},
                    {text: `${jobType.description ?? jobType?.description ?? ''}`, style: 'itemList'}
                ]
            },
            {text: task.quantity, style: 'itemListCenter'},
            {text: `${helper.delimiterEnUs(task.price)}`, style: 'itemListCenter'},
            {text:  task.tax, style: 'itemListCenter'},
            {text: `${helper.delimiterEnUs(task.subTotal)}`, style: 'itemListRight'},
            {}
        ]);
    });

    bodyTable.push([{}, {}, {}, {}, {}, {}, {}]);
    for (let i = 0; i < bodyTable.length; i++) {
        table.body.push(bodyTable[i]);
    }
    
    // // INITIALIZE PO Request PDF TEMPLATE
    const docDefinition: any = {
        pageSize: "A4",
        pageMargins: [0, 0, 50, 30],
        content: [
            {
                // HEADER FIRST LINE: COMPANY LOGO, NAME, VENDOR, & INVOICE ID
                table: {
                    headerRows: 1,
                    widths: [10, 80, 170, 80, 197, 10],
                    body: [
                        [
                            {},
                            companyImage,
                            {
                                text: `${company.info?.companyName ?? ' '}`,
                                style: 'companyName',
                                margin: [0, 20, 0, 0],
                                colSpan: 2,
                            },
                            {},
                            {
                                text: `${ticket.ticketId}`,
                                style: 'ticketId',
                                alignment: 'right',
                                margin: [0, 20, 0, 0]
                            },
                            {}
                        ],
                        [
                            {},
                            {},
                            {
                                text: `${billingAddress.street}\n${billingAddress.city}${billingAddress.state ? ', ' + billingAddress.state : ''}${billingAddress.zipCode ? ', ' + billingAddress.zipCode : ''}\n${company.contact?.phone ?? ''}`,
                                style: 'ticketHeader',
                                margin: [0, 0, 0, 10],
                                border: [false, false, false, true]
                            },
                            {text: '', margin: [0, -2, 0, 10], border: [false, false, false, true]},
                            {
                                stack: [
                                    {
                                        table: {
                                            withs: ['auto',30,'auto'],
                                            body: [
                                                [{},{text: `Created Date:`, style: 'headerTitleBold'}, {}, {text: `${moment(ticket.createdAt).format('MMM. DD, YYYY')}`, style: 'headerTitle'}],
                                            ]
                                        },
                                        layout: {
                                            ...Layouts.noBorders,
                                        }
                                    }
                                ],
                                margin: [0, 0, 0, 0],
                                border: [false, false, false, true]
                            },
                            {text: '', margin: [0, 0, 0, 10], border: [false, false, false, true]}
                        ]
                    ],
                },
                fillColor: '#F9FDFF',
                layout: {
                    ...Layouts.noBorders,
                    hLineColor: (i: number, node: any) => {
                        return '#D0D3DC';
                    },
                    hLineWidth: (i: number, node: any) => {
                        return 1;
                    }
                },
            },
            {
                // HEADER SECOND LINE: CUSTOMER  INFORMATION
                table: {
                    widths: [10, 160, 160, 207, 10],
                    body: [
                        [
                            {},
                            {
                                stack: [
                                    {text: 'Bill To', style: 'headerTitle'},
                                    {text: customer?.profile?.displayName ?? ' ', style: 'ticketHeaderBold'}
                                ],
                                margin: [0, 0, 0, 10],
                            },
                            {
                                stack: [
                                    {text: ' ', style: 'headerTitle'},
                                    {text: customer?.contact.phone ?? ' ', style: 'ticketHeader'}
                                ],
                                margin: [0, 0, 0, 10],
                            },     
                            {
                                stack: [
                                    {text: ' ', style: 'headerTitle'},
                                    {text: customer?.info.email ?? ' ', style: 'ticketHeader'}
                                ],
                                margin: [0, 0, 0, 10],
                            },
                            {}
                        ],
                        [
                            {},
                            {
                                stack: [
                                    {text: 'Subdivision', style: 'headerTitle'},
                                    {text: jobAddress.name ?? ' ', style: 'ticketHeader'}
                                ],
                                margin: [0, 0, 0, 10],
                            },
                            {
                                stack: [
                                    {text: 'Job Address', style: 'headerTitle'},
                                    {text: `${jobSiteAddress.name ?? ' '}${jobSiteAddress.street ?? ' '}`, style: 'ticketHeader'}
                                ],
                                margin: [0, 0, 0, 10],
                            },
                            {
                                stack: [
                                    {text: 'Contact Details', style: 'headerTitle'},
                                    {text:  customerContact?.name ?? ' ', style: 'ticketHeader'},
                                    {text:  customerContact?.phone ?? ' ', style: 'ticketHeader'},
                                    {text:  customerContact?.email ?? ' ', style: 'ticketHeader'}
                                ],
                                margin: [0, 0, 0, 10],
                            },
                            {}
                        ]
                    ]
                },
                fillColor: '#F9FDFF',
                layout: {
                    ...Layouts.noBorders,
                    hLineColor: (i: number, node: any) => {
                        return '#D0D3DC';
                    },
                    hLineWidth: (i: number, node: any) => {
                        return 1;
                    }
                },
            },
            {
                // BODY LINE
                table,
                layout: {
                    ...Layouts.custom,
                    paddingLeft: (i: number, node: any) => {
                        return 1;
                    },
                    paddingRight: (i: number, node: any) => {
                        return 1;
                    },
                    paddingTop: (i: number, node: any) => {
                        return 5;
                    },
                    paddingBottom: (i: number, node: any) => {
                        return 5;
                    },
                },
            },
            {
                // PO Request SUBTOTAL TOTAL AMOUNTDUE
                table: {
                    widths: [308, 148, 110, 20],
                    body: [
                        [
                            {},
                            {text: 'Total:', style: 'itemListRight', border: [false, false, false, true]},
                            {
                                text: `${helper.delimiterEnUs(totalCharge)}`,
                                style: 'itemListRight',
                                border: [false, false, false, true]
                            },
                            {}
                        ],
                        [
                            {text: '', border: [false, false, false, true]},
                            {text: 'AMOUNT DUE:', style: 'amountDueTitle', border: [false, false, false, true]},
                            {
                                text: `${helper.delimiterEnUs(totalCharge)}`,
                                style: 'amountDue',
                                border: [false, false, false, true]
                            },
                            {text: '', border: [false, false, false, true]}
                        ]
                    ]
                },
                layout: {
                    ...Layouts.noBorders,
                    hLineColor: (i: number, node: any) => {
                        return '#D0D3DC';
                    },
                    hLineWidth: (i: number, node: any) => {
                        return 1;
                    },
                    paddingLeft: (i: number, node: any) => {
                        return 1;
                    },
                    paddingRight: (i: number, node: any) => {
                        return 1;
                    },
                    paddingTop: (i: number, node: any) => {
                        return 5;
                    },
                    paddingBottom: (i: number, node: any) => {
                        return 5;
                    },
                },
            },
            {
                // HEADER SECOND LINE: CUSTOMER  INFORMATION
                table: {
                    widths: [10,"*",10],
                    body: [
                        [{},{text: 'Note:', style: "noteFont"},{}],
                        [{},{text: ticket.note, style: "ticketHeaderBold"},{}],
                    ],
                },
                layout: {
                    ...Layouts.noBorders,
                    hLineColor: (i: number, node: any) => {
                        return '#D0D3DC';
                    },
                    hLineWidth: (i: number, node: any) => {
                        return 1;
                    }
                },
            }
        ],
        footer: (currentPage: number, pageCount: number) => {
            return [{
                table: {
                    widths: [20, 68,10,395, 20],
                    body: [
                        [
                            {},
                            {
                                text: `Powered by BlueClerk`,
                                style: 'smallFontGray',
                                alignment: 'left',
                                margin: [0, 10]
                            },
                            {
                                image: blueclerkLogo,
                                width: 10,
                                alignment: 'left',
                                margin: [0, 8, 0, 0],
                            },
                            {
                                text: `Page ${currentPage} of ${pageCount}`,
                                style: 'smallFontGray',
                                alignment: 'right',
                                margin: [0, 10]
                            },
                            {}
                        ],
                    ],
                },
                fillColor: '#F9FDFF',
                layout: {...Layouts.noBorders},
            }]
        },
        styles: Styles.PORequest,
        defaultStyle: {
            columnGap: 10,
            font: 'Roboto',
        },
        images: {
            companyLogo: companyLogoFilePath,
            blueclerkLogo: blueclerkLogo
        },
    };

    const fullPath = `${PO_REQUEST_PATH}/${ticket.ticketId}.pdf`;
    // Check if folder path exist, create if not
    if (!fs.existsSync(PO_REQUEST_PATH)) {
        fs.mkdirSync(PO_REQUEST_PATH);
    }
    // Check if existing PORequest PDF exist, remove if any
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
    }

    const pdfDoc = pdfMake.createPdfKitDocument(docDefinition);
    const writeStream = fs.createWriteStream(fullPath);
    pdfDoc.pipe(writeStream);
    pdfDoc.end();

    return await new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
            if (company.info?.logoUrl) {
                fs.unlink(companyLogoFilePath, (err) => {
                    if (err) console.log(`Error in deleting temporary company logo image file "${companyLogoFilePath}" : ${err}`);
                })
            }
            resolve('');
        })
            .on('error', (error) => {
                reject('Error in _generatePORequestPdf: ' + error);
            });
    });
}