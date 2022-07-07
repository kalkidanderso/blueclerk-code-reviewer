import { Request, Response, NextFunction } from 'express'
import { check, validationResult, ValidationChain, body } from 'express-validator'
import { Status, Messages, JobStatus } from '../common/constants'


let uniq = (a: any) => {
  return a.sort().filter((item: any, pos: any, ary: any) => {
    return !pos || item != ary[pos - 1];
  });
}

export const validate = (validations: ValidationChain[]) => {

  return async (req: Request, res: Response, next: NextFunction) => {

    await Promise.all(validations.map(validation => validation.run(req)))

    const errors: any = validationResult(req)
    if (errors.isEmpty()) {
      return next()
    }
    let errorMessages = errors.errors.reduce((acc: string, v: any) => {
      return acc + 'parameter ' + v.param + ': ' + v.msg + '\n';
    }, '').split('\n').filter((e: string) => e !== "");

    errorMessages = uniq(errorMessages);
    return res.json({ 'status': Status.Error, 'message': errorMessages })

  }

}


export const Validations = {
  //Auth
  signUp: [check('email').exists(), check('email').isEmail(), check('firstName').exists(), check('lastName').exists(), check('phone').exists(), check('password').exists(), check('companyName').exists(), check('industryId').exists(), check('email').normalizeEmail({ "all_lowercase": true, "gmail_remove_dots": false })],

  login: [check('email').exists(), check('email').isEmail(), check('password').exists(), check('email').normalizeEmail({ "all_lowercase": true, "gmail_remove_dots": false })],

  socialLogin: [check('socialId').exists(), check('connectorType').exists(), check('connectorType').isNumeric()],

  socialSignUp: [check('email').exists(), check('email').isEmail(), check('socialId').exists(), check('connectorType').exists(), check('connectorType').isNumeric(), check('firstName').exists(), check('lastName').exists(), check('phone').exists(), check('companyName').exists(), check('industryId').exists()],

  customerImport: [check('customerSheet').exists()],

  agree: [check('agreedStatus').exists()],

  adminSignUp: [check('email').exists(), check('email').isEmail(), check('password').exists(), check('firstName').exists(), check('lastName').exists(), check('phone').exists(), check('email').normalizeEmail({ "all_lowercase": true, "gmail_remove_dots": false })],

  contractorSignup: [check('email').exists(), check('email').isEmail(), check('password').exists(), check('firstName').exists(), check('lastName').exists(), check('phone').exists(), check('companyName').exists(), check('industryId').exists(), check('email').normalizeEmail({ "all_lowercase": true, "gmail_remove_dots": false })],

  contractorSocialSignUp: [check('email').exists(), check('email').isEmail(), check('socialId').exists(), check('connectorType').exists(), check('connectorType').isNumeric(), check('firstName').exists(), check('lastName').exists(), check('phone').exists(), check('companyName').exists(), check('industryId').exists()],

  searchContractor: [check('email').exists().withMessage(Messages.Required), check('email').isEmail(), check('email').normalizeEmail({ "all_lowercase": true, "gmail_remove_dots": false })],

  remindContractor: [check('contractId').exists().withMessage(Messages.Required), check('contractId').isMongoId().withMessage(Messages.WrongId)],

  startContract: [check('contractorId').exists().withMessage(Messages.Required), check('contractorId').isMongoId().withMessage(Messages.WrongId)],

  updateContract: [check('contractId').exists().withMessage(Messages.Required), check('contractId').isMongoId().withMessage(Messages.WrongId), check('status').exists().withMessage(Messages.Required)],

  finishContract: [check('contractId').exists().withMessage(Messages.Required), check('contractId').isMongoId().withMessage(Messages.WrongId)],

  contractorPermissions: [check('contractorId').exists().withMessage(Messages.Required), check('contractorId').isMongoId().withMessage(Messages.WrongId), check('permissions').exists()],

  upgradeToCompany: [check('token').exists(), check('ending').exists()],

  //Users
  createManager: [check('email').exists(), check('email').isEmail(), check('firstName').exists(), check('lastName').exists(), check('phone').exists(), check('email').normalizeEmail({ "all_lowercase": true, "gmail_remove_dots": false })],

  createTechnician: [check('email').exists(), check('email').isEmail(), check('firstName').exists(), check('lastName').exists(), check('phone').exists(), check('email').normalizeEmail({ "all_lowercase": true, "gmail_remove_dots": false })],

  createOfficeAdmin: [check('email').exists(), check('email').isEmail(), check('firstName').exists(), check('lastName').exists(), check('phone').exists(), check('email').normalizeEmail({ "all_lowercase": true, "gmail_remove_dots": false })],

  changeEmployeeRole: [check('employeeId').exists(), check('newRole').exists()],

  updateProfile: [check('firstName').exists(), check('lastName').exists()],

  changePassword: [
    check('currentPassword').exists().withMessage(Messages.Required),
    check('newPassword').exists().withMessage(Messages.Required)
  ],

  getContractorDetail: [
    check('contractorId').optional().isMongoId().withMessage(Messages.WrongId),
    check('employeeId').optional().isMongoId().withMessage(Messages.WrongId)
  ],

  updateCompanyProfile: [check('companyName').exists(), check('companyEmail').exists(), check('companyEmail').isEmail(), check('companyEmail').normalizeEmail({ "all_lowercase": true, "gmail_remove_dots": false }), check('phone').exists()],

  getCompanyCustomer: [
    check('companyId').optional().isMongoId().withMessage(Messages.WrongId),
    check('customerId').optional().isMongoId().withMessage(Messages.WrongId),
    check('status').optional().isInt({ min: 0, max: 4}).toInt().withMessage('status has to be number with value between 0 and 4'),
    check('isPreferred').optional().isBoolean().toBoolean()
  ],

  updateCompanyCustomer: [
    check('companyCustomerId').exists().isMongoId().withMessage(Messages.WrongId),
    check('status').optional().isNumeric().toInt(),
    check('isPreferred').optional().isBoolean().toBoolean(),
  ],

  updateItemTier: [check('itemTierId').exists().withMessage('is required')],

  deleteEmployee: [check('employeeId').exists()],

  getEmployeeDetails: [check('employeeId').exists()],

  updateEmployeeEmailPreferences: [check('employeeId').exists(), check('emailPreferences').isNumeric()],

  updateCompanyContract: [
    check('contractId').exists().withMessage(Messages.Required),
    check('contractId').isMongoId().withMessage(Messages.WrongId),
    check('status').isInt({ min: 1, max: 4 }).toInt().withMessage('status has to be number with value between 1 and 4')
  ],

  updateContractorEmailPreferences: [check('contractorId').exists(), check('emailPreferences').isNumeric()],

  updateCustomerEmailPreferences: [check('customerId').exists(), check('emailPreferences').isNumeric()],

  forgotPassword: [check('email').exists(), check('email').normalizeEmail({ "all_lowercase": true, "gmail_remove_dots": false })],

  // COMPANY LOCATIONS
  createCompanyLocation: [
    check('name').exists().withMessage(Messages.Required),
    check('isMainLocation').optional().toBoolean(),
    check('email').optional().isEmail().normalizeEmail({ "all_lowercase": true, "gmail_remove_dots": false }),
  ],

  updateCompanyLocation: [
    check('companyLocationId').exists().withMessage(Messages.Required),
    check('companyLocationId').isMongoId().withMessage(Messages.WrongId),
    check('name').exists().withMessage(Messages.Required),
    check('isMainLocation').optional().toBoolean(),
    check('email').optional().isEmail().normalizeEmail({ "all_lowercase": true, "gmail_remove_dots": false }),
  ],

  //Industry
  createIndustry: [check('title').exists()],

  removeIndustry: [check('industryId').exists()],

  //Equipment Type
  createEquipmentType: [check('title').exists()],

  //Equipment Brand
  createEquipmentBrand: [check('title').exists()],

  //Customers
  createCustomer: [check('name').exists(), check('email').exists(), check('email').normalizeEmail({ "all_lowercase": true, "gmail_remove_dots": false })],

  updateCustomer: [check('customerId').exists()],

  updateCustomPrices: [check('customerId').exists().withMessage('is required'), check('customerId').isMongoId().withMessage(Messages.WrongId)],

  getCustomers: [check('includeActive').exists(), check('includeNonActive').exists()],

  getCustomerDetail: [check('customerId').exists()],

  searchDuplicatedCustomers: [check('keyword').exists().withMessage(Messages.Required)],

  mergeCustomers: [
    check('customerId').exists().withMessage(Messages.Required),
    check('customerId').isMongoId().withMessage(Messages.WrongId),
    check('unusedCustomerIds').exists().withMessage(Messages.Required),
    check('email').optional().isEmail().normalizeEmail({ "all_lowercase": true, "gmail_remove_dots": false }).withMessage(Messages.InvalidEmail),
  ],

  //Customer Equipment

  createCustomerEquipment: [check('model').exists(), check('serialNumber').exists(), check('nfcTag').exists(), check('equipmentTypeId').exists(), check('equipmentBrandId').exists(), check('customerId').exists()],

  getCustomerEquipments: [check('customerId').exists()],

  getCustomerEquipmentInfo: [check('nfcTag').exists()],

  linkEquipmentJob: [check('nfcTag').exists(), check('jobId').exists(), check('comment').exists()],

  getCustomerEquipmentJobs: [check('nfcTag').exists()],

  // Job Type
  createJobType: [check('title').exists()],

  editJobType: [check('jobTypeId').exists(), check('title').exists()],

  changeJobTypeStatus: [check('jobTypeId').exists(), check('status').exists()],

  // Item
  getItems: [check('includeDiscountItems').optional().isBoolean().toBoolean()],

  createItem: [check('title').exists().withMessage(Messages.Required)],

  // Discount Item
  getDiscountItems: [
    check('customerId').optional().isMongoId().withMessage(Messages.WrongId),
  ],

  createDiscountItem: [
    check('title').exists().withMessage(Messages.Required),
    check('charges').exists().withMessage(Messages.Required),
    check('noOfItems').optional().toInt()
  ],

  updateDiscountItem: [
    check('discountItemId').exists().withMessage(Messages.Required),
    check('discountItemId').isMongoId().withMessage(Messages.WrongId),
    check('title').exists().withMessage(Messages.Required),
    check('charges').exists().withMessage(Messages.Required),
    check('noOfItems').optional().toInt()
  ],

  //Job
  createJob: [
    check('scheduleDate').exists().withMessage(Messages.Required),
    check('customerId').exists().withMessage(Messages.Required),
    check('customerId').isMongoId().withMessage(Messages.WrongId),
    // check('jobTypes').exists().withMessage(Messages.Required),
    // check('ticketId').exists().withMessage(Messages.Required),
    // check('requestId').exists().withMessage(Messages.Required),
    // check('employeeType').exists().withMessage(Messages.Required),
    // check('employeeType').isNumeric(),
    check('ticketId').optional().isMongoId().withMessage(Messages.WrongId),
    check('jobRequestId').optional().isMongoId().withMessage(Messages.WrongId),
    check('equipmentId').optional().isMongoId().withMessage(Messages.WrongId),
    // check('technicianId').optional().isMongoId().withMessage(Messages.WrongId),
    // check('contractorId').optional().isMongoId().withMessage(Messages.WrongId),
    check('jobLocationId').optional().isMongoId().withMessage(Messages.WrongId),
    check('jobSiteId').optional().isMongoId().withMessage(Messages.WrongId),
    check('customerContactId').optional().isMongoId().withMessage(Messages.WrongId)
  ],

  createSubJob: [
    check('parentJobId').exists().withMessage(Messages.Required),
    check('parentJobId').isMongoId().withMessage(Messages.WrongId),
    check('employeeType').exists().withMessage(Messages.Required),
    check('employeeType').isNumeric(),
    check('equipmentId').optional().isMongoId().withMessage(Messages.WrongId),
    check('technicianId').optional().isMongoId().withMessage(Messages.WrongId),
    check('contractorId').optional().isMongoId().withMessage(Messages.WrongId),
  ],

  getJobs: [
    check('status').optional().toInt(),
    check('customerId').optional().isMongoId().withMessage(Messages.WrongId),
    check('pageSize').optional().isInt({ min: 1 }).toInt().withMessage('pageSize has to be number with minimum value 1 if provided')
  ],

  searchJob: [check('pageSize').isNumeric(), check('page').isNumeric()],

  generalJob: [check('jobId').exists().withMessage(Messages.Required)],

  startJobTask: [
    check('jobId').exists().withMessage(Messages.Required),
    check('jobId').isMongoId().withMessage(Messages.WrongId),
    check('jobTypeId').optional().isMongoId().withMessage(Messages.WrongId),
    check('taskJobTypeId').optional().isMongoId().withMessage(Messages.WrongId)
  ],

  updateJobTask: [
    check('jobId').exists().withMessage(Messages.Required),
    check('jobId').isMongoId().withMessage(Messages.WrongId),
    check('jobTypeId').optional().isMongoId().withMessage(Messages.WrongId),
    check('taskJobTypeId').optional().isMongoId().withMessage(Messages.WrongId),
    check('status').exists().withMessage(Messages.Required),
    check('status').isIn([JobStatus.PAUSED, JobStatus.FINISHED]).withMessage('Only paused and finished are allowed')
  ],

  updateJob: [
    check('jobId').exists().withMessage(Messages.Required),
    check('jobId').isMongoId().withMessage(Messages.WrongId),
    check('status').exists().withMessage(Messages.Required),
    check('jobLocationId').optional().isMongoId().withMessage(Messages.WrongId),
    check('jobSiteId').optional().isMongoId().withMessage(Messages.WrongId)
  ],

  editJob: [
    check('jobId').exists().withMessage(Messages.Required),
    check('jobId').isMongoId().withMessage(Messages.WrongId),
    check('technicianId').optional().isMongoId().withMessage(Messages.WrongId),
    check('contractorId').optional().isMongoId().withMessage(Messages.WrongId),
    check('jobLocationId').optional().isMongoId().withMessage(Messages.WrongId),
    check('jobSiteId').optional().isMongoId().withMessage(Messages.WrongId),
    check('customerContactId').optional().isMongoId().withMessage(Messages.WrongId),
    check('scheduleDate').exists().withMessage(Messages.Required)
  ],

  updateJobTime: [check('jobId').exists().withMessage(Messages.Required), check('jobId').isMongoId().withMessage(Messages.WrongId)],

  updateJobTechnicianStatus: [
    check('jobId').exists().withMessage(Messages.Required),
    check('jobId').isMongoId().withMessage(Messages.WrongId),
    check('technicianId').exists().withMessage(Messages.Required),
    check('technicianId').isMongoId().withMessage(Messages.WrongId),
    check('status').optional().isInt().toInt()
  ],

  technicianJobs: [check('employeeId').exists().withMessage(Messages.Required), check('employeeId').isMongoId().withMessage(Messages.WrongId)],

  // Job Route
  jobRoute: [
    check('scheduleDate').exists().withMessage(Messages.Required),
    // check('employeeType').exists().withMessage(Messages.Required),
    // check('employeeType').isNumeric(),
    check('technicianId').optional().isMongoId().withMessage(Messages.WrongId),
    check('contractorId').optional().isMongoId().withMessage(Messages.WrongId)
  ],

  createJobRoute: [
    check('routes').exists().withMessage(Messages.Required),
  ],

  updateJobRoute: [
    check('jobRouteId').exists().withMessage(Messages.Required),
    check('jobRouteId').isMongoId().withMessage(Messages.WrongId),
    check('routes').exists().withMessage(Messages.Required),
  ],

  //Group
  createGroup: [check('title').exists()],

  groupGeneric: [check('groupId').exists()],

  addManager: [check('groupId').exists(), check('managerId').exists()],

  memberGeneric: [check('groupId').exists(), check('memberId').exists()],

  //Company Equipemnt
  createCompanyEquipment: [check('imageUrl').exists(), check('model').exists(), check('serialNumber').exists(), check('typeId').exists(), check('brandId').exists()],

  //Company Equipemnt History
  createCompanyEquipmentHistory: [check('action').exists(), check('dateTime').exists()],

  //Company Equipemnt Inventory
  createEquipmentInventory: [check('dateTime').exists()],

  // Tags
  placeOrder: [check('noOfTags').exists(), check('total').exists(), check('tax').exists(), check('cardId').exists(), check('street').exists(), check('city').exists(), check('state').exists(), check('zipCode').exists(),],

  // Company Cards
  addCompanyCard: [check('cardNumber').exists(), check('exp').exists(), check('cvc').exists(), check('name').exists(), check('address').exists(), check('city').exists(), check('state').exists(), check('zipcode').exists()],

  removeCompanyCard: [check('cardId').exists()],

  subscribe: [check('cardId').exists(), check('planId').exists()],

  buySubscriptions: [check('noOfOfficeAdmins').exists(), check('noOfTechnicians').exists(), check('noOfManagers').exists()],

  removeSubscription: [check('employeeId').exists(),],

  updateDefaultPermissions: [check('onPermissions').exists(), check('offPermissions').exists(), check('role').exists()],

  udpateUserPermissions: [check('onPermissions').exists(), check('offPermissions').exists()],

  employeePermissions: [check('employeeId').exists()],

  createTicket: [check('customerId').exists()],

  editTicket: [check('ticketId').exists(), check('status').exists(), check('status').isNumeric()],

  updateTicket: [check('ticketId').exists(), check('note').exists()],

  getTicketDetail: [check('ticketId').exists()],

  getJobReport: [check('jobReportId').exists()],

  getAllJobReports: [check('pageSize').optional().isInt({ min: 1 }).toInt().withMessage('pageSize has to be number with minimum value 1 if provided')],

  deleteJobReport: [check('jobReportId').exists()],

  createQBCustomer: [check('customerId').exists().withMessage('is required'), check('customerId').isMongoId().withMessage(Messages.WrongId)],

  getQBUri: [check('redirectUri').exists()],

  createSaleTax: [check('state').exists(), check('tax').exists()],

  updateSaleTax: [check('salesTaxId').exists(), check('state').exists(), check('tax').exists()],

  deleteSaleTax: [check('salesTaxId').exists()],

  createJobCharges: [check('jobTypeId').exists(), check('charges').exists(), check('isFixed').exists()],

  updateJobCharges: [check('jobChargesId').exists(), check('charges').exists(), check('isFixed').exists()],

  deleteJobCharges: [check('jobChargesId').exists()],

  getInvoices: [
    check('customerId').optional().isMongoId().withMessage(Messages.WrongId),
    check('isDraft').optional().isBoolean().toBoolean().withMessage('isDraft has to be boolean'),
    check('isVoid').optional().isBoolean().toBoolean().withMessage('isVoid has to be boolean'),
    check('pageSize').optional().isInt({ min: 1 }).toInt().withMessage('pageSize has to be number with minimum value 1 if provided')
  ],

  createInvoice: [
    check('jobId').optional().isMongoId().withMessage(Messages.WrongId),
    check('purchaseOrderId').optional().isMongoId().withMessage(Messages.WrongId),
    check('estimateId').optional().isMongoId().withMessage(Messages.WrongId),
    check('customerContactId').optional().isMongoId().withMessage(Messages.WrongId),
    check('customerId').optional().isMongoId().withMessage(Messages.WrongId),
    check('paymentTermId').optional().isMongoId().withMessage(Messages.WrongId)
  ],

  sendInvoice: [
    check('invoiceId').exists().withMessage(Messages.Required),
    check('invoiceId').isMongoId().withMessage(Messages.WrongId),
  ],

  generateInvoicePdf: [
    check('customerId').exists().withMessage(Messages.Required),
    check('customerId').isMongoId().withMessage(Messages.WrongId),
    check('invoiceId').exists().withMessage(Messages.Required),
    check('invoiceId').isMongoId().withMessage(Messages.WrongId),
  ],

  sendReport: [check('jobReportId').exists()],

  createPOInvoice: [check('purchaseOrderId').exists()],

  updateInvoice: [
    check('invoiceId').exists().withMessage(Messages.Required),
    check('invoiceId').isMongoId().withMessage(Messages.WrongId),
    check('paymentTermId').optional().isMongoId().withMessage(Messages.WrongId),
    check('customerContactId').optional().isMongoId().withMessage(Messages.WrongId)
  ],

  setCustomInvoiceNumber: [check('invoiceNumber').optional().isInt().toInt()],

  companyInvoice: [check('companyInvoiceId').exists()],

  voidInvoice: [check('invoiceId').exists().withMessage(Messages.Required), check('invoiceId').isMongoId().withMessage(Messages.WrongId)],

  updateCommission: [
    check('type').exists().withMessage(Messages.Required),
    check('id').exists().withMessage(Messages.Required),
    check('id').isMongoId().withMessage(Messages.WrongId),
    check('commission').optional().isInt().withMessage('invalid format')
  ],

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

  searchDuplicatedItems: [check('keyword').exists().withMessage(Messages.Required)],

  mergeItems: [
    check('itemId').exists().withMessage(Messages.Required),
    check('itemId').isMongoId().withMessage(Messages.WrongId),
    check('unusedItemIds').exists().withMessage(Messages.Required),
    check('unusedItemIds').isArray().withMessage('Must in array format'),
  ],

  // Payment Term

  setCompanyDefaultPaymentTerm: [check('paymentTermId').exists().withMessage(Messages.Required), check('paymentTermId').isMongoId().withMessage(Messages.WrongId)],

  setCustomerPaymentTerm: [check('customerId').exists().withMessage(Messages.Required), check('customerId').isMongoId().withMessage(Messages.WrongId), check('paymentTermId').exists().withMessage(Messages.Required), check('paymentTermId').isMongoId().withMessage(Messages.WrongId)],

  createPaymentTerm: [check('name').exists().withMessage(Messages.Required), check('dueDays').exists().withMessage(Messages.Required), check('dueDays').isInt().withMessage('invalid format')],

  updatePaymentTerm: [check('paymentTermId').exists().withMessage(Messages.Required), check('paymentTermId').isMongoId().withMessage(Messages.WrongId), check('dueDays').optional().isInt().withMessage('invalid format')],

  deletePaymentTerm: [check('paymentTermId').exists().withMessage(Messages.Required), check('paymentTermId').isMongoId().withMessage(Messages.WrongId)],

  // Payment

  getInvoicesByCustomerId: [check('customerId').exists().withMessage(Messages.Required), check('customerId').isMongoId().withMessage(Messages.WrongId)],

  getPaymentsByCustomer: [check('customerId').exists().withMessage(Messages.Required), check('customerId').isMongoId().withMessage(Messages.WrongId)],

  recordPayment: [
    // check('invoiceId').exists().withMessage(Messages.Required),
    check('invoiceId').optional().isMongoId().withMessage(Messages.WrongId),
    // check('amount').exists().withMessage(Messages.Required),
    check('customerId').exists().withMessage(Messages.Required),
    check('customerId').isMongoId().withMessage(Messages.WrongId)

  ],

  updatePayment: [
    check('paymentId').exists().withMessage(Messages.Required),
    check('paymentId').isMongoId().withMessage(Messages.WrongId),
    check('customerId').exists().withMessage(Messages.Required),
    check('customerId').isMongoId().withMessage(Messages.WrongId),
  ],

  recordPaymentContractor: [
    check('type').exists().withMessage(Messages.Required),
    check('type').isIn(['vendor', 'employee']).withMessage('Type not supported. Available Type to be used: vendor or employee.'),
    check('id').exists().withMessage(Messages.Required),
    check('id').isMongoId().withMessage(Messages.WrongId),
    check('amount').exists().withMessage(Messages.Required),
  ],

  updatePaymentContractor: [
    check('type').exists().withMessage(Messages.Required),
    check('type').isIn(['vendor', 'employee']).withMessage('Type not supported. Available Type to be used: vendor or employee.'),
    check('id').exists().withMessage(Messages.Required),
    check('id').isMongoId().withMessage(Messages.WrongId),
    check('paymentId').exists().withMessage(Messages.Required),
    check('paymentId').isMongoId().withMessage(Messages.WrongId),
    check('amount').exists().withMessage(Messages.Required),
  ],

  voidPaymentContractor: [
    check('type').exists().withMessage(Messages.Required),
    check('type').isIn(['vendor', 'employee', 'customer']).withMessage('Type not supported. Available Type to be used: vendor or employee.'),
    check('paymentId').exists().withMessage(Messages.Required),
    check('paymentId').isMongoId().withMessage(Messages.WrongId),
  ],

  // REPORT
  generateIncomeReport: [
    check('reportType').exists().withMessage(Messages.Required),
    check('reportType').isInt().toInt().withMessage('has to be number')
  ],

  // Code Location

  codeLocationTag: [check('nfcTag').exists(), check('customerId').exists()],

  getLocationTagInfo: [check('nfcTag').exists()],

  updateLocationTag: [check('nfcTag').exists(), check('latitude').exists(), check('longitude').exists(), check('nfcTag').exists()],

  getLocationTagJobs: [check('nfcTag').exists()],

  getOpenServiceTickets: [check('page').exists().isNumeric(), check('pagesize').exists().isNumeric(), check('customerNames').optional(), check('jobTypeTitle').optional(), check('dueDate').optional(), check('ticketId').optional()],

  getOpenServiceTicketsStream: [check('includeOpenJobRequest').optional().toBoolean()],

  // Job location
  getJobLocation: [
    check('companyId').optional().isMongoId().withMessage(Messages.WrongId),
    check('customerId').optional().isMongoId().withMessage(Messages.WrongId),
    check('id').optional().isMongoId().withMessage(Messages.WrongId)
  ],

  createJobLocation: [
    check('customerId').exists().withMessage(Messages.Required),
    check('customerId').isMongoId().withMessage(Messages.WrongId),
    check('name').exists().withMessage(Messages.Required)
  ],

  updateJobLocation: [
    check('customerId').exists().withMessage(Messages.Required),
    check('customerId').isMongoId().withMessage(Messages.WrongId),
    check('id').exists().withMessage(Messages.Required),
    check('id').isMongoId().withMessage(Messages.WrongId)
  ],

  // Contact
  addContact: [
    check('type').exists().withMessage(Messages.Required),
    check('type').isIn(['Customer', 'JobLocation']).withMessage('Only supported for Customer & JobLocation for now'),
  ],

  updateContact: [
    check('_id').exists().withMessage(Messages.Required),
    check('_id').isMongoId().withMessage(Messages.WrongId),
    check('isActive').optional().isBoolean().toBoolean()
  ],

  getCustomerAllContacts: [
    check('customerId').exists().withMessage(Messages.Required),
    check('customerId').isMongoId().withMessage(Messages.WrongId),
  ],

  removeContact: [
    check('contactId').exists().withMessage(Messages.Required),
    check('contactId').isMongoId().withMessage(Messages.WrongId),
    check('type').exists().withMessage(Messages.Required),
    check('referenceNumber').exists().withMessage(Messages.Required),
    check('referenceNumber').isMongoId().withMessage(Messages.WrongId),
  ],

  // Image
  deleteImage: [
    check('type').exists().withMessage(Messages.Required),
    check('type').isIn(['ServiceTicket', 'Job', 'Technician']).withMessage('Only supported for ServiceTicket & Job for now'),
    check('id').exists().withMessage(Messages.Required),
    check('id').isMongoId().withMessage(Messages.WrongId),
    check('imageId').exists().withMessage(Messages.Required),
    check('imageId').isMongoId().withMessage(Messages.WrongId)
  ],

  // Notification
  getNotifications: [check('isRead').optional().isIn(['ALL', true, false, 1, 0]), check('isDismissed').optional().isIn(['ALL', true, false, 1, 0])],

  updateNotification: [check('isRead').optional().isBoolean(), check('isDismissed').optional().isBoolean()],

  createIntegrationServiceTicket: [
    check('source').exists().withMessage(Messages.Required),
    check('name').exists().withMessage(Messages.Required),
    check('email').exists().withMessage(Messages.Required),
    check('email').isEmail().withMessage(Messages.InvalidEmail),
    check('email').normalizeEmail({ "all_lowercase": true, "gmail_remove_dots": false }),
    check('street').exists().withMessage(Messages.Required),
    check('city').exists().withMessage(Messages.Required),
    check('state').exists().withMessage(Messages.Required),
    check('zipCode').exists().withMessage(Messages.Required),
    check('phone').exists().withMessage(Messages.Required)
  ],

}

