import { Request, Response } from 'express';
import { Status } from '../common/constants';
import { IUser } from '../models/User';
import { ICompany } from '../models/Company';
import { Customer } from '../models/Customer';
import { IPaymentTerm, DefaultPaymentTerms, IQBPaymentTerm, PaymentTerm } from '../models/PaymentTerm';
import { _syncQBDefaultPaymentTerms, _createQBPaymentTerm } from '../controllers/quickbook.paymentTerm';

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
            }));
        }
    }

    if (paymentTermEntries.length > 0) {
        await PaymentTerm.create(paymentTermEntries);
    }

    return;

};

/**
 * To reset Payment Term quickbookId,
 * used when /disconnectQB API called
 */
export const _resetPaymentTermQB = async (company: ICompany): Promise<void> => {

    PaymentTerm.updateMany(
        { company: company._id, quickbookId: { $ne: null } },
        { $set: { quickbookId: null } }
    ).exec();

    return;

};

export const setCompanyDefaultPaymentTerm = async (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;

    const paymentTerm = await PaymentTerm.findOne({
        _id: params.paymentTermId,
        company: company._id,
        isActive: true
    });

    if (!paymentTerm) {
        return res.json({ status: Status.Error, message: 'Payment Term not found or inactive.' });
    }

    company.paymentTerm = paymentTerm._id;
    await company.save();

    return res.json({ status: Status.Success, message: 'Company default Payment Term successfully set.', companyPaymentTerm: paymentTerm });

};

export const setCustomerPaymentTerm = async (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;

    const customer = await Customer.findOne({
        _id: params.customerId
    });

    if (!customer) {
        return res.json({ status: Status.Error, message: 'Customer not found.' });
    }

    const paymentTerm = await PaymentTerm.findOne({
        _id: params.paymentTermId,
        company: company._id,
        isActive: true
    });

    if (!paymentTerm) {
        return res.json({ status: Status.Error, message: 'Payment Term not found or inactive.' });
    }

    customer.paymentTerm = paymentTerm._id;
    await customer.save();

    return res.json({ status: Status.Success, message: 'Customer Payment Term successfully set.', customerPaymentTerm: paymentTerm });

};

export const getPaymentTerms = async (req: Request, res: Response) => {

    const company = <ICompany>req.company;

    // Check and create default payment terms of the company
    await _createDefaultPaymentTerms(company);

    // Check and sync default payments in background
    if (company.qbAuthorized) {
        _syncQBDefaultPaymentTerms(req, res, company);
    }

    const paymentTerms = await PaymentTerm.find({
        company: company._id,
        isActive: true
    })
        .sort({ name: 1 })
        .populate({ path: 'createdBy', select: 'profile' });

    return res.json({ status: Status.Success, paymentTerms });

};

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

    if (company.qbAuthorized) {
        // Create QB Payment Term
        _createQBPaymentTerm(req, res, company, paymentTerm, async (err: any, errMsg: any, qbPaymentTerm: IQBPaymentTerm) => {
            if (err) {
                return res.json({ status: err, message: errMsg });
            }

            if (qbPaymentTerm) {
                // Update quickbookId of our Payment Term
                paymentTerm.quickbookId = qbPaymentTerm.Id;
                await paymentTerm.save();

                // If company's payment terms already synced, update the synced date
                if (company.qbSync?.paymentTermSynced) {
                    company.qbSync.paymentTermSynedAt = new Date();
                    await company.save();
                }

                return res.json({ status: Status.Success, message: 'Payment Term successfully created', paymentTerm, quickbookPaymentTerm: qbPaymentTerm });
            }
        });
    } else {
        return res.json({ status: Status.Success, message: 'Payment Term successfully created', paymentTerm });
    }

};

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

};

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

};
