import {Request, Response, NextFunction} from 'express'
import { IUser } from '../models/User'
import { IEmployee } from '../models/Employee'
import { Role } from '../common/constants'
import { Company, ICompany } from '../models/Company'


// export const getCompnayId = () => {

    
//     return async (req: Request, res: Response, next: NextFunction) => {

//         const user = <IUser>req.user
//         const employee = <IEmployee>req.user

//         var companyId
//         if (employee.company) {
//             companyId = employee.company
//         } else {
//             companyId = user._id
//         }

//         req.companyId = companyId
//         next()

//     }

// }

export const getCompnayId = () => {

    
    
    return async (req: Request, res: Response, next: NextFunction) => {

        const user = <IUser>req.user
        
        if(user.permissions.role == Role.COMPANY) {
            req.company = user
            req.companyId = user._id
            next()

        }else if(user.permissions.role != Role.GLOBAL_ADMIN) {
            const employee = <IEmployee>req.user
            Company.findById(employee.company, (err: any, company: ICompany) => {
                req.company = company
                req.companyId = company._id
                next()
            })
        }else{
            next()
        }

    }

}