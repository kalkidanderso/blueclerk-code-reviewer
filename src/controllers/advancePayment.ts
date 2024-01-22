import { Request, Response } from 'express';
import moment from 'moment';
import { Messages, Status } from '../common/constants';
import { AdvancePayment, AdvancePaymentEmployee, AdvancePaymentVendor, IAdvancePayment, IAdvancePaymentVendor } from '../models/AdvancePayment';
import { Company, ICompany } from '../models/Company';
import { IUser, User } from '../models/User';
import { _voidPayment } from '../controllers/quickbook.payment';
import * as Sentry from '@sentry/node';

export const createAdvancePaymentContractor = async (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    const advancePaymentEntry:any = {
        company: company._id,
        referenceNumber: params.referenceNumber,
        paidAt: params.paidAt ?? new Date(),
        appliedAt: params.appliedAt ?? new Date(),
        amount: params.amount,
        balance: params.amount,
        paymentType: params.paymentType,
        note: params.note,
        createdBy: user._id
    };

    if (params.companyLocation) {
        advancePaymentEntry['companyLocation'] = params.companyLocation;    
    }

    if (params.workType) {
        advancePaymentEntry['workType'] = params.workType;
    }

    switch (params.type) {
    case 'vendor':
        // Check if vendor exist
        const contractor = await Company.findById(params.id).exec();
        if (!contractor) {
            return res.json({ status: Status.Error, message: 'Vendor not found' });
        }

        // Save the Advance Payment Vendor entry
        const advancePaymentVendor = await new AdvancePaymentVendor({
            contractor,
            ...advancePaymentEntry
        }).save();

        contractor.credit += params.amount;
        await contractor.save();

        // Record advance payment for vendor is done, finish the request
        return res.json({ status: Status.Success, message: 'Advance Payment successfully created.', advancePayment: advancePaymentVendor });

    case 'employee':
        // CHeck if employee exist
        const employee = await User.findById(params.id).exec();
        if (!employee) {
            return res.json({ status: Status.Error, message: 'Employee not found' });
        }

        // Save the Advance Payment Employee entry
        const advancePaymentEmployee = await new AdvancePaymentEmployee({
            employee,
            ...advancePaymentEntry
        }).save();

        employee.credit += params.amount;
        await employee.save();

        // Record advance payment for employee is done, finish the request
        return res.json({ status: Status.Success, message: 'Payment successfully created.', advancePayment: advancePaymentEmployee });

    default:
        return res.json({ status: Status.Error, message: 'Type not supported. Available Type to be used: vendor or employee.' });
    }

};

export const getAdvancePaymentsByContractor = async (req: Request, res: Response) => {
    
    let query;
    let voidQuery;
    const params = req.query;
    const company = <ICompany>req.company;
    const startDate = moment(params.startDate).startOf('day').utcOffset(params.offset ?? '', true).utc().format();
    const endDate = moment(params.endDate).endOf('day').utcOffset(params.offset ?? '', true).utc().format();

    if (params.startDate && params.endDate) {
        query = { paidAt: { $gte: startDate, $lte: endDate } };
    }

    switch (params.isActive) {
    case 'active':
        voidQuery = { isVoid: { $ne: true } };
        break;

    case 'void':
        voidQuery = { isVoid: true };
        break;

    default:
        voidQuery = {};
        break;
    }

    switch (params.type) {
    case 'vendor':
        const vendorQuery = { company: company._id, contractor: params.id, ...query, ...voidQuery };
        const contractorAdvancePayments = await AdvancePaymentVendor.find(vendorQuery)
            .populate({ path: 'company', select: 'info address contact' })
            .populate({ path: 'contractor', select: 'info address contact' })
            .populate({ path: 'createdBy', select: 'auth.email profile' })
            .catch((error: any) => {
                Sentry.captureException(error);
                return res.json({ status: Status.Error, message: error.message ?? Messages.GenericError });
            });

        return res.json({ status: Status.Success, advancePayments: contractorAdvancePayments });
    
    case 'employee':
        const employeeQuery = { company, employee: params.id, ...query, ...voidQuery };
        const employeeAdvancePayments = await AdvancePaymentEmployee.find(employeeQuery)
            .populate({ path: 'company', select: 'info address contact' })
            .populate({ path: 'employee', select: 'auth.email profile location contact' })
            .populate({ path: 'createdBy', select: 'auth.email profile' })
            .catch((error: any) => {
                Sentry.captureException(error);
                return res.json({ status: Status.Error, message: error.message ?? Messages.GenericError });
            });
            
        return res.json({ status: Status.Success, advancePayments: employeeAdvancePayments });

    default:
        return res.json({ status: Status.Error, message: 'Type not supported. Available Type to be used: vendor or employee.' });
    }

};

export const updateAdvancePaymentContractor = async (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;
    const user = <IUser>req.user;
    let advancePayment: IAdvancePayment;

    switch (params.type) {
    case 'vendor':
        const contractor = await Company.findById(params.id);
        if (!contractor) {
            return res.json({ status: Status.Error, message: 'Vendor not found.' });
        }

        advancePayment = await AdvancePaymentVendor.findOne({
            _id: params.advancePaymentId,
            contractor: contractor._id,
            company: company._id
        });

        if (!advancePayment) {
            return res.json({ status: Status.Error, message: 'Advance Payment not found or does not belong to the contractor.' });
        }
        break;

    case 'employee':
        const employee = await User.findById(params.id);
        if (!employee) {
            return res.json({ status: Status.Error, message: 'Employee not found.' });
        }

        advancePayment = await AdvancePaymentEmployee.findOne({
            _id: params.advancePaymentId,
            employee: employee._id,
            company: company._id
        });

        if (!advancePayment) {
            return res.json({ status: Status.Error, message: 'Advance Payment not found or does not belong to the employee.' });
        }
        break;

    default:
        return res.json({ status: Status.Error, message: 'Type not supported. Available Type to be used: vendor or employee.' });
    }

    if (advancePayment.isVoid) {
        return res.json({ status: Status.Error, message: 'Advance Payment already voided' });
    }

    // TODO: to handle if balance goes negative
    advancePayment.balance += params.amount - advancePayment.amount;
    advancePayment.amount = params.amount ?? advancePayment.amount;
    advancePayment.referenceNumber = params.referenceNumber ?? advancePayment.referenceNumber;
    advancePayment.paymentType = params.paymentType ?? advancePayment.paymentType;
    advancePayment.paidAt = params.paidAt ? new Date(moment(params.paidAt).format('YYYY-MM-DD')) : advancePayment.paidAt;
    advancePayment.appliedAt = params.appliedAt ?? advancePayment.appliedAt;
    advancePayment.note = params.note ?? advancePayment.note;
    advancePayment.updatedBy = user;
    advancePayment.save();

    return res.json({ status: Status.Success, advancePayment });

};

export const voidAdvancePaymentContractor = async (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;
    let advancePayment: IAdvancePayment;
    let advancePaymentVendor: IAdvancePaymentVendor;
    const user = <IUser>req.user;

    switch (params.type) {
    case 'vendor':
        advancePayment = await AdvancePayment.findOne({ _id: params.advancePaymentId, company, __t: 'AdvancePaymentVendor' }).exec();
        advancePaymentVendor = <IAdvancePaymentVendor>advancePayment;

        if (!advancePayment) {
            return res.json({ status: Status.Error, message: 'Advance Payment not found or does not belong to the contractor.' });
        }
        break;

    case 'employee':
        advancePayment = await AdvancePayment.findOne({ _id: params.advancePaymentId, company, __t: 'AdvancePaymentEmployee' }).exec();

        if (!advancePayment) {
            return res.json({ status: Status.Error, message: 'Advance Payment not found or does not belong to the employee.' });
        }
        break;

    default:
        return res.json({ status: Status.Error, message: 'Type not supported. Available Type to be used: vendor or employee.' });
    }

    if (advancePayment.isVoid) {
        return res.json({ status: Status.Error, message: 'Advance Payment already voided' });
    }

    // TODO: Check if advance payment used
    if (advancePayment.balance < advancePayment.amount) {
        return res.json({ status: Status.Error, message: 'Advance Payment is already used, cannot void it.' });
    }

    advancePayment.isVoid = true;
    advancePayment.voidedAt = new Date();
    advancePayment.voidedBy = user;
    advancePayment.updatedBy = user;
    await advancePayment.save();

    // TODO: handle any changes on payment or invoice commission?

    return res.json({ status: Status.Success, message: 'Advance Payment void successfully', advancePayment });

};
