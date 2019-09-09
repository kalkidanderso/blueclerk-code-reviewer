import express from 'express'
import {validate, Validations} from '../middlewares/validator'
import passport from 'passport'
import {checkPermissions} from '../middlewares/permissions'

import {Role} from '../common/constants'

import * as userController from '../controllers/user'
import * as equipmentTypeController from '../controllers/equipmentType'
import * as equipmentBrandController from '../controllers/equipmentBrand'
import * as customerController from '../controllers/customer'
import * as industryController from '../controllers/industry'

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
    userController.createSubscriber
    )

router.post(
    '/adminSignUp', 
    validate(Validations.adminSignUp), 
    userController.createGlobalAdmin
    )

//Industry
router.post(
    '/createIndustry', 
    passport.authenticate('jwt', {session: false}), 
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
    passport.authenticate('jwt', {session: false}), 
    checkPermissions(Role.SUBSCRIBER), 
    validate(Validations.createManager), 
    userController.createManager
    )

router.post(
    '/createTechnician', 
    passport.authenticate('jwt', {session: false}), 
    checkPermissions(Role.SUBSCRIBER), 
    validate(Validations.createTechnician), 
    userController.createTechnician
    )

router.post(
    '/createOfficeAdmin', 
    passport.authenticate('jwt', {session: false}), 
    checkPermissions(Role.SUBSCRIBER), 
    validate(Validations.createOfficeAdmin), 
    userController.createOfficeAdmin
    )

router.post(
    '/getManagers', 
    passport.authenticate('jwt', {session: false}), 
    checkPermissions(Role.SUBSCRIBER),
    userController.getManagersList
    )

router.post(
    '/getTechnicians', 
    passport.authenticate('jwt', {session: false}), 
    checkPermissions(Role.SUBSCRIBER),
    userController.getTechniciansList
    )

router.post(
    '/getOfficeAdmins', 
    passport.authenticate('jwt', {session: false}), 
    checkPermissions(Role.SUBSCRIBER),
    userController.getOfficeAdminsList)

router.post(
    '/updateProfile', 
    passport.authenticate('jwt', {session: false}), 
    checkPermissions(Role.OFFICE_ADMIN),
    validate(Validations.updateProfile), 
    userController.updateProfile)

router.post(
    '/changePassword', 
    passport.authenticate('jwt', {session: false}), 
    checkPermissions(Role.OFFICE_ADMIN),
    validate(Validations.changePassword), 
    userController.changePassword)

router.post(
    '/updateCompanyProfile', 
    passport.authenticate('jwt', {session: false}), 
    checkPermissions(Role.SUBSCRIBER),
    validate(Validations.updateCompanyProfile), 
    userController.updateCompanyProfile)

//Equipment types
router.post(
    '/createEquipmentType', 
    passport.authenticate('jwt', {session: false}), 
    checkPermissions(Role.SUBSCRIBER), 
    validate(Validations.createEquipmentType), 
    equipmentTypeController.createEquipmentType
    )

router.post(
    '/getEquipmentTypes', 
    passport.authenticate('jwt', {session: false}), 
    checkPermissions(Role.OFFICE_ADMIN),
    equipmentTypeController.getEquipmentTypes)

//Equipment brands
router.post(
    '/createEquipmentBrand', 
    passport.authenticate('jwt', {session: false}), 
    checkPermissions(Role.SUBSCRIBER), 
    validate(Validations.createEquipmentBrand), 
    equipmentBrandController.createEquipmentBrand
    )

router.post(
    '/getEquipmentBrands', 
    passport.authenticate('jwt', {session: false}), 
    checkPermissions(Role.OFFICE_ADMIN),
    equipmentBrandController.getEquipmentBrands
    )

//Customers
router.post(
    '/createCustomer', 
    passport.authenticate('jwt', {session: false}), 
    checkPermissions(Role.SUBSCRIBER),
    validate(Validations.createCustomer), 
    customerController.createCustomer
    )

router.post(
    '/getCustomers', 
    passport.authenticate('jwt', {session: false}), 
    checkPermissions(Role.OFFICE_ADMIN),
    validate(Validations.getCustomers), 
    customerController.getCustomers
    )

export default router
