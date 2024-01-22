import { Messages, Status } from '../common/constants';
import { Request, Response } from 'express';
import { IUser } from '../models/User';
import { Company, ICompany } from '../models/Company';
import { IJobType, JobType } from '../models/JobType';
import { IItem, IQBItem, Item, QBItemTypes } from '../models/Item';
import { _getQbo, _refreshToken } from './quickbook';

const Sentry = require('@sentry/node');

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
        });
    });

};

/**
 * Generic function to create QuickBooks Item,
 * this used by Job Type Controller when creating new Job Type & Item,
 * and this controller when syncing items
 */
export const _createQBItemWithAccount = async (req: Request, res: Response, company: ICompany, item: IItem,account:any, next: (error: number, errorMessage: string, qbItem: IQBItem) => void) => {

    // Always refresh the token first because token valid only for 60 minutes
    _refreshToken(req, res, company, async (err, errMsg, company) => {
        if(err){
            console.log('refresh token');
            console.log('errMsg',err);
        }
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
            Type: item.itemType == 'Product' ? QBItemTypes.NONINVENTORY : QBItemTypes.SERVICE,
            UnitPrice: item.charges,
            Active: item.isActive,
            SalesTaxIncluded: false,
            IncomeAccountRef: { name: account?.Name, value: account?.Id },
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
        });
    });
};
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
            Type: item.itemType == 'Product' ? QBItemTypes.NONINVENTORY : QBItemTypes.SERVICE,
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
        });
    });
};

/**
 * To syncing item on DB to QB
 */
export const syncQBItem = async (req: Request, res: Response) => {

    const user = <IUser>req.user;
    const { itemId ,account} = req.body;

    const jobTypesToCreate: IJobType[] = [];
    const itemsToCreate: IItem[] = [];
    const createdItems: { _id: string, name: string }[] = [];
    const updatedItems: { _id: string, name: string }[] = [];
    const handleClientError = async () => {
        await Company.findByIdAndUpdate(req.company._id, {
            qbAuthorized: false,
            qbAccessToken: undefined,
            qbRefreshToken: undefined
        });

        return res.json({ status: Status.QBUnauthorized, message: Messages.QBUnAuthorized });
    };

    const handleGenericError = async ({ errMsg }: any) => await res.json({ status: Status.Error, message: errMsg });

    const handleErrors = async ({ err, errMsg }: any) => {
        switch (err) {
        case 0:
            await handleGenericError({ errMsg });
            break;
        case 400:
            await handleClientError();
            break;
        default:
      //
        }
    };

    const returnErrorJson = ({ err }: any) => res.json({
        status: Status.Error,
        message: err.Fault?.Error[0]?.Message
      || err.fault?.error[0]?.detail
      || err.fault?.error[0]?.message
      || Messages.GenericError
    });

    // Always refresh the token first because token valid only for 60 minutes
    const syncItems = async (err: number, errMsg: string, company: any) => {
        await handleErrors({ err, errMsg });

        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        // Retrieve all items of this company from Database
        const blueClerkItems = await Item.find({ company: company._id, _id: itemId });
        const blueClerkItem = blueClerkItems[0];

        // Retrieve all items of this company from QuickBooks
        const findQBItems = () => qbo.findItems({ Id: blueClerkItem.quickbookId }, async (err: any, data: any) => {

            if (err) {
                console.log('findQBItems err');
                console.log(err);
                // returnErrorJson({err});
            }

            const qbItems: IQBItem[] = data?.QueryResponse?.Item;
            // Item not exist on QB, create it
            if (!qbItems) {

                // console.log("create qb item");
                if(account?.Id){
                    console.log('create qb item with custom account');
                    await _createQBItemWithAccount(req, res, company, blueClerkItem,account, (error, errMsg, qbItem) => {

                        if (errMsg) {

                            Sentry.captureException('Syncing failed creating', errMsg);
                            return res.json({ status: Status.Error, message: 'Item synced failed.' + errMsg });


                        }

                        if (qbItem) {

                            // QB Item created, update DB Item & JobType's quickbookId
                            Item.findByIdAndUpdate(blueClerkItem, { quickbookId: qbItem.Id }).exec();
                            JobType.findByIdAndUpdate(blueClerkItem.jobType, { quickbookId: qbItem.Id }).exec();
                            return res.json({ status: Status.Success, message: 'Item synced successfully.', createdItems, updatedItems });
                        }
                    });
                }
                else{
                    console.log('create qb item with default account');

                    await _createQBItem(req, res, company, blueClerkItem, (error, errMsg, qbItem) => {

                        if (errMsg) {

                            console.log(errMsg);
                            Sentry.captureException('Syncing failed creating', errMsg);
                            return res.json({ status: Status.Error, message: 'Item synced failed.' + errMsg });


                        }

                        if (qbItem) {
            
                            // QB Item created, update DB Item & JobType's quickbookId
                            Item.findByIdAndUpdate(blueClerkItem, { quickbookId: qbItem.Id }).exec();
                            JobType.findByIdAndUpdate(blueClerkItem.jobType, { quickbookId: qbItem.Id }).exec();
                            return res.json({ status: Status.Success, message: 'Item synced successfully.', createdItems, updatedItems });
                        }
                    });
                }
            } else {

                console.log('update qb item called');
                // QB Item exist, update DB Item in quickbook
                await _updateQBItem(req, res, company, blueClerkItem, async (error, errMsg) => {

                    if (errMsg||error) {
                        console.log(errMsg);

                        Sentry.captureException('Syncing failed updating', errMsg);
                        return res.json({ status: Status.Error, message: 'Item synced failed.' + errMsg });


                    }
                    if (!error && !errMsg) {

                        return res.json({ status: Status.Success, message: 'Item synced successfully.', createdItems, updatedItems });
                    }
                });
            }


        });
        if (blueClerkItem) {
            findQBItems();

        }else{
            return res.json({ status: Status.Error, message: 'Item synced failed.' });

        }
    };

    _refreshToken(req, res, req.company, syncItems);

};
/**
 * To syncing items on DB and items on QB
 */
export const syncQBItems = async (req: Request, res: Response) => {
    const user = <IUser>req.user;
    let jobTypesToCreate: IJobType[] = [];
    let itemsToCreate: IItem[] = [];
    let ProductItemsToCreate: IItem[] = [];
    let createdItems: { _id: string, name: string }[] = [];
    let updatedItems: { _id: string, name: string }[] = [];

    const handleClientError = async () => {
        await Company.findByIdAndUpdate(req.company._id, {
            qbAuthorized: false,
            qbAccessToken: undefined,
            qbRefreshToken: undefined
        });

        return res.json({ status: Status.QBUnauthorized, message: Messages.QBUnAuthorized });
    };

    const handleGenericError = async ({ errMsg }: any) => await res.json({ status: Status.Error, message: errMsg });

    const handleErrors = async ({ err, errMsg }: any) => {
        switch (err) {
        case 0:
            await handleGenericError({ errMsg });
            break;
        case 400:
            await handleClientError();
            break;
        default:
      //
        }
    };

    const returnErrorJson = ({ err }: any) => res.json({
        status: Status.Error,
        message: err.Fault?.Error[0]?.Message
      || err.fault?.error[0]?.detail
      || err.fault?.error[0]?.message
      || Messages.GenericError
    });

    // Always refresh the token first because token valid only for 60 minutes
    const syncItems = async (err: number, errMsg: string, company: any) => {
        await handleErrors({ err, errMsg });

        // Initiate node-quickbooks object with the refreshed company token
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        // Retrieve all items of this company from Database
        const blueClerkItems = await Item.find({ company: company._id });

        // Retrieve all items of this company from QuickBooks
        const findQBItems = () => qbo.findItems({ fetchAll: true }, async (err: any, data: any) => {
            if (err) returnErrorJson({ err });

            const qbItems: IQBItem[] = data?.QueryResponse?.Item;
            console.log('processing BC items');

            // Iterate all items from DB
            blueClerkItems.map((blueClerkItem) => {
                // Check if there any item on DB that not on QB yet
                const existQBItem = qbItems?.find((qbItem: IQBItem) => qbItem.Name?.toLowerCase() === blueClerkItem.name.toLowerCase());

                // Item not exist on QB, create it
                if (!existQBItem) {
                    _createQBItem(req, res, company, blueClerkItem, (err, errMsg, qbItem) => {
                        if (qbItem) {
                            // QB Item created, update DB Item & JobType's quickbookId
                            Item.findByIdAndUpdate(blueClerkItem, { quickbookId: qbItem.Id }).exec();
                            JobType.findByIdAndUpdate(blueClerkItem.jobType, { quickbookId: qbItem.Id }).exec();
                        }
                    });
                } else {
                    // QB Item exist, update DB Item & JobType's quickbookId directly
                    Item.findByIdAndUpdate(blueClerkItem, { quickbookId: existQBItem.Id }).exec();
                    JobType.findByIdAndUpdate(blueClerkItem.jobType, { quickbookId: existQBItem.Id }).exec();
                }
            });

            // console.log("processing QB items",qbItems.length);
      
            // console.log("company",company);
            // console.log("company - ",company.costing.list);
            // let defaultCosting=[];

            // company?.costing?.list.map((costItem:any)=>{
            //   defaultCosting.push({tier:costItem._id})
            // })

            // Iterate all QuickBooks items
            for (let qbIndex=0;qbIndex<qbItems.length;qbIndex++)
            // {

            // }
            // qbItems.map(async qbItem => 
            {

                const qbItem=qbItems[qbIndex];
                const matchedItem = blueClerkItems.find(item => item.name?.toLowerCase() === qbItem.Name?.toLowerCase());

                if (matchedItem) {
                    // Item found, check and update quickbookId
                    await Item.findByIdAndUpdate(matchedItem, { quickbookId: qbItem.Id,IncomeAccountRef:qbItem?.IncomeAccountRef }).exec();
                    await JobType.findByIdAndUpdate(matchedItem.jobType, { quickbookId: qbItem.Id }).exec();

                    const updatedItem = { _id: matchedItem._id, name: matchedItem.name };

                    updatedItems = [
                        ...updatedItems,
                        updatedItem
                    ];
                } else {
         

                    const createNewItem = () => {

                        const newItem = new Item({
                            name: qbItem.Name,
                            description: qbItem.Description,
                            sku: qbItem.Sku,
                            productCost: qbItem.PurchaseCost,
                            tiers: [...company.itemTier?.list],
                            IncomeAccountRef:qbItem?.IncomeAccountRef,
                            company: company._id,
                            itemType: 'Product',
                            quickbookId: qbItem.Id,
                        });

                        ProductItemsToCreate = [
                            ...ProductItemsToCreate,
                            newItem
                        ];
                    };
                    if (qbItem.Type == 'NonInventory') {
                        createNewItem();
                    }
                    else if (qbItem.Type == 'Service') {
                        // Item not found, find any similar Job Type
                        const jobType = await JobType.findOne({
                            title: { $regex: new RegExp(`^${qbItem.Name}$`, 'i') },
                            createdBy: user._id
                        });

                        const createNewJobTypeAndItem = () => {

                            // console.log("creating Job & Item", qbItem);

                            // Collect all Job Types in array first
                            const newJobType = new JobType({
                                title: qbItem.Name,
                                description: qbItem.Description,
                                sku: qbItem.Sku,
                                createdBy: company._id,
                                quickbookId: qbItem.Id
                            });
                            const newItem = new Item({
                                name: qbItem.Name,
                                description: qbItem.Description,
                                sku: qbItem.Sku,
                                charges: qbItem.UnitPrice,
                                IncomeAccountRef:qbItem?.IncomeAccountRef,
                                tiers: [...company.itemTier?.list],
                                company: company._id,
                                itemType: qbItem.Type,
                                costing:company?.costing?.list,
                                // jobType: jobType?._id,
                
                                quickbookId: qbItem.Id,
                            });

                            jobTypesToCreate = [
                                ...jobTypesToCreate,
                                newJobType
                            ];

                            itemsToCreate = [
                                ...itemsToCreate,
                                newItem
                            ];
                        };
                        // Job Type not found, create it
                        if (!jobType) {

                            createNewJobTypeAndItem();

                        }

                    }

                }
            }
            // )


            // Iterate array Job Types to be created
            if (jobTypesToCreate.length) {

                // Create all Job Types in array at once
                const jobTypesCreated = await JobType.create(jobTypesToCreate);

                // Iterate all created Job Types
                const newJobTypes = jobTypesCreated.map(jobType => {
                    const itemExist=itemsToCreate.findIndex(item=>{
           
                        return item.quickbookId==jobType.quickbookId && item.name==jobType.title;});
         
                    if(itemExist>-1){
                        const newItem=itemsToCreate[itemExist];
          
                        // @ts-ignore
                        itemsToCreate[itemExist]={...newItem,jobType:jobType._id,
                        };
                    }
                    // else
                    {
                        const itemExistInQB:any=qbItems.filter(qbItemObj=>qbItemObj.Id==jobType.quickbookId);
                        const newItem = new Item({
                            name: jobType?.title,
                            description: jobType?.description,
                            sku: jobType?.sku,
                            IncomeAccountRef:itemExistInQB[0].IncomeAccountRef,

                            tiers: [...company.itemTier?.list],
                            company: company._id,
                            costing:company?.costing?.list,
                            jobType: jobType?._id,
                            quickbookId: jobType?.quickbookId,
                        });
  
                        itemsToCreate = [
                            ...itemsToCreate,
                            newItem
                        ];
                    }
                });

                await Promise.all([jobTypesCreated, newJobTypes]);

                // Create all Items in array at once

                const itemsCreated = await Item.create(itemsToCreate);

                // Iterate all created Items as the response information
                if (itemsCreated?.length) itemsCreated.map(item => {
                    const newItem = { _id: item._id, name: item.name };
                    createdItems = [
                        ...createdItems,
                        newItem
                    ];
                });
            }


            if (ProductItemsToCreate?.length) {
                const productItemCreated = await Item.create(ProductItemsToCreate);

                // await Promise.all([productItemCreated]);
                // Iterate all created Items as the response information
                if (productItemCreated?.length) productItemCreated.map(item => {
                    const newItem = { _id: item._id, name: item.name };
                    createdItems = [
                        ...createdItems,
                        newItem
                    ];
                });
            }

            company.qbSync.itemsSynced = true;
            company.qbSync.itemsSyncedAt = new Date();

            try {
                await company.save();
                // Sentry.startTransaction({
                //     op: "test",
                //     name: "My First Test Transaction",
                // }).finish();
                return res.json({ status: Status.Success, message: 'Item synced successfully.', createdItems, updatedItems });
            } catch (e) {
                Sentry.captureException('Syncing failed', e);
                return res.json({ status: Status.Error, message: 'Syncing failed' });
            }

        });

        findQBItems();
    };

    _refreshToken(req, res, req.company, syncItems);

};

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
                                        );
                                    }
                                });
                            }
                        });
                    }
                }

                return next(null, null);
            });

        });
    });
};

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

            if (qbItem) {

                qbItem.Description = item.description;
                qbItem.FullyQualifiedName = item.name;
                qbItem.Name = item.name;
                qbItem.Taxable = item.tax === 0 ? false : !false;
                qbItem.Sku = item.sku;
                qbItem.IncomeAccountRef=item.IncomeAccountRef;
                qbItem.Type = item.itemType == 'Product' ? QBItemTypes.NONINVENTORY : QBItemTypes.SERVICE,


                qbo.updateItem(qbItem, async (err: any, updatedQbItem: IQBItem) => {
                    if (err || !updatedQbItem) {
                        const errMsg = err.Fault?.Error[0]?.Detail
                || err.Fault?.Error[0]?.Message
                || err.fault?.error[0]?.detail
                || err.fault?.error[0]?.message
                || Messages.GenericError;
                        return res.json({ status: Status.Error, message: errMsg });
                    }

                    return next(null, null);
                });
            }
            else {
                Sentry.captureException('QB Item not found');

                return res.json({ status: Status.Error, message: 'QB Item not found' });


            }
        });
    });
};

export const _updateQBItemsStatus = async (company: ICompany, items: IItem[], isActive: boolean) => {
    const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

    for (const item of items) {
        if (item?.quickbookId) {
            qbo.getItem(item.quickbookId, async (err: any, qbItem: IQBItem) => {
                if (qbItem) {
                    qbItem.Active = isActive;

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
                    });
                }
            });
        }
    }

    return;
};

export const createBCItem = async (req: Request, res: Response, company: ICompany, qbItemId: string) => {

    _refreshToken(req, res, company, async (err, errMsg, company) => {
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);
        qbo.getItem(qbItemId, async (err: any, qbItem: IQBItem) => {
            if (!qbItem || err) {
                return;
            }

            if (qbItem) {

                const itemTiers = [];

                // Iterate company itemTier to add to the new Item
                for (const t of company.itemTier.list) {
                    itemTiers.push({ tier: t.tier });
                }

                const existItem = await Item.findOne({
                    company: company._id,
                    name: qbItem.Name
                });

                if (!existItem) {
                    const itemEntries: any = {
                        company: company._id,
                        name: qbItem.Name,
                        description: qbItem.Description,
                        sku: qbItem.Sku,
                        isJobType: true,
                        isActive: qbItem.Active,
                        quickbookId: qbItem.Id,
                        charges: qbItem.UnitPrice,
                        tiers: itemTiers
                    };

                    const jobTypeEntry = {
                        title: qbItem.Name,
                        description: qbItem.Description,
                        sku: qbItem.Sku,
                        // industry: company?.info?.industry,
                        createdBy: company.admin,
                        quickbookId: qbItem.Id,
                    };

                    const jobType = await new JobType(jobTypeEntry).save();
                    itemEntries.jobType = jobType._id;
                    await new Item(itemEntries).save();
                }
            }

            return;
        });
    });
};

// To update all items' changes from QB to BC
export const updateBCItem = async (req: Request, res: Response, company: ICompany, qbItemId: string) => {
    _refreshToken(req, res, company, async (err, errMsg, company) => {
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        // get item on QB
        qbo.getItem(qbItemId, async (err: any, qbItem: IQBItem) => {
            if (!qbItem || err) {
                return;
            }

            if (qbItem) {
                const item = await Item.findOne({
                    quickbookId: qbItem.Id,
                    company: company._id,
                });

                if (item) {
                    item.name = qbItem.Name;
                    item.description = qbItem.Description;
                    item.sku = qbItem.Sku;
                    item.isActive = qbItem.Active;
                    item.charges = qbItem.UnitPrice;
                    await item.save();

                    // update job type when item have it
                    if (item.jobType) {
                        const jobType = await JobType.findById(item.jobType);
                        jobType.title = qbItem.Name;
                        jobType.description = qbItem.Description;
                        jobType.sku = qbItem.Sku;
                        await jobType.save();
                    }
                }
            }

            return;
        });
    });
};

export const getQBItem = async (req: Request, res: Response) => {
    return new Promise((resolve, reject) => {
        const params = req.query;
        const company = <ICompany>req.company;
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        qbo.getItem(params.quickbookId, async (err: any, qbItem: IQBItem) => {
            if (err) {
                reject(err);
            } else {
                resolve(qbItem);
            }
        });
    })
        .then((response: any) => {
            return res.json({ 'status': Status.Success, 'message': response });
        })
        .catch((error: any) => {
            Sentry.captureException(error);
            return res.json({ status: Status.Error, message: error ?? Messages.GenericError });
        });
};

export const findQBItem = async (req: Request, res: Response) => {

    return new Promise((resolve, reject) => {
        const params = req.query;
        const company = <ICompany>req.company;
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        qbo.findItems([
            { field: 'Name', value: params.name }
        ], async (err: any, data: any) => {
            if (err) {
                reject(err);
            } else {
                resolve(data?.QueryResponse?.Item);
            }
        });
    })
        .then((data: any) => {
            return res.json({ status: Status.Success, data: data ?? null });
        })
        .catch((error: any) => {
            Sentry.captureException(error);
            return res.json({ status: Status.Error, message: error ?? Messages.GenericError });
        });

};

export const findQBAccount = async (req: Request, res: Response) => {

    return new Promise((resolve, reject) => {
        const params = req.query;
        const company = <ICompany>req.company;
        const qbo = _getQbo(company.qbAccessToken, company.realmId, company.qbRefreshToken);

        qbo.findAccounts([
            { field: 'Name', value: params.name }
        ], async (err: any, data: any) => {
            if (err) {
                reject(err);
            } else {
                resolve(data?.QueryResponse?.Account);
            }
        });
    })
        .then((data: any) => {
            return res.json({ status: Status.Success, data: data ?? null });
        })
        .catch((error: any) => {
            Sentry.captureException(error);
            return res.json({ status: Status.Error, message: error ?? Messages.GenericError });
        });
};
