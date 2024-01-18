/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { Controller, ValidationService, FieldErrors, ValidateError, TsoaRoute, HttpStatusCodeLiteral, TsoaResponse, fetchMiddlewares } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AdvancePaymentController } from './../../controllers/v3/advancePayment.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { CommissionController } from './../../controllers/v3/commission.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { GetInvoiceController } from './../../controllers/v3/invoice.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { JobLocationController } from './../../controllers/v3/jobLocation.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { JobReportsController } from './../../controllers/v3/jobReports.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { JobsController } from './../../controllers/v3/jobs/jobs.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { JobSiteController } from './../../controllers/v3/jobSite.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { GetServiceTicketsController } from './../../controllers/v3/serviceTickets.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { UsersController } from './../../controllers/v3/users.controller';
import { expressAuthentication } from './../../middleware/authentication';
// @ts-ignore - no great way to install types from subpackage
const promiseAny = require('promise.any');
import type { RequestHandler } from 'express';
import * as express from 'express';

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "ICreateAdvancePaymentRequestBody": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"double","required":true},
            "type": {"dataType":"string","required":true},
            "amount": {"dataType":"double","required":true},
            "balance": {"dataType":"double","required":true},
            "referenceNumber": {"dataType":"string","required":true},
            "paymentType": {"dataType":"string","required":true},
            "paidAt": {"dataType":"datetime"},
            "appliedAt": {"dataType":"datetime"},
            "note": {"dataType":"string"},
            "createdByUser": {"dataType":"double","required":true},
            "updatedByUser": {"dataType":"double","required":true},
            "voidedByUser": {"dataType":"double","required":true},
            "workType": {"dataType":"array","array":{"dataType":"double"}},
            "companyLocation": {"dataType":"array","array":{"dataType":"double"}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IUpdateAdvancePaymentInput": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"double","required":true},
            "alternativeId": {"dataType":"string","required":true},
            "type": {"dataType":"string","required":true},
            "company": {"dataType":"double","required":true},
            "amount": {"dataType":"double","required":true},
            "balance": {"dataType":"double"},
            "referenceNumber": {"dataType":"string"},
            "paymentType": {"dataType":"string","required":true},
            "paidAt": {"dataType":"datetime"},
            "appliedAt": {"dataType":"datetime"},
            "note": {"dataType":"string"},
            "isVoid": {"dataType":"boolean"},
            "voidedAt": {"dataType":"datetime"},
            "createdByUser": {"dataType":"double","required":true},
            "updatedByUser": {"dataType":"double","required":true},
            "voidedByUser": {"dataType":"double","required":true},
            "workType": {"dataType":"array","array":{"dataType":"double"}},
            "companyLocation": {"dataType":"array","array":{"dataType":"double"}},
            "advancePaymentId": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IVoidAdvancePaymentInput": {
        "dataType": "refObject",
        "properties": {
            "type": {"dataType":"string","required":true},
            "advancePaymentId": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GetResult_any.any.any_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "InvoiceStatus": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["UNPAID"]},{"dataType":"enum","enums":["PARTIALLY_PAID"]},{"dataType":"enum","enums":["PAID"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "timestamp": {
        "dataType": "refAlias",
        "type": {"dataType":"datetime","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ICreatedJobLocation": {
        "dataType": "refObject",
        "properties": {
            "alternativeId": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "contacts": {"dataType":"nestedObjectLiteral","nestedProperties":{"email":{"dataType":"string"},"phone":{"dataType":"string"},"name":{"dataType":"string","required":true}},"required":true},
            "location": {"dataType":"nestedObjectLiteral","nestedProperties":{"long":{"dataType":"string","required":true},"lat":{"dataType":"string","required":true}},"required":true},
            "address": {"dataType":"nestedObjectLiteral","nestedProperties":{"zipCode":{"dataType":"string","required":true},"state":{"dataType":"string","required":true},"city":{"dataType":"string","required":true},"unit":{"dataType":"string"},"street":{"dataType":"string","required":true}},"required":true},
            "jobSites": {"dataType":"array","array":{"dataType":"double"}},
            "isActive": {"dataType":"boolean"},
            "customerId": {"dataType":"double"},
            "companyId": {"dataType":"double","required":true},
            "inactiveAt": {"dataType":"union","subSchemas":[{"ref":"timestamp"},{"dataType":"undefined"}]},
            "inactiveById": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"undefined"}]},
            "quickbookId": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IUpdateJobLocation": {
        "dataType": "refObject",
        "properties": {
            "alternativeId": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "contacts": {"dataType":"nestedObjectLiteral","nestedProperties":{"email":{"dataType":"string"},"phone":{"dataType":"string"},"name":{"dataType":"string","required":true}},"required":true},
            "location": {"dataType":"nestedObjectLiteral","nestedProperties":{"long":{"dataType":"string","required":true},"lat":{"dataType":"string","required":true}},"required":true},
            "address": {"dataType":"nestedObjectLiteral","nestedProperties":{"zipCode":{"dataType":"string","required":true},"state":{"dataType":"string","required":true},"city":{"dataType":"string","required":true},"unit":{"dataType":"string"},"street":{"dataType":"string","required":true}},"required":true},
            "jobSites": {"dataType":"array","array":{"dataType":"double"}},
            "isActive": {"dataType":"boolean"},
            "customerId": {"dataType":"double"},
            "companyId": {"dataType":"double","required":true},
            "inactiveAt": {"dataType":"union","subSchemas":[{"ref":"timestamp"},{"dataType":"undefined"}]},
            "inactiveById": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"undefined"}]},
            "quickbookId": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IResJob": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "jobId": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IRes": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"double","required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IJobInput": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IJobSite": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"double","required":true},
            "alternativeId": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "location": {"dataType":"any","required":true},
            "isActive": {"dataType":"boolean","required":true},
            "address": {"dataType":"any","required":true},
            "locationId": {"dataType":"double","required":true},
            "customerId": {"dataType":"double","required":true},
            "homeOwnerId": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ICreateJobSiteInput": {
        "dataType": "refObject",
        "properties": {
            "alternativeId": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "isActive": {"dataType":"boolean","required":true},
            "location": {"dataType":"nestedObjectLiteral","nestedProperties":{"long":{"dataType":"string","required":true},"lat":{"dataType":"string","required":true}},"required":true},
            "address": {"dataType":"any","required":true},
            "locationId": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}]},
            "customerId": {"dataType":"double","required":true},
            "homeOwnerId": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Pick_IUpdateJobSiteInput.Exclude_keyofIUpdateJobSiteInput.id__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"alternativeId":{"dataType":"string","required":true},"address":{"dataType":"any","required":true},"location":{"dataType":"nestedObjectLiteral","nestedProperties":{"long":{"dataType":"string","required":true},"lat":{"dataType":"string","required":true}},"required":true},"customerId":{"dataType":"double","required":true},"name":{"dataType":"string","required":true},"homeOwnerId":{"dataType":"double","required":true},"isActive":{"dataType":"boolean","required":true},"locationId":{"dataType":"double"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IUpdateJobSiteArgs": {
        "dataType": "refObject",
        "properties": {
            "alternativeId": {"dataType":"string","required":true},
            "address": {"dataType":"any","required":true},
            "location": {"dataType":"nestedObjectLiteral","nestedProperties":{"long":{"dataType":"string","required":true},"lat":{"dataType":"string","required":true}},"required":true},
            "customerId": {"dataType":"double","required":true},
            "name": {"dataType":"string","required":true},
            "homeOwnerId": {"dataType":"double","required":true},
            "isActive": {"dataType":"boolean","required":true},
            "locationId": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ICreateServiceTicketInput": {
        "dataType": "refObject",
        "properties": {
            "userId": {"dataType":"double","required":true},
            "alternativeId": {"dataType":"string","required":true},
            "dueDate": {"dataType":"union","subSchemas":[{"ref":"timestamp"},{"dataType":"enum","enums":[null]}]},
            "customerId": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}]},
            "note": {"dataType":"string","required":true},
            "customerContactId": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}]},
            "customerPO": {"dataType":"string","required":true},
            "image": {"dataType":"string","required":true},
            "images": {"dataType":"union","subSchemas":[{"dataType":"array","array":{"dataType":"string"}},{"dataType":"enum","enums":[null]}]},
            "companyId": {"dataType":"double","required":true},
            "technicianId": {"dataType":"double","required":true},
            "status": {"dataType":"double","required":true},
            "ticketId": {"dataType":"string","required":true},
            "jobLocationId": {"dataType":"double","required":true},
            "jobSiteId": {"dataType":"double","required":true},
            "isHomeOccupied": {"dataType":"boolean","required":true},
            "homeOwnerId": {"dataType":"double","required":true},
            "homeJobLocationId": {"dataType":"double","required":true},
            "homeJobSiteId": {"dataType":"double","required":true},
            "jobTypeId": {"dataType":"double","required":true},
            "itemId": {"dataType":"double","required":true},
            "jobCreated": {"dataType":"boolean","required":true},
            "source": {"dataType":"string","required":true},
            "workTypeId": {"dataType":"double","required":true},
            "companyLocationId": {"dataType":"double","required":true},
            "pooverriddenById": {"dataType":"double","required":true},
            "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["Ticket"]},{"dataType":"enum","enums":["PORequest"]},{"dataType":"enum","enums":["AllPORequest"]}],"required":true},
            "emailHistory": {"dataType":"array","array":{"dataType":"any"},"required":true},
            "bouncedEmailFlag": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IUpdateServiceTicketInput": {
        "dataType": "refObject",
        "properties": {
            "userId": {"dataType":"double","required":true},
            "alternativeId": {"dataType":"string","required":true},
            "dueDate": {"dataType":"union","subSchemas":[{"ref":"timestamp"},{"dataType":"enum","enums":[null]}]},
            "customerId": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}]},
            "note": {"dataType":"string","required":true},
            "customerContactId": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}]},
            "customerPO": {"dataType":"string","required":true},
            "image": {"dataType":"string","required":true},
            "images": {"dataType":"union","subSchemas":[{"dataType":"array","array":{"dataType":"string"}},{"dataType":"enum","enums":[null]}]},
            "companyId": {"dataType":"double","required":true},
            "technicianId": {"dataType":"double","required":true},
            "status": {"dataType":"double","required":true},
            "editedAt": {"ref":"timestamp","required":true},
            "ticketId": {"dataType":"string","required":true},
            "jobLocationId": {"dataType":"double","required":true},
            "jobSiteId": {"dataType":"double","required":true},
            "isHomeOccupied": {"dataType":"boolean","required":true},
            "homeOwnerId": {"dataType":"double","required":true},
            "homeJobLocationId": {"dataType":"double","required":true},
            "homeJobSiteId": {"dataType":"double","required":true},
            "jobTypeId": {"dataType":"double","required":true},
            "itemId": {"dataType":"double","required":true},
            "jobCreated": {"dataType":"boolean","required":true},
            "source": {"dataType":"string","required":true},
            "workTypeId": {"dataType":"double","required":true},
            "companyLocationId": {"dataType":"double","required":true},
            "pooverriddenById": {"dataType":"double","required":true},
            "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["Ticket"]},{"dataType":"enum","enums":["PORequest"]},{"dataType":"enum","enums":["AllPORequest"]}],"required":true},
            "emailHistory": {"dataType":"array","array":{"dataType":"any"},"required":true},
            "bouncedEmailFlag": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IUpdateStatusServiceTicketInput": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ILoginReturn": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"double","required":true},
            "message": {"dataType":"string"},
            "token": {"dataType":"string"},
            "userType": {"dataType":"double","required":true},
            "accountType": {"dataType":"double","required":true},
            "user": {"dataType":"any","required":true},
            "company": {"dataType":"any"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ILoginInput": {
        "dataType": "refObject",
        "properties": {
            "email": {"dataType":"string","required":true},
            "password": {"dataType":"string","required":true},
            "fbToken": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IUserRegister": {
        "dataType": "refObject",
        "properties": {
            "accountType": {"dataType":"string","required":true},
            "email": {"dataType":"string","required":true},
            "password": {"dataType":"string","required":true},
            "firstName": {"dataType":"string","required":true},
            "lastName": {"dataType":"string","required":true},
            "phone": {"dataType":"string","required":true},
            "companyName": {"dataType":"string"},
            "supplierName": {"dataType":"string"},
            "industryId": {"dataType":"double"},
            "companyId": {"dataType":"double"},
            "customerId": {"dataType":"double"},
            "role": {"dataType":"string"},
            "isci": {"dataType":"boolean"},
            "cid": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const validationService = new ValidationService(models);

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

export function RegisterRoutes(app: express.Router) {
    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################
        app.post('/api/v3/advance-payment',
            ...(fetchMiddlewares<RequestHandler>(AdvancePaymentController)),
            ...(fetchMiddlewares<RequestHandler>(AdvancePaymentController.prototype.createAdvancePaymentContractor)),

            function AdvancePaymentController_createAdvancePaymentContractor(request: any, response: any, next: any) {
            const args = {
                    body: {"in":"body","name":"body","required":true,"ref":"ICreateAdvancePaymentRequestBody"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new AdvancePaymentController();


              const promise = controller.createAdvancePaymentContractor.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/advance-payment',
            ...(fetchMiddlewares<RequestHandler>(AdvancePaymentController)),
            ...(fetchMiddlewares<RequestHandler>(AdvancePaymentController.prototype.getAdvancePaymentsByContractor)),

            function AdvancePaymentController_getAdvancePaymentsByContractor(request: any, response: any, next: any) {
            const args = {
                    type: {"in":"query","name":"type","dataType":"union","subSchemas":[{"dataType":"enum","enums":["vendor"]},{"dataType":"enum","enums":["employee"]}]},
                    isActive: {"in":"query","name":"isActive","dataType":"union","subSchemas":[{"dataType":"enum","enums":["ALL"]},{"dataType":"enum","enums":["active"]},{"dataType":"enum","enums":["void"]}]},
                    id: {"in":"query","name":"id","dataType":"double"},
                    startDate: {"in":"query","name":"startDate","dataType":"string"},
                    endDate: {"in":"query","name":"endDate","dataType":"string"},
                    offset: {"in":"query","name":"offset","dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new AdvancePaymentController();


              const promise = controller.getAdvancePaymentsByContractor.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.put('/api/v3/advance-payment',
            ...(fetchMiddlewares<RequestHandler>(AdvancePaymentController)),
            ...(fetchMiddlewares<RequestHandler>(AdvancePaymentController.prototype.updateAdvancePaymentContractor)),

            function AdvancePaymentController_updateAdvancePaymentContractor(request: any, response: any, next: any) {
            const args = {
                    body: {"in":"body","name":"body","required":true,"ref":"IUpdateAdvancePaymentInput"},
                    req: {"in":"request","name":"req","required":true,"dataType":"object"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new AdvancePaymentController();


              const promise = controller.updateAdvancePaymentContractor.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.patch('/api/v3/advance-payment',
            ...(fetchMiddlewares<RequestHandler>(AdvancePaymentController)),
            ...(fetchMiddlewares<RequestHandler>(AdvancePaymentController.prototype.voidAdvancePaymentContractor)),

            function AdvancePaymentController_voidAdvancePaymentContractor(request: any, response: any, next: any) {
            const args = {
                    body: {"in":"body","name":"body","required":true,"ref":"IVoidAdvancePaymentInput"},
                    req: {"in":"request","name":"req","required":true,"dataType":"object"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new AdvancePaymentController();


              const promise = controller.voidAdvancePaymentContractor.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/getCommissionHistory/:beneficiaryId',
            ...(fetchMiddlewares<RequestHandler>(CommissionController)),
            ...(fetchMiddlewares<RequestHandler>(CommissionController.prototype.getCommissionHistory)),

            function CommissionController_getCommissionHistory(request: any, response: any, next: any) {
            const args = {
                    beneficiaryId: {"in":"path","name":"beneficiaryId","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new CommissionController();


              const promise = controller.getCommissionHistory.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/getCommissionHistoryByJob/:jobId',
            ...(fetchMiddlewares<RequestHandler>(CommissionController)),
            ...(fetchMiddlewares<RequestHandler>(CommissionController.prototype.getCommissionHistoryByJob)),

            function CommissionController_getCommissionHistoryByJob(request: any, response: any, next: any) {
            const args = {
                    jobId: {"in":"path","name":"jobId","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new CommissionController();


              const promise = controller.getCommissionHistoryByJob.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.put('/api/v3/updateCommission',
            ...(fetchMiddlewares<RequestHandler>(CommissionController)),
            ...(fetchMiddlewares<RequestHandler>(CommissionController.prototype.updateCommission)),

            function CommissionController_updateCommission(request: any, response: any, next: any) {
            const args = {
                    params: {"in":"body","name":"params","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"jobId":{"dataType":"double","required":true},"commissionType":{"dataType":"string","required":true},"commissionEffectiveDate":{"dataType":"string","required":true},"commission":{"dataType":"double"},"id":{"dataType":"double","required":true},"type":{"dataType":"string","required":true}}},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new CommissionController();


              const promise = controller.updateCommission.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/updateCommissionCron',
            ...(fetchMiddlewares<RequestHandler>(CommissionController)),
            ...(fetchMiddlewares<RequestHandler>(CommissionController.prototype.updateCommissionCron)),

            function CommissionController_updateCommissionCron(request: any, response: any, next: any) {
            const args = {
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new CommissionController();


              const promise = controller.updateCommissionCron.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.put('/api/v3/updateJobCommission/:id',
            ...(fetchMiddlewares<RequestHandler>(CommissionController)),
            ...(fetchMiddlewares<RequestHandler>(CommissionController.prototype.updateJobCommission)),

            function CommissionController_updateJobCommission(request: any, response: any, next: any) {
            const args = {
                    id: {"in":"path","name":"id","required":true,"dataType":"string"},
                    body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"deduction":{"dataType":"double","required":true},"additional":{"dataType":"double","required":true},"jobId":{"dataType":"double","required":true},"balance":{"dataType":"double","required":true}}},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new CommissionController();


              const promise = controller.updateJobCommission.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/invoice',
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController)),
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController.prototype.getInvoice)),

            function GetInvoiceController_getInvoice(request: any, response: any, next: any) {
            const args = {
                    invoiceId: {"in":"query","name":"invoiceId","dataType":"string"},
                    dueDate: {"in":"query","name":"dueDate","dataType":"string"},
                    startAmount: {"in":"query","name":"startAmount","dataType":"double"},
                    endAmount: {"in":"query","name":"endAmount","dataType":"double"},
                    customerPO: {"in":"query","name":"customerPO","dataType":"string"},
                    missingPO: {"in":"query","name":"missingPO","dataType":"boolean"},
                    customerId: {"in":"query","name":"customerId","dataType":"string"},
                    customerContactId: {"in":"query","name":"customerContactId","dataType":"string"},
                    isDraft: {"in":"query","name":"isDraft","dataType":"boolean"},
                    isVoid: {"in":"query","name":"isVoid","dataType":"boolean"},
                    startDate: {"in":"query","name":"startDate","dataType":"datetime"},
                    endDate: {"in":"query","name":"endDate","dataType":"datetime"},
                    lastEmailStartDate: {"in":"query","name":"lastEmailStartDate","dataType":"datetime"},
                    lastEmailEndDate: {"in":"query","name":"lastEmailEndDate","dataType":"datetime"},
                    bouncedEmailFlag: {"in":"query","name":"bouncedEmailFlag","dataType":"boolean"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetInvoiceController();


              const promise = controller.getInvoice.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v3/invoice/getInvoices',
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController)),
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController.prototype.getInvoices)),

            function GetInvoiceController_getInvoices(request: any, response: any, next: any) {
            const args = {
                    params: {"in":"body","name":"params","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"recentOnly":{"dataType":"boolean"},"dueDate":{"dataType":"string"},"isVoid":{"dataType":"boolean"},"isDraft":{"dataType":"boolean"},"lastEmailEndDate":{"dataType":"string"},"lastEmailStartDate":{"dataType":"string"},"endAmount":{"dataType":"double"},"startAmount":{"dataType":"double"},"technicianId":{"dataType":"string"},"jobZip":{"dataType":"string"},"jobState":{"dataType":"string"},"jobCity":{"dataType":"string"},"jobAddress":{"dataType":"string"},"jobLocationId":{"dataType":"double"},"customerContactId":{"dataType":"double"},"customerId":{"dataType":"double"},"status":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["UNPAID"]},{"dataType":"enum","enums":["PARTIALLY_PAID"]},{"dataType":"enum","enums":["PAID"]}]},"jobId":{"dataType":"double"},"endDate":{"dataType":"string"},"startDate":{"dataType":"string"},"keyword":{"dataType":"string"},"previousCursor":{"dataType":"string"},"nextCursor":{"dataType":"string"},"pageSize":{"dataType":"double"}}},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetInvoiceController();


              const promise = controller.getInvoices.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/invoice/exportInvoicesToExcel',
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController)),
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController.prototype.exportInvoicesToExcel)),

            function GetInvoiceController_exportInvoicesToExcel(request: any, response: any, next: any) {
            const args = {
                    invoiceId: {"in":"query","name":"invoiceId","dataType":"string"},
                    dueDate: {"in":"query","name":"dueDate","dataType":"string"},
                    startAmount: {"in":"query","name":"startAmount","dataType":"double"},
                    endAmount: {"in":"query","name":"endAmount","dataType":"double"},
                    customerPO: {"in":"query","name":"customerPO","dataType":"string"},
                    missingPO: {"in":"query","name":"missingPO","dataType":"boolean"},
                    customerId: {"in":"query","name":"customerId","dataType":"string"},
                    customerContactId: {"in":"query","name":"customerContactId","dataType":"string"},
                    isDraft: {"in":"query","name":"isDraft","dataType":"boolean"},
                    isVoid: {"in":"query","name":"isVoid","dataType":"boolean"},
                    startDate: {"in":"query","name":"startDate","dataType":"datetime"},
                    endDate: {"in":"query","name":"endDate","dataType":"datetime"},
                    lastEmailStartDate: {"in":"query","name":"lastEmailStartDate","dataType":"datetime"},
                    lastEmailEndDate: {"in":"query","name":"lastEmailEndDate","dataType":"datetime"},
                    bouncedEmailFlag: {"in":"query","name":"bouncedEmailFlag","dataType":"boolean"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetInvoiceController();


              const promise = controller.exportInvoicesToExcel.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/invoice/getInvoiceEmailTemplate',
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController)),
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController.prototype.getInvoiceEmailTemplate)),

            function GetInvoiceController_getInvoiceEmailTemplate(request: any, response: any, next: any) {
            const args = {
                    emailType: {"in":"query","name":"emailType","required":true,"dataType":"string"},
                    invoiceIds: {"in":"query","name":"invoiceIds","dataType":"string"},
                    invoiceId: {"in":"query","name":"invoiceId","dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetInvoiceController();


              const promise = controller.getInvoiceEmailTemplate.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/invoice/getCurrentInvoiceNumber',
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController)),
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController.prototype.getCurrentInvoiceNumber)),

            function GetInvoiceController_getCurrentInvoiceNumber(request: any, response: any, next: any) {
            const args = {
                    companyId: {"in":"query","name":"companyId","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetInvoiceController();


              const promise = controller.getCurrentInvoiceNumber.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v3/invoice/sendInvoice',
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController)),
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController.prototype.sendinvoice)),

            function GetInvoiceController_sendinvoice(request: any, response: any, next: any) {
            const args = {
                    params: {"in":"body","name":"params","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"message":{"dataType":"string","required":true},"subject":{"dataType":"string","required":true},"copyToMyself":{"dataType":"boolean","required":true},"recipients":{"dataType":"array","array":{"dataType":"string"},"required":true},"invoiceId":{"dataType":"double","required":true}}},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetInvoiceController();


              const promise = controller.sendinvoice.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v3/invoice/sendInvoices',
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController)),
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController.prototype.sendInvoices)),

            function GetInvoiceController_sendInvoices(request: any, response: any, next: any) {
            const args = {
                    params: {"in":"body","name":"params","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"customerId":{"dataType":"double","required":true},"message":{"dataType":"string","required":true},"subject":{"dataType":"string","required":true},"copyToMyself":{"dataType":"boolean","required":true},"recipients":{"dataType":"array","array":{"dataType":"string"},"required":true},"invoiceIds":{"dataType":"array","array":{"dataType":"double"},"required":true}}},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetInvoiceController();


              const promise = controller.sendInvoices.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v3/invoice/updateInvoice',
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController)),
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController.prototype.updateInvoice)),

            function GetInvoiceController_updateInvoice(request: any, response: any, next: any) {
            const args = {
                    params: {"in":"body","name":"params","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"vendorId":{"dataType":"string","required":true},"note":{"dataType":"string","required":true},"shippingCost":{"dataType":"double"},"items":{"dataType":"array","array":{"dataType":"any"}},"includePO":{"dataType":"boolean"},"timeSpent":{"dataType":"double"},"dueDate":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"datetime"}],"required":true},"issuedDate":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"datetime"}],"required":true},"tax":{"dataType":"double"},"charges":{"dataType":"double"},"jobSiteId":{"dataType":"double","required":true},"jobLocationId":{"dataType":"double","required":true},"customerContactId":{"dataType":"double","required":true},"paymentTermId":{"dataType":"double","required":true},"isDraft":{"dataType":"boolean","required":true},"invoiceId":{"dataType":"double","required":true}}},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetInvoiceController();


              const promise = controller.updateInvoice.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/invoice/generateInvoicePdf',
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController)),
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController.prototype.generateInvoicePdf)),

            function GetInvoiceController_generateInvoicePdf(request: any, response: any, next: any) {
            const args = {
                    customerId: {"in":"query","name":"customerId","required":true,"dataType":"string"},
                    companyId: {"in":"query","name":"companyId","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetInvoiceController();


              const promise = controller.generateInvoicePdf.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v3/invoice/updateInvoiceMessages',
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController)),
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController.prototype.updateInvoiceMessages)),

            function GetInvoiceController_updateInvoiceMessages(request: any, response: any, next: any) {
            const args = {
                    params: {"in":"body","name":"params","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"technicianMessages":{"dataType":"nestedObjectLiteral","nestedProperties":{"images":{"dataType":"array","array":{"dataType":"string"},"required":true},"notes":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"comment":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"required":true}}},"showJobId":{"dataType":"boolean"},"invoiceId":{"dataType":"double","required":true}}},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetInvoiceController();


              const promise = controller.updateInvoiceMessages.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/invoice/getInvoiceDetail',
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController)),
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController.prototype.getInvoiceDetail)),

            function GetInvoiceController_getInvoiceDetail(request: any, response: any, next: any) {
            const args = {
                    invoiceId: {"in":"query","name":"invoiceId","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetInvoiceController();


              const promise = controller.getInvoiceDetail.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v3/invoice/unvoidInvoice',
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController)),
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController.prototype.unvoidInvoice)),

            function GetInvoiceController_unvoidInvoice(request: any, response: any, next: any) {
            const args = {
                    invoiceId: {"in":"body-prop","name":"invoiceId","required":true,"dataType":"double"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetInvoiceController();


              const promise = controller.unvoidInvoice.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.delete('/api/v3/invoice/voidInvoice',
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController)),
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController.prototype.voidInvoice)),

            function GetInvoiceController_voidInvoice(request: any, response: any, next: any) {
            const args = {
                    invoiceId: {"in":"body-prop","name":"invoiceId","required":true,"dataType":"double"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetInvoiceController();


              const promise = controller.voidInvoice.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/invoice/getUnsyncedInvoices',
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController)),
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController.prototype.getUnsyncedInvoices)),

            function GetInvoiceController_getUnsyncedInvoices(request: any, response: any, next: any) {
            const args = {
                    keyword: {"in":"query","name":"keyword","dataType":"string"},
                    customerId: {"in":"query","name":"customerId","dataType":"string"},
                    status: {"in":"query","name":"status","ref":"InvoiceStatus"},
                    dueDate: {"in":"query","name":"dueDate","dataType":"string"},
                    startDate: {"in":"query","name":"startDate","dataType":"string"},
                    endDate: {"in":"query","name":"endDate","dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetInvoiceController();


              const promise = controller.getUnsyncedInvoices.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/invoice/getCompanyInvoices',
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController)),
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController.prototype.getCompanyInvoices)),

            function GetInvoiceController_getCompanyInvoices(request: any, response: any, next: any) {
            const args = {
                    compantId: {"in":"query","name":"compantId","dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetInvoiceController();


              const promise = controller.getCompanyInvoices.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/invoice/getCompanyInvoiceDetails',
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController)),
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController.prototype.getCompanyInvoiceDetails)),

            function GetInvoiceController_getCompanyInvoiceDetails(request: any, response: any, next: any) {
            const args = {
                    companyInvoiceId: {"in":"query","name":"companyInvoiceId","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetInvoiceController();


              const promise = controller.getCompanyInvoiceDetails.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/invoice/getInvoicesByCustomerId',
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController)),
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController.prototype.getInvoicesByCustomerId)),

            function GetInvoiceController_getInvoicesByCustomerId(request: any, response: any, next: any) {
            const args = {
                    customerId: {"in":"query","name":"customerId","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetInvoiceController();


              const promise = controller.getInvoicesByCustomerId.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/invoice/getInvoicesByContractor',
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController)),
            ...(fetchMiddlewares<RequestHandler>(GetInvoiceController.prototype.getInvoicesByContractor)),

            function GetInvoiceController_getInvoicesByContractor(request: any, response: any, next: any) {
            const args = {
                    type: {"in":"query","name":"type","required":true,"dataType":"union","subSchemas":[{"dataType":"enum","enums":["vendor"]},{"dataType":"enum","enums":["employee"]}]},
                    id: {"in":"query","name":"id","required":true,"dataType":"string"},
                    name: {"in":"query","name":"name","dataType":"string"},
                    startDate: {"in":"query","name":"startDate","dataType":"string"},
                    endDate: {"in":"query","name":"endDate","dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetInvoiceController();


              const promise = controller.getInvoicesByContractor.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v3/job-location',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(JobLocationController)),
            ...(fetchMiddlewares<RequestHandler>(JobLocationController.prototype.addJobLocation)),

            function JobLocationController_addJobLocation(request: any, response: any, next: any) {
            const args = {
                    req: {"in":"request","name":"req","required":true,"dataType":"object"},
                    body: {"in":"body","name":"body","required":true,"ref":"ICreatedJobLocation"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new JobLocationController();


              const promise = controller.addJobLocation.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/job-location',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(JobLocationController)),
            ...(fetchMiddlewares<RequestHandler>(JobLocationController.prototype.getJobLocation)),

            function JobLocationController_getJobLocation(request: any, response: any, next: any) {
            const args = {
                    req: {"in":"request","name":"req","required":true,"dataType":"object"},
                    id: {"in":"query","name":"id","dataType":"double"},
                    customerId: {"in":"query","name":"customerId","dataType":"double"},
                    companyId: {"in":"query","name":"companyId","dataType":"double"},
                    isActive: {"in":"query","name":"isActive","dataType":"union","subSchemas":[{"dataType":"boolean"},{"dataType":"string"}]},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new JobLocationController();


              const promise = controller.getJobLocation.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.put('/api/v3/job-location/reset-quick-book',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(JobLocationController)),
            ...(fetchMiddlewares<RequestHandler>(JobLocationController.prototype.updateResetQbJobLocation)),

            function JobLocationController_updateResetQbJobLocation(request: any, response: any, next: any) {
            const args = {
                    req: {"in":"request","name":"req","required":true,"dataType":"object"},
                    params: {"in":"body","name":"params","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"companyId":{"dataType":"double","required":true}}},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new JobLocationController();


              const promise = controller.updateResetQbJobLocation.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.put('/api/v3/job-location/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(JobLocationController)),
            ...(fetchMiddlewares<RequestHandler>(JobLocationController.prototype.updateJobLocation)),

            function JobLocationController_updateJobLocation(request: any, response: any, next: any) {
            const args = {
                    req: {"in":"request","name":"req","required":true,"dataType":"object"},
                    id: {"in":"path","name":"id","required":true,"dataType":"double"},
                    params: {"in":"body","name":"params","required":true,"ref":"IUpdateJobLocation"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new JobLocationController();


              const promise = controller.updateJobLocation.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.delete('/api/v3/job-location/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(JobLocationController)),
            ...(fetchMiddlewares<RequestHandler>(JobLocationController.prototype.deleteJobLocation)),

            function JobLocationController_deleteJobLocation(request: any, response: any, next: any) {
            const args = {
                    req: {"in":"request","name":"req","required":true,"dataType":"object"},
                    id: {"in":"path","name":"id","required":true,"dataType":"double"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new JobLocationController();


              const promise = controller.deleteJobLocation.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/job-reports',
            ...(fetchMiddlewares<RequestHandler>(JobReportsController)),
            ...(fetchMiddlewares<RequestHandler>(JobReportsController.prototype.getAll)),

            function JobReportsController_getAll(request: any, response: any, next: any) {
            const args = {
                    keyword: {"in":"query","name":"keyword","dataType":"string"},
                    startDate: {"in":"query","name":"startDate","dataType":"string"},
                    endDate: {"in":"query","name":"endDate","dataType":"string"},
                    currentPage: {"in":"query","name":"currentPage","dataType":"double"},
                    pageSize: {"in":"query","name":"pageSize","dataType":"double"},
                    req: {"in":"request","name":"req","dataType":"object"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new JobReportsController();


              const promise = controller.getAll.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/job-reports/:jobReportId',
            ...(fetchMiddlewares<RequestHandler>(JobReportsController)),
            ...(fetchMiddlewares<RequestHandler>(JobReportsController.prototype.getDetails)),

            function JobReportsController_getDetails(request: any, response: any, next: any) {
            const args = {
                    jobReportId: {"in":"path","name":"jobReportId","required":true,"dataType":"double"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new JobReportsController();


              const promise = controller.getDetails.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.delete('/api/v3/job-reports/:jobReportId',
            ...(fetchMiddlewares<RequestHandler>(JobReportsController)),
            ...(fetchMiddlewares<RequestHandler>(JobReportsController.prototype.delete)),

            function JobReportsController_delete(request: any, response: any, next: any) {
            const args = {
                    jobReportId: {"in":"path","name":"jobReportId","required":true,"dataType":"double"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new JobReportsController();


              const promise = controller.delete.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v3/job-reports/send',
            ...(fetchMiddlewares<RequestHandler>(JobReportsController)),
            ...(fetchMiddlewares<RequestHandler>(JobReportsController.prototype.sendReport)),

            function JobReportsController_sendReport(request: any, response: any, next: any) {
            const args = {
                    jobReportId: {"in":"body","name":"jobReportId","required":true,"dataType":"double"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new JobReportsController();


              const promise = controller.sendReport.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/job-reports/email-template/:jobReportId',
            ...(fetchMiddlewares<RequestHandler>(JobReportsController)),
            ...(fetchMiddlewares<RequestHandler>(JobReportsController.prototype.getEmailTemplate)),

            function JobReportsController_getEmailTemplate(request: any, response: any, next: any) {
            const args = {
                    jobReportId: {"in":"path","name":"jobReportId","required":true,"dataType":"double"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new JobReportsController();


              const promise = controller.getEmailTemplate.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/jobs/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(JobsController)),
            ...(fetchMiddlewares<RequestHandler>(JobsController.prototype.getJob)),

            function JobsController_getJob(request: any, response: any, next: any) {
            const args = {
                    req: {"in":"request","name":"req","required":true,"dataType":"object"},
                    id: {"in":"path","name":"id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new JobsController();


              const promise = controller.getJob.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v3/jobs',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(JobsController)),
            ...(fetchMiddlewares<RequestHandler>(JobsController.prototype.addJob)),

            function JobsController_addJob(request: any, response: any, next: any) {
            const args = {
                    req: {"in":"request","name":"req","required":true,"dataType":"object"},
                    body: {"in":"body","name":"body","required":true,"ref":"IJobInput"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new JobsController();


              const promise = controller.addJob.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/job-sites',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(JobSiteController)),
            ...(fetchMiddlewares<RequestHandler>(JobSiteController.prototype.getJobSite)),

            function JobSiteController_getJobSite(request: any, response: any, next: any) {
            const args = {
                    req: {"in":"request","name":"req","required":true,"dataType":"object"},
                    id: {"in":"query","name":"id","dataType":"double"},
                    customerId: {"in":"query","name":"customerId","dataType":"double"},
                    homeOwnerId: {"in":"query","name":"homeOwnerId","dataType":"double"},
                    locationId: {"in":"query","name":"locationId","dataType":"double"},
                    isActive: {"in":"query","name":"isActive","dataType":"union","subSchemas":[{"dataType":"boolean"},{"dataType":"string"}]},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new JobSiteController();


              const promise = controller.getJobSite.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v3/job-sites',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(JobSiteController)),
            ...(fetchMiddlewares<RequestHandler>(JobSiteController.prototype.addJobSite)),

            function JobSiteController_addJobSite(request: any, response: any, next: any) {
            const args = {
                    req: {"in":"request","name":"req","required":true,"dataType":"object"},
                    params: {"in":"body","name":"params","required":true,"ref":"ICreateJobSiteInput"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new JobSiteController();


              const promise = controller.addJobSite.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.put('/api/v3/job-sites/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(JobSiteController)),
            ...(fetchMiddlewares<RequestHandler>(JobSiteController.prototype.updateJobSite)),

            function JobSiteController_updateJobSite(request: any, response: any, next: any) {
            const args = {
                    req: {"in":"request","name":"req","required":true,"dataType":"object"},
                    id: {"in":"path","name":"id","required":true,"dataType":"double"},
                    params: {"in":"body","name":"params","required":true,"ref":"IUpdateJobSiteArgs"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new JobSiteController();


              const promise = controller.updateJobSite.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.delete('/api/v3/job-sites/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(JobSiteController)),
            ...(fetchMiddlewares<RequestHandler>(JobSiteController.prototype.deleteJobSite)),

            function JobSiteController_deleteJobSite(request: any, response: any, next: any) {
            const args = {
                    req: {"in":"request","name":"req","required":true,"dataType":"object"},
                    id: {"in":"path","name":"id","required":true,"dataType":"double"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new JobSiteController();


              const promise = controller.deleteJobSite.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/service-tickets',
            ...(fetchMiddlewares<RequestHandler>(GetServiceTicketsController)),
            ...(fetchMiddlewares<RequestHandler>(GetServiceTicketsController.prototype.getServiceTickets)),

            function GetServiceTicketsController_getServiceTickets(request: any, response: any, next: any) {
            const args = {
                    type: {"in":"query","name":"type","required":true,"dataType":"union","subSchemas":[{"dataType":"enum","enums":["Ticket"]},{"dataType":"enum","enums":["PO Request"]},{"dataType":"enum","enums":["All PO Request"]}]},
                    keyword: {"in":"query","name":"keyword","dataType":"string"},
                    status: {"in":"query","name":"status","dataType":"double"},
                    startDate: {"in":"query","name":"startDate","dataType":"string"},
                    endDate: {"in":"query","name":"endDate","dataType":"string"},
                    customerId: {"in":"query","name":"customerId","dataType":"double"},
                    technicianIds: {"in":"query","name":"technicianIds","dataType":"array","array":{"dataType":"double"}},
                    nextCursor: {"in":"query","name":"nextCursor","dataType":"string"},
                    previousCursor: {"in":"query","name":"previousCursor","dataType":"string"},
                    currentPage: {"default":0,"in":"query","name":"currentPage","dataType":"double"},
                    pageSize: {"default":30,"in":"query","name":"pageSize","dataType":"double"},
                    companyId: {"in":"query","name":"companyId","dataType":"double"},
                    workType: {"in":"query","name":"workType","dataType":"any"},
                    companyLocation: {"in":"query","name":"companyLocation","dataType":"any"},
                    isHomeOccupied: {"in":"query","name":"isHomeOccupied","dataType":"boolean"},
                    bouncedEmailFlag: {"in":"query","name":"bouncedEmailFlag","dataType":"boolean"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetServiceTicketsController();


              const promise = controller.getServiceTickets.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/service-tickets/:id',
            ...(fetchMiddlewares<RequestHandler>(GetServiceTicketsController)),
            ...(fetchMiddlewares<RequestHandler>(GetServiceTicketsController.prototype.getServiceTicketDetail)),

            function GetServiceTicketsController_getServiceTicketDetail(request: any, response: any, next: any) {
            const args = {
                    id: {"in":"path","name":"id","required":true,"dataType":"double"},
                    companyId: {"in":"query","name":"companyId","dataType":"double"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetServiceTicketsController();


              const promise = controller.getServiceTicketDetail.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v3/service-tickets',
            ...(fetchMiddlewares<RequestHandler>(GetServiceTicketsController)),
            ...(fetchMiddlewares<RequestHandler>(GetServiceTicketsController.prototype.createServiceTicket)),

            function GetServiceTicketsController_createServiceTicket(request: any, response: any, next: any) {
            const args = {
                    body: {"in":"body","name":"body","required":true,"ref":"ICreateServiceTicketInput"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetServiceTicketsController();


              const promise = controller.createServiceTicket.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.put('/api/v3/service-tickets/:id',
            ...(fetchMiddlewares<RequestHandler>(GetServiceTicketsController)),
            ...(fetchMiddlewares<RequestHandler>(GetServiceTicketsController.prototype.updateServiceTicket)),

            function GetServiceTicketsController_updateServiceTicket(request: any, response: any, next: any) {
            const args = {
                    id: {"in":"path","name":"id","required":true,"dataType":"double"},
                    body: {"in":"body","name":"body","required":true,"ref":"IUpdateServiceTicketInput"},
                    companyId: {"in":"query","name":"companyId","dataType":"double"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetServiceTicketsController();


              const promise = controller.updateServiceTicket.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.patch('/api/v3/service-tickets/:id',
            ...(fetchMiddlewares<RequestHandler>(GetServiceTicketsController)),
            ...(fetchMiddlewares<RequestHandler>(GetServiceTicketsController.prototype.editStatusServiceTicket)),

            function GetServiceTicketsController_editStatusServiceTicket(request: any, response: any, next: any) {
            const args = {
                    id: {"in":"path","name":"id","required":true,"dataType":"double"},
                    body: {"in":"body","name":"body","required":true,"ref":"IUpdateStatusServiceTicketInput"},
                    companyId: {"in":"query","name":"companyId","dataType":"double"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetServiceTicketsController();


              const promise = controller.editStatusServiceTicket.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.delete('/api/v3/service-tickets/:id',
            ...(fetchMiddlewares<RequestHandler>(GetServiceTicketsController)),
            ...(fetchMiddlewares<RequestHandler>(GetServiceTicketsController.prototype.deleteServiceTicket)),

            function GetServiceTicketsController_deleteServiceTicket(request: any, response: any, next: any) {
            const args = {
                    id: {"in":"path","name":"id","required":true,"dataType":"double"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetServiceTicketsController();


              const promise = controller.deleteServiceTicket.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.get('/api/v3/service-tickets/po-request-email-template/:id',
            ...(fetchMiddlewares<RequestHandler>(GetServiceTicketsController)),
            ...(fetchMiddlewares<RequestHandler>(GetServiceTicketsController.prototype.getPORequestEmailTemplate)),

            function GetServiceTicketsController_getPORequestEmailTemplate(request: any, response: any, next: any) {
            const args = {
                    id: {"in":"path","name":"id","required":true,"dataType":"double"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new GetServiceTicketsController();


              const promise = controller.getPORequestEmailTemplate.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v3/users/login',
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.login)),

            function UsersController_login(request: any, response: any, next: any) {
            const args = {
                    req: {"in":"request","name":"req","required":true,"dataType":"object"},
                    body: {"in":"body","name":"body","required":true,"ref":"ILoginInput"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new UsersController();


              const promise = controller.login.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v3/users/signup',
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.signup)),

            function UsersController_signup(request: any, response: any, next: any) {
            const args = {
                    req: {"in":"request","name":"req","required":true,"dataType":"object"},
                    body: {"in":"body","name":"body","required":true,"ref":"IUserRegister"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const controller = new UsersController();


              const promise = controller.signup.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function authenticateMiddleware(security: TsoaRoute.Security[] = []) {
        return async function runAuthenticationMiddleware(request: any, _response: any, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            // keep track of failed auth attempts so we can hand back the most
            // recent one.  This behavior was previously existing so preserving it
            // here
            const failedAttempts: any[] = [];
            const pushAndRethrow = (error: any) => {
                failedAttempts.push(error);
                throw error;
            };

            const secMethodOrPromises: Promise<any>[] = [];
            for (const secMethod of security) {
                if (Object.keys(secMethod).length > 1) {
                    const secMethodAndPromises: Promise<any>[] = [];

                    for (const name in secMethod) {
                        secMethodAndPromises.push(
                            expressAuthentication(request, name, secMethod[name])
                                .catch(pushAndRethrow)
                        );
                    }

                    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

                    secMethodOrPromises.push(Promise.all(secMethodAndPromises)
                        .then(users => { return users[0]; }));
                } else {
                    for (const name in secMethod) {
                        secMethodOrPromises.push(
                            expressAuthentication(request, name, secMethod[name])
                                .catch(pushAndRethrow)
                        );
                    }
                }
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            try {
                request['user'] = await promiseAny(secMethodOrPromises);
                next();
            }
            catch(err) {
                // Show most recent error as response
                const error = failedAttempts.pop();
                error.status = error.status || 401;
                next(error);
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        }
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function isController(object: any): object is Controller {
        return 'getHeaders' in object && 'getStatus' in object && 'setStatus' in object;
    }

    function promiseHandler(controllerObj: any, promise: any, response: any, successStatus: any, next: any) {
        return Promise.resolve(promise)
            .then((data: any) => {
                let statusCode = successStatus;
                let headers;
                if (isController(controllerObj)) {
                    headers = controllerObj.getHeaders();
                    statusCode = controllerObj.getStatus() || statusCode;
                }

                // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

                returnHandler(response, statusCode, data, headers)
            })
            .catch((error: any) => next(error));
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function returnHandler(response: any, statusCode?: number, data?: any, headers: any = {}) {
        if (response.headersSent) {
            return;
        }
        Object.keys(headers).forEach((name: string) => {
            response.set(name, headers[name]);
        });
        if (data && typeof data.pipe === 'function' && data.readable && typeof data._read === 'function') {
            data.pipe(response);
        } else if (data !== null && data !== undefined) {
            response.status(statusCode || 200).json(data);
        } else {
            response.status(statusCode || 204).end();
        }
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function responder(response: any): TsoaResponse<HttpStatusCodeLiteral, unknown>  {
        return function(status, data, headers) {
            returnHandler(response, status, data, headers);
        };
    };

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function getValidatedArgs(args: any, request: any, response: any): any[] {
        const fieldErrors: FieldErrors  = {};
        const values = Object.keys(args).map((key) => {
            const name = args[key].name;
            switch (args[key].in) {
                case 'request':
                    return request;
                case 'query':
                    return validationService.ValidateParam(args[key], request.query[name], name, fieldErrors, undefined, {"noImplicitAdditionalProperties":"throw-on-extras"});
                case 'path':
                    return validationService.ValidateParam(args[key], request.params[name], name, fieldErrors, undefined, {"noImplicitAdditionalProperties":"throw-on-extras"});
                case 'header':
                    return validationService.ValidateParam(args[key], request.header(name), name, fieldErrors, undefined, {"noImplicitAdditionalProperties":"throw-on-extras"});
                case 'body':
                    return validationService.ValidateParam(args[key], request.body, name, fieldErrors, undefined, {"noImplicitAdditionalProperties":"throw-on-extras"});
                case 'body-prop':
                    return validationService.ValidateParam(args[key], request.body[name], name, fieldErrors, 'body.', {"noImplicitAdditionalProperties":"throw-on-extras"});
                case 'formData':
                    if (args[key].dataType === 'file') {
                        return validationService.ValidateParam(args[key], request.file, name, fieldErrors, undefined, {"noImplicitAdditionalProperties":"throw-on-extras"});
                    } else if (args[key].dataType === 'array' && args[key].array.dataType === 'file') {
                        return validationService.ValidateParam(args[key], request.files, name, fieldErrors, undefined, {"noImplicitAdditionalProperties":"throw-on-extras"});
                    } else {
                        return validationService.ValidateParam(args[key], request.body[name], name, fieldErrors, undefined, {"noImplicitAdditionalProperties":"throw-on-extras"});
                    }
                case 'res':
                    return responder(response);
            }
        });

        if (Object.keys(fieldErrors).length > 0) {
            throw new ValidateError(fieldErrors, '');
        }
        return values;
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
