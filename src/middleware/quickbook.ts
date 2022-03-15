import { NextFunction, Request, Response } from 'express'
import { Company, ICompany } from '../models/Company';
import { Status, Messages } from '../common/constants'

var OAuthClient = require('intuit-oauth');

export const refreshQBToken = () => {

    return async (req: Request, res: Response, next: NextFunction) => {
        const company = <ICompany>req.company;
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
                    return res.json({status: 0, messages: Messages.GenericError});
                }
    
                Company.findById(company._id, (err: any, newCompany: ICompany) => {
                    if(err){
                        return res.json({status: Status.Error, messages: Messages.GenericError});
                    }
    
                    next();
                    return
                })
            })
        })
        .catch(function (err: any) {
            console.log('== error', err);
            console.log('The error message is :', err.originalMessage);
            console.log('Intuit error :', err.intuit_tid);
            return res.json({ status: err.authResponse?.response?.status || Status.Error, messages: 'Unable to refresh the token'});
        });
    }
}