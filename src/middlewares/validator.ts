import {Request, Response, NextFunction} from 'express'
import {check, validationResult, ValidationChain} from 'express-validator'
import {Status, Messages} from '../common/constants'

export const validate = (validations: ValidationChain[]) => {

    return async (req: Request, res: Response, next: NextFunction) => {

      await Promise.all(validations.map(validation => validation.run(req)))
  
      const errors = validationResult(req)
      if (errors.isEmpty()) {
        return next()
      }
  
      res.json({'status': Status.Error, 'message': Messages.MissingParams})

    }

}

export const Validations = {
  //Auth
  login: [check('email').exists(), check('email').isEmail(), check('password').exists()],
  socialLogin: [check('socialId').exists(), check('connectorType').exists(), check('connectorType').isNumeric()],
  socialSignUp: [check('email').exists(), check('email').isEmail(), check('socialId').exists(), check('connectorType').exists(), check('connectorType').isNumeric(), check('firstName').exists(), check('lastName').exists(), check('phone').exists(), check('companyName').exists(), check('industryId').exists()],
  customerImport: [check('customerSheet').exists()],
  // companySubscribe: [check('agreedStatus').exists()],
  agree: [check('agreedStatus').exists()],
  signUp: [check('email').exists(), check('email').isEmail(), check('password').exists(), check('firstName').exists(), check('lastName').exists(), check('phone').exists(), check('companyName').exists(), check('industryId').exists()],
  adminSignUp: [check('email').exists(), check('email').isEmail(), check('password').exists(), check('firstName').exists(), check('lastName').exists(), check('phone').exists()],
  contractorSignup: [check('email').exists(), check('email').isEmail(), check('password').exists(), check('firstName').exists(), check('lastName').exists(), check('phone').exists(), check('companyName').exists(), check('industryId').exists()],
  searchContractor: [check('email').exists(), check('email').isEmail()],
  inviteContractor: [check('contractorId').exists()],
  updateContract: [check('contractId').exists(), check('status').exists()],
  contractorPermissions: [check('contractorId').exists(), check('permissions').exists()],
  upgradeToCompany: [check('token').exists(), check('ending').exists()],
  customWorkOrder: [check('workOrderNumber').exists(), check('workOrderNumber').isNumeric()],
  //Users
  createManager: [check('email').exists(), check('email').isEmail(), check('firstName').exists(), check('lastName').exists(), check('phone').exists()],
  createTechnician: [check('email').exists(), check('email').isEmail(), check('firstName').exists(), check('lastName').exists(), check('phone').exists()],
  createOfficeAdmin: [check('email').exists(), check('email').isEmail(), check('firstName').exists(), check('lastName').exists(), check('phone').exists()],

  updateProfile: [check('firstName').exists(), check('lastName').exists(), check('imageUrl').exists()],
  changePassword: [check('currentPassword').exists(), check('newPassword').exists()],
  updateCompanyProfile: [check('companyName').exists(), check('logoUrl').exists(), check('street').exists(), check('city').exists(), check('state').exists(), check('zipCode').exists(), check('phone').exists(), check('fax').exists()],
  deleteEmployee: [check('employeeId').exists()],
  forgotPassword: [check('email').exists()],

  //Industry
  createIndustry: [check('title').exists()],
  removeIndustry: [check('industryId').exists()],

  //Equipment Type
  createEquipmentType: [check('title').exists()],

  //Equipment Brand
  createEquipmentBrand: [check('title').exists()],

  //Customers
  createCustomer: [check('firstName').exists(), check('lastName').exists()],
  updateCustomer: [check('customerId').exists(), check('name').exists()],
  // createCustomer: [check('email').exists(), check('email').isEmail(), check('name').exists(), check('street').exists(), check('city').exists(), check('state').exists(), check('zipCode').exists(), check('contactName').exists(), check('phone').exists()],
  getCustomers: [check('includeActive').exists(), check('includeNonActive').exists()],
  getCustomerDetail: [check('customerId').exists()],

  //Customer Equipment
  createCustomerEquipment: [check('model').exists(), check('serialNumber').exists(), check('nfcTag').exists(), check('equipmentTypeId').exists(), check('equipmentBrandId').exists(), check('customerId').exists(), check('location').exists(), check('images').exists()],
  getCustomerEquipments: [check('customerId').exists()],
  linkEquipmentJob: [check('nfcTag').exists(), check('jobId').exists(), check('comment').exists()],
  getCustomerEquipmentJobs: [check('nfcTag').exists()],

  //Job Type
  createJobType: [check('title').exists()],

  //Job
  createJob: [check('dateTime').exists(), check('technicianId').exists(), check('customerId').exists(), check('jobTypeId').exists(), check('ticketId').exists(), check('employeeType').exists(), check('employeeType').isNumeric()],
  generalJob: [check('jobId').exists()],
  updateJob: [check('status').exists(), check('comment').exists(), check('jobId').exists()],
  editJob: [check('jobId').exists(), check('technicianId').exists(), check('dateTime').exists()],
  technicianJobs: [check('employeeId').exists()],
  
  //Group
  createGroup: [check('title').exists()],
  groupGeneric: [check('groupId').exists()],
  addManager: [check('groupId').exists(), check('managerId').exists()],
  memberGeneric: [check('groupId').exists(), check('memberId').exists()],
  
  //Company Equipemnt
  createCompanyEquipment: [check('imageUrl').exists(), check('model').exists(), check('serialNumber').exists(), check('typeId').exists(),check('brandId').exists()],
  
  //Company Equipemnt History
  createCompanyEquipmentHistory: [check('action').exists(), check('dateTime').exists()],

  //Company Equipemnt Inventory
  createEquipmentInventory: [check('dateTime').exists()],
  
  // Tags
  placeOrder: [check('noOfTags').exists(), check('total').exists(), check('tax').exists(), check('cardId').exists(),  check('street').exists(), check('city').exists(), check('state').exists(), check('zipCode').exists(),],

  // Company Cards
  addCompanyCard: [ check('token').exists(), check('ending').exists()],
  removeCompanyCard: [ check('cardId').exists()],
  subscribe: [ check('cardId').exists(), check('planId').exists()],
 
 
  buySubscriptions: [ check('noOfOfficeAdmins').exists(),check('noOfTechnicians').exists(),check('noOfManagers').exists(),],

  updateDefaultPermissions: [check('onPermissions').exists(), check('offPermissions').exists(), check('role').exists()],
  udpateUserPermissions: [check('onPermissions').exists(), check('offPermissions').exists()],
  employeePermissions: [check('employeeId').exists()],
   
  createTicket: [check('customerId').exists()],
  updateTicket: [check('ticketId').exists(), check('note').exists()],
  getTicketDetail: [check('ticketId').exists()],
}