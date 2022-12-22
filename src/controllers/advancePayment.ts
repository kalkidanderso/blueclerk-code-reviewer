import { Request, Response } from 'express';
import moment from 'moment';
import { Messages, Status } from '../common/constants';
import { AdvancePayment, AdvancePaymentEmployee, AdvancePaymentVendor } from '../models/AdvancePayment';
import { Company, ICompany } from '../models/Company';
import { IUser, User } from '../models/User';

export const createAdvancePaymentContractor = async (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    const advancePaymentEntry = {
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

}

export const getAdvancePaymentsByContractor = async (req: Request, res: Response) => {
    
    let query;
    let voidQuery;
    const params = req.query;
    const company = <ICompany>req.company;
    const startDate = moment(params.startDate).startOf('day').utcOffset(params.offset ?? '', true).utc().format();
    const endDate = moment(params.endDate).endOf('day').utcOffset(params.offset ?? '', true).utc().format();

    if (params.startDate && params.endDate) {
        query = { paidAt: { $gte: startDate, $lte: endDate } }
    }

    switch (params.isActive) {
        case 'active':
            voidQuery = { isVoid: { $ne: true } };
            break;

        case 'void':
            voidQuery = { isVoid: true };
            break;

        default:
            voidQuery = {}
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
                    return res.json({ status: Status.Error, message: error.message ?? Messages.GenericError });
                });;

            return res.json({ status: Status.Success, advancePayments: contractorAdvancePayments });
    
        case 'employee':
            const employeeQuery = { company, employee: params.id, ...query, ...voidQuery };
                const employeeAdvancePayments = await AdvancePaymentEmployee.find(employeeQuery)
                .populate({ path: 'company', select: 'info address contact' })
                .populate({ path: 'employee', select: 'auth.email profile location contact' })
                .populate({ path: 'createdBy', select: 'auth.email profile' })
                .catch((error: any) => {
                    return res.json({ status: Status.Error, message: error.message ?? Messages.GenericError });
                });
            
            return res.json({ status: Status.Success, advancePayments: employeeAdvancePayments });

        default:
            return res.json({ status: Status.Error, message: 'Type not supported. Available Type to be used: vendor or employee.' });
    }

}
