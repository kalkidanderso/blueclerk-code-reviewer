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
  createCustomer: [check('email').exists(), check('email').isEmail(), check('name').exists(), check('street').exists(), check('city').exists(), check('state').exists(), check('zipCode').exists(), check('contactName').exists(), check('phone').exists()],
  getCustomers: [check('includeActive').exists(), check('includeNonActive').exists()],

}