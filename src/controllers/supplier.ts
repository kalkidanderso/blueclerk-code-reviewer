import { Request, Response } from 'express';
import { AccountTypes, Messages, Role, Status } from '../common/constants';
import { SupplierAdmin } from '../models/CompanyAdmin';
import { sendEmail } from '../services/aws';
import { Supplier } from '../models/Supplier';
import { login } from '../controllers/user';
import { checkPasswordRegex } from '../services/helper';

export const createSupplier = async (req: Request, res: Response, sio: any) => {

    const params = req.body;

    // Check if password is strong and good
    if (!await checkPasswordRegex(params.password)) {
        return res.json({ status: Status.Error, message: Messages.PasswordNotStrong });
    }

    // Construct and save the new supplier entry
    const supplier = new Supplier({
        info: {
            name: params.supplierName,
            email: params.email,
            logoUrl: ''
        },
        address: {
            street: '',
            unit: '',
            city: '',
            state: '',
            zipCode: ''
        },
        contact: {
            phone: params.phone,
            fax: ''
        }
    });
    await supplier.save();

    // Construct and save the new admin for the supplier
    const supplierAdmin = new SupplierAdmin({
        auth: {
            email: params.email,
            password: params.password
        },
        profile: {
            firstName: params.firstName,
            lastName: params.lastName,
            displayName: `${params.firstName} ${params.lastName}`,
            imageUrl: ''
        },
        accountType: AccountTypes.SUPPLIER,
        address: {
            street: '',
            city: '',
            state: '',
            zipCode: ''
        },
        contact: {
            phone: params.phone,
            fax: ''
        },
        permissions: {
            role: Role.SUPPLIER_ADMIN,
            extra: [],
        },
        supplier: supplier._id
    });
    await supplierAdmin.save();

    // Add the new supplier admin to the supplier object
    supplier.admin = supplierAdmin._id;
    await supplier.save();

    // Send welcome email
    sendEmail({ to: params.email });
    // Proceed to login and return token
    login(req, res, sio);

};