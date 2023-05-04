import { Request, Response } from 'express';
import { WorkType } from '../models/WorkType';
import { Status } from '../common/constants';
import { Company, ICompany } from '../models/Company';
import { CompanyAdmin } from '../models/CompanyAdmin';
import { CompanyLocation, ICompanyLocation } from '../models/CompanyLocation';
import { AssignedVendor, IAssignedVendor } from '../models/AssignedVendor';
import { checkIfDuplicateExists, removeDuplicate } from '../utils/arrayUtil';
import { Employee } from '../models/Employee';
import { AssignedEmployee, IAssignedEmployee } from '../models/AssignedEmployee';


export const getCompanyLocations = async (req: Request, res: Response) => {
    try {
        const company = <ICompany>req.company;

        const companyLocations = await CompanyLocation.find({ company })
            .populate('workTypes')
            .populate('assignedEmployees.employee')
            .populate('assignedEmployees.workTypes')
            .populate('assignedVendors.vendor')
            .populate('assignedVendors.workTypes');

        return res.json({ status: Status.Success, companyLocations });
    } catch (error) {
        return res.json({ status: Status.Error, message: error.message});
    }
}

export const getCompanyLocationById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const companyLocation = await CompanyLocation.findById(id)
            .populate('workTypes')
            .populate('assignedVendors.workTypes');

        return res.json({ status: Status.Success, companyLocation });
    } catch (error) {
        return res.json({ status: Status.Error, message: error.message});
    }
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

        await validateAndParseWorkTypesParam(params);
        await validateAndParseAssignedVendorsParam(params);
        await validateAndParseAssignedEmployeesParam(params);

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
                workTypes: params.workTypes,
                assignedVendors: params.assignedVendors,
                assignedEmployees: params.assignedEmployees
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

        await validateAndParseWorkTypesParam(params);
        await validateAndParseAssignedVendorsParam(params);
        await validateAndParseAssignedEmployeesParam(params);

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

        companyLocation.workTypes = params.workTypes;
        if(params.assignedVendors) companyLocation.assignedVendors = params.assignedVendors;
        if(params.assignedEmployees) companyLocation.assignedEmployees = params.assignedEmployees;

        await companyLocation.save();

        const newCompanyLocation = await CompanyLocation.findOne({ _id: params.companyLocationId, company })
        .populate('workTypes')
        .populate('assignedEmployees.employee')
        .populate('assignedEmployees.workTypes')
        .populate('assignedVendors.vendor')
        .populate('assignedVendors.workTypes');

        return res.json({ status: Status.Success, message: 'Company Location updated successfully', "companyLocation": newCompanyLocation });
    } catch (error) {
        return res.json({ status: Status.Error, message: error.message });
    }
}

/**
 * To manage the employees or vendors who are assigned to a specific company location
 */

export const updateCompanyLocationAssignments = async (req: Request, res: Response) => {
    try {
        const params = req.body;
        const company = <ICompany>req.company;

        
        let data: {[key: string]: any} = {};
        if(params.assignedVendors) {
            await validateAndParseAssignedVendorsParam(params);
            data["assignedVendors"] = params.assignedVendors;
        }

        if(params.assignedEmployees) {
            await validateAndParseAssignedEmployeesParam(params);
            data["assignedEmployees"] = params.assignedEmployees;
        }
        
        await CompanyLocation.updateOne({ _id: params.companyLocationId, company }, data);

        const newCompanyLocation = await CompanyLocation.findOne({ _id: params.companyLocationId, company })
        .populate('workTypes')
        .populate('assignedEmployees.employee')
        .populate('assignedEmployees.workTypes')
        .populate('assignedVendors.vendor')
        .populate('assignedVendors.workTypes');

        return res.json({ status: Status.Success, message: 'Company Location updated successfully', "companyLocation": newCompanyLocation });
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

const validateAndParseWorkTypesParam = async (params: any) => {
    // For handling request from swagger which uses application/x-www-form-urlencoded content type
    if (typeof params.workTypes === 'string') {
        params.workTypes = params.workTypes.split(',');
    }

    params.workTypes = removeDuplicate(params.workTypes);

    for (const workTypeId of (params.workTypes || [])) {
        if (!await WorkType.findById(workTypeId)) {
            throw new Error("Invalid Company Location Work Type ID: " + workTypeId);
        }
    }
}

const validateAndParseAssignedVendorsParam = async (params: any) => {
    // For handling request from swagger which uses application/x-www-form-urlencoded content type
    if (typeof params.assignedVendors === 'string') {
        params.assignedVendors = JSON.parse("["+params.assignedVendors+"]");
    }

    if (params.assignedVendors) {
        const vendorIds = params.assignedVendors.map((e: any) => e.vendorId);
        if (checkIfDuplicateExists(vendorIds)) {
            throw new Error("Duplicate Vendor ID found");
        }
    }

    const assignedVendors: IAssignedVendor[] = [];

    for (const assignedVendor of (params.assignedVendors || [])) {
        if (!await Company.findById(assignedVendor.vendorId)) {
            throw new Error("Invalid Assigned Vendor ID: " + assignedVendor.vendorId);
        }

        if (params.workTypes && params.workTypes.length > 0) {
            assignedVendor.workTypes = removeDuplicate(assignedVendor.workTypes);

            for (const workTypeId of (assignedVendor.workTypes || [])) {
                if (!await WorkType.findById(workTypeId)) {
                    throw new Error("Invalid Assigned Vendor Work Type ID: " + workTypeId);
                }

                if (params.workTypes.indexOf(workTypeId) === -1) {
                    throw new Error(`Work Type ID ${workTypeId} doesn't match Company Location Work Type IDs`);
                }
            }
        } else {
            if (assignedVendor.workTypes && assignedVendor.workTypes.length > 0) {
                throw new Error(`Can't set Work Type for Vendor with ID ${assignedVendor.vendorId} - Company Location doesn't have Work Types`);
            }
        }

        assignedVendors.push(new AssignedVendor(
            {
                vendor: assignedVendor.vendorId,
                workTypes: assignedVendor.workTypes
            }));
    }

    params.assignedVendors = assignedVendors;
}

const validateAndParseAssignedEmployeesParam = async (params: any) => {
    // For handling request from swagger which uses application/x-www-form-urlencoded content type
    if (typeof params.assignedEmployees === 'string') {
        params.assignedEmployees = JSON.parse("["+params.assignedEmployees+"]");
    }

    if (params.assignedEmployees) {
        const employeeIds = params.assignedEmployees.map((e: any) => e.employeeId);
        if (checkIfDuplicateExists(employeeIds)) {
            throw new Error("Duplicate Emplyee ID found");
        }
    }

    const assignedEmployees: IAssignedEmployee[] = [];

    for (const assignedEmployee of (params.assignedEmployees || [])) {

        if (!await Employee.findById(assignedEmployee.employeeId)) {
            throw new Error("Invalid Assigned Employee ID: " + assignedEmployee.employeeId);
        }

        if (params.workTypes && params.workTypes.length > 0) {
            assignedEmployee.workTypes = removeDuplicate(assignedEmployee.workTypes);

            for (const workTypeId of (assignedEmployee.workTypes || [])) {
                if (!await WorkType.findById(workTypeId)) {
                    throw new Error("Invalid Assigned Emplyee Work Type ID: " + workTypeId);
                }

                if (params.workTypes.indexOf(workTypeId) === -1) {
                    throw new Error(`Work Type ID ${workTypeId} doesn't match Company Location Work Type IDs`);
                }
            }
        } else {
            if (assignedEmployee.workTypes && assignedEmployee.workTypes.length > 0) {
                throw new Error(`Can't set Work Type for Emplyee with ID ${assignedEmployee.employeeId} - Company Location doesn't have Work Types`);
            }
        }
        
        assignedEmployees.push(new AssignedEmployee(
            {
                employee: assignedEmployee.employeeId,
                workTypes: assignedEmployee.workTypes
            }));
    }

    params.assignedEmployees = assignedEmployees;
}
