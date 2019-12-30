import {Request, Response, NextFunction} from 'express'
import { IUser } from '../models/User'
import { IEmployee } from '../models/Employee'
import { Role } from '../common/constants'
import { Company, ICompany } from '../models/Company'
import { Status, Messages } from '../common/constants'


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
        req.otherCompanyId = undefined
        
        // check if contractor or organization is making the request
        if(req.body.companyId != undefined) {
            req.otherCompanyId = req.body.companyId
        }
    
        if(user.permissions.role == Role.COMPANY) {
            Company.findById(user._id, (err: any, company: ICompany) => {
                if(company.type == 1 && (req.body.companyId == undefined || req.body.companyId == null) ){
                    return res.json({'status': Status.Error, 'message': 'Company id is required.'})
                }else{

                    req.company = company
                    req.companyId = company._id
                    next()
                    return
                }
            })

        }else if(user.permissions.role != Role.GLOBAL_ADMIN) {
            const employee = <IEmployee>req.user
            Company.findById(employee.company, (err: any, company: ICompany) => {
                req.company = company
                req.companyId = company._id
                next()
                return
            })
        }else{
            next()
            return
        }

    }

}