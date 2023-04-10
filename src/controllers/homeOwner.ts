import { Request, Response } from 'express';
import * as helper from '../services/helper';
import { Status } from '../common/constants';
import { HomeOwner } from '../models/HomeOwner';
import { Company } from '../models/Company';
import { CompanyHomeOwner } from '../models/companyHomeOwner';

/**
 * CREATE NEW HOME OWNER
 */
export const createHomeOwner = async (req: Request, res: Response) => {

    const params = req.body;
    const imagesUrl: string[] = [];
    let companyId;

    // Check for email and phone, one of them should be provided
    if (!params.email && !params.phone) {
        return res.json({ status: Status.Error, message: 'Either one of email or phone should be provided' });
    }

    // Handle the uploaded 'image' file
    if (req.files) {
        // Parse the uploaded image file
        const paramsImageFile = JSON.parse(JSON.stringify(req.files));
        // Push image location from req.files to imagesUrl
        paramsImageFile?.image?.forEach((image: any) => imagesUrl.push(image.location));
    }

    if (params.companyId) {
        const company = await Company.findById(params.companyId);
        if (!company) {
            return res.json({ status: Status.Error, message: 'Company not found' });
        }
        companyId = company._id;
    }

    // Construct the basic Home Owner object
    const homeOwner = new HomeOwner({
        profile: {
            firstName: params.firstName?.trim(),
            lastName: params.lastName?.trim(),
            displayName: `${params.firstName} ${params.lastName}`.trim(),
            imageUrl: imagesUrl?.[0]
        },
        info: {
            email: params.email
        },
        contact: {
            phone: params.phone?.trim(),
            fax: params.fax?.trim()
        },
        address: {
            street: params.addressStreet?.trim(),
            unit: params.addressUnit?.trim(),
            city: params.addressCity?.trim(),
            state: params.addressState?.trim(),
            zipCode: params.addressZipCode?.trim()
        }
    });

    // Input the long lat when provided
    if (params.latitude && params.longitude) {
        homeOwner.location = {
            coordinates: [params.longitude, params.latitude]
        }
    }

    await homeOwner.save();
    if (companyId) {
        await new CompanyHomeOwner({
            company: companyId,
            homeOwner: homeOwner._id
        }).save();
    }

    let resMessage = 'Home Owner created successfully';
    if (!params.addressStreet) {
        resMessage += ' without any address. Subdivision and Job Address are required for this Home Owner to be available';
    }

    return res.json({ status: Status.Success, message: resMessage, homeOwner });

}

/**
 * RETRIEVE MULTIPLE HOME OWNER
 * TODO: Add another params?
 * TODO: Testing & finish
 */
export const getHomeOwners = async (req: Request, res: Response) => {

    const params = req.params;

    let query: any

    if (req.query._id) query = { _id: req.query._id }
    else {

        const keyword = helper.getRegex(params.keyword, 'i');

        query = {
            $or: [
                { 'profile.firstName': keyword },
                { 'profile.lastName': keyword },
                { 'profile.displayName': keyword },
                { 'address.street': keyword },
                { 'address.city': keyword },
            ]
        }
    }

    const homeOwners = await HomeOwner.find(query)
        .populate({
            path: 'jobLocations', select: 'isActive name location address jobSites',
            populate: [{ path: 'jobSites', select: 'isActive name location address' }]
        });

    return res.json({ status: Status.Success, homeOwners });

}
