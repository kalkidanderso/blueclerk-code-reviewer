import { Request, Response } from 'express';
import { Messages, Role, Status } from '../common/constants';
import { IUser, User } from '../models/User';
import * as helper from '../services/helper';
import * as authentication from '../services/authentication';
import { queryChaincode } from '../blockchain/query';
import { Company } from '../models/Company';
import { IdentityTypes, InvocationChaincodes, QueryChaincodes, SystemNames } from '../models/Blockchain';
import { invokeChaincode } from '../blockchain/invoke';
import * as Sentry from '@sentry/node';

export const login = async (req: Request, res: Response) => {

    const params = req.body;

    const user = await User.findOne({ 'auth.email': helper.getRegex(params.email, 'i') });

    if (!user) {
        return res.json({ status: Status.Error, message: Messages.InvalidEmailPassword });
    }

    if (!authentication.compareUserPassword(user, params.password)) {
        return res.json({ status: Status.Error, message: Messages.InvalidEmailPassword });
    }

    if (user.permissions.role === Role.GLOBAL_ADMIN) {
        req.session.save();
        return res.json({
            status: Status.Success,
            token: user.jwt(req),
            userType: user.permissions.role,
            accountType: user.accountType,
            user
        });
    }

    // TODO: Login for company's employees

    // TODO: Login for customer's employees

    return res.json({
        status: Status.Unauthorized,
        message: 'Your account type does not have blockchain access',
        userType: user.permissions.role,
        accountType: user.accountType,
        user: null
    });

};

export const getAllAssets = async (req: Request, res: Response) => {
    // const { queryChaincode } = require('./blockchain/query');

    const [data] = await queryChaincode(QueryChaincodes.GET_ALL_ASSETS, []);
    
    return res.json({
        status: Status.Success,
        data
    });
};

export const getAllCompanies = async (req: Request, res: Response) => {

    const params = req.query;

    const filterQuery: any = { $and: [] };
    let query = {};

    switch (params.isVerified) {
    case 'true':
    case true:
        filterQuery['$and'].push({ 'blockchain.verified': true });
        query = { ...query, 'blockchain.verified': true };
        break;

    case 'false':
    case false:
        filterQuery['$and'].push({ $or: [{ 'blockchain.verified': false }, { 'blockchain.verified': null }] });
        query = { ...query, $or: [{ 'blockchain.verified': false }, { 'blockchain.verified': null }] };
        break;

    default:
        // Retrieve all companies, query is good at this point
        break;
    }


    // filterQuery['$and'].push({
    //     $or: [
    //         { 'info.companyName': keywordRegex },
    //         { 'info.companyEmail': keywordRegex },
    //         { 'address.street': keywordRegex },
    //         { 'address.city': keywordRegex },
    //         { 'address.state': keywordRegex },
    //         { 'address.zipCode': keywordRegex },
    //         { 'contact.phone': keywordRegex },
    //         { 'contact.fax': keywordRegex },
    //     ]
    // });

    if (params.keyword) {
        const fields = [
            'info.companyName',
            'info.companyEmail',
            'address.street',
            'address.city',
            'address.state',
            'address.zipCode',
            'contact.phone',
            'contact.fax'
        ];

        const keywordRegex = helper.getRegex(params.keyword, 'i');
        query = {
            ...query,
            $or: fields.map(field => ({ [field]: keywordRegex }))
            // $or: [
            //     { 'info.companyName': keywordRegex },
            //     { 'info.companyEmail': keywordRegex },
            //     { 'address.street': keywordRegex },
            //     { 'address.city': keywordRegex },
            //     { 'address.state': keywordRegex },
            //     { 'address.zipCode': keywordRegex },
            //     { 'contact.phone': keywordRegex },
            //     { 'contact.fax': keywordRegex },
            // ]
        };
    }

    console.log('== filterQuery:', filterQuery);
    console.log('== query:', query);

    const companies = await Company
        .find({ ...query }, { info: 1, address: 1, contact: 1, blockchain: 1, admin: 1 })
        .collation({ locale: 'en' })
        .sort({ 'info.companyName': 1 })
        .populate({ path: 'admin', select: 'profile info contact location' });

    return res.json({
        status: Status.Success,
        companies
    });

};

export const approveCompany = async (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;

    const company = await Company.findById(params.companyId);

    if (!company) {
        return res.json({ status: Status.Error, message: 'Company not found' });
    }

    const companyBC = {
        systemId: company._id,
        systemName: SystemNames.BLUECLERK,
        firstName: company.info.companyName,
        lastName: company.info.companyName,
        email: company.info.companyEmail,
        phoneNumber: company.contact.phone,
        address: {
            street: company.address.street,
            city: company.address.city,
            country: company.address.state,
            postalCode: company.address.zipCode
        },
        type: IdentityTypes.VENDOR
    };

    try {
        const args = [JSON.stringify(companyBC)];
        const invokationResult = await invokeChaincode(InvocationChaincodes.CREATE_NEW_IDENTITY, args);

        console.log('== invokationResult:', invokationResult);

        if (!invokationResult.isValid) {
            console.log('== NOT VALID');
            return res.json({ status: Status.Error, message: invokationResult.transaction });
        }

        company.blockchain.verified = true;
        company.blockchain.verifiedAt = new Date();
        company.blockchain.deniedBy = user;
        await company.save();

        return res.json({
            status: Status.Success,
            company,
            blockchainCompany: invokationResult.transaction
        });

    } catch (err) {
        Sentry.captureException(err);
        console.log('== err:', err);
        return res.json({ status: Status.Error, message: err.message });
    }

};
