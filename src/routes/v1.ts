import express from 'express'
import { validate, Validations } from '../middleware/validator'
import passport from 'passport'
import {
    checkPermissions,
    checkSpecificPermissions,
    checkUserPermissions,
    checkUserScanPermissions
} from '../middleware/permissions'
import { uploadInvoices, uploadImageInS3 } from '../middleware/multer';
import { getCompanyId } from '../middleware/company'
import { getSupplierId } from '../middleware/supplier';
import { refreshQBToken } from '../middleware/quickbook';
import { getTechnicianContractor } from '../middleware/job'

import { Role, Permissions } from '../common/constants'

import * as userController from '../controllers/user'
import * as vendorController from '../controllers/vendor'
import * as jobTypeController from '../controllers/jobType'
import * as itemController from '../controllers/item'
import * as equipmentTypeController from '../controllers/equipmentType'
import * as equipmentBrandController from '../controllers/equipmentBrand'
import * as customerController from '../controllers/customer'
import * as customerEquipmentController from '../controllers/customerEquipment'
import * as industryController from '../controllers/industry'
import * as jobController from '../controllers/job'
import * as jobRouteController from '../controllers/jobRoute'
import * as imageController from '../controllers/image'
import * as groupController from '../controllers/group'
import * as companyEquipmentController from '../controllers/companyEquipment'
import * as orderController from '../controllers/order'
import * as companyEquipmentHistoryController from '../controllers/companyEquipmentHistory'
import * as companyEquipmentInventoryController from '../controllers/companyEquipmentInventory'
import * as companyCardController from '../controllers/companyCard'
import * as companyLocationController from '../controllers/companyLocation';
import * as subscriptionController from '../controllers/subscription'
import * as permissionController from '../controllers/permission'
import * as customerImportController from '../controllers/customerImport'
import * as serviceTicketController from '../controllers/serviceTicket'
import * as quickBookController from '../controllers/quickbook'
import * as quickBookCustomerController from '../controllers/quickbook.customer'
import * as quickBookItemController from '../controllers/quickbook.item'
import * as quickBookPaymentTermController from '../controllers/quickbook.paymentTerm'
import * as quickBookInvoiceController from '../controllers/quickbook.invoice'
import * as quickBookPaymentController from '../controllers/quickbook.payment'
import * as companyController from '../controllers/company'
import * as emailDefaultController from '../controllers/emailDefault'
import * as invoiceController from '../controllers/invoice'
import * as paymentAdvanceController from '../controllers/advancePayment'
import * as partController from '../controllers/part'
import * as purchaseOrderController from '../controllers/purchaseOrder'
import * as estimateController from '../controllers/estimate'
import * as paymentController from '../controllers/payment'
import * as paymentTermController from '../controllers/paymentTerm'
import * as reportController from '../controllers/report';
import * as tagController from '../controllers/tag'
import * as ContactController from '../controllers/contact';
import * as notificationController from '../controllers/notification';
import * as integrationController from '../controllers/integration';
import * as scriptController from '../controllers/script';

import jobLocation from './jobLocation'
import jobSite from './jobSite'
import chat from './chat';
import { isLogin } from '../middleware/session';

export default function (sio: any) {

    const router: express.Router = express.Router()

    router.use('/jobLocation', jobLocation)
    router.use('/jobSite', jobSite)
    router.use('/chats', chat);

    // Auth
    router.post(
        '/login',
        validate(Validations.login),
        (req, res) => {
            userController.login(req, res, sio)
        }
    )

    // Used for Service Provider Sign Up
    router.get(
        '/getAllCompanies',
        companyController.getAllCompanies
    )

    // Used for Builder Sign Up
    router.get(
        '/getAllCustomers',
        customerController.getAllCustomers
    )

    router.post(
        '/logout',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        userController.logout
    )

    router.post(
        '/subscribe',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        userController.companySubscribe
    )

    router.post(
        '/agreeTermAndCondition',
        passport.authenticate('jwt', { session: false }),
        validate(Validations.agree),
        userController.agreeToTermAndConditions
    )

    // router.post(
    //     '/signup',
    //     validate(Validations.signUp),
    //     (req, res) => {
    //         userController.createCompany(req, res, sio)
    //     }
    // )

    router.post(
        '/signup',
        validate(Validations.signUp),
        (req, res) => {
            userController.signup(req, res, sio)
        }
    )

    router.post(
        '/adminSignUp',
        validate(Validations.adminSignUp),
        (req, res) => {
            userController.createGlobalAdmin(req, res, sio)
        }
    )

    router.get(
        '/getCompanyProfile/:companyId',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        userController.getCompanyProfile
    )

    router.post(
        '/getDefaultPermissions',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Permission_Get_All),
        permissionController.getAllPermissions
    )

    router.post(
        '/updateDefaultPermissions',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Permission_Update_Default),
        validate(Validations.updateDefaultPermissions),
        permissionController.updateDefaultPermissions
    )

    router.post(
        '/getOfficeAdminPermissions',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Permission_Get_Office_Admin),
        permissionController.getOfficeAdminPermissions
    )

    router.post(
        '/getTechPermissions',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Permission_Get_Tech),
        permissionController.getTechPermissions
    )

    router.post(
        '/getManagerPermissions',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Permission_Get_Manager),
        permissionController.getManagerPermissions
    )

    router.post(
        '/updateUserPermissions',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Permission_Update_Employee),
        validate(Validations.udpateUserPermissions),
        permissionController.updateUserPermissions
    )

    router.post(
        '/updateEmployeeEmailPreferences',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkPermissions(Role.TECHNICIAN),
        validate(Validations.updateEmployeeEmailPreferences),
        companyController.updateEmployeeEmailPreferences
    )
    router.post(
        '/updateContractorEmailPreferences',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkPermissions(Role.ADMIN_EMPLOYEE),
        validate(Validations.updateContractorEmailPreferences),
        companyController.updateContractorEmailPreferences
    )
    router.post(
        '/updateCustomerEmailPreferences',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkPermissions(Role.ADMIN_EMPLOYEE),
        validate(Validations.updateCustomerEmailPreferences),
        companyController.updateCustomerEmailPreferences

    )
    router.post(
        '/getEmployeePermissions',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Permission_Get_Employee),
        validate(Validations.employeePermissions),
        permissionController.getUserPermissions
    )


    //Industry
    router.post(
        '/createIndustry',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        checkPermissions(Role.GLOBAL_ADMIN),
        validate(Validations.createIndustry),
        industryController.createIndustry
    )

    router.post(
        '/getIndustries',
        industryController.getIndustries
    )

    // router.post(
    //     '/removeIndustry',
    //     passport.authenticate('jwt', { session: false }),
    //     checkPermissions(Role.GLOBAL_ADMIN),
    //     validate(Validations.removeIndustry),
    //     industryController.removeIndustry
    // )

    //Users
    router.post(
        '/createManager',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.User_Create_Manager),
        validate(Validations.createManager),
        getCompanyId(),
        userController.createManager
    )

    router.post(
        '/createTechnician',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.User_Create_Technician),
        validate(Validations.createTechnician),
        getCompanyId(),
        userController.createTechnician
    )

    router.post(
        '/createOfficeAdmin',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.User_Create_Office_Admin),
        validate(Validations.createOfficeAdmin),
        getCompanyId(),
        userController.createOfficeAdmin
    )

    router.post(
        '/createAdminEmployee',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.User_Create_Office_Admin),
        validate(Validations.createOfficeAdmin),
        getCompanyId(),
        userController.createAdminEmployee
    )

    router.post(
        '/updateEmployeeRole',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.User_Get_All_Employees),
        validate(Validations.changeEmployeeRole),
        userController.updateEmployeeRole
    )

    router.post(
        '/getManagers',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.User_Get_Manager),
        getCompanyId(),
        userController.getManagersList
    )

    router.post(
        '/getTechnicians',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.User_Get_Technician),
        getCompanyId(),
        userController.getTechniciansList
    )

    router.post(
        '/getOfficeAdmins',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.User_Get_Office_Admin),
        getCompanyId(),
        userController.getOfficeAdminsList)

    router.post(
        '/updateProfile',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.User_Update_Profile),
        //validate(Validations.updateProfile),
        userController.updateProfile)

    router.post(
        '/changePassword',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.User_Change_Password),
        validate(Validations.changePassword),
        userController.changePassword)

    router.post(
        '/forgotPassword',
        validate(Validations.forgotPassword),
        userController.forgotPassword)


    router.post(
        '/deleteEmployee',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.User_Delete_Employee),
        validate(Validations.deleteEmployee),
        userController.deleteEmployee)

    router.post(
        '/activateEmployee',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.User_Activate_Employee),
        validate(Validations.deleteEmployee),
        userController.activateEmployee)



    //Equipment types
    router.post(
        '/createEquipmentType',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Equipment_Type_Create),
        validate(Validations.createEquipmentType),
        equipmentTypeController.createEquipmentType
    )

    router.post(
        '/getEquipmentTypes',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Equipment_Type_Get),
        equipmentTypeController.getEquipmentTypes)

    //Equipment brands
    router.post(
        '/createEquipmentBrand',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Equipment_Brand_Create),
        validate(Validations.createEquipmentBrand),
        equipmentBrandController.createEquipmentBrand
    )

    router.post(
        '/getEquipmentBrands',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Equipment_Brand_Get),
        equipmentBrandController.getEquipmentBrands
    )

    // COMPANY LOCATION
    router.get(
        '/getCompanyLocations',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Update_Company_Profile),
        companyLocationController.getCompanyLocations
    )

    router.post(
        '/createCompanyLocation',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Update_Company_Profile),
        validate(Validations.createCompanyLocation),
        companyLocationController.createCompanyLocation
    )

    router.put(
        '/updateCompanyLocation',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Update_Company_Profile),
        validate(Validations.updateCompanyLocation),
        companyLocationController.updateCompanyLocation
    )

    // Customers
    router.post(
        '/createCustomer',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Customer_Create),
        validate(Validations.createCustomer),
        customerController.createCustomer
    )

    router.post(
        '/getCustomers',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Customer_Get_All),
        validate(Validations.getCustomers),
        customerController.getCustomers
    )

    router.post(
        '/getCustomerDetail',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Customer_Detail),
        validate(Validations.getCustomerDetail),
        customerController.customerDetail
    )

    router.post(
        '/updateCustomer',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Customer_Update),
        validate(Validations.updateCustomer),
        customerController.updateCustomer
    )

    router.post(
        '/updateCustomPrices',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Customer_Update),
        validate(Validations.updateCustomPrices),
        customerController.updateCustomPrices
    )

    router.post(
        '/searchDuplicatedCustomers',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Customer_Get_All),
        validate(Validations.searchDuplicatedCustomers),
        refreshQBToken(),
        customerController.searchDuplicatedCustomers
    )

    router.post(
        '/mergeCustomers',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Customer_Update),
        validate(Validations.mergeCustomers),
        customerController.mergeCustomers
    )

    router.get(
        '/getSupplierBuilders',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getSupplierId(),
        // checkUserPermissions(Permissions.Customer_Get_All),
        customerController.getSupplierBuilders
    )

    //Customer equipments
    router.post(
        '/createCustomerEquipment',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Customer_Equipment_Create),
        validate(Validations.createCustomerEquipment),
        customerEquipmentController.createCustomerEquipment
    )

    router.post(
        '/getCustomerEquipments',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Customer_Equipment_Get_All),
        validate(Validations.getCustomerEquipments),
        customerEquipmentController.getCustomerEquipments
    )

    router.post(
        '/getCustomerEquipmentJobs',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Customer_Equipment_Get_Jobs),
        validate(Validations.getCustomerEquipmentJobs),
        customerEquipmentController.getCustomerEquipmentJobs
    )

    router.post(
        '/getEquipmentInfo',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Customer_Equipment_Get_All),
        validate(Validations.getCustomerEquipmentInfo),
        customerEquipmentController.getCustomerEquipmentInfo
    )

    router.post(
        '/getEquipmentJobs',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Customer_Equipment_Get_All),
        validate(Validations.getCustomerEquipmentInfo),
        customerEquipmentController.getEquipmentJobs
    )

    router.post(
        '/scanJobEquipment',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Customer_Equipment_Assign_Job),
        validate(Validations.linkEquipmentJob),
        customerEquipmentController.linkJobToEquipment
    )

    router.post(
        '/scanTag',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserScanPermissions(Permissions.Scan_Tag),
        validate(Validations.getCustomerEquipmentJobs),
        customerEquipmentController.checkTagAssociation
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

    // Discount Item

    router.get(
        '/getDiscountItems',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Items),
        validate(Validations.getDiscountItems),
        itemController.getDiscountItems
    )

    router.post(
        '/createDiscountItem',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Type_Create),
        validate(Validations.createDiscountItem),
        itemController.createDiscountItem
    )

    router.put(
        '/updateDiscountItem',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Type_Create),
        validate(Validations.updateDiscountItem),
        itemController.updateDiscountItem
    )

    // Job

    router.post(
        '/createJob',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Create),
        // uploadImageInS3.array('images'),
        uploadImageInS3.fields([{ name: 'image' }, { name: 'images' }]),
        validate(Validations.createJob),
        jobController.createJob
    )

    router.post(
        '/createSubJob',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Create),
        validate(Validations.createSubJob),
        jobController.createSubJob
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
        '/getJobsStream',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Get_All),
        (req, res) => {
            jobController.getJobsStream(req, res, sio)
        }
    )

    router.post(
        '/searchJobs',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Get_All),
        validate(Validations.searchJob),
        jobController.getFilteredJobs
    )

    router.post(
        '/getTechnicianJobs',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Get_Technician),
        validate(Validations.technicianJobs),
        jobController.getJobsByTechnicianId
    )

    router.post(
        '/getTechnicianJobsToday',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Get_Technician),
        validate(Validations.technicianJobs),
        jobController.getTodaysJobsByTechnicianId
    )

    router.get(
        '/getScheduledJobsStream',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Get_All),
        (req, res) => {
            jobController.getJobsStream(req, res, sio)
        }
    )

    router.post(
        '/updateJob',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Update),
        // uploadImageInS3.array('images'),
        uploadImageInS3.fields([{ name: 'image' }, { name: 'images' }]),
        validate(Validations.updateJob),
        (req, res) => {
            jobController.updateJob(req, res, sio)
        }
    )

    router.post(
        '/startJob',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Start),
        validate(Validations.generalJob),
        jobController.startJob
    )

    router.post(
        '/startJobTask',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Start),
        validate(Validations.startJobTask),
        jobController.startJobTask
    )

    router.post(
        '/updateJobTask',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Update),
        validate(Validations.updateJobTask),
        jobController.updateJobTask
    )

    router.post(
        '/getJobDetails',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Detail),
        validate(Validations.generalJob),
        jobController.getJobDetails
    )

    router.post(
        '/editJob',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Edit),
        // uploadImageInS3.array('images'),
        uploadImageInS3.fields([{ name: 'image' }, { name: 'images' }]),
        validate(Validations.editJob),
        jobController.editJob
    )

    router.put(
        '/updateJobRequestStatus',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Update),
        validate(Validations.updateJoBRequestStatus),
        jobController.updateJobRequestStatus
    )

    router.post(
        '/updateJobTechnicianStatus',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Edit),
        uploadImageInS3.fields([{ name: 'images' }]),
        validate(Validations.updateJobTechnicianStatus),
        (req, res) => {
            jobController.updateJobTechnicianStatus(req, res, sio)
        }
    )

    router.post(
        '/updateJobTime',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Edit),
        validate(Validations.updateJobTime),
        jobController.updateJobTime
    )

    // JOB ROUTE

    router.get(
        '/getAllJobRoutes',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Get_Technician),
        jobRouteController.getAllJobRoutes
    )

    router.get(
        '/getJobRoute',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Get_Technician),
        validate(Validations.jobRoute),
        getTechnicianContractor(),
        jobRouteController.getJobRoute
    )

    router.post(
        '/createJobRoute',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Get_Technician),
        validate(Validations.jobRoute),
        validate(Validations.createJobRoute),
        jobRouteController.createJobRoute
    )

    router.put(
        '/updateJobRoute',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Job_Get_Technician),
        validate(Validations.updateJobRoute),
        jobRouteController.updateJobRoute
    )

    // JOB REPORT

    router.get(
        '/getJobReport',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Job_Report),
        validate(Validations.getJobReport),
        jobController.getJobReportDetails
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

    router.delete(
        '/deleteJobReport',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Job_Report),
        validate(Validations.deleteJobReport),
        jobController.deleteJobReportById
    )

    //Image upload
    router.post(
        '/uploadImage',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        checkUserPermissions(Permissions.Image_Upload),
        imageController.uploadImage
    )

    router.delete(
        '/deleteImage',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Image_Upload),
        validate(Validations.deleteImage),
        imageController.deleteImage
    )

    //Group
    router.post(
        '/createGroup',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Group_Create),
        validate(Validations.createGroup),
        groupController.createGroup
    )

    router.post(
        '/getGroups',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Group_Get_All),
        groupController.getGroups
    )

    router.post(
        '/deleteGroup',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Group_Delete),
        validate(Validations.groupGeneric),
        groupController.deleteGroup
    )

    router.post(
        '/addGroupManager',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Group_Add_Manager),
        validate(Validations.addManager),
        groupController.addManager
    )

    router.post(
        '/addGroupMember',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Group_Add_Member),
        validate(Validations.memberGeneric),
        groupController.addMember
    )

    router.post(
        '/removeGroupMember',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Group_Remove_Member),
        validate(Validations.memberGeneric),
        groupController.removeMember
    )


    //Company Equipment
    router.post(
        '/createCompanyEquipment',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Company_Equipment_Create),
        validate(Validations.createCompanyEquipment),
        companyEquipmentController.createCompanyEquipment
    )

    router.post(
        '/getCompanyEquipments',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Company_Equipment_Get),
        companyEquipmentController.getCompanyEquipments
    )

    // Company Equipment History
    router.post(
        '/equipmentCheckInOut',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Company_Equipment_Check_In_Out),
        validate(Validations.createCompanyEquipmentHistory),
        companyEquipmentHistoryController.createCompanyEquipmentHistory
    )

    // Company Equipment Inventory
    router.post(
        '/takeInventory',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Inventory_Take),
        validate(Validations.createEquipmentInventory),
        companyEquipmentInventoryController.createCompanyEquipmentInventory
    )

    router.post(
        '/getInventoryReport',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Inventory_Report),
        companyEquipmentInventoryController.getIventoryHistory
    )


    // Company cards
    router.post(
        '/addCompanyCard',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Company_Card_Add),
        validate(Validations.addCompanyCard),
        companyCardController.createCompanyCard
    )

    router.post(
        '/removeCompanyCard',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Company_Card_Remove),
        validate(Validations.removeCompanyCard),
        companyCardController.removeCompanyCard
    )

    router.post(
        '/getCompanyCards',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Company_Card_Get),
        companyCardController.getCompanyCards
    )

    // place tags orders
    router.post(
        '/placeOrder',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Tags_Place_Order),
        validate(Validations.placeOrder),
        orderController.placeOrder
    )

    router.post(
        '/getOrders',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Tags_Get_Orders),
        orderController.getOrders
    )


    router.post(
        '/buySubscriptions',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Subscription_Buy),
        validate(Validations.buySubscriptions),
        subscriptionController.addCompanySubscriptions
    )
    router.get(
        '/getAllSubscriptions',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkSpecificPermissions([Role.ADMIN_EMPLOYEE, Role.COMPANY_ADMIN]),
        subscriptionController.getAllSubscriptions
    )

    router.post(
        '/cancelSubscriptions',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Subscription_Cancel),
        validate(Validations.removeSubscription),
        subscriptionController.removeCompanySubscriptions
    )

    router.get(
        '/chargeSubscription',
        subscriptionController.chargeCompanySubscription
    )

    router.get(
        '/finalizeStripeInvoices',
        (req, res) => {
            subscriptionController.finalizeCompanyInvoices(req, res, sio)
        }
    )

    // router.post(
    //     '/updateSubscription',
    //     userController.updateSub
    // )

    // router.post(
    //     '/contractorSignup',
    //     validate(Validations.contractorSignup),
    //     (req, res) => {
    //         vendorController.createContractor(req, res, sio)
    //     }
    // )

    router.post(
        '/searchContractor',
        // validate(Validations.searchContractor),
        vendorController.searchContractor
    )

    router.post(
        '/startContract',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Invite_Contractor),
        validate(Validations.startContract),
        (req, res) => {
            vendorController.startContract(req, res, sio)
        }
    )

    router.post(
        '/inviteContractor',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Invite_Contractor),
        validate(Validations.searchContractor),
        vendorController.inviteContractor
    )

    router.post(
        '/remindContractor',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Invite_Contractor),
        validate(Validations.remindContractor),
        vendorController.remindContractor
    )

    // limit only for contractors
    router.post(
        '/getContracts',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_All_Contracts),
        vendorController.getAllContracts
    )

    // limit only for contractors
    // router.post(
    //     '/acceptOrRejectContract',
    //     passport.authenticate('jwt', { session: false }),
    //     getCompanyId(),
    //     checkUserPermissions(Permissions.Accept_Reject_Contract),
    //     validate(Validations.updateContract),
    //     (req, res) => {
    //         vendorController.acceptRejectContract(req, res, sio)
    //     }
    // )

    router.post(
        '/CancelOrFinish',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Cancel_Finish_Contract),
        validate(Validations.updateContract),
        (req, res) => {
            vendorController.cancelOrFinishContract(req, res, sio)
        }
    )

    router.post(
        '/finishContract',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Cancel_Finish_Contract),
        validate(Validations.finishContract),
        (req, res) => {
            vendorController.finishContract(req, res, sio)
        }
    )

    router.post(
        '/changeContractorPermission',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Add_Contractor_Permission),
        validate(Validations.contractorPermissions),
        permissionController.addContractorPermissions
    )

    router.post(
        '/upgradeToCompany',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        checkUserPermissions(Permissions.Upgrade_To_Company),
        validate(Validations.upgradeToCompany),
        vendorController.upgradeToCompany
    )

    router.get(
        '/getContractors',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_All_Contracts),
        vendorController.getContractors
    )

    router.post(
        '/checkAndGet',
        validate(Validations.socialLogin),
        userController.checkAndGetUser
    )

    router.post(
        '/signUpSocial',
        validate(Validations.socialSignUp),
        userController.createCompanySocial
    )

    router.post(
        '/contractorSignUpSocial',
        validate(Validations.contractorSocialSignUp),
        userController.createContractorSocial
    )
    router.post(
        '/importCustomer',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Customer_Import),
        // validate(Validations.customerImport),
        customerImportController.uploadfile
    )

    // Service Ticket
    router.post(
        '/getServiceTickets',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Service_Tickets),
        serviceTicketController.getServiceTickets
    )

    router.post(
        '/getOpenServiceTickets',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Service_Tickets),
        validate(Validations.getOpenServiceTickets),
        serviceTicketController.getOpenServiceTickets
    )

    router.get(
        '/getOpenServiceTicketsStream',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Service_Tickets),
        validate(Validations.getOpenServiceTicketsStream),
        (req, res) => {
            serviceTicketController.getOpenServiceTicketsStream(req, res, sio)
        }
    )

    router.post(
        '/createServiceTicket',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Create_Service_Ticket),
        (req, res) => {
            serviceTicketController.createServiceTicket(req, res, sio)
        }
    )

    router.post(
        '/editServiceTicket',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Edit_Service_Ticket),
        validate(Validations.editTicket),
        serviceTicketController.editServiceTicket
    )

    router.post(
        '/updateServiceTicket',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Update_Service_Ticket),
        //validate(Validations.updateTicket),
        serviceTicketController.updateServiceTicket
    )
    router.post(
        '/getServiceTicketDetail',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Ticket_Detail),
        validate(Validations.getTicketDetail),
        serviceTicketController.getServiceTicketDetail
    )


    // Quickbooks
    /**
     * @deprecated
     * TODO: To be deprecated
     */
    // router.post(
    //     '/getQBCustomers',
    //     passport.authenticate('jwt', { session: false }),
    //     getCompanyId(),
    //     checkUserPermissions(Permissions.Get_QB_Customers),
    //     // validate(Validations.getQBCustomers),
    //     quickbookCustomerController.getQBCustomers
    // )

    router.post(
        '/syncQBCustomers',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_QB_Customers),
        quickBookCustomerController.syncQBCustomers
    )

    router.post(
        '/createQBCustomer',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Create_QB_customer),
        validate(Validations.createQBCustomer),
        refreshQBToken(),
        quickBookCustomerController.createQBCustomer
    )

    router.post(
        '/syncQBItems',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        quickBookItemController.syncQBItems
    )

    router.post(
        '/syncQBPaymentTerms',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        quickBookPaymentTermController.syncQBPaymentTerms
    )

    router.post(
        '/createQBInvoice',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        refreshQBToken(),
        quickBookInvoiceController.createQBInvoice
    )

    router.post(
        '/createQBInvoices',
        passport.authenticate('jwt', { session: false }),
        getCompanyId(),
        refreshQBToken(),
        quickBookInvoiceController.createQBInvoices
    )

    router.post(
        '/syncQBInvoices',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        quickBookInvoiceController.syncQBInvoices
    )

    router.post(
        '/createQBPayment',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        refreshQBToken(),
        quickBookPaymentController.createQBPayment
    )

    router.post(
        '/createQBPayments',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        refreshQBToken(),
        quickBookPaymentController.createQBPayments
    )

    router.post(
        '/syncQBPayments',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        quickBookPaymentController.syncQBPayments
    )

    router.post(
        '/getQBUri',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_QB_Uri),
        validate(Validations.getQBUri),
        quickBookController.getQBUri
    )

    router.get(
        '/QBCallback',
        (req, res) => {
            quickBookController.getCallBackToken(req, res, sio)
        }
    )

    router.post(
        '/disconnectQB',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_QB_Uri),
        quickBookController.disconnectQB
    )

    router.post(
        '/blueclerkSyncWebhook',
        quickBookController.blueclerkSyncWebhook
    )

    // Company

    router.post(
        '/getContractorsForJob',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Contractors_For_Job),
        companyController.getContractorForJob
    )

    router.post(
        '/getCompanyContracts',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Company_Contracts),
        companyController.getCompanyContracts
    )

    router.post(
        '/getContractorDetail',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Contractor_Detail),
        validate(Validations.getContractorDetail),
        companyController.getContractorDetail
    )

    router.put(
        '/updateContract',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.updateCompanyContract),
        (req, res) => {
            vendorController.updateContract(req, res, sio)
        }
    )

    router.post(
        '/updateCompanyProfile',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Update_Company_Profile),
        validate(Validations.updateCompanyProfile),
        companyController.updateCompanyProfile
    )

    router.get(
        '/getCompanyCustomer',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        validate(Validations.getCompanyCustomer),
        companyController.getCompanyCustomer
    )

    router.put(
        '/updateCompanyCustomer',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Update_Company_Profile),
        validate(Validations.updateCompanyCustomer),
        companyController.updateCompanyCustomer
    )

    // Item Tier

    router.get(
        '/getItemTierList',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        companyController.getItemTierList
    )

    router.post(
        '/addItemTier',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        companyController.addItemTier
    )

    router.put(
        '/updateItemTier',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.updateItemTier),
        companyController.updateItemTier
    )

    // Email Default
    router.get(
        '/getCompanyEmailDefault',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        emailDefaultController.getCompanyEmailDefault
    )

    router.put(
        '/updateCompanyEmailDefault',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        emailDefaultController.updateCompanyEmailDefault
    )

    router.post(
        '/setCustomWorkOrderNumber',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Custom_work_Order_Number),
        companyController.setCustomWorkNumber
    )

    router.post(
        '/getCurrentJobId',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Custom_Work_No),
        companyController.getCustomWorkNumber
    )

    router.post(
        '/getSyncInfo',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Custom_Work_No),
        companyController.getSyncInfo
    )

    router.post(
        '/getAllEmployees',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.User_Get_All_Employees),
        companyController.getAllEmployees
    )
    router.get(
        '/getEmployeeDetail',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.getEmployeeDetails),
        checkUserPermissions(Permissions.User_Get_All_Employees),
        companyController.getEmployeeDetail
    )
    router.post(
        '/getEmployeesForJob',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.User_Get_All_Employees),
        companyController.getEmployeesForJob
    )

    router.get(
        '/downgradeCompanies',
        companyController.downgradeCompanies
    )

    router.post(
        '/setCustomInvoiceNumber',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Set_Invoice_Number),
        validate(Validations.setCustomInvoiceNumber),
        invoiceController.setCustomInvoiceNumber
    )

    router.post(
        '/getCurrentInvoiceNumber',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Current_Invoice_Number),
        invoiceController.getInvoiceNumber
    )

    // Sales Taxes
    router.post(
        '/createSalesTax',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Create_Sales_Tax),
        validate(Validations.createSaleTax),
        companyController.createSalesTax
    )

    router.post(
        '/updateSalesTax',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Update_Sales_Tax),
        validate(Validations.updateSaleTax),
        companyController.updateSalesTax
    )

    router.post(
        '/deleteSalesTax',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Delete_Sales_Tax),
        validate(Validations.deleteSaleTax),
        companyController.deleteSalesTax
    )

    router.post(
        '/getSalesTax',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Sales_Taxes),
        companyController.getSalesTaxes
    )

    // Job Charges
    router.post(
        '/createJobCharges',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Create_Job_Charges),
        validate(Validations.createJobCharges),
        companyController.createJobCharges
    )

    router.post(
        '/updateJobCharges',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Update_Job_Charges),
        validate(Validations.updateJobCharges),
        companyController.updateJobCharges
    )

    router.post(
        '/deleteJobCharges',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Delete_Job_Charges),
        validate(Validations.deleteJobCharges),
        companyController.deleteJobCharges
    )

    router.post(
        '/getJobCharges',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Job_Charges),
        companyController.getJobCharges
    )

    // Invoice
    router.post(
        '/createInvoice',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Create_Invoice),
        validate(Validations.createInvoice),
        refreshQBToken(),
        invoiceController.createInvoice
    )

    router.get(
        '/getInvoiceEmailTemplate',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoice_Detail),
        validate(Validations.getInvoiceEmailTemplate),
        invoiceController.getInvoiceEmailTemplate
    )

    router.post(
        '/sendInvoice',
        passport.authenticate('jwt', { session: false }),
        uploadInvoices.single('invoicePdf'),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoice_Detail),
        validate(Validations.sendInvoice),
        invoiceController.sendInvoiceEmail
    )

    router.post(
        '/sendInvoices',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoice_Detail),
        validate(Validations.sendInvoices),
        invoiceController.sendInvoicesEmail
    )

    router.get(
        '/generateInvoicePdf',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoice_Detail),
        validate(Validations.sendInvoice),
        invoiceController.generateInvoicePdf
    )

    router.post(
        '/sendJobReportEmail',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoice_Detail),
        validate(Validations.sendReport),
        jobController.sendJobReport
    )

    router.post(
        '/createPOInvoice',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Create_Invoice),
        validate(Validations.createPOInvoice),
        invoiceController.createPOInvoice
    )

    router.post(
        '/updateInvoice',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Update_Invoice),
        validate(Validations.updateInvoice),
        refreshQBToken(),
        invoiceController.updateInvoice
    )

    router.post(
        '/getInvoiceDetail',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoice_Detail),
        invoiceController.getInvoiceDetail
    )

    router.post(
        '/getInvoices',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        validate(Validations.getInvoices),
        invoiceController.getInvoices
    )

    router.get(
        '/getUnsyncedInvoices',
        passport.authenticate('jwt', { session: false }),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        invoiceController.getUnsyncedInvoices
    )

    router.get(
        '/getCompanyInvoices',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        invoiceController.getCompanyInvoices
    )
    router.get(
        '/getCompanyInvoiceDetails',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        validate(Validations.companyInvoice),
        invoiceController.getCompanyInvoiceDetails
    )

    router.delete(
        '/voidInvoice',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        validate(Validations.voidInvoice),
        invoiceController.voidInvoice
    )

    router.post(
        '/updateCompaniesDefaultPermissions',
        permissionController.updateAllCompaniesPermissions
    )

    router.put(
        '/updateCommission',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Update_Invoice),
        validate(Validations.updateCommission),
        invoiceController.updateCommission
    )

     router.get(
        '/updateCommissionCron',       
         (req, res) => {
            invoiceController.updateCommissionCron(req, res)
        }
    )  

    router.get(
        '/getCommissionHistory/:beneficiaryId',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        checkUserPermissions(Permissions.Update_Invoice), //if has permission to update then can also view
        invoiceController.getCommissionHistory
    )

    router.get(
        '/getInvoicesByContractor',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        invoiceController.getInvoicesByContractor
    )

    //Parts Inventory

    router.post(
        '/getParts',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Parts),
        partController.getPartInventory
    )

    router.post(
        '/createPart',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Create_Part),
        validate(Validations.createPartInventory),
        partController.createPartInventory
    )

    router.post(
        '/updatePart',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Update_Part),
        validate(Validations.udpatePartInventory),
        partController.updatePartInventory
    )

    router.post(
        '/removePart',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Remove_Part),
        validate(Validations.removePartInventory),
        partController.removePartInventory
    )

    // Purchase Order
    router.post(
        '/createPurchaseOrder',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Create_Purchase_Order),
        validate(Validations.createPurchaseOrder),
        purchaseOrderController.createPO
    )

    router.post(
        '/getAllPurchaseOrder',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Purchase_Order),
        purchaseOrderController.getAllPO
    )

    router.post(
        '/getEquipmentPurchaseOrder',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.getEquipmentPO),
        checkUserPermissions(Permissions.Get_Equipment_Purchase_Order),
        purchaseOrderController.getAllEquipmentPurchaseOrder
    )

    router.post(
        '/updatePurchaseOrderStatus',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Update_Status_Purchase_Order),
        validate(Validations.udpatePurchaseOrderStatus),
        purchaseOrderController.updatePOStatus
    )

    router.post(
        '/createPOEstimate',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Create_Purchase_Order_From_Estimate),
        validate(Validations.createPurchaseOrderEstimate),
        purchaseOrderController.createPOEstimate
    )

    router.post(
        '/updatePurchaseOrder',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Update_Purchase_Order),
        validate(Validations.udpatePurchaseOrder),
        purchaseOrderController.updatePO
    )

    router.post(
        '/updateEstimate',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Update_Estimate),
        validate(Validations.udpateEstimate),
        estimateController.updateEstimate
    )

    router.post(
        '/updateEstimateStatus',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Update_Status_Estimate),
        validate(Validations.udpateEstimateStatus),
        estimateController.updateEstimateStatus
    )

    router.post(
        '/createEstimate',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Create_Estimate),
        estimateController.createEstimate
    )

    router.post(
        '/getEstimate',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Estimate),
        estimateController.getEstimates
    )

    router.post(
        '/cancelEstimate',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.cancelEstimate),
        checkUserPermissions(Permissions.Cancel_Estimate),
        estimateController.cancelEstimate
    )

    router.post(
        '/getCompanyContractorActivity',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Company_Contractor_Activity),
        companyController.getCompanyContractorActivity
    )

    // PAYMENT TERM

    router.post(
        '/setCompanyDefaultPaymentTerm',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.setCompanyDefaultPaymentTerm),
        paymentTermController.setCompanyDefaultPaymentTerm
    )

    router.post(
        '/setCustomerPaymentTerm',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.setCustomerPaymentTerm),
        paymentTermController.setCustomerPaymentTerm
    )

    router.get(
        '/getPaymentTerms',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        // TODO: Add and use new proper permission
        checkUserPermissions(Permissions.Get_Sales_Taxes),
        paymentTermController.getPaymentTerms
    )

    router.post(
        '/createPaymentTerm',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        // TODO: Add and use new proper permission
        checkUserPermissions(Permissions.Create_Sales_Tax),
        validate(Validations.createPaymentTerm),
        paymentTermController.createPaymentTerm
    )

    router.put(
        '/updatePaymentTerm',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        // TODO: Add and use new proper permission
        checkUserPermissions(Permissions.Update_Sales_Tax),
        validate(Validations.updatePaymentTerm),
        paymentTermController.updatePaymentTerm
    )

    router.delete(
        '/deletePaymentTerm',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        // TODO: Add and use new proper permission
        checkUserPermissions(Permissions.Delete_Sales_Tax),
        validate(Validations.deletePaymentTerm),
        paymentTermController.deletePaymentTerm
    )

    // PAYMENT

    router.get(
        '/getInvoicesByCustomerId',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.getInvoicesByCustomerId),
        checkUserPermissions(Permissions.Get_Customer_Invoices),
        invoiceController.getInvoicesByCustomerId
    )

    router.get(
        '/getPayments',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Payments),
        paymentController.getPayments
    )

    router.get(
        '/getUnsyncedPayments',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Payments),
        paymentController.getUnsyncedPayments
    )

    router.get(
        '/getPaymentsByCustomerId',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.getPaymentsByCustomer),
        checkUserPermissions(Permissions.Get_Customer_Payments),
        paymentController.getPaymentsByCustomerId
    )

    router.get(
        '/getPaymentsByContractor',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Customer_Payments),
        paymentController.getPaymentsByContractor
    )

    router.post(
        '/recordPayment',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.recordPayment),
        checkUserPermissions(Permissions.Create_Payment),
        refreshQBToken(),
        paymentController.createPayment
    )

    router.post(
        '/recordPaymentContractor',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.recordPaymentContractor),
        checkUserPermissions(Permissions.Get_Customer_Payments),
        paymentController.createPaymentContractor
    )

    router.put(
        '/updatePayment',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.updatePayment),
        checkUserPermissions(Permissions.Update_Payment),
        paymentController.updatePayment
    )

    router.put(
        '/updatePaymentContractor',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.updatePaymentContractor),
        checkUserPermissions(Permissions.Update_Payment),
        paymentController.updatePaymentContractor
    )

    router.post(
        '/voidPaymentContractor',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.voidPaymentContractor),
        checkUserPermissions(Permissions.Update_Payment),
        paymentController.voidPaymentContractor
    )

    router.delete(
        '/voidPayment',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.voidPaymentContractor),
        checkUserPermissions(Permissions.Update_Payment),
        paymentController.voidPaymentContractor
    )

    router.get(
        '/getPayrollBalance',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Payments),
        paymentController.getPayrollBalance
    )

    router.get(
        '/getPayrollReport',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Payments),
        paymentController.getPayrollReport
    )

    // Advance Payment
    router.post(
        '/recordAdvancePaymentContractor',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        validate(Validations.recordAdvancePayment),
        paymentAdvanceController.createAdvancePaymentContractor
    )

    router.get(
        '/getAdvancePaymentsByContractor',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        validate(Validations.getAdvancePayments),
        paymentAdvanceController.getAdvancePaymentsByContractor
    )

    router.put(
        '/updateAdvancePaymentContractor',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Update_Payment),
        validate(Validations.updateAdvancePaymentContractor),
        paymentAdvanceController.updateAdvancePaymentContractor
    )

    router.delete(
        '/voidAdvancePaymentContractor',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Update_Payment),
        validate(Validations.voidAdvancePaymentContractor),
        paymentAdvanceController.voidAdvancePaymentContractor
    )    

    // REPORT

    router.get(
        '/generateIncomeReport',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        validate(Validations.generateIncomeReport),
        reportController.generateIncomeReport
    )

    router.get(
        '/generateIncomeReportPdf',
        passport.authenticate('jwt', { session: false }),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        validate(Validations.generateIncomeReport),
        reportController.generateIncomeReportPdf
    )

    router.get(
        '/getIncomeReportEmailTemplate',
        passport.authenticate('jwt', { session: false }),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        reportController.getIncomeReportEmailTemplate
    )

    router.post(
        '/sendIncomeReport',
        passport.authenticate('jwt', { session: false }),
        uploadInvoices.single('incomeReportPdf'),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        validate(Validations.generateIncomeReport),
        reportController.sendIncomeReportEmail
    )

    router.get(
        '/getReportEmailTemplate/:reportType',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        reportController.getReportEmailTemplate
    )

    router.post(
        '/sendReport/:reportType',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        validate(Validations.sendReportEmail),
        reportController.sendReportEmail
    )

    router.get(
        '/generateAccountReceivableReport',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        validate(Validations.generateAccountReceivableReport),
        reportController.generateAccountReceivableReport
    )

    router.get(
        '/generateReportPdf/:reportType',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        validate(Validations.generateReportPdf),
        reportController.generateReportPdf
    )

    router.get(
        '/getMemorizedReports',
        passport.authenticate('jwt', { session: false }),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        reportController.getMemorizedReports
    )

    router.get(
        '/getMemorizedReport',
        passport.authenticate('jwt', { session: false }),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        reportController.getMemorizedReport
    )

    router.post(
        '/createMemorizedReport',
        passport.authenticate('jwt', { session: false }),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        validate(Validations.createMemorizedReport),
        reportController.createMemorizedReport
    )

    router.put(
        '/updateMemorizedReport',
        passport.authenticate('jwt', { session: false }),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        validate(Validations.updateMemorizedReport),
        reportController.updateMemorizedReport
    )

    router.delete(
        '/deleteMemorizedReport',
        passport.authenticate('jwt', { session: false }),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Invoices),
        validate(Validations.updateMemorizedReport),
        reportController.deleteMemorizedReport
    )

    // CODE LOCATION TAG

    router.post(
        '/codeLocationTag',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.codeLocationTag),
        checkUserPermissions(Permissions.Code_Location_Tag),
        tagController.codeLocationTag
    )

    router.post(
        '/getLocationTagInfo',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Location_Tags),
        validate(Validations.getLocationTagInfo),
        tagController.getLocationTagInfo
    )

    router.post(
        '/updateLocationTag',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.updateLocationTag),
        checkUserPermissions(Permissions.Update_Location_Tag),
        tagController.updateLocationTag
    )

    router.post(
        '/getLocationTags',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Get_Location_Tags),
        tagController.getLocationTags
    )
    router.post(
        '/getLocationTagJobs',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.getLocationTagJobs),
        checkUserScanPermissions(Permissions.Get_Location_Tag_Jobs),
        tagController.getLocationTagJobs
    )

    // CONTACT

    router.post(
        '/addContact',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        checkUserPermissions(Permissions.Customer_Create),
        validate(Validations.addContact),
        ContactController.addContact
    )

    router.put(
        '/updateContact',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        checkUserPermissions(Permissions.Customer_Create),
        validate(Validations.updateContact),
        ContactController.updateContact
    )

    router.get(
        '/getContacts',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        checkUserPermissions(Permissions.Customer_Create),
        ContactController.getContacts
    )

    router.get(
        '/getCustomerAllContacts',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.getCustomerAllContacts),
        checkUserPermissions(Permissions.Customer_Create),
        ContactController.getCustomerAllContacts
    )

    router.delete(
        '/removeContact',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        validate(Validations.removeContact),
        checkUserPermissions(Permissions.Customer_Create),
        ContactController.removeContact
    )

    // Notification
    router.get(
        '/getNotifications',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.getNotifications),
        notificationController.getNotifications
    )

    router.put(
        '/updateNotification/:notificationId([0-9a-f]{24})?',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.updateNotification),
        notificationController.updateNotification
    )

    // Integrations
    router.post(
        '/createIntegrationServiceTicket',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        validate(Validations.createIntegrationServiceTicket),
        checkUserPermissions(Permissions.Create_Service_Ticket),
        (req, res) => {
            integrationController.createServiceTicket(req, res, sio)
        }
    )

    // Scripts
    router.post(
        '/script/syncItemTier',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        scriptController.syncItemTier
    )

    router.post(
        '/script/migrateJobTask',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        scriptController.migrateJobTask
    )

    router.post(
        '/script/migrateTicketAndJobImage',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        scriptController.migrateTicketAndJobImage
    )

    router.post(
        '/script/migrateTechnicianStatus',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        scriptController.migrateTechnicianStatus
    )

    router.post(
        '/script/addJobTypeMongooseId',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        scriptController.addJobTypeMongooseId
    )

    router.post(
        '/script/addVendorBalance',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        scriptController.addVendorBalance
    )

    router.post(
        '/script/addPaymentType',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        scriptController.addPaymentType
    )

    router.post(
        '/script/addInvoiceCommission',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        scriptController.addInvoiceCommission
    )

    router.post(
        '/script/updatePaidTechnicians',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        scriptController.updatePaidTechnicians
    )

    router.post(
        '/script/migrateCustomer',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        scriptController.migrateCustomer
    )

    router.post(
        '/script/updateQBCustomerJob',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        scriptController.updateQBCustomerJob
    )

    router.post(
        '/script/revertBackInvoices',
        scriptController.revertBackInvoices
    )

    router.post(
        '/script/revertBackInvoices',
        scriptController.revertBackInvoices
    )

    // QUICKBOOK DIRECT CHECK API
    router.get(
        '/quickbook/customerCheck',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        refreshQBToken(),
        quickBookCustomerController.getQBCustomer
    )

    router.get(
        '/quickbook/itemCheck',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        refreshQBToken(),
        quickBookItemController.getQBItem
    )

    router.get(
        '/quickbook/invoiceCheck',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        refreshQBToken(),
        quickBookInvoiceController.getQBInvoice
    )

    router.get(
        '/quickbook/paymentCheck',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        refreshQBToken(),
        quickBookPaymentController.getQBPayment
    )

    // QUICKBOOK DIRECT CUSTOMER API

    router.get(
        '/quickbook/findQBCustomers',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        refreshQBToken(),
        quickBookCustomerController.findQBCustomers
    )

    router.get(
        '/quickbook/findQBCustomersByEmail',
        passport.authenticate('jwt', { session: false }),
        isLogin(),
        getCompanyId(),
        refreshQBToken(),
        quickBookCustomerController.findQBCustomersByEmail
    )

    // QUICKBOOK DIRECT ACCOUNT API

    router.get(
        '/quickbook/findQBInvoice',
        passport.authenticate('jwt', { session: false }),
        getCompanyId(),
        refreshQBToken(),
        quickBookInvoiceController.findQBInvoice
    )

    router.get(
        '/quickbook/findQBAccount',
        passport.authenticate('jwt', { session: false }),
        getCompanyId(),
        refreshQBToken(),
        quickBookItemController.findQBAccount
    )

    // QUICKBOOK DIRECT ITEM API

    router.get(
        '/quickbook/findQBItem',
        passport.authenticate('jwt', { session: false }),
        getCompanyId(),
        refreshQBToken(),
        quickBookItemController.findQBItem
    )

    // QUICKBOOK DIRECT PAYMENT METHOD API

    router.get(
        '/quickbook/findQBAllTerms',
        passport.authenticate('jwt', { session: false }),
        getCompanyId(),
        refreshQBToken(),
        quickBookPaymentTermController.findQBAllTerms
    )

    // QUICKBOOK DIRECT INVOICE API
    router.put(
        '/quickbook/updateQBInvoice',
        passport.authenticate('jwt', { session: false }),
        getCompanyId(),
        refreshQBToken(),
        quickBookInvoiceController.updateQBInvoice
    )

    // QUICKBOOK DIRECT PAYMENT API

    router.delete(
        '/quickbook/deleteQBPayment',
        passport.authenticate('jwt', { session: false }),
        getCompanyId(),
        refreshQBToken(),
        quickBookPaymentController.deleteQBPayment
    )

    router.get(
        '/quickbook/findQBPayment',
        passport.authenticate('jwt', { session: false }),
        getCompanyId(),
        refreshQBToken(),
        quickBookPaymentController.findQBPayment
    )

    return router

}

