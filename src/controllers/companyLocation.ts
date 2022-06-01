import { Request, Response } from 'express';
import { Status } from '../common/constants';
import { ICompany } from '../models/Company';
import { CompanyAdmin } from '../models/CompanyAdmin';
import { CompanyLocation, ICompanyLocation } from '../models/CompanyLocation';


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

/**
 * To manage company main location when Company Profile updated,
 * if company already have a main location, update it based on the latest Company Profile,
 * if not, create new main location for the company
 */
export const _manageCompanyMainLocation = async (company: ICompany): Promise<ICompanyLocation> => {

    let mainLocation = await CompanyLocation.findOne({ company, isActive: true, isMainLocation: true }).sort({ _id: -1 });

    if (!mainLocation) {
        // No main location found, create a new one
        const companyAdmin = await CompanyAdmin.findById(company.admin);

        mainLocation = new CompanyLocation(
            {
                name: 'Main HQ',
                isMainLocation: true,
                info: {
                    companyEmail: companyAdmin?.auth?.email,
                    logoUrl: company.info?.logoUrl
                },
                address: {
                    street: company.address?.street,
                    city: company.address?.city,
                    state: company.address?.state,
                    zipCode: company.address?.zipCode
                },
                contact: {
                    phone: company.contact?.phone,
                    fax: company.contact?.fax
                },
                contactName: companyAdmin?.profile?.displayName,
                company
            }
        );
    } else {
        // Main locatin found, update existing
        mainLocation.info.logoUrl = company.info?.logoUrl;
        mainLocation.address = {
            street: company.address?.street,
            city: company.address?.city,
            state: company.address?.state,
            zipCode: company.address?.zipCode
        };
        mainLocation.contact = {
            phone: company.contact?.phone,
            fax: company.contact?.fax
        }
    }

    await mainLocation.save();

    return mainLocation;

}
