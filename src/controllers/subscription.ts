import { Request, Response } from 'express';
import { CronJob } from 'cron';
import { ObjectId } from 'mongodb';
import request from 'request';
import moment from 'moment-timezone';

import { Status, Messages, ContractStatus, EmployeeStatus, Role, CompanyType, NotificationTypes, SocketEvents } from '../common/constants';
import { sendAccountDowngradeEmail, sendAccountUpgradeEmail, sendDeclinedOrderEmail } from '../services/aws';
import { chargeSubscription, createStripeInvoice, payStripeInvoice } from '../services/stripe';
import { ICompany, Company } from '../models/Company';
import { Contract } from '../models/Contract';
import { Employee } from '../models/Employee';
import {CompanyInvoice, ICompanyInvoice} from '../models/CompanyInvoice';
import { INotificationContract, NotificationContract } from '../models/NotificationContract';

export const addCompanySubscriptions = (req: Request, res: Response) => {

    const company = <ICompany>req.company
    const params = req.body
/*    if (company.paid == false &&  new Date() > company.chargeDate) {
        return res.json({ 'status': Status.Error, 'message': 'You can\'t buy subscription contact blueclerk admin for details.' })
    }
 */
    if(company.stripeId == undefined || company.stripeId == '') {
        return res.json({status: Status.Error, message: "Company payment method required."})
    }

    const now = new Date();
    const daysRemaining = now.getDate()
    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()
    const daysToCharge = daysInCurrentMonth-daysRemaining + 1

    let amount: number = 0;

    if(params.noOfOfficeAdmins > 0){
        const perday = 30/daysInCurrentMonth
        amount = amount+(params.noOfOfficeAdmins * (perday* daysToCharge))
    }

    if(params.noOfTechnicians > 0){
        const perday = 30/daysInCurrentMonth
        amount = amount+(params.noOfTechnicians * (perday *daysToCharge))
    }

    if(params.noOfManagers > 0){
        const perday = 30/daysInCurrentMonth
        amount = amount+(params.noOfManagers * (perday * daysToCharge))
    }

    if(params.nbOfAdmins > 0){
        const perday = 30/daysInCurrentMonth
        amount = amount+(params.nbOfAdmins * (perday * daysToCharge))
    }
    if (amount == 0) {

        return res.json({ 'status': Status.Error, 'message': "Invalid number of subscriptions."});
    }
    try {
        chargeSubscription( amount , company.stripeId, (status:any, charge:any, tax:any, message: any)=>{
            if(status == 1){
                const noOfTechs: number = company.maxTechnicians + parseInt(params.noOfTechnicians)
                const noOfManagers: number = company.maxManagers + parseInt(params.noOfManagers)
                const noOfOfficeAdmins: number = company.maxOfficeAdmins + parseInt(params.noOfOfficeAdmins)
                const nbOfAdmins: number = company.maxAdmins + parseInt(params.nbOfAdmins)
                // Create Company Invoice
                const companyInvoice: ICompanyInvoice = new CompanyInvoice({
                    technicians: parseInt(params.noOfTechnicians),
                    managers: parseInt(params.noOfManagers),
                    officeAdmins: parseInt(params.noOfOfficeAdmins),
                    admins: parseInt(params.nbOfAdmins),
                    contractors: 0,
                    charges: amount,
                    tax: tax,
                    total: charge.amount_captured/100,
                    company: company._id
                });
                sendAccountUpgradeEmail({
                    to: company.info.companyEmail,
                    amount: charge.amount_captured/100,
                    technicians: parseInt(params.noOfTechnicians),
                    managers: parseInt(params.noOfManagers),
                    officeAdmins: parseInt(params.noOfOfficeAdmins),
                    admins: parseInt(params.nbOfAdmins),
                    contractors: 0
                }).then(async () => {
                    companyInvoice.emailHistory.push({
                        sentTo: company.info.companyEmail
                    });
                    await companyInvoice.save();
                });
                let chargeDate = moment().tz('America/Chicago').add(1, 'month').startOf('month');
                company.updateOne(
                    {
                        maxTechnicians: noOfTechs,
                        maxManagers: noOfManagers,
                        maxOfficeAdmins: noOfOfficeAdmins,
                        maxAdmins: nbOfAdmins,
                        paid: true,
                        plan: CompanyType.SUBSCRIBED,
                        chargeDate: chargeDate,
                        $push: { companyInvoices: companyInvoice._id } ,
                    })
                    .exec((err: any, raw: any)=>{
                        if (err) {
                            return res.json({'status': Status.Error, 'message': err.message})
                        }
                        return res.json({'status': Status.Error, 'message': 'Company subscriptions added successfully!.'})
                    })

            } else {
                return res.json({status: Status.Error, message: message})
            }
        })
    }catch (err) {
        return res.json({'status': Status.Error, 'message': err.message});
    }
}

export const getAllSubscriptions = async (req: Request, res: Response) => {
    const company = <ICompany> req.company;
    const maxVendors = await Contract.countDocuments({company: company._id, status: ContractStatus.ACCEPTED});
    return res.json(
        {'status': Status.Success,
            'technicians': company.maxTechnicians,
            'office admins': company.maxOfficeAdmins,
            'admins': company.maxAdmins,
            'managers': company.maxManagers,
            'contractors': maxVendors
        });
}
export const removeCompanySubscriptions = async (req: Request, res: Response) => {

    const company = <ICompany>req.company
    const params = req.body
    if (company.paid == false && new Date() > company.chargeDate) {
        return res.json({
            'status': Status.Error,
            'message': `Your Company Does Not Have Any Subscription To Cancel!`
        })
    }
    const employeeId = params.employeeId;
    let checkEmployeeRelatedToCompany = await Employee.findOne({
        _id: new ObjectId(employeeId),
        status: EmployeeStatus.ACTIVE
    });
    if (!checkEmployeeRelatedToCompany) {
        return res.json({status: Status.Error, message: "Invalid Employee Id."})
    }
    switch (checkEmployeeRelatedToCompany.permissions.role) {
        case Role.TECHNICIAN: {
            company.maxTechnicians--;
            break;
        }
        case Role.MANAGER: {
            company.maxManagers--;
            break;
        }
        case Role.OFFICE_ADMIN: {
            company.maxOfficeAdmins--;
            break;
        }
        case Role.ADMIN_EMPLOYEE: {
            company.maxAdmins--;
        }
    }
    company.save().then(() => {
        checkEmployeeRelatedToCompany.status = EmployeeStatus.INACTIVE;
        checkEmployeeRelatedToCompany.save();
        return res.json({'status': Status.Error, 'message': 'Employee Subscription Have Been Deleted Successfully.'})
    }).catch((err) => {
        return res.json({'status': Status.Error, 'message': err.message})
    })
}

export const chargeCompanySubscription = (req: Request, res: Response) => {

    Company.find(
        {$or: [{maxManagers: { $gt: 0 }}, {maxOfficeAdmins: { $gt: 0 }}, {maxTechnicians: { $gt: 0 }}, {maxAdmins: { $gt: 0 }}], _id: new ObjectId('6027192facb8e2c885da3b66')  },
        async (err: any, companies: ICompany[])=>{
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
            let responses: any = [];
            for (let index = 0; index < companies.length; index++) {
                const company = companies[index];
                if (!company.stripeId) {
                    // Send an email to add a billing method
                    sendAccountDowngradeEmail({to: company.info.companyEmail});
                    continue;
                }
                let amount: number = 0;

                if(company.maxOfficeAdmins > 0){
                    amount = amount + (company.maxOfficeAdmins * 30)
                }
                if(company.maxManagers > 0){
                    amount = amount + (company.maxManagers * 30)
                }
                if(company.maxTechnicians > 0){
                    amount = amount + (company.maxTechnicians * 30)
                }
                if(company.maxAdmins > 0){
                    amount = amount + (company.maxAdmins * 30)
                }
                const nbOfContractors = await Contract.countDocuments({company: company._id, status: ContractStatus.ACCEPTED});
                if (nbOfContractors > 0) {
                    amount = amount + (nbOfContractors * 3)
                }
                if(amount > 0) {
                    try {
                        chargeSubscription( amount , company.stripeId, async (status:any, charge: any, tax: any, message: any)=>{
                            if(status == 1){
                                // Create Company Invoice
                                const companyInvoice: ICompanyInvoice = new CompanyInvoice({
                                    technicians: company.maxTechnicians,
                                    managers: company.maxManagers,
                                    officeAdmins: company.maxOfficeAdmins,
                                    admins: company.maxAdmins,
                                    contractors: nbOfContractors,
                                    charges: amount,
                                    tax: tax,
                                    total: charge.amount_captured/100,
                                    company: company._id
                                });
                                sendAccountUpgradeEmail({
                                    to: company.info.companyEmail,
                                    amount: charge.amount_captured/100,
                                    technicians: company.maxTechnicians,
                                    managers: company.maxManagers,
                                    officeAdmins: company.maxOfficeAdmins,
                                    admins: company.maxAdmins,
                                    contractors: nbOfContractors
                                }).then(async () => {
                                    companyInvoice.emailHistory.push({
                                        sentTo: company.info.companyEmail
                                    });
                                    await companyInvoice.save();
                                });
                                let companyInvoices = company.companyInvoices ? company.companyInvoices : [];
                                companyInvoices.push(companyInvoice);
                                company.plan = CompanyType.SUBSCRIBED;
                                company.paid = true;
                                company.companyInvoices = companyInvoices;
                                let chargeDate = moment().tz('America/Chicago').add(1, 'month').startOf('month');
                                company.chargeDate = chargeDate.toDate();
                                await company.save();
                                // we need to send an email to the company to let it know that the transaction was successfully done!
                                responses.push({'status': Status.Success, 'company': company.info.companyName, 'message': 'Done.'});

                            }else{
                                let currentDate = new Date();
                                let downgradeDate = moment().tz('Africa/Tunis').add(currentDate.getDate() + 4, 'days').hours(23).minutes(58);
                                new CronJob(downgradeDate, function() {
                                    request('http://localhost:'+process.env.PORT || 3000+'/api/v1/downgradeCompanies', function (response: any) {
                                        console.log(response);
                                    });
                                }, null, true);
                                // We need to send an email to the company to update their payment information
                                sendDeclinedOrderEmail({to: company.info.companyEmail});
                                responses.push({'status': Status.Error,'company': company.info.companyName, 'message': 'Unable to Charge Company: ' + company._id});
                            }
                        })
                    } catch (err) {
                        responses.push({'status': Status.Error, 'message': err.message});
                    }
                }

            }
            return res.json({response: responses});
        });
}

/**
 * Finalize any draft company invoices,
 * this is called by cron job at the end of each day,
 * will create the invoice in STRIPE for any pending invoice items,
 * then will do the automatically payment for the invoice
 */
export const finalizeCompanyInvoices = async (req: Request, res: Response, sio: any) => {

    // Retrieve all draft company invoices
    const companyInvoices = await CompanyInvoice.find({ isDraft: true }).populate({ path: 'company' });

    if (companyInvoices?.length > 0) {
        for (const companyInvoice of companyInvoices) {
            const company = <ICompany>companyInvoice.company;

            try {
                // Create all pending items to a draft invoice in Stripe
                const stripeInvoice = await createStripeInvoice(company.stripeId);

                if (stripeInvoice) {
                    companyInvoice.isDraft = false;
                    companyInvoice.stripeId = stripeInvoice.id;

                    // Paid the draft invoice in Stripe
                    const paidInvoice = await payStripeInvoice(stripeInvoice?.id);

                    if (paidInvoice) {
                        companyInvoice.paid = true;
                        companyInvoice.paidAt = new Date();
                        companyInvoice.stripeHostedInvoiceUrl = paidInvoice.hosted_invoice_url;
                        companyInvoice.stripeInvoicePdf = paidInvoice.invoice_pdf;
                    }

                    await companyInvoice.save();

                    // Update company information
                    company.plan = CompanyType.SUBSCRIBED;
                    company.paid = true;
                    company.chargeDate = moment().tz('America/Chicago').add(1, 'month').startOf('month').toDate();
                    await company.save();

                    // Collect all invoice charge details for the email
                    const chargeDetails = [];
                    for (const data of stripeInvoice.lines?.data) {
                        chargeDetails.push({
                            description: data.description,
                            amount: data.amount / 100
                        });
                    }

                    // TODO: Download stripe invoice and attach it

                    // Send account upgrade and invoice email to company
                    sendAccountUpgradeEmail({
                        to: company.info?.companyEmail,
                        amount: paidInvoice.amount_paid / 100,
                        technicians: companyInvoice.technicians ?? 0,
                        officeAdmins: companyInvoice.officeAdmins ?? 0,
                        admins: companyInvoice.admins ?? 0,
                        managers: companyInvoice.managers ?? 0,
                        contractors: companyInvoice.contractors ?? 0,
                        chargeDetails,
                        stripeHostedInvoiceUrl: companyInvoice.stripeHostedInvoiceUrl,
                        stripeInvoicePdf: companyInvoice.stripeInvoicePdf
                    }).then(async () => {
                        companyInvoice.emailHistory.push({
                            sentTo: company.info?.companyEmail
                        });
                        await companyInvoice.save();
                    });
                }

            } catch (err) {
                let title, body;

                if (err.code === 'missing' && err.param === 'card') {
                    title = 'Payment for company billing failed';
                    body = 'Payment for company billing failed due to a missing card';
                } else if (err.code === 'card_declined') {
                    title = err.message;
                    body = err.body
                }

                // if (title) {
                //     // Construct notification entry to be saved
                //     let notificationEntry: INotificationContract = new NotificationContract({
                //         company: company._id,
                //         notificationType: NotificationTypes.COMPANY_INVOICE_FAILED,
                //         message: {
                //             title,
                //             body
                //         },
                //         metadata: companyInvoice._id
                //     });

                //     // Save the notification with Contrac as the metadata
                //     notificationEntry.save(async (err: any, notification: INotificationContract) => {

                //         // if (err) {
                //         //     return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                //         // }

                //         // TODO: Send notification to sio to company if payment failed
                //         // Send notification message to specific room based on the Company ID
                //         await notification.populate('metadata').execPopulate();
                //         await sio.to(company?._id.toString()).emit(SocketEvents.NOTIFICATION_CENTER, notification);
                //     });

                //     // TODO: Send email to company if payment failed
                // }
            }
        };
    }

    return res.json({ status: Status.Success });

}
