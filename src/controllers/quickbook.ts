import {Request, Response} from 'express'
import { Status, Messages, Role} from '../common/constants'
import { qbConfig } from '../common/config'

import { IContact } from '../common/contact';
import { Contact } from '../models/Contact';
import { IUser } from '../models/User';
import { ICompany, IQBCompany, Company } from '../models/Company'
import { Customer, ICustomer, IQBCustomer } from '../models/Customer'
import { JobLocation, IJobLocation } from '../models/JobLocation';
import { CompanyCustomer, ICompanyCustomer } from '../models/CompanyCustomer'
import { IJobType, JobType } from '../models/JobType'
import { IItem, IQBItem, QBItemTypes, Item } from '../models/Item';

var QuickBooks = require('node-quickbooks')
var OAuthClient = require("intuit-oauth");

// ===========================================
// =======[ PRIVATE & GENERIC FUNCTION ]======
// ===========================================

const _oauthClient = new OAuthClient({
    clientId: qbConfig.qb_client_id,
    clientSecret: qbConfig.qb_client_secret,
    environment: qbConfig.qb_environment,
    redirectUri: qbConfig.qb_redirect_uri
});

export const _getQbo = (oauthToken: string, realmId: string, refreshToken: string) => {
    return new QuickBooks(
        qbConfig.qb_client_id,
        qbConfig.qb_client_secret,
        oauthToken,
        false, // no token secret for oAuth 2.0
        realmId,
        true, // use the sandbox?
        false, // enable debugging?
        14, // set minorversion, or null for the latest version
        '2.0', //oAuth version
        refreshToken
    )
};

export const _refreshToken = (req: Request, res: Response, company: ICompany, next: (error: number, errorMessage: string, company: ICompany) => void) => {

    var oauthClient = new OAuthClient({
        clientId: qbConfig.qb_client_id,
        clientSecret: qbConfig.qb_client_secret,
        environment: qbConfig.qb_environment,
        redirectUri: qbConfig.qb_redirect_uri,
    });

    oauthClient
    .refreshUsingToken(company.qbRefreshToken)
    .then(function (authResponse: any) {
        const refresh_token = authResponse.token.refresh_token
        const access_token = authResponse.token.access_token

        var expiry = new Date();
        expiry.setDate(expiry.getDate() + 99)

        company.updateOne({
            qbAccessToken: access_token,
            qbRefreshToken: refresh_token,
            qbAuthorized: true,
            qbRefeshTokenExpiry: expiry
        }, (err: any, raw: any)=>{
            if(err){
                return next(0, Messages.GenericError, null);
            }

            Company.findById(company._id, (err: any, newCompany: ICompany) => {
                if(err){
                    return next(0, Messages.GenericError, null);
                }

                return next(1, '', newCompany);
            })
        })
    })
    .catch(function (err: any) {
        return next(err.authResponse?.response?.status || Status.Error, 'Unable to refersh the token', null);
    });
}

export const get = function(obj: any, key: any) {
    return key.split(".").reduce(function(o: any, x: any) {
        return (typeof o == "undefined" || o === null) ? '' : o[x];
    }, obj);
}

export const getQBUri = (req: Request, res: Response) => {

    const params = req.body

    var oauthClient = new OAuthClient({
        clientId: qbConfig.qb_client_id,
        clientSecret: qbConfig.qb_client_secret,
        environment: qbConfig.qb_environment,
        redirectUri: params.redirectUri || qbConfig.qb_redirect_uri,
    });

    var authUri = oauthClient.authorizeUri({
        scope: [OAuthClient.scopes.Accounting],
        state: req.companyId,
    });

    Company.findById(req.companyId, (err: any, company: ICompany) => {
        if(err){
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }
        if(company == undefined || company ==null){
            return res.json({'status': Status.Error, 'message': "Invalid company id"})
        }

        company.updateOne({
            socketId: params.sessionID
        }, (err: any, raw: any)=>{
            if(err){
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
            
            return res.json({'status': Status.Success, 'authUri': authUri})
        })
    })
}

export const getCallBackToken = (req: Request, res: Response, sio: any) => {

    const query = req.query;

    var oauthClient = new OAuthClient({
        clientId: qbConfig.qb_client_id,
        clientSecret: qbConfig.qb_client_secret,
        environment: qbConfig.qb_environment,
        redirectUri: query.redirectUri || qbConfig.qb_redirect_uri,
    });
    
    oauthClient
    .createToken(req.url)
    .then(function (authResponse: any) {

        // var oauth2_token_json: any = JSON.stringify(authResponse.getJson(), null, 2);
      
        const companyId = req.query.state
        const refresh_token = authResponse.token.refresh_token
        const access_token = authResponse.token.access_token
        const realmId = req.query.realmId

        Company.findById(companyId, (err: any, company: ICompany) => {
            if(err){
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
            if(company == undefined || company ==null){
                return res.json({'status': Status.Error, 'message': "Invalid company id"})
            }

            // Initiate node-quickbooks object with the refreshed company token
            const qbo = _getQbo(access_token, realmId, refresh_token);

            // Find the QuickBooks company info to be saved to Company Object
            qbo.findCompanyInfos({}, (err: any, data: any) => {

                const qbCompany: IQBCompany = data?.QueryResponse?.CompanyInfo[0];

                var expiry = new Date();
                expiry.setDate(expiry.getDate() + 99);
                company.updateOne({
                    qbAccessToken: access_token,
                    qbRefreshToken: refresh_token,
                    realmId: realmId,
                    qbCompanyName: qbCompany?.CompanyName,
                    qbCompanyEmail: qbCompany?.Email?.Address,
                    qbAuthorized: true,
                    qbRefeshTokenExpiry: expiry
                }, (err: any, raw: any)=>{
                    if(err){
                        sio.emit(company.socketId, {'status': Status.Error, 'message': Messages.GenericError});
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }

                    // sio.emit("authToken", oauth2_token_json);

                    sio.emit(company.socketId, {'status': Status.Success, 'message': 'Quickbooks Connected Successfully'});
                    return res.json({ 'status': Status.Success, 'message': 'Quickbooks Connected Successfully' });
                })
            })
        })
    })
    .catch(function (err: any) {
        return res.json({'status': Status.Error, 'message': err.error_description || err.originalMessage || err.message || Messages.GenericError});
    });
}

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
            Type: QBItemTypes.SERVICE,
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
                const exist = qbItems?.find((qbItem: IQBItem) => qbItem.Name?.toLowerCase() === item.name.toLowerCase());

                // Item not exist on QB, create it
                if (!exist) {
                    _createQBItem(req, res, company, item, (err, errMsg, qbItem) => {
                        if (qbItem) {
                            // QB Item created, update DB Item & JobType's quickbookId
                            item.quickbookId = qbItem.Id;
                            item.save();
                            JobType.findByIdAndUpdate(item.jobType, { quickbookId: qbItem.Id }).exec();
                        }
                    })
                }
            }

            // Iterate all QuickBooks items
            for (const qbItem of qbItems) {
                // Check if there any item on QB that not on DB yet
                let item = items.find(item => item.name?.toLowerCase() === qbItem.Name?.toLowerCase());

                if (item) {
                    // Item found, check and update quickbookId
                    if (item.quickbookId !== qbItem.Id) {
                        item.quickbookId = qbItem.Id;
                        item.save();

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
                        jobTypesToCreate.push(new JobType({
                            title: qbItem.Name,
                            createdBy: user._id,
                            quickbookId: qbItem.Id
                        }));
                    }
                }
            }

            // Iterate array Job Types to be created
            if (jobTypesToCreate.length > 0) {
                // Create all Job Types in array at once
                const jobTypesCreated = await JobType.create(jobTypesToCreate);

                // Iterate all created Job Types
                for (const jobType of jobTypesCreated) {
                    // Collect all Items in array first
                    itemsToCreate.push(new Item({
                        name: jobType.title,
                        tiers: [...company.itemTier?.list],
                        company: company._id,
                        jobType: jobType._id,
                        quickbookId: jobType.quickbookId,
                    }))
                }

                // Create all Items in array at once
                const itemsCreated = await Item.create(itemsToCreate);

                // Iterate all created Items as the response information
                for (const item of itemsCreated) {
                    createdItems.push({ _id: item._id, name: item.name });
                }
            }

            company.qbSync.itemsSynced = true;
            company.qbSync.itemsSyncedAt = new Date();
            company.save();

            return res.json({ status: Status.Success, message: 'Item synced successfully.', createdItems, updatedItems });
        })
    })

}

