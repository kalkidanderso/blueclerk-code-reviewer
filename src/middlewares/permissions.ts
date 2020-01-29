import {Request, Response, NextFunction} from 'express'
import { Role, Status, Messages, Permissions, ContractStatus } from '../common/constants'
import { IUser } from '../models/User'
import { Company, ICompany } from '../models/Company'
import { IEmployee, Employee } from '../models/Employee'
import { Contract, IContract } from '../models/Contract'

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

        // check if get contracts

        if(user.permissions.role == Role.COMPANY){
            Company.findById(user._id, 
            (err: any, company: ICompany)=>{
                
                if(company.type == 1){
                    // it is contractor check contractor permissions
    
                    if(permissionId == Permissions.Get_All_Contracts || permissionId == Permissions.Accept_Reject_Contract || permissionId == Permissions.Upgrade_To_Company) {
                        next()
                        return
                    }
    
                    // check other contractor permissions

                    Contract.findOne( {company: req.otherCompanyId, contractor: company._id},
                        (err: any, contract: IContract)=>{
                            if (err) {
                                return res.json({'status': Status.Error, 'message': Messages.GenericError})
                            }
            
                            if (contract == undefined || contract == null) {
                                return res.json({'status': Status.Error, 'message': 'No Contract found.'})
                            }
            
                            if (contract.status == ContractStatus.CANCELED || contract.status == ContractStatus.FINISHED) {
                                return res.json({'status': Status.Error, 'message': 'Your contract is no more valid.'})
                            }
                            
                            if (contract.extraPermissions == undefined) {
                                return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
                            }
            
                            if (!contract.extraPermissions.includes(permissionId)) {
                                return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
                            }
            
                            next()
                            return
                        })
    
    
                } else {
                    if(req.otherCompanyId != undefined || req.otherCompanyId != null) {
                        // it is contracting company hiting api's for other company
                        if(permissionId == Permissions.Get_All_Contracts || permissionId == Permissions.Accept_Reject_Contract) {
                            next()
                            return
                        }
                        // find contract with other company and get permissions from contract
                        Contract.findOne( {company: req.otherCompanyId, contractor: req.companyId},
                            (err: any, contract: IContract)=>{
                                if (err) {
                                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                                }
                
                                if (contract == undefined || contract == null) {
                                    return res.json({'status': Status.Error, 'message': 'No Contract found.'})
                                }
                
                                if (contract.extraPermissions == undefined) {
                                    
                                    return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
                                }
                
                                if (!contract.extraPermissions.includes(permissionId)) {
                                    return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
                                }
                                next()
                                return
                            })
                    }else{
                        // it is not a contractinig company
                        if(permissionId == Permissions.Get_Company_Contracts || permissionId == Permissions.Cancel_Finish_Contract ) {
                            next()
                            return
                        }

                        if (!company.userPermissions[3].on.includes(permissionId)) {
                            return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
                        }
                        next()
                        return
                    }
            
                }
            })
        }else{

            Employee.findById(user._id, 
                (err: any, employee: IEmployee)=>{
                    if(employee.extraPermissions != undefined ){

                        if(employee.extraPermissions.on.includes(permissionId)) {
                            next()
                            return
                        }
                        
                        if(employee.extraPermissions.off.includes(permissionId)) {
                            return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
                        }
                        Company.findById(employee.company, 
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
    
    
                })
        }


        // if(user.permissions.role == Role.)

        // if (user.permissions.role == Role.CONTRACTOR) {

        //     if(permissionId == Permissions.Get_All_Contracts || permissionId == Permissions.Accept_Reject_Contract || permissionId == Permissions.Upgrade_To_Company) {
        //         next()
        //         return
        //     }
            
        //     Contract.findOne( {company: req.otherCompanyId, contractor: user._id},
        //     (err: any, contract: IContract)=>{
        //         if (err) {
        //             return res.json({'status': Status.Error, 'message': Messages.GenericError})
        //         }

        //         if (contract == undefined || contract == null) {
        //             return res.json({'status': Status.Error, 'message': 'No Contract found.'})
        //         }

        //         if (contract.status == ContractStatus.CANCELED || contract.status == ContractStatus.FINISHED) {
        //             return res.json({'status': Status.Error, 'message': 'Your contract is no more valid.'})
        //         }
                
        //         if (contract.extraPermissions == undefined) {
        //             return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
        //         }

        //         if (!contract.extraPermissions.includes(permissionId)) {
        //             return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
        //         }

        //         next()
        //         return
        //     })
            
        // }
        
        // if(permissionId == Permissions.Get_Company_Contracts) {
        //     next()
        //     return
        // }

        // if (req.otherCompanyId != undefined) {
        //     if( permissionId == Permissions.Cancel_Finish_Contract) {
        //         next()
        //         return
        //     }
        //     Contract.findOne( {company: req.otherCompanyId, contractor: req.companyId},
        //     (err: any, contract: IContract)=>{
        //         if (err) {
        //             return res.json({'status': Status.Error, 'message': Messages.GenericError})
        //         }

        //         if (contract == undefined || contract == null) {
        //             return res.json({'status': Status.Error, 'message': 'No Contract found.'})
        //         }

        //         if (contract.extraPermissions == undefined) {
                    
        //             return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
        //         }

        //         if (!contract.extraPermissions.includes(permissionId)) {
        //             return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
        //         }

        //         next()
        //         return
        //     })
            
        // }
        
        // const employee = <IEmployee>user
        // if(employee.extraPermissions != undefined ){

        //     if(employee.extraPermissions.on.includes(permissionId)) {
             
        //         next()
        //         return
        //     }
        //     if(employee.extraPermissions.off.includes(permissionId)) {
            
        //         return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
        //     }

        // } 
      
        // Company.findById(req.companyId, 
        // (err: any, company: ICompany)=>{
        //     switch (user.permissions.role) {
        //         case 0:
                    
        //             if (!company.userPermissions[0].on.includes(permissionId)) {
        //                 return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
        //             }
        //             next()
        //             break;
            
        //         case 1:
            
        //             if (!company.userPermissions[1].on.includes(permissionId)) {
        //                 return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
        //             }
        //             next()
        //             break;
                
        //         case 2:
                  
        //             if (!company.userPermissions[2].on.includes(permissionId)) {
        //                 return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
        //             }
        //             next()
        //             break;

        //         case 3:
                    
        //             if (!company.userPermissions[3].on.includes(permissionId)) {
        //                 return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
        //             }
        //             next()
        //             break;
                    
        //         default:
        //                 // return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
        //                 break;
        //         }
        //         return
        //     })
                
    }

}