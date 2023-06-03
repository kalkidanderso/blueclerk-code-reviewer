import express from 'express'
import { validate, Validations } from '../middleware/validator';
import passport from 'passport';
import {
    checkUserPermissions,
} from '../middleware/permissions'
import { getCompanyId } from '../middleware/company';

import { Permissions } from '../common/constants';

import * as invoiceController from '../controllers/v2/invoice';
import { isLogin } from '../middleware/session';

export default function () {

    const router: express.Router = express.Router()


    router.post(
        '/getInvoices',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        validate(Validations.getInvoices),
        invoiceController.getInvoices
    )

    return router

}

