import {Request, Response, NextFunction} from 'express'
import { IUser } from '../models/User'
import { IEmployee } from 'src/models/Employee'


export const getCompnayId = () => {

    
    return async (req: Request, res: Response, next: NextFunction) => {

        const user = <IUser>req.user
        const employee = <IEmployee>req.user

        var companyId
        if (employee.company) {
            companyId = employee.company
        } else {
            companyId = user._id
        }

        req.companyId = companyId
        next()

    }

}