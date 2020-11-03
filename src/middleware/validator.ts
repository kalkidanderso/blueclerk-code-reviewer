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
  signUp: [check('email').exists(), check('email').isEmail(), check('firstName').exists(), check('lastName').exists(), check('phone').exists(), check('password').exists(), check('companyName').exists(), check('industryId').exists()],
  
  login: [check('email').exists(), check('email').isEmail(), check('password').exists()],

  socialLogin: [check('socialId').exists(), check('connectorType').exists(), check('connectorType').isNumeric()],
  
  socialSignUp: [check('email').exists(), check('email').isEmail(), check('socialId').exists(), check('connectorType').exists(), check('connectorType').isNumeric(), check('firstName').exists(), check('lastName').exists(), check('phone').exists(), check('companyName').exists(), check('industryId').exists()],
  
  customerImport: [check('customerSheet').exists()],
  
  agree: [check('agreedStatus').exists()],
  
  adminSignUp: [check('email').exists(), check('email').isEmail(), check('password').exists(), check('firstName').exists(), check('lastName').exists(), check('phone').exists()],
  
  contractorSignup: [check('email').exists(), check('email').isEmail(), check('password').exists(), check('firstName').exists(), check('lastName').exists(), check('phone').exists(), check('companyName').exists(), check('industryId').exists()],
  
  contractorSocialSignUp: [check('email').exists(), check('email').isEmail(), check('socialId').exists(), check('connectorType').exists(), check('connectorType').isNumeric(), check('firstName').exists(), check('lastName').exists(), check('phone').exists(), check('companyName').exists(), check('industryId').exists()],
  
  searchContractor: [check('email').exists(), check('email').isEmail()],
  
  inviteContractor: [check('contractorId').exists()],
  
  updateContract: [check('contractId').exists(), check('status').exists()],
  
  contractorPermissions: [check('contractorId').exists(), check('permissions').exists()],
  
  upgradeToCompany: [check('token').exists(), check('ending').exists()],
  
  //Users
  createManager: [check('email').exists(), check('email').isEmail(), check('firstName').exists(), check('lastName').exists(), check('phone').exists()],
  
  createTechnician: [check('email').exists(), check('email').isEmail(), check('firstName').exists(), check('lastName').exists(), check('phone').exists()],
  
  createOfficeAdmin: [check('email').exists(), check('email').isEmail(), check('firstName').exists(), check('lastName').exists(), check('phone').exists()],

  updateProfile: [check('firstName').exists(), check('lastName').exists()],
  
  changePassword: [check('currentPassword').exists(), check('newPassword').exists()],
  
  updateCompanyProfile: [check('companyName').exists(), check('companyEmail').exists(), check('companyEmail').isEmail(), check('phone').exists()],
  
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
  createCustomer: [check('name').exists()],
  
  updateCustomer: [check('customerId').exists(), check('name').exists()],
  
  getCustomers: [check('includeActive').exists(), check('includeNonActive').exists()],

  getCustomerDetail: [check('customerId').exists()],

  //Customer Equipment
  createCustomerEquipment: [check('model').exists(), check('serialNumber').exists(), check('nfcTag').exists(), check('equipmentTypeId').exists(), check('equipmentBrandId').exists(), check('customerId').exists(), check('location').exists(), check('images').exists()],

  getCustomerEquipments: [check('customerId').exists()],
  
  getCustomerEquipmentInfo: [check('nfcTag').exists()],

  linkEquipmentJob: [check('nfcTag').exists(), check('jobId').exists(), check('comment').exists()],

  getCustomerEquipmentJobs: [check('nfcTag').exists()],

  //Job Type
  createJobType: [check('title').exists()],
  
  editJobType: [check('jobTypeId').exists(), check('title').exists()],
  
  changeJobTypeStatus: [check('jobTypeId').exists(), check('status').exists()],

  //Job
  createJob: [check('scheduleDate').exists(), check('technicianId').exists(), check('customerId').exists(), check('jobTypeId').exists(), check('ticketId').exists(), check('employeeType').exists(), check('employeeType').isNumeric()],

  generalJob: [check('jobId').exists()],

  updateJob: [check('status').exists(), check('comment').exists(), check('jobId').exists()],

  editJob: [check('jobId').exists(), check('technicianId').exists(), check('scheduleDate').exists()],
  
  updateJobTime: [check('jobId').exists()],

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
  
  editTicket: [check('ticketId').exists(), check('status').exists(), check('status').isNumeric()],
 
  updateTicket: [check('ticketId').exists(), check('note').exists()],
 
  getTicketDetail: [check('ticketId').exists()],
 
  getJobReport: [check('jobId').exists()],

  createQBCustomer: [check('name').exists(), check('name').not().isEmpty()],
  
  createSaleTax: [check('state').exists(), check('tax').exists()],
  
  updateSaleTax: [check('salesTaxId').exists(), check('state').exists(), check('tax').exists()],
  
  deleteSaleTax: [check('salesTaxId').exists()],
  
  createJobCharges: [check('jobTypeId').exists(), check('charges').exists(), check('isFixed').exists()],
  
  updateJobCharges: [check('jobChargesId').exists(), check('charges').exists(), check('isFixed').exists()],
  
  deleteJobCharges: [check('jobChargesId').exists()],

  //createInvoice: [],
  
  createPOInvoice: [check('purchaseOrderId').exists()],

  updateInvoice: [check('invoiceId').exists()],
  
  getInvoiceDetail: [check('invoiceId').exists()],
  
  createPartInventory: [check('name').exists(), check('itemCode').exists(), check('cost').exists(), check('price').exists(), check('totalQuantity').exists()],
  
  udpatePartInventory: [check('partId').exists(), check('name').exists(), check('itemCode').exists(), check('cost').exists(), check('price').exists(), check('totalQuantity').exists()],
  
  removePartInventory: [check('partId').exists()],
  
  createPurchaseOrder: [check('customer').exists(), check('note').exists()],
  
  udpatePurchaseOrder: [check('purchaseOrderId').exists(), check('total').exists(), check('note').exists()],
  
  udpatePurchaseOrderStatus: [check('purchaseOrderId').exists(), check('status').exists()],
  
  getEquipmentPO: [check('equipmentId').exists()],
  
  createPurchaseOrderEstimate: [check('estimateId').exists()],

  udpateEstimate: [check('estimateId').exists(), check('total').exists(), check('customer').exists()],
  
  udpateEstimateStatus: [check('estimateId').exists()],

  cancelEstimate: [check('estimateId').exists()],

  updateItem: [check('itemId').exists(), check('charges').exists(), check('isFixed').exists(), check('tax').exists()],
  
  getInvoiceByCustomer: [check('customer').exists()],
  
  recordPayment: [check('amount').exists(), check('referenceNumber').exists(), check('paidAt').exists(), check('customer').exists(), check('invoices').exists()],
  
  updatePayment: [check('paymentId').exists(), check('amount').exists(), check('referenceNumber').exists(), check('paidAt').exists(), check('invoices').exists()],
  
  getPaymentsByCustomer: [check('customer').exists()],

  codeLocationTag: [check('latitude').exists(), check('longitude').exists(), check('nfcTag').exists(), check('customer').exists()],
  
  updateLocationTag: [check('nfcTag').exists(), check('latitude').exists(), check('longitude').exists(), check('nfcTag').exists()],
  
  getLocationTagJobs: [check('nfcTag').exists()],

}