import { Request, Response, NextFunction } from 'express';
import { Status } from '../common/constants';

import { IUser } from '../models/User';
import { ICompany } from '../models/Company';
import { Customer } from '../models/Customer';
import { IItem, IQBItem, Item } from '../models/Item';
import { DiscountItem } from '../models/DiscountItem';
import { _createQBItem } from '../controllers/quickbook.item';

export const createItem = async (req: Request, res: Response, next: NextFunction) => {

    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;
    const itemTiers = [];

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
            company: company._id,
            isJobType: false
        }
    )

    await item.save();

    // Return the HTTP request to user first
    res.json({ status: Status.Success, message: 'Item created successfully.', item });

    if (company.qbAuthorized) {
        // Create the new Item in QuickBooks
        _createQBItem(req, res, company, item, async (err: any, errMsg: any, qbItem: IQBItem) => {
            if (err) {
                console.log('== createItem > _createQBItem');
                console.log('== errMsg:', errMsg);
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
        })
    } else {
        return next();
    }

}

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

}

export const createDiscountItem = async (req: Request, res: Response, next: NextFunction) => {

    const params = req.body;
    const company = <ICompany>req.company;

    let customer, custDiscountPrice;

    if (params.customerId) {
        if (params.noOfItems == undefined || params.noOfItems == null) {
            return res.json({ status: Status.Error, message: 'Params noOfItems is requireq when customerId is provided' });
        }

        customer = await Customer.findOne({ _id: params.customerId, company }).populate({ path: 'discountPrices.discountItem' });
        if (!customer) {
            return res.json({ status: Status.Error, message: 'Customer not found' });
        }

        // Check if customer already have discount item for that quantity of items
        custDiscountPrice = customer.discountPrices.find((discountPrice) => discountPrice.quantity === Number(params.noOfItems));
        if (custDiscountPrice?.discountItem) {
            const custDiscountItem = <IItem>custDiscountPrice.discountItem;
            if (custDiscountItem.isActive) {
                return res.json({ status: Status.Error, message: `Customer already have discount item for this No. of Items. Please unassign this Discount Item first: ${custDiscountItem.name}`})
            }
        }
    }

    // Construct the new discount item entry
    const item = new DiscountItem(
        {
            name: params.title,
            description: params.description,
            charges: params.charges,
            company: company._id,
            isDiscountItem: true,
            isJobType: false,
            customer: customer._id,
            noOfItems: Number(params.noOfItems)
        }
    )
    await item.save();

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
        res.json({ status: Status.Error, message: error.message });
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

}
