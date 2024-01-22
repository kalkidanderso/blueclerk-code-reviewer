import { Request, Response } from 'express';
import { Status, Role, Messages } from '../common/constants';

import { JobType, IJobType } from '../models/JobType';
import { IUser } from '../models/User';
import { ICompany } from '../models/Company';
import { Item, IItem, IQBItem } from '../models/Item';
import { _createQBItem, _updateQBItemsStatus, _transferQBItems, _updateQBItem } from '../controllers/quickbook.item';
import { _transferQBInvoiceItem } from './quickbook.invoice';

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
};

export const createJobType = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    const {account}=params;


    let userId: any = null;
    let industryId: any = null;

    if (user.permissions.role == Role.COMPANY_ADMIN || user.permissions.role == Role.ADMIN_EMPLOYEE) {
        userId = user._id;
    }

    if (user.permissions.role != Role.GLOBAL_ADMIN) {
        userId = req.companyId;
    }

    if (user.permissions.role == Role.GLOBAL_ADMIN) {
        if (params.industryId == undefined || params.industryId == null) {
            return res.json({ status: Status.Error, message: 'Industry Id is required' });
        } else {
            industryId = params.industryId;
        }
    }
    if (industryId != null && industryId != undefined) {
        JobType.findOne({ title: params.title, industry: industryId, createdBy: null }, (err: any, previousJobType: IJobType) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (previousJobType != undefined || previousJobType != null) {
                return res.json({ 'status': Status.Error, 'message': 'Job Type already created for this industry' });
            }

            const jobType = new JobType({
                title: params.title,
                description: params.description,
                sku: params.sku,
                industry: industryId,
                createdBy: userId
            });

            jobType.save((err: any) => {

                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                }
                _createItem(req, res, jobType, null, account,(item, qbItem) => {

                    return res.json({ 'status': Status.Success, 'message': 'Job type created successfully.', jobType, item, quickbookItem: qbItem });
                });


            });
        });
    } else {
        const regex = new RegExp(['^', params.title, '$'].join(''), 'i');
        JobType.findOne({ title: regex, createdBy: req.companyId }, (err: any, previousJobType: IJobType) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (previousJobType != undefined || previousJobType != null) {
                return res.json({ 'status': Status.Error, 'message': 'Job Type already created' });
            }

            const jobType = new JobType({
                title: params.title,
                description: params.description,
                sku: params.sku,
                industry: industryId,
                createdBy: userId
            });

            jobType.save((err: any) => {

                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                }

                _createItem(req, res, jobType, req.company, account, (item, qbItem) => {
                    return res.json({ 'status': Status.Success, 'message': 'Job type created successfully.', jobType, item, quickbookItem: qbItem });
                });

            });
        });
    }
};

const _createItem = (req: Request, res: Response, jobType: IJobType, company: ICompany, account:any,next: (item: IItem, qbItem: IQBItem) => void) => {

    const params = req.body;
    let companyId = company._id;
    const itemTiers = [];
    const jobCostingList = [];

    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }

    // Iterate company itemTier to add to the new Item
    for (const t of company.itemTier.list) {
        itemTiers.push({ tier: t.tier });
    }
    for (const t of company.costing.list) {
        jobCostingList.push({ tier: t.tier });
    }
    const isProduct=params.itemType=='Product';

    const item = new Item(
        {
            name: params.title,
            description: params.description,
            sku: params.sku,
            tiers: itemTiers,
            costing: jobCostingList,
            company: companyId,
            jobType: jobType._id,
            itemType:params.itemType,
            productCost:params.productCost,
            isFixed:isProduct?true:params.isFixed,
            salePrice:params.salePrice,
            IncomeAccountRef:{ name: account?.Name, value: account?.Id }

        }
    );

    item.save((err: any) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
        }
        if (company.qbAuthorized) {
            console.log('=== company QB authorized, creating QB Item');
            // Create new Item in QuickBooks
            console.log('item for qbok ==> ',item);
            _createQBItem(req, res, company, item, async (err: any, errMsg: any, qbItem: IQBItem) => {
                if (err) {
                    console.log('== createJobType > _createItem > _createQBItem');
                    console.log('== errMsg:', errMsg);
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
            });
        } else {
            return next(item, null);
        }
    });
};

export const getJobTypes = (req: Request, res: Response) => {

    const user = <IUser>req.user;
    let companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    if (user.permissions.role == Role.GLOBAL_ADMIN) {
        JobType.find({},
            (err: any, types: IJobType[]) => {

                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                }

                return res.json({ 'status': Status.Success, 'types': types });

            }
        );

    } else {
        JobType.find(
            { $or: [{ createdBy: null, industry: req.company.info.industry, isActive: true }, { createdBy: req.companyId, isActive: true }] },
            (err: any, types: IJobType[]) => {

                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                }

                return res.json({ 'status': Status.Success, 'types': types });

            }
        );
    }
};

export const editJobType = (req: Request, res: Response) => {

    const params = req.body;

    JobType.findOne({ _id: params.jobTypeId }, async (err: any, jobType: IJobType) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
        }

        if (!jobType) {
            return res.json({ 'status': Status.Error, 'message': 'Invalid job Type id' });
        }

        if (!jobType.isActive) {
            return res.json({ 'status': Status.Error, 'message': 'Job type is inactive, activate to edit.' });
        }

        jobType.title = params.title;
        jobType.description = params.description;
        jobType.sku = params.sku;
        await jobType.save();

        _updateItem(req, res, jobType, (req: Request, res: Response) => {
            return res.json({ status: Status.Success, message: 'Job type update successfully.', jobType });
        });
    });

};

const _updateItem = (req: Request, res: Response, jobType: IJobType, next: (req: Request, res: Response) => void) => {

    let companyId = req.companyId;

    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    Item.findOne({ jobType: jobType._id }, (err: any, item: IItem) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
        }

        if (item) {
            item.updateOne({
                name: jobType.title,
                description: jobType.description,
                sku: jobType.sku
            }, (err: any, raw: any) => {
                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                }

                next(req, res);
                return;
            });
        } else {
            const item = new Item(
                {
                    name: jobType.title,
                    description: jobType.description,
                    sku: jobType.sku,
                    company: companyId,
                    jobType: jobType._id,
                }
            );

            item.save((err: any) => {
                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                }
                next(req, res);
                return;
            });
        }
    });
};

export const changeJobTypeStatus = (req: Request, res: Response) => {

    const params = req.body;

    JobType.findOne({ _id: params.jobTypeId }, (err: any, jobType: IJobType) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
        }

        if (jobType == undefined || jobType == null) {
            return res.json({ 'status': Status.Error, 'message': 'Invalid job Type id' });
        }

        jobType.updateOne({ isActive: params.status }, (err: any, raw: any) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            _updateItemStatus(req, res, jobType, params.status, (req: Request, res: Response) => {
                return res.json({ 'status': Status.Success, 'message': 'Job type status update successfully.' });
            });

        });
    });
};

const _updateItemStatus = (req: Request, res: Response, jobType: IJobType, itemStatus: boolean, next: (req: Request, res: Response) => void) => {

    Item.findOne({ jobType: jobType._id }, (err: any, item: IItem) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
        }

        if (item != undefined && item != null) {
            item.updateOne({ isActive: itemStatus }, (err: any, raw: any) => {
                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                }

                next(req, res);
                return;
            });
        } else {
            return res.json({ 'status': Status.Error, 'message': 'Item for this job type not found' });
        }
    });
};
