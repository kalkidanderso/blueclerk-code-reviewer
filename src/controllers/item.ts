import { Request, Response, NextFunction } from 'express';
import { Messages, Status } from '../common/constants';

import { IUser } from '../models/User';
import { ICompany } from '../models/Company';
import { ICustomer, Customer } from '../models/Customer';
import { IItem, IQBItem, Item } from '../models/Item';
import { DiscountItem } from '../models/DiscountItem';
import { _createQBItem, _updateQBItem } from '../controllers/quickbook.item';

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

    try {
        // Check if customer already have discount item for that quantity of items
        ({ customer, custDiscountPrice } = await _checkCustomerDiscountItem(params, company, customer, custDiscountPrice));
    } catch (err) {
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
    )
    await item.save();

    try {
        // Check and fill Customer's discount prices list
        await _saveCustomerDiscountItem(params, customer, custDiscountPrice, item);
    } catch (err) {
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

}

export const updateDiscountItem = async (req: Request, res: Response, next: NextFunction) => {

    const params = req.body;
    const company = <ICompany>req.company;

    let customer, custDiscountPrice;
    const item = await DiscountItem.findOne({ _id: params.discountItemId, isActive: true, company: company._id });

    if (!item) {
        return res.json({ status: Status.Error, message: 'Discount Item not found' });
    }

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
            return res.json({ status: Status.Error, message: err.message || Messages.GenericError });
        }
    } else {
        customer = await Customer.findOne({ _id: params.customerId, company }).populate({ path: 'discountPrices.discountItem' });
        custDiscountPrice = customer?.discountPrices?.find((discountPrice) => discountPrice.quantity === Number(params.noOfItems));
    }

    item.name = params.title || item.name;
    item.description = params.description;
    item.tax = params.tax ?? 0;
    item.charges = params.charges ?? 0;
    item.customer = customer?._id;
    item.noOfItems = params.noOfItems;

    await item.save();

    try {
        // Check and fill Customer's discount prices list
        await _saveCustomerDiscountItem(params, customer, custDiscountPrice, item);
    } catch (err) {
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

}

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
        throw new Error(error.message);
    }

    return;

}

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
    customer = await Customer.findOne({ _id: params.customerId, company }).populate({ path: 'discountPrices.discountItem' });
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

}
