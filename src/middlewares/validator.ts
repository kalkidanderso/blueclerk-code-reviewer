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
    signUp: [check('email').exists(), check('email').isEmail(), check('password').exists()],
    login: [check('email').exists(), check('email').isEmail(), check('password').exists()],
}