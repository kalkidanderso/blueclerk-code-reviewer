import { Request, Response } from 'express'
import { Status, Messages, QBEntityNames, QBEntityOperations} from '../common/constants'

import { ICompany, IQBCompany, Company } from '../models/Company';
import { _resetCompanyQB } from '../controllers/company';
import { _resetCustomerQB } from '../controllers/customer';
import { _resetJobLocationQB } from './jobLocation';
import { _resetItemQB } from '../controllers/jobType';
import { _resetPaymentTermQB } from '../controllers/paymentTerm';
import { _resetInvoiceQB } from '../controllers/invoice';
import { _resetPaymentQB } from '../controllers/payment';
import { updateBCCustomer } from '../controllers/quickbook.customer';
import { createBCPayment } from '../controllers/quickbook.payment';

var QuickBooks = require('node-quickbooks')
var OAuthClient = require("intuit-oauth");

// ===========================================
// =======[ PRIVATE & GENERIC FUNCTION ]======
// ===========================================

export const _getQbo = (oauthToken: string, realmId: string, refreshToken: string) => {
    const { QB_ENVIRONMENT, QB_CLIENT_ID, QB_CLIENT_SECRET, QB_REDIRECT_URI } = process.env;

    return new QuickBooks(
        QB_CLIENT_ID,
        QB_CLIENT_SECRET,
        oauthToken,
        false, // no token secret for oAuth 2.0
        realmId,
        QB_ENVIRONMENT === 'production' ? false : true, // use the sandbox?
        false, // enable debugging?
        14, // set minorversion, or null for the latest version
        '2.0', //oAuth version
        refreshToken
    )
};

export const _refreshToken = (req: Request, res: Response, company: ICompany, next: (error: number, errorMessage: string, company: ICompany) => void) => {

    const { QB_ENVIRONMENT, QB_CLIENT_ID, QB_CLIENT_SECRET, QB_REDIRECT_URI } = process.env;

    var oauthClient = new OAuthClient({
        clientId: QB_CLIENT_ID,
        clientSecret: QB_CLIENT_SECRET,
        environment: QB_ENVIRONMENT,
        redirectUri: QB_REDIRECT_URI,
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
        return next(err.authResponse?.response?.status || Status.Error, 'Unable to refresh the token', null);
    });

}

export const get = function(obj: any, key: any) {
    return key.split(".").reduce(function(o: any, x: any) {
        return (typeof o == "undefined" || o === null) ? '' : o[x];
    }, obj);
}

export const getQBUri = (req: Request, res: Response) => {

    const params = req.body;

    const { QB_ENVIRONMENT, QB_CLIENT_ID, QB_CLIENT_SECRET, QB_REDIRECT_URI } = process.env;

    var oauthClient = new OAuthClient({
        clientId: QB_CLIENT_ID,
        clientSecret: QB_CLIENT_SECRET,
        environment: QB_ENVIRONMENT,
        redirectUri: params.redirectUri || QB_REDIRECT_URI,
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

    const { QB_ENVIRONMENT, QB_CLIENT_ID, QB_CLIENT_SECRET, QB_REDIRECT_URI } = process.env;

    var oauthClient = new OAuthClient({
        clientId: QB_CLIENT_ID,
        clientSecret: QB_CLIENT_SECRET,
        environment: QB_ENVIRONMENT,
        redirectUri: query.redirectUri || QB_REDIRECT_URI,
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

export const disconnectQB = async (req: Request, res: Response) => {

    const company = <ICompany>req.company;

    /**
     * Construct the response message now before qb data wiped out,
     * doing this to make sure even company is already diconnected,
     * BE will wiped out company stuff's quickbookId
     */
    const message = company.qbAuthorized
        ? `Company successfully disconnected from QuickBooks: ${company.qbCompanyName}.`
        : `Company already disconnected.`;

    // Remove all quickbookId across company's stuff
    _resetCompanyQB(company);
    _resetCustomerQB(company);
    _resetJobLocationQB(company);
    _resetItemQB(company);
    _resetPaymentTermQB(company);
    _resetInvoiceQB(company);
    _resetPaymentQB(company);

    return res.json({ status: Status.Success, message });

}

/**
 * Endpoint to handle webhook action from Quickbooks
 */
export const blueclerkSyncWebhook = async (req: Request, res: Response) => {

    const params = req.body;
    const eventNotification = params?.eventNotifications[0];
    const eventEntities = eventNotification?.dataChangeEvent?.entities;

    // Get BC Company based on the realmId
    const company = await Company.findOne({ realmId: eventNotification?.realmId });

    for (const eventEntity of eventEntities) {

        // Handle Entity Event Trigger
        switch (eventEntity?.name) {

            // => CUSTOMER ENTITY EVENT
            case QBEntityNames.CUSTOMER:
                switch (eventEntity?.operation) {
                    // => CUSTOMER CREATE ACTION
                    case QBEntityOperations.CREATE:
                        // Create BC Customer here
                        break;

                    case QBEntityOperations.UPDATE:
                        // Update BC Customer / Job Location here
                        updateBCCustomer(req, res, company, eventEntity?.id, (err, errMsg, customer, jobLocation) => {
                            // Implement another actions here
                        });
                        break;

                    default:
                        break;
                }
                break;

            // => ITEM ENTITY EVENT
            case QBEntityNames.ITEM:
                switch (eventEntity?.operation) {
                    // => ITEM CREATE ACTION
                    case QBEntityOperations.CREATE:
                        // Create BC Job Type and Item here
                        break;

                    default:
                        break;
                }

            // => PAYMENT ENTITY EVENT
            case QBEntityNames.PAYMENT:
                switch (eventEntity?.operation) {
                    // => PAYMENT CREATE ACTION
                    case QBEntityOperations.CREATE:
                        // Call quickbook payment to handle BC Payment
                        createBCPayment(req, res, company, eventEntity?.id, (err, errMsg, payments) => {
                            // Implement another actions here
                        });
                        break;

                    default:
                        break;
                }
                break;

            // => PAYMENT TERM ENTITY EVENT
            case QBEntityNames.TERM:
                switch (eventEntity?.operation) {
                    // => PAYMENT TERM CREATE ACTION
                    case QBEntityOperations.CREATE:
                        // Create BC Payment Term here
                        break;

                    default:
                        break;
                }

            default:
                break;
        }
    }

    res.status(200).json({});

}
