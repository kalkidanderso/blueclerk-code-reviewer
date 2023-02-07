import { Request, Response } from 'express';
import { WorkType } from '../models/WorkType';
import { Status } from '../common/constants';
import { Company, CompanyTypes, ICompany } from '../models/Company';
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
    try {
        const params = req.body;
        const company = <ICompany>req.company;

        if (params.isMainLocation) {
            let existingMainLocation = await CompanyLocation.findOne({ company, isActive: true, isMainLocation: true });
            if (existingMainLocation) {
                return res.json({ status: Status.Error, message: 'Company already have main location', mainLocation: existingMainLocation });
            }
        }

        if (params.assignedVendorId) {
            if (await Company.findOne({$and: [{_id: params.assignedVendorId }, { type: CompanyTypes.CONTRACTOR }]}) == null) {
                return res.json({ status: Status.Error, message: 'Invalid Assigned Vendor ID: ' + params.assignedVendorId});
            }
        }

        // For handling request from swagger which uses application/x-www-form-urlencoded content type
        if (typeof params.workTypes === 'string') {
            params.workTypes = params.workTypes.split(',');
        }

        for (const workTypeId of (params.workTypes || [])) {
            if (await WorkType.findById(workTypeId) == null) {
                return res.json({ status: Status.Error, message: 'Invalid Work Type ID: ' + workTypeId});
            }
        }

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
                company,
                assignedVendor: params.assignedVendorId || null,
                workTypes: params.workTypes
            }
        );

        await companyLocation.save();

        return res.json({ status: Status.Success, companyLocation });
    } catch (error) {
        return res.json({ status: Status.Error, message: error.message });
    }
}

export const updateCompanyLocation = async (req: Request, res: Response) => {
    try {
        const params = req.body;
        const company = <ICompany>req.company;

        const companyLocation = await CompanyLocation.findOne({ _id: params.companyLocationId, company });

        if (!companyLocation) {
            return res.json({ status: Status.Error, message: 'Company Location is not found' });
        }

        if (!companyLocation.isMainLocation && params.isMainLocation) {
            let existingMainLocation = await CompanyLocation.findOne({ company, isActive: true, isMainLocation: true });
            if (existingMainLocation) {
                return res.json({ status: Status.Error, message: 'Company already have main location', mainLocation: existingMainLocation });
            }
        }

        if (params.assignedVendorId) {
            if (await Company.findOne({$and: [{_id: params.assignedVendorId }, { type: CompanyTypes.CONTRACTOR }]}) == null) {
                return res.json({ status: Status.Error, message: 'Invalid Assigned Vendor ID: ' + params.assignedVendorId});
            }
        }

        // For handling request from swagger which uses application/x-www-form-urlencoded content type
        if (typeof params.workTypes === 'string') {
            params.workTypes = params.workTypes.split(',');
        }

        for (const workTypeId of (params.workTypes || [])) {
            if (await WorkType.findById(workTypeId) == null) {
                return res.json({ status: Status.Error, message: 'Invalid Work Type ID: ' + workTypeId});
            }
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

        companyLocation.assignedVendor = params.assignedVendorId || null;
        companyLocation.workTypes = params.workTypes;

        await companyLocation.save();

        return res.json({ status: Status.Success, message: 'Company Location updated successfully', companyLocation });
    } catch (error) {
        return res.json({ status: Status.Error, message: error.message });
    }
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
