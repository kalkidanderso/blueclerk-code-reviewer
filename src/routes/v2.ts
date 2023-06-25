import express from 'express';
import passport from 'passport';
import { validate, Validations } from '../middleware/validator';

import {
    checkUserPermissions,
} from '../middleware/permissions'
import { getCompanyId } from '../middleware/company';
import { isLogin } from '../middleware/session';
import { Permissions } from '../common/constants';
import * as invoiceController from '../controllers/v2/invoice';
import * as jobController from '../controllers/v2/job';
import * as serviceTicketController from '../controllers/v2/serviceTicket';
import * as itemController from '../controllers/v2/item'
import * as jobTypeController from '../controllers/v2/jobType'


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

    router.post(
        '/getJobs',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Get_All),
        validate(Validations.getJobs),
        jobController.getJobs
    )

    router.get(
        '/getAllJobReports',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Job_Report),
        validate(Validations.getAllJobReports),
        jobController.getAllJobReports
    )

    router.post(
        '/getServiceTickets',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Service_Tickets),
        serviceTicketController.getServiceTickets
    )
      // Job Type

      router.post(
        '/createJobType',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Type_Create),
        validate(Validations.createJobType),
        jobTypeController.createJobType
    )

    router.post(
        '/editJobType',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Type_Create),
        validate(Validations.editJobType),
        jobTypeController.editJobType
    )

    router.post(
        '/changeJobTypeStatus',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Type_Create),
        validate(Validations.changeJobTypeStatus),
        jobTypeController.changeJobTypeStatus
    )

    router.post(
        '/getJobTypes',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Type_Get),
        jobTypeController.getJobTypes
    )

      // Item

      router.post(
        '/getItems',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Items),
        validate(Validations.getItems),
        itemController.getItems
    )

    router.post(
        '/createItem',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Type_Create),
        validate(Validations.createItem),
        itemController.createItem
    )

    router.post(
        '/updateItem',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Update_Item),
        validate(Validations.updateItem),
        itemController.updateItem
    )

    router.post(
        '/updateItems',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Update_Item),
        itemController.updateItems
    )

    router.post(
        '/searchDuplicatedItems',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Items),
        validate(Validations.searchDuplicatedItems),
        itemController.searchDuplicatedItems
    )

    router.post(
        '/mergeItems',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Update_Item),
        validate(Validations.mergeItems),
        itemController.mergeItems
    )

    return router

}

