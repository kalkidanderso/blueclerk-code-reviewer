import express from 'express'
import { validate, Validations } from '../middlewares/validator'
import passport from 'passport'
import { checkPermissions, checkUserPermissions } from '../middlewares/permissions'
import { getCompnayId } from '../middlewares/company'

import { Role, Permissions } from '../common/constants'

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
import * as companyEquipmentController from '../controllers/companyEquipment'
import * as orderController from '../controllers/order'
import * as companyEquipmentHistoryController from '../controllers/companyEquipmentHistory'
import * as companyEquipmentInventoryController from '../controllers/companyEquipmentInventory'
import * as companyCardController from '../controllers/companyCard'
import * as subscriptionController from '../controllers/subscription'
import * as permissionController from '../controllers/permission'
import { Personalize } from 'aws-sdk'


const router: express.Router = express.Router()
 
//Auth
router.post(
    '/login',
    validate(Validations.login),
    userController.login
)

router.post(
    '/subscribe',
    passport.authenticate('jwt', { session: false }),
    userController.companySubscribe
)

router.post(
    '/agreeTermAndCondition',
    passport.authenticate('jwt', { session: false }),
    validate(Validations.agree),
    userController.agreeToTermAndConditions
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

router.post(
    '/getDefaultPermissions',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Permission_Get_All),
    permissionController.getAllPermissions
)

router.post(
    '/updateDefaultPermissions',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Permission_Update_Default),
    validate(Validations.updateDefaultPermissions),
    permissionController.updateDefaultPermissions
)

router.post(
    '/getOfficeAdminPermissions',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Permission_Get_Office_Admin),
    permissionController.getOfficeAdminPermissions
)

router.post(
    '/getTechPermissions',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Permission_Get_Tech),
    permissionController.getTechPermissions
)

router.post(
    '/getManagerPermissions',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Permission_Get_Manager),
    permissionController.getManagerPermissions
)

router.post(
    '/updateUserPermissions',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Permission_Update_Employee),
    validate(Validations.udpateUserPermissions),
    permissionController.updateUserPermissions
)

router.post(
    '/getEmployeePermissions',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Permission_Get_Employee),
    validate(Validations.employeePermissions),
    permissionController.getUserPermissions
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
    getCompnayId(),
    checkUserPermissions(Permissions.User_Create_Manager),
    validate(Validations.createManager),
    getCompnayId(),
    userController.createManager
)

router.post(
    '/createTechnician',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.User_Create_Technician),
    validate(Validations.createTechnician),
    getCompnayId(),
    userController.createTechnician
)

router.post(
    '/createOfficeAdmin',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.User_Create_Office_Admin),
    validate(Validations.createOfficeAdmin),
    getCompnayId(),
    userController.createOfficeAdmin
)

router.post(
    '/getManagers',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.User_Get_Manager),
    getCompnayId(),
    userController.getManagersList
)

router.post(
    '/getTechnicians',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.User_Get_Technician),
    getCompnayId(),
    userController.getTechniciansList
)

router.post(
    '/getOfficeAdmins',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.User_Get_Office_Admin),
    getCompnayId(),
    userController.getOfficeAdminsList)

router.post(
    '/updateProfile',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.User_Update_Profile),
    validate(Validations.updateProfile),
    userController.updateProfile)

router.post(
    '/changePassword',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.User_Change_Password),
    validate(Validations.changePassword),
    userController.changePassword)

    router.post(
    '/forgotPassword',
    // passport.authenticate('jwt', { session: false }),
    // getCompnayId(),
    // checkUserPermissions(Permissions.User_Change_Password),
    validate(Validations.forgotPassword),
    userController.fogotPassword)

router.post(
    '/updateCompanyProfile',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Update_Company_Profile),
    validate(Validations.updateCompanyProfile),
    userController.updateCompanyProfile)

router.post(
    '/deleteEmployee',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.User_Delete_Employee),
    validate(Validations.deleteEmployee),
    userController.deleteEmployee)

router.post(
    '/activateEmployee',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.User_Activate_Employee),
    validate(Validations.deleteEmployee),
    userController.activateEmployee)

    router.post(
    '/getAllEmployees',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.User_Get_All_Employees),
    userController.getAllEmployees)
    
    router.post(
    '/getEmployeesForJob',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.User_Get_All_Employees),
    userController.getEmployeesForJob)

//Equipment types
router.post(
    '/createEquipmentType',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Equipment_Type_Create),
    validate(Validations.createEquipmentType),
    equipmentTypeController.createEquipmentType
)

router.post(
    '/getEquipmentTypes',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Equipment_Type_Get),
    equipmentTypeController.getEquipmentTypes)

//Equipment brands
router.post(
    '/createEquipmentBrand',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Equipment_Brand_Create),
    validate(Validations.createEquipmentBrand),
    equipmentBrandController.createEquipmentBrand
)

router.post(
    '/getEquipmentBrands',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Equipment_Brand_Get),
    equipmentBrandController.getEquipmentBrands
)

//Customers
router.post(
    '/createCustomer',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Customer_Create),
    validate(Validations.createCustomer),
    customerController.createCustomer
)

router.post(
    '/getCustomers',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Customer_Get_All),
    validate(Validations.getCustomers),
    customerController.getCustomers
)

router.post(
    '/updateCustomer',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Customer_Update),
    validate(Validations.updateCustomer),
    customerController.updateCustomer
)

//Customer equipments
router.post(
    '/createCustomerEquipment',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Customer_Equipment_Create),
    validate(Validations.createCustomerEquipment),
    customerEquipmentController.createCustomerEquipment
)

router.post(
    '/getCustomerEquipments',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Customer_Equipment_Get_All),
    validate(Validations.getCustomerEquipments),
    customerEquipmentController.getCustomerEquipments
)

router.post(
    '/getCustomerEquipmentJobs',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Customer_Equipment_Get_Jobs),
    validate(Validations.getCustomerEquipmentJobs),
    customerEquipmentController.getCustomerEquipmentJobs
)
router.post(
    '/scanJobEquipment',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Customer_Equipment_Assign_Job),
    validate(Validations.linkEquipmentJob),
    customerEquipmentController.linkJobToEquipment
)

//Job types
router.post(
    '/createJobType',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Job_Type_Create),
    validate(Validations.createJobType),
    jobTypeController.createJobType
)

router.post(
    '/getJobTypes',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Job_Type_Get),
    jobTypeController.getJobTypes)

//Job
router.post(
    '/createJob',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Job_Create),
    validate(Validations.createJob),
    jobController.createJob
    )

router.post(
    '/getJobs',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Job_Get_All),
    jobController.getJobs
    )
    
    router.post(
    '/getTechnicianJobs',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Job_Get_Technician),
    validate(Validations.technicianJobs),
    jobController.getJobsByTechnicianId
)

router.post(
    '/updateJob',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Job_Update),
    validate(Validations.updateJob),
    jobController.updateJob
)

router.post(
    '/startJob',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Job_Start),
    validate(Validations.generalJob),
    jobController.startJob
)

router.post(
    '/getJobDetails',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Job_Detail),
    validate(Validations.generalJob),
    jobController.getJobDetails
)

router.post(
    '/editJob',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Job_Edit),
    validate(Validations.editJob),
    jobController.editJob
)

//Image upload
router.post(
    '/uploadImage',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Image_Upload),
    imageController.uploadImage
)


//Group
router.post(
    '/createGroup',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Group_Create),
    validate(Validations.createGroup),
    groupController.createGroup
)

router.post(
    '/getGroups',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Group_Get_All),
    groupController.getGroups
)

router.post(
    '/deleteGroup',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Group_Delete),
    validate(Validations.groupGeneric),
    groupController.deleteGroup
)

router.post(
    '/addGroupManager',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Group_Add_Manager),
    validate(Validations.addManager),
    groupController.addManager
)

router.post(
    '/addGroupMember',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Group_Add_Member),
    validate(Validations.memberGeneric),
    groupController.addMember
)

router.post(
    '/removeGroupMember',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Group_Remove_Member),
    validate(Validations.memberGeneric),
    groupController.removeMember
)


//Company Equipment
router.post(
    '/createCompanyEquipment',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Company_Equipment_Create),
    validate(Validations.createCompanyEquipment),
    companyEquipmentController.createCompanyEquipment
)

router.post(
    '/getCompanyEquipments',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Company_Equipment_Get),
    companyEquipmentController.getCompanyEquipments
)

// Company Equipment History
router.post(
    '/equipmentCheckInOut',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Company_Equipment_Check_In_Out),
    validate(Validations.createCompanyEquipmentHistory),
    companyEquipmentHistoryController.createCompanyEquipmentHistory
)

// Company Equipment Inventory
router.post(
    '/takeInventory',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Inventory_Take),
    validate(Validations.createEquipmentInventory),
    companyEquipmentInventoryController.createCompanyEquipmentInventory
)

router.post(
    '/getInventoryReport',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Inventory_Report),
    companyEquipmentInventoryController.getIventoryHistory
)


// Company cards
router.post(
    '/addCompanyCard',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Company_Card_Add),
    validate(Validations.addCompanyCard),
    companyCardController.createCompanyCard
)

router.post(
    '/removeCompanyCard',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Company_Card_Remove),
    validate(Validations.removeCompanyCard),
    companyCardController.removeCompanyCard
)

router.post(
    '/getCompanyCards',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Company_Card_Get),
    companyCardController.getCompanyCards
)

// place tags orders
router.post(
    '/placeOrder',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Tags_Place_Order),
    validate(Validations.placeOrder),
    orderController.placeOrder
)

router.post(
    '/getOrders',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Tags_Get_Orders),
    orderController.getOrders
)


router.post(
    '/buySubscriptions',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Subscription_Buy),
    validate(Validations.buySubscriptions),
    subscriptionController.addCompanySubscriptions
)

router.post(
    '/cancelSubscriptions',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Subscription_Cancel),
    validate(Validations.buySubscriptions),
    subscriptionController.removeCompanySubscriptions
)

router.get(
    '/chargeSubscription',
    subscriptionController.chargeCompanySubscription
)

// router.post(
//     '/updateSubscription',
//     userController.updateSub
// )

router.post(
    '/contractorSignup',
    validate(Validations.contractorSignup),
    userController.createContractor
)

router.post(
    '/searchContractor',
    validate(Validations.searchContractor),
    userController.searchContractor
)

router.post(
    '/startContract',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Invite_Contractor),
    validate(Validations.inviteContractor),
    userController.startContract
)

router.post(
    '/inviteContractor',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Invite_Contractor),
    validate(Validations.searchContractor),
    userController.inviteContractor
)

// limit only for contractors
router.post(
    '/getContracts',
    passport.authenticate('jwt', { session: false }),
    checkUserPermissions(Permissions.Get_All_Contracts),
    userController.getAllContracts
)
router.post(
    '/getCompanyContracts',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Get_Company_Contracts),
    userController.getCompanyContracts
)
// limit only for contractors
router.post(
    '/acceptOrRejectContract',
    passport.authenticate('jwt', { session: false }),
    checkUserPermissions(Permissions.Accept_Reject_Contract),
    validate(Validations.updateContract),
    userController.acceptRejectContract
)

router.post(
    '/CancelOrFinish',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Cancel_Finish_Contract),
    validate(Validations.updateContract),
    userController.cancelOrFinishContract
)

router.post(
    '/changeContractorPermission',
    passport.authenticate('jwt', { session: false }),
    getCompnayId(),
    checkUserPermissions(Permissions.Add_Contractor_Permission),
    validate(Validations.contractorPermissions),
    permissionController.addContractorPermissions
)

router.post(
    '/upgradeToCompany',
    passport.authenticate('jwt', { session: false }),
    checkUserPermissions(Permissions.Upgrade_To_Company),
    validate(Validations.upgradeToCompany),
    userController.upgradeToCompany
)

export default router
