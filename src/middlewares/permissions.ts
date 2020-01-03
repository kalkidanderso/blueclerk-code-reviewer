import {Request, Response, NextFunction} from 'express'
import { Role, Status, Messages } from '../common/constants'
import { IUser } from '../models/User'
import { Company, ICompany } from '../models/Company'
import { IEmployee } from '../models/Employee'

export const checkPermissions = (minAuth: Role) => {

    return async (req: Request, res: Response, next: NextFunction) => {

        const user = <IUser>req.user

        if (user.permissions.role < minAuth) {
            return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
        }

        next()

    }
}

export const checkUserPermissions = (permissionId : number) => {

    return async (req: Request, res: Response, next: NextFunction) => {
        
        const user = <IUser>req.user
        
        if (user.permissions.role == Role.GLOBAL_ADMIN) {
            next()
            return
        }
        
        const employee = <IEmployee>user
        if(employee.extraPermissions != undefined ){

            if(employee.extraPermissions.on.includes(permissionId)) {
             
                next()
                return
            }
            if(employee.extraPermissions.off.includes(permissionId)) {
            
                return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
            }

        } 
      
        Company.findById(req.companyId, 
        (err: any, company: ICompany)=>{
            switch (user.permissions.role) {
                case 0:
                    
                    if (!company.userPermissions[0].on.includes(permissionId)) {
                        return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
                    }
                    next()
                    break;
            
                case 1:
            
                    if (!company.userPermissions[1].on.includes(permissionId)) {
                        return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
                    }
                    next()
                    break;
                
                case 2:
                  
                    if (!company.userPermissions[2].on.includes(permissionId)) {
                        return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
                    }
                    next()
                    break;

                case 3:
                    
                    if (!company.userPermissions[3].on.includes(permissionId)) {
                        return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
                    }
                    next()
                    break;
                    
                default:
                        // return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
                        break;
                }
                return
            })
                
    }

}