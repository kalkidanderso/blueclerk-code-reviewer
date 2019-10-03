import express from 'express'
import { validate, Validations } from '../middlewares/validator'
import passport from 'passport'
import { checkPermissions } from '../middlewares/permissions'
import { getCompnayId } from '../middlewares/company'

import { Role } from '../common/constants'

import * as userController from '../controllers/user'
import * as jobTypeController from '../controllers/jobType'
import * as equipmentTypeController from '../controllers/equipmentType'
import * as equipmentBrandController from '../controllers/equipmentBrand'
import * as customerController from '../controllers/customer'
import * as customerEquipmentController from '../controllers/customerEquipment'
import * as industryController from '../controllers/industry'
import * as jobController from '../controllers/job'
import * as imageController from '../controllers/image'
import * as groupController from '../controllers/group'
import * as companyEquipment from '../controllers/companyEquipment'
// import * as orderController from '../controllers/order'
import * as companyEquipmentHistory from '../controllers/companyEquipmentHistory'
import * as companyEquipmentInventory from '../controllers/companyEquipmentInventory'


const router: express.Router = express.Router()

//Auth
router.post(
    '/login',
    validate(Validations.login),
    userController.login
)

router.post(
    '/signup',
    validate(Validations.signUp),
    userController.createCompany
)

router.post(
    '/adminSignUp',
    validate(Validations.adminSignUp),
    userController.createGlobalAdmin
)

//Industry
router.post(
    '/createIndustry',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.GLOBAL_ADMIN),
    validate(Validations.createIndustry),
    industryController.createIndustry
)

router.post(
    '/getIndustries',
    industryController.getIndustries
)

//Users
router.post(
    '/createManager',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.COMPANY),
    validate(Validations.createManager),
    getCompnayId(),
    userController.createManager
)

router.post(
    '/createTechnician',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.COMPANY),
    validate(Validations.createTechnician),
    getCompnayId(),
    userController.createTechnician
)

router.post(
    '/createOfficeAdmin',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.COMPANY),
    validate(Validations.createOfficeAdmin),
    getCompnayId(),
    userController.createOfficeAdmin
)

router.post(
    '/getManagers',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.COMPANY),
    getCompnayId(),
    userController.getManagersList
)

router.post(
    '/getTechnicians',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.COMPANY),
    getCompnayId(),
    userController.getTechniciansList
)

router.post(
    '/getOfficeAdmins',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.COMPANY),
    getCompnayId(),
    userController.getOfficeAdminsList)

router.post(
    '/updateProfile',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.OFFICE_ADMIN),
    validate(Validations.updateProfile),
    userController.updateProfile)

router.post(
    '/changePassword',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.OFFICE_ADMIN),
    validate(Validations.changePassword),
    userController.changePassword)

router.post(
    '/updateCompanyProfile',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.COMPANY),
    validate(Validations.updateCompanyProfile),
    getCompnayId(),
    userController.updateCompanyProfile)

//Equipment types
router.post(
    '/createEquipmentType',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.COMPANY),
    validate(Validations.createEquipmentType),
    equipmentTypeController.createEquipmentType
)

router.post(
    '/getEquipmentTypes',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.OFFICE_ADMIN),
    equipmentTypeController.getEquipmentTypes)

//Equipment brands
router.post(
    '/createEquipmentBrand',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.COMPANY),
    validate(Validations.createEquipmentBrand),
    equipmentBrandController.createEquipmentBrand
)

router.post(
    '/getEquipmentBrands',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.OFFICE_ADMIN),
    equipmentBrandController.getEquipmentBrands
)

//Customers
router.post(
    '/createCustomer',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.COMPANY),
    validate(Validations.createCustomer),
    getCompnayId(),
    customerController.createCustomer
)

router.post(
    '/getCustomers',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.OFFICE_ADMIN),
    validate(Validations.getCustomers),
    getCompnayId(),
    customerController.getCustomers
)

router.post(
    '/updateCustomer',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.COMPANY),
    validate(Validations.updateCustomer),
    customerController.updateCustomer
)

//Customer equipments
router.post(
    '/createCustomerEquipment',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.TECHNICIAN),
    validate(Validations.createCustomerEquipment),
    customerEquipmentController.createCustomerEquipment
)

router.post(
    '/getCustomerEquipments',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.OFFICE_ADMIN),
    validate(Validations.getCustomerEquipments),
    customerEquipmentController.getCustomerEquipments
)

router.post(
    '/getCustomerEquipmentJobs',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.TECHNICIAN),
    validate(Validations.getCustomerEquipmentJobs),
    getCompnayId(),
    customerEquipmentController.getCustomerEquipmentJobs
)
router.post(
    '/assignJobToEquipment',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.TECHNICIAN),
    validate(Validations.linkEquipmentJob),
    customerEquipmentController.linkEquipmentJob
)

//Job types
router.post(
    '/createJobType',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.COMPANY),
    validate(Validations.createJobType),
    jobTypeController.createJobType
)

router.post(
    '/getJobTypes',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.OFFICE_ADMIN),
    getCompnayId(),
    jobTypeController.getJobTypes)

//Job
router.post(
    '/createJob',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.OFFICE_ADMIN),
    validate(Validations.createJob),
    getCompnayId(),
    jobController.createJob
)

router.post(
    '/getJobs',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.OFFICE_ADMIN),
    getCompnayId(),
    jobController.getJobs
)

router.post(
    '/updateJob',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.TECHNICIAN),
    validate(Validations.updateJob),
    jobController.updateJob
)

//Image upload
router.post(
    '/uploadImage',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.OFFICE_ADMIN),
    imageController.uploadImage
)


//Group
router.post(
    '/createGroup',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.COMPANY),
    validate(Validations.createGroup),
    getCompnayId(),
    groupController.createGroup
)

router.post(
    '/getGroups',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.COMPANY),
    getCompnayId(),
    groupController.getGroups
)

router.post(
    '/deleteGroup',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.COMPANY),
    validate(Validations.groupGeneric),
    groupController.deleteGroup
)

router.post(
    '/addGroupManager',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.COMPANY),
    validate(Validations.addManager),
    getCompnayId(),
    groupController.addManager
)

router.post(
    '/addGroupMember',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.COMPANY),
    validate(Validations.memberGeneric),
    getCompnayId(),
    groupController.addMember
)

router.post(
    '/removeGroupMember',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.COMPANY),
    validate(Validations.memberGeneric),
    getCompnayId(),
    groupController.removeMember
)


//Company Equipment
router.post(
    '/createComapnyEquipment',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.COMPANY),
    validate(Validations.createCompanyEquipment),
    getCompnayId(),
    companyEquipment.createCompanyEquipment
)

router.post(
    '/getCompanyEquipments',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.OFFICE_ADMIN),
    getCompnayId(),
    companyEquipment.getCompanyEquipments
)

// Company Equipment History
router.post(
    '/equipmentCheckInOut',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.OFFICE_ADMIN),
    validate(Validations.createCompanyEquipmentHistory),
    companyEquipmentHistory.createCompanyEquipmentHistory
)

// Company Equipment Inventory
router.post(
    '/takeInventory',
    passport.authenticate('jwt', { session: false }),
    checkPermissions(Role.OFFICE_ADMIN),
    validate(Validations.createEquipmentInventory),
    companyEquipmentInventory.createCompanyEquipmentInventory
)

// router.post(
//     '/getInventoryReport',
//     passport.authenticate('jwt', { session: false }),
//     checkPermissions(Role.OFFICE_ADMIN),
//     companyEquipmentInventory.getIventoryHistory
// )


// place tags orders
// router.post(
//     '/placeOrder',
//     passport.authenticate('jwt', { session: false }),
//     checkPermissions(Role.COMPANY),
//     validate(Validations.placeOrder),
//     getCompnayId(),
//     orderController.placeOrder
// )

// router.post(
//     '/getOrders',
//     passport.authenticate('jwt', { session: false }),
//     checkPermissions(Role.COMPANY),
//     getCompnayId(),
//     orderController.getOrders
// )

// router.post(
//     '/updateOrder',
//     passport.authenticate('jwt', { session: false }),
//     checkPermissions(Role.COMPANY),
//     validate(Validations.udpateOrder),
//     getCompnayId(),
//     orderController.updateOrder
// )

// router.post(
//     '/createStripCustomer',
//     passport.authenticate('jwt', { session: false }),
//     orderController.createCustomer
// )


export default router
