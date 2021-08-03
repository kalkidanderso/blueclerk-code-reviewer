import { Request, Response } from 'express';
import { Status } from '../common/constants';
import { IUser } from '../models/User';
import { ICompany } from '../models/Company';
import { IPaymentTerm, DefaultPaymentTerms, PaymentTerm } from '../models/PaymentTerm';

export const _createDefaultPaymentTerms = async (company: ICompany): Promise<void> => {

    const paymentTerms = await PaymentTerm.find({
        company: company._id,
        isActive: true
    });
    
    const paymentTermEntries: IPaymentTerm[] = [];
    for (const term of DefaultPaymentTerms) {
        const { name, dueDays } = term;

        if (!paymentTerms.find(t => t.name === term.name)) {
            paymentTermEntries.push(new PaymentTerm({
                name,
                dueDays,
                company: company._id,
                createdBy: company.admin
            }))
        }
    }

    if (paymentTermEntries.length > 0) {
        await PaymentTerm.create(paymentTermEntries);
    }

    return;

}

export const getPaymentTerms = async (req: Request, res: Response) => {

    const company = <ICompany>req.company;

    await _createDefaultPaymentTerms(company);

    const paymentTerms = await PaymentTerm.find({
        company: company._id,
        isActive: true
    })
        .sort({ name: 1 })
        .populate({ path: 'createdBy', select: 'profile' });

    return res.json({ status: Status.Success, message: 'ok', paymentTerms });

}

export const createPaymentTerm = async (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    const paymentTerm = new PaymentTerm({
        name: params.name,
        dueDays: params.dueDays,
        company: company._id,
        createdBy: user._id
    });

    await paymentTerm.save();

    return res.json({ status: Status.Success, message: 'Payment Term successfully created', paymentTerm });

}

export const updatePaymentTerm = async (req: Request, res: Response) => {

    const params = req.body;
    const { name, dueDays, isActive } = params;
    const company = <ICompany>req.company;

    const paymentTerm = await PaymentTerm.findOne({
        _id: params.paymentTermId,
        company: company._id
    });

    if (!paymentTerm) {
        return res.json({ status: Status.Error, message: 'Payment Term not found' });
    }

    paymentTerm.name = name ?? paymentTerm.name;
    paymentTerm.dueDays = dueDays ?? paymentTerm.dueDays;
    paymentTerm.isActive = isActive ?? paymentTerm.isActive;
    await paymentTerm.save();

    return res.json({ status: Status.Success, message: 'Payment Term updated successfully.', paymentTerm });

}

export const deletePaymentTerm = async (req: Request, res: Response) => {

    const params = req.query;
    const company = <ICompany>req.company;

    const paymentTerm = await PaymentTerm.findOne({
        _id: params.paymentTermId,
        company: company._id
    });

    if (!paymentTerm) {
        return res.json({ status: Status.Error, message: 'Payment Term not found.' });
    }

    await PaymentTerm.deleteOne({ _id: paymentTerm._id });

    return res.json({ status: Status.Success, message: 'Payment Term successfully deleted.' });

}
