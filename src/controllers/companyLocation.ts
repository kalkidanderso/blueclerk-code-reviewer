import { Request, Response, NextFunction } from 'express';
import { Status } from '../common/constants';
import { ICompany } from '../models/Company';
import { CompanyLocation } from '../models/CompanyLocation';


export const getCompanyLocations = async (req: Request, res: Response) => {

    const company = <ICompany>req.company;

    const companyLocations = await CompanyLocation.find({ company });

    return res.json({ status: Status.Success, companyLocations });

}

export const getCompanyLocationDetail = (req: Request, res: Response) => {
// upcoming
}

export const createCompanyLocation = async (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;

    const companyLocation = new CompanyLocation(
        {
            name: params.name,
            isMainLocation: params.isMainLocation,
            info: {
                companyEmail: params.email,
                logoUrl: params.logoUrl,
            },
            address: {
                street: params.street,
                unit: params.unit,
                city: params.city,
                state: params.state,
                zipCode: params.zipCode
            },
            contact: {
                phone: params.phone,
                fax: params.fax
            },
            contactName: params.contactName,
            company
        }
    );

    await companyLocation.save();

    return res.json({ status: Status.Success, companyLocation });

}

export const updateCompanyLocation = async (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;

    const companyLocation = await CompanyLocation.findOne({ _id: params.companyLocationId, company });

    if (!companyLocation) {
        return res.json({ status: Status.Error, message: 'Company Location is not found' });
    }

    companyLocation.name = params.name;
    companyLocation.isMainLocation = params.isMainLocation ?? companyLocation.isMainLocation;

    companyLocation.info = companyLocation.info ?? {};
    companyLocation.info.companyEmail = params.email;
    companyLocation.info.logoUrl = params.logoUrl;

    companyLocation.address = companyLocation.address ?? {};
    companyLocation.address.street = params.street;
    companyLocation.address.unit = params.unit;
    companyLocation.address.city = params.city;
    companyLocation.address.state = params.state;
    companyLocation.address.zipCode = params.zipCode;

    companyLocation.contact = companyLocation.contact ?? {};
    companyLocation.contact.phone = params.phone;
    companyLocation.contact.fax = params.fax;
    companyLocation.contactName = params.contactName;

    await companyLocation.save();

    return res.json({ status: Status.Success, message: 'Company Location updated successfully', companyLocation });

}
