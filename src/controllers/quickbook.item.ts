import { Request, Response } from 'express'
import { Status, Messages } from '../common/constants'

import { IUser } from '../models/User';
import { ICompany, Company } from '../models/Company'
import { IJobType, JobType } from '../models/JobType'
import { IItem, IQBItem, QBItemTypes, Item } from '../models/Item';
import { _getQbo, _refreshToken } from '../controllers/quickbook';

// ================================
// =======[ QUICKBOOK ITEM ]=======
// ================================

const _getQBItems = async (qbo: any): Promise<IQBItem[]> => {

    return new Promise((resolve, reject) => {
        qbo.findItems({}, (err: any, data: any) => {
            if (err) {
                reject({
                    status: Status.Error,
                    message: err.Fault?.Error[0]?.Message
                        || err.fault?.error[0]?.detail
                        || err.fault?.error[0]?.message
                        || Messages.GenericError
                });
            }

            resolve(<IQBItem[]>data?.QueryResponse?.Item);
        })
    })

}

/**
* Generic function to create QuickBooks Item,
* this used by Job Type Controller when creating new Job Type & Item,
* and this controller when syncing items
*/
export const _createQBItem = async (req: Request, res: Response, company: ICompany, item: IItem, next: (error: number, errorMessage: string, qbItem: IQBItem) => void) => {

    // Always refresh the token first because token valid only for 60 minutes
    _refreshToken(req, res, company, async (err, errMsg, company) => {
        if (err === 0) {
            return res.json({ status: Status.Error, message: errMsg });
        }

        if (err === 400) {
            await Company.findByIdAndUpdate(req.company._id, {
                qbAuthorized: false,
                qbAccessToken: undefined,
                qbRefreshToken: undefined
            });

            return next(Status.QBUnauthorized, Messages.QBUnAuthorized, null);
        }

        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        // Construct QB Item Entry
        const qbItemEntry: IQBItem = {
            Name: item.name,
            Description: item.description,
            Sku: item.sku,
            Type: QBItemTypes.SERVICE,
            UnitPrice: item.charges,
            Active: item.isActive,
            SalesTaxIncluded: false,
            IncomeAccountRef: { name: 'Sales of Product Income', value: '79' },
            MetaData: { CreateTime: new Date(), LastUpdatedTime: new Date() }
        };

        // Create QB Item
        qbo.createItem(qbItemEntry, async (err: any, qbItem: IQBItem) => {
            if (err) {
                return next(
                    Status.Error,
                    err.Fault?.Error[0]?.Message
                    || err.fault?.error[0]?.detail
                    || err.fault?.error[0]?.message
                    || Messages.GenericError,
                    null
                );
            }

            return next(null, null, qbItem);
        })
    });

}

/**
* To syncing items on DB and items on QB
*/
export const syncQBItems = async (req: Request, res: Response) => {

    const user = <IUser>req.user;
    const jobTypesToCreate: IJobType[] = [];
    const itemsToCreate: IItem[] = [];
    const createdItems: { _id: string, name: string }[] = [];
    const updatedItems: { _id: string, name: string }[] = [];

    // Always refresh the token first because token valid only for 60 minutes
    _refreshToken(req, res, req.company, async (err, errMsg, company) => {
        if (err === 0)
            return res.json({ status: Status.Error, message: errMsg });

        if (err === 400) {
            await Company.findByIdAndUpdate(req.company._id, {
                qbAuthorized: false,
                qbAccessToken: undefined,
                qbRefreshToken: undefined
            });

            return res.json({ status: Status.QBUnauthorized, message: Messages.QBUnAuthorized });
        }

        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        // Retrieve all items of this company from Database
        const items = await Item.find({ company: company._id });

        // Retrieve all items of this company from QuickBooks
        qbo.findItems({}, async (err: any, data: any) => {
            if (err) {
                return res.json({
                    status: Status.Error,
                    message: err.Fault?.Error[0]?.Message
                        || err.fault?.error[0]?.detail
                        || err.fault?.error[0]?.message
                        || Messages.GenericError
                })
            }

            const qbItems: IQBItem[] = data?.QueryResponse?.Item;

            // Iterate all items from DB
            for (const item of items) {
                // Check if there any item on DB that not on QB yet
                const existQBItem = qbItems?.find((qbItem: IQBItem) => qbItem.Name?.toLowerCase() === item.name.toLowerCase());

                // Item not exist on QB, create it
                if (!existQBItem) {
                    _createQBItem(req, res, company, item, (err, errMsg, qbItem) => {
                        if (qbItem) {
                            // QB Item created, update DB Item & JobType's quickbookId
                            Item.findByIdAndUpdate(item, { quickbookId: qbItem.Id }).exec();
                            JobType.findByIdAndUpdate(item.jobType, { quickbookId: qbItem.Id }).exec();
                        }
                    })
                } else {
                    if (item.quickbookId !== existQBItem.Id) {
                        // QB Item exist, update DB Item & JobType's quickbookId directly
                        Item.findByIdAndUpdate(item, { quickbookId: existQBItem.Id }).exec();
                        JobType.findByIdAndUpdate(item.jobType, { quickbookId: existQBItem.Id }).exec();

                        updatedItems.push({ _id: item._id, name: item.name });
                    }
                }
            }

            // Iterate all QuickBooks items
            for (const qbItem of qbItems) {
                // Check if there any item on QB that not on DB yet
                let item = items.find(item => item.name?.toLowerCase() === qbItem.Name?.toLowerCase());

                if (item) {
                    // Item found, check and update quickbookId
                    if (item.quickbookId !== qbItem.Id) {
                        Item.findByIdAndUpdate(item, { quickbookId: qbItem.Id }).exec();
                        JobType.findByIdAndUpdate(item.jobType, { quickbookId: qbItem.Id }).exec();

                        updatedItems.push({ _id: item._id, name: item.name });
                    }
                } else {
                    // Item not found, find any similar Job Type
                    let jobType = await JobType.findOne({
                        title: { $regex: new RegExp(`^${qbItem.Name}$`, 'i') },
                        createdBy: user._id
                    });

                    // Job Type not found, create it
                    if (!jobType) {
                        // Collect all Job Types in array first
                        const jobType = new JobType({
                            title: qbItem.Name,
                            description: qbItem.Description,
                            sku: qbItem.Sku,
                            createdBy: company._id,
                            quickbookId: qbItem.Id
                        });
                        jobTypesToCreate.push(jobType);
                        // jobTypesToCreate.push(new JobType({
                        //     title: qbItem.Name,
                        //     description: qbItem.Description,
                        //     sku: qbItem.Sku,
                        //     createdBy: company._id,
                        //     quickbookId: qbItem.Id
                        // }));

                        // Collect all Items in array first
                        itemsToCreate.push(new Item({
                            name: jobType.title,
                            description: jobType.description,
                            sku: jobType.sku,
                            charges: qbItem.UnitPrice,
                            tiers: [...company.itemTier?.list],
                            company: company._id,
                            jobType: jobType._id,
                            quickbookId: jobType.quickbookId,
                        }))
                    }
                }
            }

            // Iterate array Job Types to be created
            if (jobTypesToCreate.length > 0) {
                // Create all Job Types in array at once
                const jobTypesCreated = await JobType.create(jobTypesToCreate);

                // // Iterate all created Job Types
                // for (const jobType of jobTypesCreated) {
                //     // Collect all Items in array first
                //     itemsToCreate.push(new Item({
                //         name: jobType.title,
                //         description: jobType.description,
                //         sku: jobType.sku,
                //         tiers: [...company.itemTier?.list],
                //         company: company._id,
                //         jobType: jobType._id,
                //         quickbookId: jobType.quickbookId,
                //     }))
                // }

                // Create all Items in array at once
                const itemsCreated = await Item.create(itemsToCreate);

                // Iterate all created Items as the response information
                if (itemsCreated.length > 0) {
                    for (const item of itemsCreated) {
                        createdItems.push({ _id: item._id, name: item.name });
                    }
                }
            }

            company.qbSync.itemsSynced = true;
            company.qbSync.itemsSyncedAt = new Date();
            company.save();

            return res.json({ status: Status.Success, message: 'Item synced successfully.', createdItems, updatedItems });
        })
    })

}

export const _transferQBItems = async (req: Request, res: Response, company: ICompany, unusedItems: IItem[], currentItem: IItem, next: (error: number, errorMessage: string) => void) => {
    // Always refresh the token first because token valid only for 60 minutes
    _refreshToken(req, res, company, async (err, errMsg, company) => {
        if (err === 0) {
            return res.json({ status: Status.Error, message: errMsg });
        }

        if (err === 400) {
            await Company.findByIdAndUpdate(req.company._id, {
                qbAuthorized: false,
                qbAccessToken: undefined,
                qbRefreshToken: undefined
            });

            // return next(Status.QBUnauthorized, Messages.QBUnAuthorized);
            return res.json({ status: Status.Error, message: Messages.QBUnAuthorized });
        }

        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        qbo.getItem(currentItem.quickbookId, async (err: any, currentQBItem: IQBItem) => {
            // Make sure the merged base item Active
            currentQBItem.Active = true;

            qbo.updateItem(currentQBItem, async (err: any, qbItem: IQBItem) => {

                if (currentQBItem) {
                    for (const unusedItem of unusedItems) {
                        qbo.getItem(unusedItem.quickbookId, async (err: any, unusedQBItem: IQBItem) => {

                            if (unusedQBItem?.Active) {
                                unusedQBItem.Description = currentItem.description;
                                unusedQBItem.FullyQualifiedName = currentItem.name;
                                unusedQBItem.Name = currentItem.name;
                                unusedQBItem.Taxable = currentItem.tax === 0 ? false : !false;
                                unusedQBItem.Sku = currentItem.sku;

                                qbo.updateItem(unusedQBItem, async (err: any, qbItem: IQBItem) => {
                                    if (err) {
                                        throw new Error(
                                            err.Fault?.Error[0]?.Detail
                                            || err.Fault?.Error[0]?.Message
                                            || err.fault?.error[0]?.detail
                                            || err.fault?.error[0]?.message
                                            || Messages.GenericError
                                        )
                                    }
                                })
                            }
                        });
                    }
                }

                return next(null, null)
            })

        })
    })
}

export const _updateQBItem = async (req: Request, res: Response, company: ICompany, item: IItem, next: (error: number, errorMessage: string) => void) => {
    _refreshToken(req, res, company, async (err, errMsg, company) => {
        if (err === 0) {
            return res.json({ status: Status.Error, message: errMsg });
        }

        if (err === 400) {
            await Company.findByIdAndUpdate(req.company._id, {
                qbAuthorized: false,
                qbAccessToken: undefined,
                qbRefreshToken: undefined
            });
            return res.json({ status: Status.QBUnauthorized, message: Messages.QBUnAuthorized });
        }

        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        qbo.getItem(item.quickbookId, async (err: any, qbItem: IQBItem) => {

            qbItem.Description = item.description;
            qbItem.FullyQualifiedName = item.name;
            qbItem.Name = item.name;
            qbItem.Taxable = item.tax === 0 ? false : !false;
            qbItem.Sku = item.sku;

            qbo.updateItem(qbItem, async (err: any, updatedQbItem: IQBItem) => {
                if (err || !updatedQbItem) {
                    throw new Error(
                        err.Fault?.Error[0]?.Detail
                        || err.Fault?.Error[0]?.Message
                        || err.fault?.error[0]?.detail
                        || err.fault?.error[0]?.message
                        || Messages.GenericError
                    );
                }

                return next(null, null);
            })
        });
    });
}

export const _updateQBItemsStatus = async (company: ICompany, items: IItem[], isActive: boolean) => {
    const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

    for (const item of items) {
        if (item?.quickbookId) {
            qbo.getItem(item.quickbookId, async (err: any, qbItem: IQBItem) => {
                if (qbItem) {
                    qbItem.Active = isActive

                    qbo.updateItem(qbItem, async (err: any, updatedQBItem: IQBItem) => {
                        if (err || !updatedQBItem) {
                            throw new Error(
                                err.Fault?.Error[0]?.Detail
                                || err.Fault?.Error[0]?.Message
                                || err.fault?.error[0]?.detail
                                || err.fault?.error[0]?.message
                                || Messages.GenericError
                            );
                        }
                    })
                }
            })
        }
    }

    return;
}