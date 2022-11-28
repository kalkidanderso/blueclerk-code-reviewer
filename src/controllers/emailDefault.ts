import { Request, Response } from 'express';
import moment from 'moment';
import * as helper from '../services/helper';
import { Status } from '../common/constants';

import { ICompany } from '../models/Company';
import { IUser } from '../models/User';
import { ICustomer } from '../models/Customer';
import { IInvoice } from '../models/Invoice';
import { IEmailDefault, DefaultEmailTemplate, DefaultInvoicesEmailTemplate, EmailDefault, EmailTypes, DefaultIncomeReportEmailTemplate, DefaultARReportEmailTemplate } from '../models/EmailDefault';
import { IJob } from 'src/models/Job';
import { IContact } from 'src/common/contact';


export const getCompanyEmailDefault = async (req: Request, res: Response) => {

    const company = <ICompany>req.company;

    // Check and create default email template of the company
    await _createCompanyDefaultEmail(company, req.query.emailType);

    const emailDefault = await EmailDefault.findOne({ company, emailType: req.query.emailType ?? EmailTypes.INVOICE });

    return res.json({ status: Status.Success, emailDefault });

}

export const updateCompanyEmailDefault = async (req: Request, res: Response) => {

    const params = req.body;
    const { subject, message } = params;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    // Check and create default email template of the company
    await _createCompanyDefaultEmail(company, req.body.emailType);

    // const emailDefault = await EmailDefault.findOne({ company, _id: params.emailDefaultId });
    let emailDefault = await EmailDefault.findOne({ company, emailType: params.emailType });

    emailDefault.subject = subject ?? emailDefault.subject;
    emailDefault.message = message ?? emailDefault.message;
    emailDefault.updatedBy = user;
    emailDefault.emailType = params.emailType;
    await emailDefault.save();

    return res.json({ status: Status.Success, message: 'Company Email Default updated successfully.', emailDefault });

}


/**
 * ===================================
 * ======[ UTIL METHODS BELOW ]=======
 * ===================================
 */

/**
 * Transfrom the email default placeholder symbol to fit Javascript Template Literal,
 * '{{' become '${' & '}}' become '}'
 */
export const transformPlaceholders = async (emailDefault: IEmailDefault): Promise<void> => {

    emailDefault.subject = emailDefault?.subject?.replace(/{{/gi, '${')?.replace(/}}/gi, '}');
    emailDefault.message = emailDefault?.message?.replace(/{{/gi, '${')?.replace(/}}/gi, '}');

    emailDefault.message = emailDefault?.message?.replace(/\${small_company_logo}/gi, '{{small_company_logo}}');

    return;

}

/**
 * Get available placeholder values for Invoice email template
 */
export const getPlaceholderValues = async ({
    company,
    invoice,
    invoices,
    customer,
    job,
    dateRange
}: {
    company: ICompany,
    invoice?: IInvoice,
    invoices?: IInvoice[],
    customer?: ICustomer,
    job?: IJob,
    dateRange?: string
}): Promise<any> => {

    // Get invoice and job contact if exist for the recipient
    const invoiceContact = <IContact>invoice?.customerContactId;
    const jobContact = <IContact>job?.customerContactId;

    const company_name = company.info?.companyName ?? '';
    const company_email = company.info?.companyEmail ?? '';
    const customer_name = customer?.profile?.displayName ?? '';
    const customer_email = invoiceContact?.email ?? jobContact?.email ?? customer?.info?.email ?? '';
    const invoice_number = invoice?.invoiceId ?? '';
    const invoice_amount = helper.delimiterEnUs(invoice?.total);
    const invoice_due_date = moment(invoice?.dueDate ?? '').format('MMMM DD, YYYY');
    const date_range = dateRange ?? '';

    let invoice_total_amount = '';
    if (invoices?.length) {
        let invoiceTotalAmount = 0;
        for (const invoice of invoices) {
            invoiceTotalAmount += invoice?.total;
        }
        invoice_total_amount = helper.delimiterEnUs(invoiceTotalAmount);
    }

    return { company_name, company_email, customer_name, customer_email, invoice_number, invoice_amount, invoice_total_amount, invoice_due_date, date_range };

}


/**
 * ===================================
 * =====[ PRIVATE METHODS BELOW ]=====
 * ===================================
 */

export const _createCompanyDefaultEmail = async (company: ICompany, emailType: EmailTypes): Promise<void> => {

    const emailDefault = await EmailDefault.findOne({ company, emailType: emailType ?? EmailTypes.INVOICE });

    if (emailDefault) {
        return;
    }

    switch (emailType) {
        case EmailTypes.INCOME_REPORT:
            await new EmailDefault({
                subject: DefaultIncomeReportEmailTemplate.subject,
                message: DefaultIncomeReportEmailTemplate.message,
                emailType: EmailTypes.INCOME_REPORT,
                company
            }).save();
            break;

        case EmailTypes.ACCOUNT_RECEIVABLE_REPORT:
            await new EmailDefault({
                subject: DefaultARReportEmailTemplate.subject,
                message: DefaultARReportEmailTemplate.message,
                emailType: EmailTypes.ACCOUNT_RECEIVABLE_REPORT,
                company
            }).save();
            break;

        case EmailTypes.INVOICES:
            await new EmailDefault({
                subject: DefaultInvoicesEmailTemplate.subject,
                message: DefaultInvoicesEmailTemplate.message,
                emailType: EmailTypes.INVOICES,
                company
            }).save();
            break;

        case EmailTypes.INVOICE:
        default:
            await new EmailDefault({
                subject: DefaultEmailTemplate.subject,
                message: DefaultEmailTemplate.message,
                emailType: EmailTypes.INVOICE,
                company
            }).save();
            break;
    }

    return;

}
