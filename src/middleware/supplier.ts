import { Request, Response, NextFunction } from 'express';
import { Messages, Role, Status } from '../common/constants';
import { ISupplierAdmin } from '../models/CompanyAdmin';
import { Supplier } from '../models/Supplier';

/**
 * To check and retrieve the supplier information from the logged in user,
 * and save them to req object
 */
export const getSupplierId = () => {

    return async (req: Request, res: Response, next: NextFunction) => {

        const user = <ISupplierAdmin>req.user;

        if (user.permissions.role !== Role.SUPPLIER_ADMIN) {
            return res.json({ status: Status.Error, message: Messages.UnAuthorized });
        }

        const supplier = await Supplier.findById(user.supplier);

        if (!supplier) {
            return res.json({ status: Status.Error, message: 'Unable to find your supplier. Please contact BlueClerk admin for more information.' });
        }

        req.supplier = supplier;
        req.supplierId = supplier._id;

        next();
    };

};
