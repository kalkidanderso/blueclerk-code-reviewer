import { NextFunction, Request, Response } from 'express'
import { Company, ICompany } from '../../models/Company';
import { Status, Messages } from '../../common/constants'
import * as Sentry from '@sentry/node';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

var OAuthClient = require('intuit-oauth');

export const refreshQBToken = () => {

    return async (req: Request, res: Response, next: NextFunction) => {
        const company = <ICompany>req.company;
        const { QB_ENVIRONMENT, QB_CLIENT_ID, QB_CLIENT_SECRET, QB_REDIRECT_URI } = process.env;

        if (!company.qbAuthorized) {
            return next();
        }

        var oauthClient = new OAuthClient({
            clientId: QB_CLIENT_ID,
            clientSecret: QB_CLIENT_SECRET,
            environment: QB_ENVIRONMENT,
            redirectUri: QB_REDIRECT_URI,
        });

        try {
            const authResponse = await oauthClient.refreshUsingToken(company.qbRefreshToken);
            const refresh_token = authResponse.token.refresh_token;
            const access_token = authResponse.token.access_token;

            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 99);

            await prisma.company.update({
                where: { id: company.id },
                data: {
                    qbAccessToken: access_token,
                    qbRefreshToken: refresh_token,
                    qbAuthorized: true,
                    qbRefeshTokenExpiry: expiry,
                },
            });

            const newCompany = await prisma.company.findUnique({
                where: { id: company.id },
            });

            req.company = newCompany;
            next();
        } catch (err) {
            Sentry.captureException(err);
            console.error('== error', err);
            console.error('The error message is:', err.originalMessage);
            console.error('Intuit error:', err.intuit_tid);
            res.json({
                status: err.authResponse?.response?.status || Status.Error,
                message: 'Unable to refresh the token',
            });
        }
    }
}