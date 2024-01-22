import { Request, Response, NextFunction } from 'express';
import { Messages, Status } from '../common/constants';
import { ObjectId } from 'mongodb';

import { IUser } from '../models/User';
import { ICompany } from '../models/Company';
import { ICustomer, Customer } from '../models/Customer';
import { JobType, IJobType, IJobTypes } from '../models/JobType';
import { IItem, IQBItem, Item } from '../models/Item';
import { DiscountItem } from '../models/DiscountItem';
import { PriceTier } from '../models/PriceTier';
import { ServiceTicket } from '../models/ServiceTicket';
import { Job } from '../models/Job';
import { JobCharges } from '../models/JobCharges';
import { IInvoice, Invoice } from '../models/Invoice';
import { _createQBItem,_createQBItemWithAccount, _updateQBItem, _updateQBItemsStatus, _transferQBItems } from '../controllers/quickbook.item';
import { _transferQBInvoiceItem } from '../controllers/quickbook.invoice';
import * as Sentry from '@sentry/node';
import { param } from 'express-validator';

// ==========================================
// ==============[ ITEM ]====================
// ==========================================

export const getItems = (req: Request, res: Response) => {

    const params = req.body;
    const query: any = {
        $or: [
            { company: null, isActive: true },
            { company: req.companyId, isActive: true }
        ],
        isActive: true
    };

    if (!params.includeDiscountItems) {
        query.isDiscountItem = { $ne: true };
    }
    if(params.includeInactiveItems){
        delete query.isActive;
        query['$or']?.map((queryItem:any)=>{
            delete queryItem.isActive;
        });
    }
    
    Item.find(query)
        .populate({ path: 'tiers.tier', select: '-companyId -__v' })
        .populate({ path: 'costing.tier', select: '-companyId -__v' })
        .exec((err: any, items: IItem[]) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            return res.json({ 'status': Status.Success, 'items': items });

        });

};

export const createItem = async (req: Request, res: Response, next: NextFunction) => {

    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;
    const itemTiers = [];
    const {account}=params;
    // Iterate company itemTier to add to the new Item
    for (const t of company.itemTier.list) {
        itemTiers.push({ tier: t.tier });
    }
    const isProduct=params.itemType=='Product';
    const item = new Item(
        {
            name: params.title,
            description: params.description,
            sku: params.sku,
            tiers: itemTiers,
            company: company._id,
            isJobType: false,
            itemType:params?.itemType,
            productCost:params.productCost,
            salePrice:params.salePrice,
            isFixed:isProduct?true:params.isFixed,
            IncomeAccountRef:{ name: account?.Name, value: account?.Id }
        }
    );

    await item.save();

    // Return the HTTP request to user first

    if (company.qbAuthorized) {

        if(account?.Id){
        // Create the new Item in QuickBooks
            _createQBItemWithAccount(req, res, company, item,account, async (err: any, errMsg: any, qbItem: IQBItem) => {
                let qbSync=false;
                if (err) {
                    console.log('== createItem > _createQBItem');
                    console.log('== errMsg:', errMsg);
                    return res.json({ status: Status.Error, message: errMsg });
                }

                if (qbItem) {
                    item.quickbookId = qbItem.Id;
                    await item.save();
                    qbSync=true;

                    // If company's items already synced, update the synced date
                    if (company.qbSync?.itemsSynced) {
                        company.qbSync.itemsSyncedAt = new Date();
                        await company.save();
                    }
                }
                res.json({ status: Status.Success, message: 'Item created successfully.', item,qbSync });

                return next();
            });
        }else
    
        {
            _createQBItem(req, res, company, item, async (err: any, errMsg: any, qbItem: IQBItem) => {
                let qbSync=false;
                if (err) {
                    console.log('== createItem > _createQBItem');
                    console.log('== errMsg:', errMsg);
                    return res.json({ status: Status.Error, message: errMsg });
                }

                if (qbItem) {
                    item.quickbookId = qbItem.Id;
                    await item.save();
                    qbSync=true;

                    // If company's items already synced, update the synced date
                    if (company.qbSync?.itemsSynced) {
                        company.qbSync.itemsSyncedAt = new Date();
                        await company.save();
                    }
                }
                res.json({ status: Status.Success, message: 'Item created successfully.', item,qbSync });

                return next();
            });  
        }
        

    } else {
        res.json({ status: Status.Success, message: 'Item created successfully.', item });

        return next();
    }

};
export const disabledItemExists = (req: Request, res: Response) => {
    
    const params = req.body;

    Item.findOne({ name: params.name, company: req.companyId },
        (err: any, item: IItem) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (item == null || item == undefined) {
                return res.json({ 'status': Status.Error, 'message': 'Item does not exist' });
            }
            if(item){
                return res.json({ 'status': Status.Success, 'message': 'Item Exist',item });

            }

        

        }
    );
};

export const toggleItemStatus = (req: Request, res: Response) => {
    
    const params = req.body;
    Item.findOne({ _id: params.itemId },
        (err: any, item: IItem) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (item == null || item == undefined) {
                return res.json({ 'status': Status.Error, 'message': 'Invalid item id' });
            }

            item.updateOne({ isActive:!item.isActive},
                (err: any, raw: any) => {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }

                    return res.json({ 'status': Status.Success, 'message': 'Item status changed successfully', itemStatus:item.isActive });
                });

        }
    );
};

export const updateItem = (req: Request, res: Response) => {
    
    const params = req.body;
    const {account}=params;

    const isProduct=params.itemType=='Product';
    Item.findOne({ _id: params.itemId },
        (err: any, item: IItem) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (item == null || item == undefined) {
                return res.json({ 'status': Status.Error, 'message': 'Invalid item id' });
            }

            item.updateOne({ charges: params.charges, tax: params.tax, isFixed: isProduct?true:params.isFixed ,itemType:params.itemType,  productCost:params.productCost,salePrice:params.salePrice, 
                IncomeAccountRef:{ name: account?.Name, value: account?.Id }
            },
            (err: any, raw: any) => {
                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                }

                return res.json({ 'status': Status.Success, 'message': 'Item updated successfully' });
            });

        }
    );
};

// To update all items' charges
export const updateItems = async (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;
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
            Sentry.captureException(err);
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
        // if (i.tiers.length <= 0) {
        //     continue;
        // }

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
        if (i.tiers.length) {
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
        }
        if (i.costing.length) {
            for (const productCost of i.costing) {
                // Find the tier to be updated
                itemObj.costing.forEach(itemTier => {
                    if (itemTier.tier.toString() === productCost.tierId) {
                        itemTier.charge = productCost.charge;
                    }
                });
            }
        }

        // Handle item active status
        if (itemObj.isActive !== i.isActive) {
            await _updateQBItemsStatus(company, new Array(itemObj), i.isActive);
        }

        // Handle isJobType status
        const jobType = await _handleItemJobType(itemObj, i, user._id);
        const IncomeAccountRefObj=i.account?{ name: i.account?.Name, value: i.account?.Id } : itemObj.IncomeAccountRef;
        itemObj.name = i.name ?? itemObj.name;
        itemObj.description = i.description;
        itemObj.isJobType = i.isJobType ?? itemObj.isJobType;
        itemObj.isFixed = i.isFixed ?? itemObj.isFixed;
        itemObj.tax = i.tax ?? itemObj.tax;
        itemObj.isActive = i.isActive ?? itemObj.isActive;
        itemObj.jobType = jobType?._id;
        itemObj.productCost=i.productCost ?? itemObj.productCost;
        itemObj.salePrice=i.salePrice ?? itemObj.salePrice;
        itemObj.itemType=i.itemType ?? itemObj.itemType;
        itemObj.IncomeAccountRef=IncomeAccountRefObj;
        

      

        await itemObj.save(async (err) => {
            if (err) {
                return res.json({ status: Status.Success, message: err.message, item: itemObj });
            }
            if (company.qbAuthorized && itemObj.quickbookId) {
                await _updateQBItem(req, res, company, itemObj,  async (err, errMsg) => { });
            }
        });
    }

    // Return any error details if any
    if (errorWrongIds.length > 0) {
        return res.json({ status: Status.Success, message: 'Items updated successfully, except these ones', items: errorWrongIds });
    }

    return res.json({ status: Status.Success, message: 'Items updated successfully' });

};

export const searchDuplicatedItems = async (req: Request, res: Response) => {

    const params = req.body;
    const companyId = req.companyId;

    const items: IItem[] = await Item.find({
        company: companyId,
        name: {
            $regex: params.keyword,
            $options: 'i'
        }
    })
        .populate({ path: 'tiers.tier', select: '-__v -createdAt -updatedAt' })
        .populate({ path: 'jobType', select: '-__v -createdAt -updatedAt' });

    if (!items.length) {
        return res.json({ 'status': Status.Success, message: `Items with keyword "${params.keyword}" not found.` });
    }

    return res.json({ status: Status.Success, items });

};

export const mergeItems = async (req: Request, res: Response) => {
    const params = req.body;
    const errorWrongIds = [];
    const tierObject: any[] = [];
    const company = <ICompany>req.company;
    const unusedIds = params.unusedItemIds?.length ? JSON.parse(params.unusedItemIds) : [];
    // To save param items from JSON format
    let tiers = [];

    if (params.tiers) {
        try {
            tiers = JSON.parse(params.tiers);

            // To handle any over-stringified strings
            if (!Array.isArray(tiers)) {
                tiers = JSON.parse(tiers);
            }
        } catch (err) {
            Sentry.captureException(err);
            return res.json({ status: Status.Error, message: 'Items json is invalid' });
        }
    }

    // Iterate all item from param items
    for (const tier of tiers) {
        /**
         * Check if itemId is a valid Mongo ObjectId,
         * collect the troubled itemId, go to next item
         */
        if (!ObjectId.isValid(tier.tierId)) {
            errorWrongIds.push({ itemId: tier.tierId, message: Messages.WrongId });
            continue;
        }

        const priceTier = await PriceTier.findOne({ _id: tier.tierId }).exec();

        if (!priceTier) {
            return res.json({ status: Status.NotFound, message: 'Price tier not foind' });
        }

        tierObject.push({ tier: tier.tierId, charge: tier.charge });
    }

    Item.findById(params.itemId).exec(async (err: any, item: IItem) => {
        if (err || !item) {
            return res.json({ status: Status.NotFound, message: 'Item Not Found' });
        }

        const isActive = params.isActive === undefined || params.isActive === null
            ? false
            : params.isActive === 'false'
                ? false
                : !!params.isActive;

        const isFixed = params.isFixed === undefined || params.isFixed === null
            ? false
            : params.isFixed === 'false'
                ? false
                : !!params.isFixed;

        const mergeItemEntry: any = {
            isFixed: isFixed ?? item.isFixed,
            charges: params.charges ?? item.charges,
            tax: params.tax ?? item.tax,
            sku: params.sku ?? item.sku,
            isActive: isActive ?? item.isActive,
            name: params.name ?? item.name,
            description: params.description ?? item.description,
            tiers: tierObject ?? item.tiers
        };

        // Handle item without quickbookId
        if (!item.quickbookId) {
            // create item on QB
            await _createQBItem(req, res, company, item, async (err: any, errMsg: any, qbItem: IQBItem) => {
                if (err) {
                    return res.json({ status: err, message: errMsg });
                }

                mergeItemEntry.quickbookId = qbItem.Id;
            });
        }

        // Merge item only
        await item.updateOne(mergeItemEntry).exec();

        // Refresh the updated item data from database
        item = await Item.findById(item._id);

        await Item.find({ _id: { $in: unusedIds } }).exec(async (err: any, unusedItems: IItem[]) => {
            if (company?.qbAuthorized && item.quickbookId) {

                await Invoice.find({ 'items.item': { $in: unusedItems }, quickbookId: { $ne: null } }).exec(async (err: any, unusedInvoiceItems: IInvoice[]) => {
                    for (const unusedInvoiceItem of unusedInvoiceItems) {
                        // Update item on invoice in quickbook
                        await _transferQBInvoiceItem(req, res, company, unusedItems, item, unusedInvoiceItem, async (err, errMsg) => {
                            // Merge update item in quickbook
                            await _updateQBItem(req, res, company, item, async (err, errMsg) => {
                                // Inactive unused item in quickbook
                                await _updateQBItemsStatus(company, unusedItems, false);
                            });
                        });
                    }
                });

                // Update invoice item
                await Invoice.updateMany({ 'items.item': { $in: unusedItems } }, {
                    $set: {
                        'items.$.item': item._id,
                        'items.$.name': item.name,
                        'items.$.description': item.description,
                    }
                }).exec();

                // Handle job type
                for (const unusedItem of unusedItems) {
                    if (unusedItem.jobType) {
                        await JobType.findOne({ _id: unusedItem.jobType }).exec(async (err: any, unusedJobType: IJobType) => {

                            // update all job
                            await Job.updateMany({ 'tasks.jobTypes.jobType': unusedJobType._id }, {
                                $set: { 'tasks.$[].jobTypes.$.jobType': item.jobType }
                            }).exec();

                            // update all service ticket
                            await ServiceTicket.updateMany({ 'tasks.jobType': unusedItem.jobType }, { $set: { 'tasks.$.jobType': item.jobType } }).exec();
                            // update job
                            await JobCharges.updateMany({ jobType: unusedItem.jobType }, { $set: { jobType: item.jobType } }).exec();
                            // await JobType.deleteMany({_id: unusedJobType}).exec()
                        });
                    }
                }

                // await Item.deleteMany({ _id: { $in: unusedIds } }).exec();
                await Item.updateMany({ _id: { $in: unusedIds } }, { $set: { isActive: false } }).exec();
            }

            return res.json({ status: Status.Success, item });
        });
    });
};

// ==========================================
// ============[ DISCOUNT ITEM ]=============
// ==========================================

export const getDiscountItems = async (req: Request, res: Response, next: NextFunction) => {

    const queryParams = req.query;
    const company = <ICompany>req.company;
    let query = {};

    // Check and handle customerId if provided
    if (queryParams.customerId) {
        const customer = await Customer.findById(queryParams.customerId);

        if (!customer) {
            return res.json({ status: Status.Error, message: 'Customer not found' });
        }

        query = { customer: customer._id };
    }

    // Handle query isActive to query
    switch (queryParams.isActive) {
    case 'true':
    case true:
        query = { ...query, isActive: { $ne: false } };
        break;

    case 'false':
    case false:
        query = { ...query, isActive: false };
        break;

    default:
        // Retrieve all discount items, query is good at this point
        break;
    }

    // Retrieve all items with isDiscountItem is true
    const discountItems = await Item.find({
        company: company._id,
        isDiscountItem: true,
        ...query
    })
        .populate({
            path: 'customer',
            select: 'info contactName profile auth.email address'
        });

    return res.json({ status: Status.Success, discountItems });

};

export const createDiscountItem = async (req: Request, res: Response, next: NextFunction) => {

    const params = req.body;
    const company = <ICompany>req.company;

    let customer, custDiscountPrice;

    try {
        // Check if customer already have discount item for that quantity of items
        ({ customer, custDiscountPrice } = await _checkCustomerDiscountItem(params, company, customer, custDiscountPrice));
    } catch (err) {
        Sentry.captureException(err);
        return res.json({ status: Status.Error, message: err.message || Messages.GenericError });
    }

    // Construct the new discount item entry
    const item = new DiscountItem(
        {
            name: params.title,
            description: params.description,
            tax: params.tax ?? 0,
            charges: params.charges,
            company: company._id,
            isDiscountItem: true,
            isJobType: false,
            customer: customer?._id,
            noOfItems: params.noOfItems
        }
    );
    await item.save();

    try {
        // Check and fill Customer's discount prices list
        await _saveCustomerDiscountItem(params, customer, custDiscountPrice, item);
    } catch (err) {
        Sentry.captureException(err);
        return res.json({ status: Status.Error, message: err.message || Messages.GenericError });
    }

    // Return the HTTP request to user first
    res.json({ status: Status.Success, message: 'Discount Item created successfully.', discountItem: item, customer });

    if (!company.qbAuthorized) {
        return next();
    }
    // Create the new Discount Item in QuickBooks
    _createQBItem(req, res, company, item, async (err: any, errMsg: any, qbItem: IQBItem) => {
        if (err) {
            return res.json({ status: Status.Error, message: errMsg });
        }

        if (qbItem) {
            item.quickbookId = qbItem.Id;
            await item.save();

            // If company's items already synced, update the synced date
            if (company.qbSync?.itemsSynced) {
                company.qbSync.itemsSyncedAt = new Date();
                await company.save();
            }
        }

        return next();
    });

};

export const updateDiscountItem = async (req: Request, res: Response, next: NextFunction) => {

    const params = req.body;
    const company = <ICompany>req.company;

    let customer, custDiscountPrice;
    let item = await DiscountItem.findOne({ _id: params.discountItemId, company: company._id });

    if (item) {
        // Discount Item assigned to another specific customer
        if (item.customer?.toString() !== params.customerId?.toString() || item.noOfItems !== params.noOfItems) {
            if (item.customer) {
                const oldCustomer = await Customer.findById(item.customer);
                const oldCustDiscPrice = oldCustomer.discountPrices.find(dp => dp.quantity === item.noOfItems);
                oldCustDiscPrice.discountItem = null;
                await oldCustomer.save();
            }
    
            try {
                // Check if customer already have discount item for that quantity of items
                ({ customer, custDiscountPrice } = await _checkCustomerDiscountItem(params, company, customer, custDiscountPrice));
            } catch (err) {
                Sentry.captureException(err);
                return res.json({ status: Status.Error, message: err.message || Messages.GenericError });
            }
        } else {
            customer = await Customer.findOne({ _id: params.customerId }).populate({ path: 'discountPrices.discountItem' });
            custDiscountPrice = customer?.discountPrices?.find((discountPrice) => discountPrice.quantity === Number(params.noOfItems));
        }
        item.customer = customer?._id;
        item.noOfItems = params.noOfItems;
    } else {
        item = await Item.findOne({ _id: params.discountItemId, company: company._id });
        if (!item) {
            return res.json({ status: Status.Error, message: 'Discount Item not found' });
        }
    }

    item.name = params.title || item.name;
    item.description = params.description;
    item.tax = params.tax ?? 0;
    item.charges = params.charges ?? 0;
    item.isActive = params.isActive ?? true; 

    await item.save();

    try {
        // Check and fill Customer's discount prices list
        await _saveCustomerDiscountItem(params, customer, custDiscountPrice, item);
    } catch (err) {
        Sentry.captureException(err);
        return res.json({ status: Status.Error, message: err.message || Messages.GenericError });
    }

    // Return the HTTP request to user first
    res.json({ status: Status.Success, message: 'Discount Item updated successfully.', discountItem: item, customer });

    if (!company.qbAuthorized) {
        return next();
    }
    // Create the new Discount Item in QuickBooks
    _updateQBItem(req, res, company, item, async (err: any, errMsg: any) => {
        if (err) {
            return res.json({ status: Status.Error, message: errMsg });
        }

        // If company's items already synced, update the synced date
        if (company.qbSync?.itemsSynced) {
            company.qbSync.itemsSyncedAt = new Date();
            await company.save();
        }

        return next();
    });

};

// ==========================================
// ===========[ PRIVATE FUNCTION ]===========
// ==========================================

/**
 * To handle params jobTypes that comes on JSON format
 * and check if the job types are valid
 */
export const _handleJobTypesJson = (customerId: string, paramJobTypes: string, jobTypes: IJobTypes[]): Promise<{ jobTypes: IJobTypes[] | any, invalidJobTypes: string[] }> => {

    return new Promise(async (resolve, reject) => {

        let parsedJobTypes: { jobTypeId: string, quantity: number, price: number, status: number }[];
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
                Sentry.captureException(err);
                reject({ message: 'jobTypes json is invalid' });
            }

            /**
             * Check if the customer uses customPrices or not,
             * then check if the total job types cannot exceed the max quantity
             */
            const customer = await Customer.findById(customerId);
            if (customer?.isCustomPrice && parsedJobTypes.length > customer?.customPrices.length) {
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
                                reject({ message: 'Can\'t add an hourly and fixed price item to the same service ticket/job' });
                            }
                            isFixed = item.isFixed;

                            // Check if jobType exist
                            const jobType = await JobType.findById(parsedJobType.jobTypeId);
                            if (jobType) {
                                newJobTypes.push({ jobType: jobType._id, quantity: parsedJobType.quantity, price: parsedJobType.price, status: parsedJobType.status || 0});
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

    });
};

const _handleItemJobType = async (oldItem: IItem, newItem: IItem, userId: string): Promise<IJobType> => {

    let jobType = await JobType.findById(oldItem.jobType);

    // From isJobType false to isJobType true
    if (!oldItem.isJobType && newItem.isJobType) {
        if (jobType) {
            jobType.isActive = true;
        } else {
            jobType = new JobType({
                title: newItem.name ?? oldItem.name,
                description: newItem.description ?? oldItem.description,
                sku: newItem.sku ?? oldItem.sku,
                createdBy: userId,
                isActive: newItem.isActive ?? oldItem.isActive,
                quickbookId: newItem.quickbookId ?? oldItem.quickbookId
            });
        }

        jobType.save();
    }

    // From isJobType false to isJobType true
    if (oldItem.isJobType && !newItem.isJobType) {
        jobType.isActive = false;
        jobType.save();
    }

    return jobType;
};

/**
 * Configure and save Customer's discount prices
 */
const _saveCustomerDiscountItem = async (params: any, customer: ICustomer, custDiscountPrice: any, item: IItem) => {

    if (!customer) {
        return;
    }

    // Check and fill Customer's discount prices list
    const maxDiscountQty = customer.discountPrices[customer.discountPrices.length - 1]?.quantity ?? 0;

    if (maxDiscountQty < Number(params.noOfItems)) {
        for (let i = maxDiscountQty + 1; i <= Number(params.noOfItems); i++) {
            // Fill any quantity that not assigned to discount item to null
            const discountItem = i === Number(params.noOfItems) ? item : null;

            customer.discountPrices.push({
                quantity: i,
                discountItem
            });
        }
    } else {
        custDiscountPrice.discountItem = item;
    }

    try {
        customer.save();
    } catch (error) {
        Sentry.captureException(error);
        throw new Error(error.message);
    }

    return;

};

/**
 * Check if customer already have discount item for that quantity of items
 */
const _checkCustomerDiscountItem = async (params: any, company: ICompany, customer: ICustomer, custDiscountPrice: any): Promise<{customer: ICustomer, custDiscountPrice: any}> => {

    if (!params.customerId) {
        return { customer, custDiscountPrice };
    }

    if (params.noOfItems == undefined || params.noOfItems == null) {
        throw new Error('Params noOfItems is requireq when customerId is provided');
    }

    // Find customer on the company
    customer = await Customer.findOne({ _id: params.customerId }).populate({ path: 'discountPrices.discountItem' });
    if (!customer) {
        throw new Error('Customer not found');
    }

    // Get the customer discount price for the quantity of item
    custDiscountPrice = customer.discountPrices.find((discountPrice) => discountPrice.quantity === Number(params.noOfItems));
    if (custDiscountPrice?.discountItem) {
        // If existing discount item found, check if discount item active or not
        const custDiscountItem = <IItem>custDiscountPrice.discountItem;
        if (custDiscountItem.isActive) {
            throw new Error(`Customer already have discount item for this No. of Items. Please unassign this Discount Item first: ${custDiscountItem.name}`);
        }
    }

    return { customer, custDiscountPrice };

};
