import {Request, Response} from 'express'
import { ObjectId } from 'mongodb'
import { Status, Role, Messages } from '../common/constants'

import { JobType, IJobType, IJobTypes } from '../models/JobType'
import { IUser } from '../models/User'
import { Customer } from '../models/Customer';
import { ICompany } from '../models/Company'
import { Item, IItem, IQBItem } from '../models/Item'
import { _createQBItem } from '../controllers/quickbook.item';

/**
 * To reset Job Type & Item quickbookId,
 * used when /disconnectQB API called
 */
export const _resetItemQB = (company: ICompany): void => {

    JobType.updateMany(
        { createdBy: company._id, quickbookId: { $ne: null } },
        { $set: { quickbookId: null } }
    ).exec();

    Item.updateMany(
        { company: company._id, quickbookId: { $ne: null } },
        { $set: { quickbookId: null } }
    ).exec();

    return;
}

export const createJobType = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user

    var userId: any = null
    var industryId: any = null

    if (user.permissions.role == Role.COMPANY_ADMIN || user.permissions.role == Role.ADMIN_EMPLOYEE) {
        userId = user._id
    }

    if (user.permissions.role != Role.GLOBAL_ADMIN){
        userId = req.companyId
    }

    if(user.permissions.role == Role.GLOBAL_ADMIN) {
        if(params.industryId == undefined || params.industryId == null) {
            return res.json({ status: Status.Error, message: "Industry Id is required"})
        }else{
            industryId = params.industryId
        }
    }
    if (industryId != null && industryId != undefined) {
        JobType.findOne({title: params.title, industry: industryId, createdBy: null}, (err: any, previousJobType: IJobType) =>{
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            if(previousJobType != undefined || previousJobType != null) {
                return res.json({'status': Status.Error, 'message': "Job Type already created for this industry"})
            }

            const jobType = new JobType({
                title: params.title,
                description: params.description,
                sku: params.sku,
                industry: industryId,
                createdBy:  userId
            })

            jobType.save((err: any) => {

                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
                _createItem(req, res, jobType, null, (item, qbItem) => {

                    return res.json({ 'status': Status.Success, 'message': 'Job type created successfully.', jobType, item, quickbookItem: qbItem });
                })


            })
        })
    }else{
        var regex = new RegExp(["^", params.title, "$"].join(""), "i");
        JobType.findOne({title: regex, createdBy: req.companyId}, (err: any, previousJobType: IJobType) =>{
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            if(previousJobType != undefined || previousJobType != null) {
                return res.json({'status': Status.Error, 'message': "Job Type already created"})
            }

            const jobType = new JobType({
                title: params.title,
                description: params.description,
                sku: params.sku,
                industry: industryId,
                createdBy:  userId
            })

            jobType.save((err: any) => {

                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }

                _createItem(req, res, jobType, req.company, (item, qbItem) => {
                    return res.json({ 'status': Status.Success, 'message': 'Job type created successfully.', jobType, item, quickbookItem: qbItem });
                })

            })
        })
    }
}

const _createItem = (req: Request, res: Response, jobType: IJobType, company: ICompany, next: (item: IItem, qbItem: IQBItem) => void) => {

    const params = req.body
    let companyId = company._id;
    const itemTiers = [];

    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }

    // Iterate company itemTier to add to the new Item
    for (const t of company.itemTier.list) {
        itemTiers.push({ tier: t.tier });
    }

    const item = new Item(
        {
            name: params.title,
            description: params.description,
            sku: params.sku,
            tiers: itemTiers,
            company: companyId,
            jobType: jobType._id,
        }
    )

    item.save((err: any) => {
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        if (company.qbAuthorized) {
            // Create new Item in QuickBooks
            _createQBItem(req, res, company, item, async (err: any, errMsg: any, qbItem: IQBItem) => {
                if (err) {
                    return res.json({ status: err, message: errMsg });
                }

                if (qbItem) {
                    jobType.quickbookId = qbItem.Id;
                    await jobType.save();
                    item.quickbookId = qbItem.Id;
                    await item.save();

                    // If company's items already synced, update the synced date
                    if (company.qbSync?.itemsSynced) {
                        company.qbSync.itemsSyncedAt = new Date();
                        await company.save();
                    }
                }

                return next(item, qbItem);
            })
        } else {
            return next(item, null);
        }
    })
}

export const getJobTypes = (req: Request, res: Response) => {

    const user = <IUser>req.user
    var companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    if(user.permissions.role == Role.GLOBAL_ADMIN) {
        JobType.find({},
            (err: any, types: IJobType[])=>{

                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }

                return res.json({'status': Status.Success, 'types': types})

            }
        )

    }else{
        JobType.find(
            { $or: [ {createdBy: null, industry: req.company.info.industry, isActive: true}, {createdBy: req.companyId, isActive: true} ]},
            (err: any, types: IJobType[])=>{

                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }

                return res.json({'status': Status.Success, 'types': types})

            }
        )
    }
}

export const editJobType = (req: Request, res: Response) => {

    const params = req.body

    JobType.findOne({_id: params.jobTypeId}, async (err: any, jobType: IJobType) =>{
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        if(!jobType) {
            return res.json({'status': Status.Error, 'message': "Invalid job Type id"})
        }

        if(!jobType.isActive) {
            return res.json({'status': Status.Error, 'message': "Job type is inactive, activate to edit."})
        }

        jobType.title = params.title;
        jobType.description = params.description;
        jobType.sku = params.sku;
        await jobType.save();

        _updateItem(req, res, jobType, (req: Request, res: Response) => {
            return res.json({ status: Status.Success, message: 'Job type update successfully.', jobType });
        });
    })

}

const _updateItem = (req: Request, res: Response, jobType: IJobType, next: (req: Request, res: Response) => void) => {

    var companyId = req.companyId;

    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    Item.findOne({jobType: jobType._id}, (err: any, item: IItem) => {
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        if(item) {
            item.updateOne({
                name: jobType.title,
                description: jobType.description,
                sku: jobType.sku
            }, (err: any, raw: any) => {
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }

                next(req, res)
                return
            })
        } else {
            const item = new Item(
                {
                    name: jobType.title,
                    description: jobType.description,
                    sku: jobType.sku,
                    company: companyId,
                    jobType: jobType._id,
                }
            )

            item.save((err: any) => {
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
                next(req, res)
                return
            })
        }
    })
}

export const changeJobTypeStatus = (req: Request, res: Response) => {

    const params = req.body

    JobType.findOne({_id: params.jobTypeId}, (err: any, jobType: IJobType) =>{
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        if(jobType == undefined || jobType == null) {
            return res.json({'status': Status.Error, 'message': "Invalid job Type id"})
        }

        jobType.updateOne({isActive: params.status},(err: any, raw: any) => {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            _updateItemStatus(req, res, jobType, params.status, (req: Request, res: Response) => {
                return res.json({'status': Status.Success, 'message': 'Job type status update successfully.'})
            })

        })
    })
}

const _updateItemStatus = (req: Request, res: Response, jobType: IJobType, itemStatus: boolean, next: (req: Request, res: Response) => void) => {

    Item.findOne({jobType: jobType._id}, (err: any, item: IItem) => {
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        if(item != undefined && item != null) {
            item.updateOne({isActive: itemStatus}, (err: any, raw: any) => {
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }

                next(req, res)
                return
            })
        } else {
            return res.json({'status': Status.Error, 'message': 'Item for this job type not found'})
        }
    })
}

export const getAllItems = (req: Request, res: Response) => {

    Item.find(
        { $or: [{ company: null, isActive: true }, { company: req.companyId, isActive: true }] })
        .populate({ path: 'tiers.tier', select: '-companyId -__v' })
        .exec((err: any, items: IItem[]) => {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            return res.json({'status': Status.Success, 'items': items})

        }
    )
}

export const updateItem = (req: Request, res: Response) => {

    const params = req.body
    Item.findOne({_id: params.itemId},
        (err: any, item: IItem)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            if (item == null || item == undefined) {
                return res.json({'status': Status.Error, 'message': 'Invalid item id'})
            }

            item.updateOne({charges: params.charges, tax: params.tax, isFixed: params.isFixed},
            (err: any, raw: any) => {
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }

                return res.json({'status': Status.Success, 'message': 'Item updated successfully'})

            })

        }
    )
}

// To update all items' charges
export const updateItems = async (req: Request, res: Response) => {

    const params = req.body;
    // To save any error itemIds and/or tierIds
    const errorWrongIds = [];
    // To save param items from JSON format
    let items = [];

    if (params.items) {
        try {
            items = JSON.parse(params.items);

            // To handle any over-stringified strings
            if (!Array.isArray(items)) {
                items = JSON.parse(items);
            }
        } catch (err) {
            return res.json({ status: Status.Error, message: 'Items json is invalid' });
        }
    }

    // No item to be updated, return directly
    if (items.length <= 0) {
        return res.json({ status: Status.Success, message: 'No items to be updated' });
    }

    // Iterate all item from param items
    for (const i of items) {
        // No tier object found from param items, go to next item
        if (i.tiers.length <= 0) {
            continue;
        }

        /**
         * Check if itemId is a valid Mongo ObjectId,
         * collect the troubled itemId, go to next item
         */
        if (!ObjectId.isValid(i.itemId)) {
            errorWrongIds.push({ itemId: i.itemId, message: Messages.WrongId });
            continue;
        }

        const itemObj = await Item.findById(i.itemId);
        // Iterate all tiers of item on DB
        for (const paramTier of i.tiers) {
            // Find the tier to be updated
            const itemObjTier = itemObj.tiers.find(itemTier => itemTier.tier.toString() === paramTier.tierId);

            // No tier found, collect the troubled tierId, go to next tier
            if (!itemObjTier) {
                errorWrongIds.push({ itemId: i.itemId, tierId: paramTier.tierId, message: 'Tier not found' });
                continue;
            }

            itemObjTier.charge = paramTier.charge;
        }

        await itemObj.save((err) => {
            if (err)
                return res.json({ status: Status.Success, message: err.message, item: itemObj });
        });
    }

    // Return any error details if any
    if (errorWrongIds.length > 0) {
        return res.json({ status: Status.Success, message: 'Items updated successfully, except these ones', items: errorWrongIds });
    }

    return res.json({ status: Status.Success, message: 'Items updated successfully' });

}

/**
 * To handle params jobTypes that comes on JSON format
 * and check if the job types are valid
 */
export const _handleJobTypesJson = (customerId: string, paramJobTypes: string, jobTypes: IJobTypes[]): Promise<{ jobTypes: IJobTypes[] | any, invalidJobTypes: string[] }> => {

    return new Promise(async (resolve, reject) => {

        let parsedJobTypes: {jobTypeId:string}[];
        let isFixed: boolean;
        const newJobTypes: IJobTypes[] = [];
        const invalidJobTypes: string[] = [];

        if (paramJobTypes) {
            try {
                if (Array.isArray(paramJobTypes)) {
                    // paramJobTypes already in array
                    parsedJobTypes = Array.from(paramJobTypes);
                } else {
                    // Parse the stringified paramJobTypes
                    parsedJobTypes = JSON.parse(paramJobTypes);

                    // To handle any over-stringified strings
                    if (!Array.isArray(parsedJobTypes)) {
                        parsedJobTypes = JSON.parse(parsedJobTypes);
                    }
                }
            } catch (err) {
                reject({ message: 'jobTypes json is invalid' });
            }

            /**
             * Check if the customer uses customPrices or not,
             * then check if the total job types cannot exceed the max quantity
             */
            const customer = await Customer.findById(customerId);
            if (customer.isCustomPrice && parsedJobTypes.length > customer.customPrices.length) {
                reject({ message: `Customer's custom price maximum quantity is ${customer.customPrices.length}. Total job types cannot exceed that maximum quantity.` });
            }

            // Check if params job types has items
            if (parsedJobTypes.length > 0) {
                // Iterate all the params job types
                for (const parsedJobType of parsedJobTypes) {
                    // Check if param job type is a valid Job Type
                    if (ObjectId.isValid(parsedJobType.jobTypeId)) {
                        // Check if all items of jobTypes have the same isFixed
                        const item = await Item.findOne({ jobType: parsedJobType.jobTypeId });
                        if (item) {
                            if (isFixed !== undefined && isFixed !== item.isFixed) {
                                reject({ message: `Can't add an hourly and fixed price item to the same service ticket/job` });
                            }
                            isFixed = item.isFixed;

                            // Check if jobType exist
                            const jobType = await JobType.findById(parsedJobType.jobTypeId);
                            if (jobType) {
                                newJobTypes.push({ jobType: jobType._id });
                                continue;
                            }
                        }
                    }

                    // Collect all invalid job types
                    invalidJobTypes.push(parsedJobType.jobTypeId);
                }

                if (invalidJobTypes.length === parsedJobTypes.length) {
                    reject({ message: `All Jobs are invalid: [${invalidJobTypes}]` });
                }
            }
        }

        // Replace current job types if the new has any
        if (newJobTypes.length > 0) {
            jobTypes = newJobTypes;
        }

        resolve({ jobTypes, invalidJobTypes });

    })
}

export const filterItems = async (req: Request, res: Response) => {
    const params = req.body;
    const companyId = req.companyId;

    const items = await Item.find({
        company: companyId,
        name: {
                $regex: params.keyword
        }
    });

    if (!items.length) {
        return res.json({ 'status': Status.NotFound, messages: `Items with keyword ${params.keyword} not found` });
    }

    items.forEach(item => console.log(item))
    return res.json({
        'status': Status.Success,
        'item': items
    });
}