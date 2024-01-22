import { Request, Response, NextFunction } from 'express';
import { Messages, Status } from '../common/constants';
import { ICompany, Company } from '../models/Company';
import { IUser, User } from '../models/User';
import { ICompanyAdmin } from '../models/CompanyAdmin';

export const getTechnicianContractor = () => {

    return async (req: Request, res: Response, next: NextFunction) => {

        const employeeType = req.body.employeeType ?? req.query.employeeType;
        const technicianId = req.body.technicianId ?? req.query.technicianId;
        const contractorId = req.body.contractorId ?? req.query.contractorId;

        let technician: IUser, contractor: ICompany;

        if (!employeeType) {
            return res.json({ status: Status.Error, message: `params employeeType: ${Messages.Required}` });
        }

        if (employeeType == 0) {
            if (!technicianId) {
                return res.json({ status: Status.Error, message: 'technicianId must be provided when employeeType is employee (0)' });
            }

            technician = await User.findById(technicianId);

            if (!technician) {
                return res.json({ status: Status.Error, message: 'Technician not found' });
            }

            req.technician = technician;
        }

        if (employeeType == 1) {
            if (!contractorId) {
                return res.json({ status: Status.Error, message: 'contractorId must be provided when employeeType is contractor (1)' });
            }

            contractor = await Company.findById(contractorId).populate('admin');

            if (!contractor) {
                return res.json({ status: Status.Error, message: 'Contractor not found' });
            }

            req.contractor = contractor;
            req.technician = <ICompanyAdmin>contractor.admin;
        }

        return next();
    };

};