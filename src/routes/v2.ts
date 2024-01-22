import express from 'express';
import passport from 'passport';
import { validate, Validations } from '../middleware/validator';

import {
    checkUserPermissions,
} from '../middleware/permissions';
import { getCompanyId } from '../middleware/company';
import { isLogin } from '../middleware/session';
import { Permissions } from '../common/constants';
import { isObjectIdValid } from '../middleware/isObjectIdValid';
import { isLambdaRequest } from '../middleware/isLamdaRequest';

import * as invoiceController from '../controllers/v2/invoice';
import * as jobController from '../controllers/v2/job';
import * as serviceTicketController from '../controllers/v2/serviceTicket';
import * as userPermissionController from '../controllers/v2/userPermission';
import * as bouncedEmails from '../controllers/bouncedEmails';
import { uploadImageInS3 } from '../middleware/multer';





export default function (sio: any) {

    const router: express.Router = express.Router();


    router.post(
        '/getInvoices',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        validate(Validations.getInvoices),
        invoiceController.getInvoices
    );

    router.post(
        '/exportInvoices',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        validate(Validations.getInvoices),
        invoiceController.exportInvoicesToExcel
    );

    // Bounced Emails for invoices
    router.post(
        '/store-invoices-bounced-emails',
        validate(Validations.bounceEmail),
        isLambdaRequest,
        bouncedEmails.storeforInvoices
    );

    // Bounced Emails for PO
    router.post(
        '/store-po-request-bounced-emails',
        validate(Validations.bounceEmail),
        isLambdaRequest,
        bouncedEmails.storeforPO
    );

    //mark-bounced-emails-as-read-for-invoices
    router.post(
        '/mark-as-read-invoices',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        isObjectIdValid,
        bouncedEmails.markReadInvoiceNBounce
    );

    //mark-bounced-emails-as-read-for-PO
    router.post(
        '/mark-as-read-po',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        isObjectIdValid,
        bouncedEmails.markReadPOBounce
    );

    router.post(
        '/getJobs',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Get_All),
        validate(Validations.getJobs),
        jobController.getJobs
    );

    router.get(
        '/getAllJobReports',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Job_Report),
        validate(Validations.getAllJobReports),
        jobController.getAllJobReports
    );

    router.post(
        '/getServiceTickets',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Service_Tickets),
        serviceTicketController.getServiceTickets
    );

    router.post(
        '/getPORequest',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Service_Tickets),
        serviceTicketController.getPORequest
    );

    router.get(
        '/getPORequestEmailTemplate',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        serviceTicketController.getPORequestEmailTemplate
    );

    router.post(
        '/sendPORequest',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        serviceTicketController.sendPORequest
    );
    
    router.get(
        '/getUserPermission/:userId',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        userPermissionController.getUserPermission
    );

    router.post(
        '/updateUserPermission/:userId',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        userPermissionController.updateUserPermission
    );

    router.post(
        '/updatePartialJob',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Update),
        uploadImageInS3.fields([{ name: 'image' }, { name: 'images' }]),
        (req, res) => {
            jobController.updatePartialJob(req, res, sio);
        }
    );

    router.get(
        '/getJobInvoice/:jobId',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Detail),
        jobController.getJobInvoice
    );

    return router;

}

