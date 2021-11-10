import { Request, Response } from 'express';
import moment from 'moment';
import { Status } from '../common/constants';

import { ICompany } from '../models/Company';
import { IUser } from '../models/User';
import { ICustomer } from '../models/Customer';
import { IInvoice } from '../models/Invoice';
import { IEmailDefault, DefaultEmailTemplate, EmailDefault } from '../models/EmailDefault';


export const getCompanyEmailDefault = async (req: Request, res: Response) => {

    const company = <ICompany>req.company;

    // Check and create default email template of the company
    await _createCompanyDefaultEmail(company);

    const emailDefault = await EmailDefault.findOne({ company });

    return res.json({ status: Status.Success, emailDefault });

}

export const updateCompanyEmailDefault = async (req: Request, res: Response) => {

    const params = req.body;
    const { subject, message } = params;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    // Check and create default email template of the company
    await _createCompanyDefaultEmail(company);

    // const emailDefault = await EmailDefault.findOne({ company, _id: params.emailDefaultId });
    let emailDefault = await EmailDefault.findOne({ company });

    emailDefault.subject = subject ?? emailDefault.subject;
    emailDefault.message = message ?? emailDefault.message;
    emailDefault.updatedBy = user;
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

    emailDefault.subject = emailDefault.subject.replace(/{{/gi, '${').replace(/}}/gi, '}');
    emailDefault.message = emailDefault.message.replace(/{{/gi, '${').replace(/}}/gi, '}');

    emailDefault.message = emailDefault.message.replace(/\${small_company_logo}/gi, '{{small_company_logo}}');

    return;

}

/**
 * Get available placeholder values for Invoice email template
 */
export const getPlaceholderValues = async (company: ICompany, invoice: IInvoice, customer: ICustomer): Promise<any> => {

    const company_name = company.info?.companyName ?? '';
    const company_email = company.info?.companyEmail ?? '';
    const customer_name = customer.profile?.displayName ?? '';
    const customer_email = customer.info?.email ?? '';
    const invoice_number = invoice.invoiceId ?? '';
    const invoice_amount = `$${invoice.total ?? ''}`;
    const invoice_due_date = moment(invoice.dueDate ?? '').format('MMMM DD, YYYY');

    return { company_name, company_email, customer_name, customer_email, invoice_number, invoice_amount, invoice_due_date };

}


/**
 * ===================================
 * =====[ PRIVATE METHODS BELOW ]=====
 * ===================================
 */

export const _createCompanyDefaultEmail = async (company: ICompany): Promise<void> => {

    const emailDefault = await EmailDefault.findOne({ company });

    if (emailDefault) {
        return;
    }

    await new EmailDefault({
        subject: DefaultEmailTemplate.subject,
        message: DefaultEmailTemplate.message,
        company
    }).save();

    return;

}
