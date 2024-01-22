import {Request, Response, NextFunction} from 'express';
import { Role, Status, Messages, Permissions, ContractStatus } from '../common/constants';
import { IUser } from '../models/User';
import { Company, ICompany } from '../models/Company';
import { IEmployee, Employee } from '../models/Employee';
import { Contract, IContract } from '../models/Contract';
import { ICompanyAdmin, CompanyAdmin } from '../models/CompanyAdmin';
import {Tag} from '../models/Tag';
import {createManager} from '../controllers/user';
import {CustomerEquipment} from '../models/CustomerEquipment';
import * as Sentry from '@sentry/node';

export const checkPermissions = (minAuth: Role) => {

    return async (req: Request, res: Response, next: NextFunction) => {

        const user = <IUser>req.user;

        if (user.permissions.role < minAuth) {
            return res.json({'status': Status.Error, 'message': Messages.UnAuthorized});
        }

        next();

    };
};
export const checkSpecificPermissions = (minAuth: Role[]) => {

    return async (req: Request, res: Response, next: NextFunction) => {

        const user = <IUser>req.user;

        if (!minAuth.includes(user.permissions.role)) {
            console.log('not there' , minAuth, user.permissions.role);
            return res.json({'status': Status.Error, 'message': Messages.UnAuthorized});
        }

        next();

    };
};

export const checkUserScanPermissions = (permissionId: number) => {
    return async (req: Request, res: Response, next: NextFunction) => {

        const user = <IUser>req.user;
        const company =<ICompany>req.company;
        const tag = req.body.nfcTag;
        const checkTag = await Tag.findOne({'info.nfcTag' : tag});
        const equipmentTag = await CustomerEquipment.findOne({ 'info.nfcTag': tag });

        if(!checkTag && !equipmentTag) {
            return res.json({ 'status': Status.Success, 'tagStatus': Status.TagNotAssociated, 'message': 'Tag Not In System' });
        }

        let check = false;
        if (user.permissions.role == Role.GLOBAL_ADMIN) {
            check = true;
            next();
            return ;
        }

        // Take the Company ID from the tag either location or equipment
        const companyOfTag =
            checkTag && checkTag.company
                ? checkTag.company
                : equipmentTag && equipmentTag.customer
                    ? equipmentTag.customer
                    : undefined;

        // check if it's the company owner
        if((user.permissions.role == Role.COMPANY_ADMIN || user.permissions.role == Role.ADMIN_EMPLOYEE) && JSON.stringify(company._id) == JSON.stringify(companyOfTag)) {
            check = true;
            // check if it's an employee
        } else if (JSON.stringify(company._id) == JSON.stringify(companyOfTag) && (user.permissions.role != Role.COMPANY_ADMIN && user.permissions.role != Role.ADMIN_EMPLOYEE)) {
            if (
                user.permissions.role == Role.MANAGER ||
                user.permissions.role == Role.TECHNICIAN
            ) {
                check = true;
            }
        } else {
            // This is a contractor
            // if (company.type == 1) {
            // verify if there's a contract with it
            try {
                const contract =
                        await Contract.findOne({company: companyOfTag, contractor: company._id, status: 1});
                if (contract) {
                    check = true;
                }

            }catch (err) {
                Sentry.captureException(err);
                return res.json({'status': Status.Error, 'message': err.message});
            }
            // }
        }
        if(!check) {
            return res.json({'status': Status.Error, 'message': Messages.UnAuthorized});
        } else {
            next();
            return ;
        }
    };

};
export const checkUserPermissions = (permissionId : number) => {

    return async (req: Request, res: Response, next: NextFunction) => {

        const user = <IUser>req.user;
        if (user.permissions.role == Role.GLOBAL_ADMIN) {
            next();
            return;
        }

        // check if get contracts

        if(user.permissions.role == Role.COMPANY_ADMIN || user.permissions.role == Role.ADMIN_EMPLOYEE || user.permissions.role == Role.CONTRACTOR){

            const companyAdmin = <ICompanyAdmin>req.user;

            Company.findById(companyAdmin.company,
                (err: any, company: ICompany)=>{

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': 'Unable to find your company. Contact BlueClerk admin for more.' });
                    }

                    if(company.type == 1){
                    // it is contractor check contractor permissions from default or contract

                        if(permissionId == Permissions.Get_All_Contracts || permissionId == Permissions.Accept_Reject_Contract || permissionId == Permissions.Upgrade_To_Company) {
                            next();
                            return;
                        }

                        // check other contractor permissions

                        // Contract.findOne( {company: req.otherCompanyId, contractor: company._id},
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
                        //     }
                        // )
                        next();
                        return;


                    } else {

                        if(req.otherCompanyId != undefined || req.otherCompanyId != null) {
                        // it is contracting company hitting api's for other company
                            if(permissionId == Permissions.Get_All_Contracts || permissionId == Permissions.Accept_Reject_Contract) {
                                next();
                                return;
                            }

                            // find contract with other company and get permissions from contract
                            Contract.findOne( {company: req.otherCompanyId, contractor: req.companyId},
                                (err: any, contract: IContract)=>{
                                    if (err) {
                                        return res.json({'status': Status.Error, 'message': Messages.GenericError});
                                    }

                                    if (contract == undefined) {
                                        return res.json({'status': Status.Error, 'message': 'No Contract found.'});
                                    }

                                    if (contract.extraPermissions == undefined) {
                                        console.log(0);
                                        return res.json({'status': Status.Error, 'message': Messages.UnAuthorized});
                                    }

                                    if (!contract.extraPermissions.includes(permissionId)) {
                                        console.log(1);
                                        return res.json({'status': Status.Error, 'message': Messages.UnAuthorized});
                                    }
                                    next();
                                    return;
                                });
                        }else{
                        // it is not a contracting company
                            if(permissionId == Permissions.Get_Company_Contracts || permissionId == Permissions.Cancel_Finish_Contract || permissionId == Permissions.Get_Contractor_Detail) {
                                next();
                                return;
                            }

                            if (!company.userPermissions[3].on.includes(permissionId)) {
                                console.log(2);
                                return res.json({'status': Status.Error, 'message': Messages.UnAuthorized});
                            }
                            next();
                            return;
                        }

                    }
                });
        }else{

            Employee.findById(user._id,
                (err: any, employee: IEmployee)=>{

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }
                    if (employee?.extraPermissions) {

                        if(employee.extraPermissions.on.includes(permissionId)) {
                            next();
                            return;
                        }

                        if(employee.extraPermissions.off.includes(permissionId)) {
                            console.log(3);
                            return res.json({'status': Status.Error, 'message': Messages.UnAuthorized});
                        }
                        Company.findById(employee.company,
                            (err: any, company: ICompany)=>{
                                if (err) {
                                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                                }

                                switch (user.permissions.role) {
                                case 0:

                                    if (!company.userPermissions[0].on.includes(permissionId)) {
                                        console.log(4);
                                        return res.json({'status': Status.Error, 'message': Messages.UnAuthorized});
                                    }
                                    next();
                                    break;

                                case 1:

                                    if (!company.userPermissions[1].on.includes(permissionId)) {
                                        console.log(5);
                                        return res.json({'status': Status.Error, 'message': Messages.UnAuthorized});
                                    }
                                    next();
                                    break;

                                case 2:

                                    if (!company.userPermissions[2].on.includes(permissionId)) {
                                        console.log(6);
                                        return res.json({'status': Status.Error, 'message': Messages.UnAuthorized});
                                    }
                                    next();
                                    break;

                                case 3:

                                    if (!company.userPermissions[3].on.includes(permissionId)) {
                                        console.log(7);
                                        return res.json({'status': Status.Error, 'message': Messages.UnAuthorized});
                                    }
                                    next();
                                    break;

                                default:
                                    // return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
                                    break;
                                }
                                return;
                            });

                    }


                });
        }
    };
};
