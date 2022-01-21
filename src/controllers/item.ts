import { Request, Response, NextFunction } from 'express';
import { Status } from '../common/constants';

import { IUser } from '../models/User';
import { ICompany } from '../models/Company';
import { IQBItem, Item } from '../models/Item';
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

export const createDiscountItem = async (req: Request, res: Response, next: NextFunction) => {

    const params = req.body;
    const user = <IUser>req.user;
    const company = <ICompany>req.company;

    const item = new Item(
        {
            name: params.title,
            description: params.description,
            charges: params.charges,
            company: company._id,
            isDiscountItem: true,
            isJobType: false,
        }
    )

    await item.save();

    // Return the HTTP request to user first
    res.json({ status: Status.Success, message: 'Discount Item created successfully.', discountItem: item });

    if (company.qbAuthorized) {
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
        })
    } else {
        return next();
    }

}
