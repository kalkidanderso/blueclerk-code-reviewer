import express from 'express';
import passport from 'passport';

import { validate, Validations } from '../middleware/validator';

import * as blockchainController from '../controllers/blockchain';

const router: express.Router = express.Router();

router.post(
    '/login',
    validate(Validations.login),
    blockchainController.login
);

router.get(
    '/getAllAssets',
    blockchainController.getAllAssets
);

router.get(
    '/getAllCompanies',
    blockchainController.getAllCompanies
);

router.post(
    '/approveCompany',
    blockchainController.approveCompany
);

export default router;
