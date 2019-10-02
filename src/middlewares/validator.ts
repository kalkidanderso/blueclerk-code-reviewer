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
  signUp: [check('email').exists(), check('email').isEmail(), check('password').exists(), check('firstName').exists(), check('lastName').exists(), check('phone').exists(), check('companyName').exists(), check('industryId').exists()],
  adminSignUp: [check('email').exists(), check('email').isEmail(), check('password').exists(), check('firstName').exists(), check('lastName').exists(), check('phone').exists()],

  //Users
  createManager: [check('email').exists(), check('email').isEmail(), check('password').exists(), check('firstName').exists(), check('lastName').exists(), check('phone').exists()],
  createTechnician: [check('email').exists(), check('email').isEmail(), check('password').exists(), check('firstName').exists(), check('lastName').exists(), check('phone').exists()],
  createOfficeAdmin: [check('email').exists(), check('email').isEmail(), check('password').exists(), check('firstName').exists(), check('lastName').exists(), check('phone').exists()],

  updateProfile: [check('firstName').exists(), check('lastName').exists(), check('imageUrl').exists()],
  changePassword: [check('currentPassword').exists(), check('newPassword').exists()],
  updateCompanyProfile: [check('companyName').exists(), check('logoUrl').exists(), check('street').exists(), check('city').exists(), check('state').exists(), check('zipCode').exists(), check('phone').exists(), check('fax').exists()],

  //Industry
  createIndustry: [check('title').exists()],

  //Equipment Type
  createEquipmentType: [check('title').exists()],

  //Equipment Brand
  createEquipmentBrand: [check('title').exists()],

  //Customers
  createCustomer: [check('name').exists()],
  // createCustomer: [check('email').exists(), check('email').isEmail(), check('name').exists(), check('street').exists(), check('city').exists(), check('state').exists(), check('zipCode').exists(), check('contactName').exists(), check('phone').exists()],
  getCustomers: [check('includeActive').exists(), check('includeNonActive').exists()],

  //Customer Equipment
  createCustomerEquipment: [check('model').exists(), check('serialNumber').exists(), check('nfcTag').exists(), check('imageUrl').exists(), check('equipmentTypeId').exists(), check('equipmentBrandId').exists(), check('customerId').exists()],
  getCustomerEquipments: [check('customerId').exists()],
  linkEquipmentJob: [check('nfcTag').exists(), check('jobId').exists()],
  getCustomerEquipmentJobs: [check('equipmentId').exists()],

  //Job Type
  createJobType: [check('title').exists()],

  //Job
  createJob: [check('dateTime').exists(), check('technicianId').exists(), check('customerId').exists(), check('jobTypeId').exists()],
  updateJob: [check('status').exists(), check('comment').exists(), check('jobId').exists()],
  
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
  createEquipmentInventory: [check('dateTime').exists(), check('nfcTags').exists(), check('qrCodes').exists()],
  
  // Tags
  placeOrder: [check('noOfTags').exists(), check('total').exists(), check('tax').exists(), check('dateTime').exists()],
  udpateOrder: [ check('status').exists(), check('orderId').exists(), check('orderStatus').exists()]
}