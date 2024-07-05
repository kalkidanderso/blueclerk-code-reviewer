import { Request, Response } from 'express';
import * as helper from '../services/helper';
import { Status } from '../common/constants';
import { HomeOwner, IHomeOwner } from '../models/HomeOwner';
import { Company } from '../models/Company';
import { CompanyHomeOwner } from '../models/companyHomeOwner';
import { JobSite } from '../models/JobSite';
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

    const jobSite = await JobSite.findById(params.address)
    // Define the customer if there is a jobSite
    if (!jobSite) {
        return res.json({ status: Status.Error, message: 'A valid address/jobsite should be provided' });
    }
    
    // Construct the basic Home Owner object
    const homeOwner = new HomeOwner({
        profile: {
            firstName: params.firstName?.trim(),
            lastName: params.lastName?.trim(),
            displayName: `${params.firstName ?? ''} ${params.lastName ?? ''}`.trim(),
            imageUrl: imagesUrl?.[0]
        },
        info: {
            email: params.email
        },
        contact: {
            phone: params.phone?.trim(),
            fax: params.fax?.trim()
        },
        subdivision: params.subdivision,
        address: params.address,
        customer: jobSite.customerId
    })

    await homeOwner.save();
    if (companyId) {
        await new CompanyHomeOwner({
            company: companyId,
            homeOwner: homeOwner._id
        }).save();
    }

    const resMessage = 'Home Owner created successfully';

    return res.json({ status: Status.Success, message: resMessage, homeOwner });
};

/**
 * RETRIEVE ONE HOME OWNER GIVEN ITS ID
 */
export const getHomeOwner = async (req: Request, res: Response) => {

    const homeOwner = await HomeOwner.findOne({ '_id': req.query.id });
    if(!homeOwner) return res.json({ status: Status.NotFound, message: 'Home Owner not found' });
    
    return res.json({ status: Status.Success, homeOwner });
};

/**
 * RETRIEVES ALL HOME OWNERS, APPLYING A FILTER IF DESIRED
 */
export const getHomeOwners = async(req: Request, res: Response) => {
    const {
        keyword,
        address,
        subdivision,
    } = req.query;

    let query: any = {};

    // Build query depending on provided parameters
    if(subdivision && subdivision.length > 0) {
        query = {
            ...query,
            $and: [
                { 'subdivision': subdivision }
            ]
        };
    }

    if(address && address.length > 0) {
        query['$and'] ?
            query['$and'].push({ 'address': address }) :
            query = {
                ...query,
                $and: [
                    { 'address': address }
                ]
            };
    }

    if(keyword && keyword.length > 0) {
        const keyword = helper.getRegex(req.query.keyword, 'i');
        query = {
            ...query,
            $or: [
                { 'profile.firstName': keyword },
                { 'profile.lastName': keyword },
                { 'contact.phone': keyword },
                { 'info.email': keyword},
                { 'contact.fax': keyword },
            ]
        };
    }

    const homeOwners = await HomeOwner.find(query);

    return res.json({ status: Status.Success, homeOwners });
};

/**
 * DELETE ONE HOME OWNER GIVEN ITS ID
 */
export const deleteHomeOwner = async (req: Request, res: Response) => {

    const homeOwner = await HomeOwner.findOne({ '_id': req.query.id });
    if(!homeOwner) return res.json({ status: Status.NotFound, message: 'Home Owner not found' });
    
    HomeOwner.deleteOne({_id: req.query.id})
        .exec((err: any) => {

            if (err) {
                return res.json({'status': Status.InternalError, 'message': 'Failed deleting home owner'});
            }

            return res.json({'status': Status.OK, 'message': 'Home owner deleted successfully.'});
        });
};

/**
 * UPDATE A EXISTING HOME OWNER
 */
export const updateHomeOwner = async (req: Request, res: Response) => {
    const {
        id,
        firstName,
        lastName,
        email,
        phone,
        fax,
        address,
        subdivision,
    } = req.body;

    const myquery = { '_id': id };
    const homeOwner = await HomeOwner.findOne(myquery);
    if(!homeOwner) return res.json({ status: Status.NotFound, message: 'Home Owner not found' });
    

    // Update displayname if one firstname or lastname changes
    let displayName = homeOwner.profile.displayName;
    if (firstName || lastName) {
        displayName = (
            (firstName ?? homeOwner.profile.firstName) 
            + ' ' 
            + (lastName ?? homeOwner.profile.lastName)
        ).trim();
    }

    // Updates home owner
    HomeOwner.updateOne(myquery, { 
        profile: {
            firstName: firstName?.trim() ?? homeOwner.profile.firstName,
            lastName: lastName?.trim() ?? homeOwner.profile.lastName,
            displayName: displayName,
        },
        info: {
            email: email?.trim() ?? homeOwner.info.email,
        },
        contact: {
            phone: phone?.trim() ?? homeOwner.contact.phone,
            fax: fax?.trim() ?? homeOwner.contact.fax,
        },
        address: address?.trim() ?? homeOwner.address,
        subdivision: subdivision?.trim() ?? homeOwner.subdivision
    }, (err: any, raw: any) => {

        if (err) {
            return res.json({ 'status': Status.Error, 'message': 'Failed updating Home Owner' });
        }

        return res.json({ 'status': Status.OK, 'message': 'Home owner updated successfully' });
    });
};