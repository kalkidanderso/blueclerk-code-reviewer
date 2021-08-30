import { Request, Response } from 'express';
import { Status } from '../common/constants';

import { ICompany } from '../models/Company';
import { IUser } from '../models/User';
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
 * =====[ PRIVATE METHODS BELOW ]=====
 * ===================================
 */

const _createCompanyDefaultEmail = async (company: ICompany): Promise<void> => {

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
