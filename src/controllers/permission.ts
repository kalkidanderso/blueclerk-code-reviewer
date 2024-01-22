import {Request, Response, response} from 'express';
import { Status, Role, Messages, UserPermissions, ContractorPermissions } from '../common/constants';
import {sendEmail} from '../services/aws';

import { User, IUser } from '../models/User';
import { Company, ICompany } from '../models/Company';
import { Employee, IEmployee } from '../models/Employee';
import { Contract, IContract } from '../models/Contract';
import { ObjectId } from 'mongodb';
import { privateKey } from '../common/config';

export const getAllPermissions = (req: Request, res: Response) => {

    const company = <ICompany>req.company;

    if(company.userPermissions == undefined || !company.userPermissions) {
        setDefaultPermissions(req, res, (req, res, company)=>{
            return res.json({'status': Status.Success, 'permissions': company.userPermissions});
        });
    }
    return res.json({'status': Status.Success, 'permissions': company.userPermissions});
};

export const getOfficeAdminPermissions = (req: Request, res: Response) => {

    const company = <ICompany>req.company;

    if(company.userPermissions == undefined || !company.userPermissions) {
        setDefaultPermissions(req, res, (req, res, company)=>{
            return res.json({'status': Status.Success, 'permissions': company.userPermissions[0]});
        });
    }
    return res.json({'status': Status.Success, 'permissions': company.userPermissions[0]});
};


export const getTechPermissions = (req: Request, res: Response) => {

    const company = <ICompany>req.company;

    if(company.userPermissions == undefined || !company.userPermissions) {
        setDefaultPermissions(req, res, (req, res, company)=>{
            return res.json({'status': Status.Success, 'permissions': company.userPermissions[1]});
        });
    }
    return res.json({'status': Status.Success, 'permissions': company.userPermissions[1]});
};

export const getManagerPermissions = (req: Request, res: Response) => {

    const company = <ICompany>req.company;

    if(company.userPermissions == undefined || !company.userPermissions) {
        setDefaultPermissions(req, res, (req, res, company)=>{
            return res.json({'status': Status.Success, 'permissions': company.userPermissions[2]});
        });
    }
    return res.json({'status': Status.Success, 'permissions': company.userPermissions[2]});
};

export const getUserPermissions = (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;

    if(company.userPermissions == undefined || !company.userPermissions) {

        getPermissionByEmployeeId(req, res, company, params.employeeId, (req, res, permissions) => {

            return res.json({'status': Status.Success, 'permissions': permissions});
        });
    }
    getPermissionByEmployeeId(req, res, company, params.employeeId, (req, res, permissions) => {

        return res.json({'status': Status.Success, 'permissions': permissions});
    });
};

export const updateDefaultPermissions = (req: Request, res: Response) => {

    const params = req.body;
    const company = <ICompany>req.company;

    const userOn = params.onPermissions.split(',');
    const userOff = params.offPermissions.split(',');

    const userPermissionsToUpdate = company.userPermissions;

    switch (params.role) {
    case '0':
        userPermissionsToUpdate[0].on = userOn;
        userPermissionsToUpdate[0].off = userOff;
        break;
    case '1':
        userPermissionsToUpdate[1].on = userOn;
        userPermissionsToUpdate[1].off = userOff;
        break;
    case '2':
        userPermissionsToUpdate[2].on = userOn;
        userPermissionsToUpdate[2].off = userOff;
        break;

    default:
        break;
    }

    if(company.userPermissions == undefined || !company.userPermissions) {
        udpateDefaultPermissions(req, res, userPermissionsToUpdate, (req, res, company)=>{
            return res.json({'status': Status.Success, 'message': 'permissions updated successfuly'});
        });
    }
    udpateDefaultPermissions(req, res, userPermissionsToUpdate, (req, res, company)=>{
        return res.json({'status': Status.Success, 'message': 'permissions updated successfuly'});
    });
};
export const updateUserPermissions = (req: Request, res: Response) => {

    const params = req.body;

    const onPermissions = params.onPermissions.split(',');
    const offPermissions = params.offPermissions.split(',');
    const newPermissions = {
        on: onPermissions,
        off: offPermissions,
    };
    Employee.findById(params.employeeId, (err: any, employee: IEmployee) => {

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError});
        }

        employee.updateOne({
            extraPermissions: newPermissions
        }, (err: any, raw: any)=>{
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            return res.json({'status': Status.Success, 'message': 'permissions updated successfully.'});
        });
    });
};

const udpateDefaultPermissions =(req: Request, res: Response, permissions: any,  next: (req: Request, res: Response, company: ICompany)=>void) => {

    const company = <ICompany>req.company;

    company.updateOne(
        {
            userPermissions: permissions,
        },
        (err: any, raw: any)=> {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            next(req, res, company);
        }
    );
};

const setDefaultPermissions =(req: Request, res: Response, next: (req: Request, res: Response, company: ICompany)=>void) => {

    const company = <ICompany>req.company;

    company.updateOne(
        {
            userPermissions: UserPermissions,
        },
        (err: any, raw: any)=> {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            next(req, res, company);
        }
    );
};

const getPermissionByEmployeeId = (req: Request, res:Response, company: ICompany, employeeId: string, next: (req: Request, res: Response, permissions: any)=>void) => {

    Employee.findById(employeeId)
        .populate({ path:'company'})
        .exec((err: any, employee: IEmployee)=>{
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }
            let defaultPermissionsOn: any = [];
            let defaultPermissionsOff: any = [];
            switch (employee.permissions.role) {
            case 0:
                defaultPermissionsOn = company.userPermissions[0].on;
                defaultPermissionsOff = company.userPermissions[0].off;
                break;
            case 1:
                defaultPermissionsOn = company.userPermissions[1].on;
                defaultPermissionsOff = company.userPermissions[1].off;
                break;
            case 2:
                defaultPermissionsOn = company.userPermissions[2].on;
                defaultPermissionsOff = company.userPermissions[2].off;
                break;

            default:
                break;
            }


            defaultPermissionsOn = defaultPermissionsOn.filter( function( el: number ) {
                return employee.extraPermissions.off.indexOf( el ) < 0;
            });
            defaultPermissionsOn = defaultPermissionsOn.filter( function( el: number ) {
                return employee.extraPermissions.on.indexOf( el ) < 0;
            });
            defaultPermissionsOff = defaultPermissionsOff.filter( function( el: number ) {
                return employee.extraPermissions.off.indexOf( el ) < 0;
            });
            defaultPermissionsOff = defaultPermissionsOff.filter( function( el: number ) {
                return employee.extraPermissions.on.indexOf( el ) < 0;
            });

            defaultPermissionsOn = defaultPermissionsOn.concat(employee.extraPermissions.on);
            defaultPermissionsOff = defaultPermissionsOff.concat(employee.extraPermissions.off);

            const employeePermissions = {
                on: defaultPermissionsOn,
                off: defaultPermissionsOff,
            };
            next(req, res, employeePermissions);


        });
};

export const addContractorPermissions = (req: Request, res: Response) => {

    const params = req.body;

    const permissions = params.permissions.split(',').map(Number);
    const checker = (arr: any, target: any) => target.every((v: any) => arr.includes(v));

    if(!checker(ContractorPermissions.on, permissions)) {
        return res.json({'status': Status.Error, 'message': 'Invalid permissions for contractor'});
    }

    Contract.findOne( {contractor: params.contractorId, company: req.companyId},
        (err: any, contract: IContract) => {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            contract.updateOne({
                extraPermissions: permissions
            }, (err: any, raw: any)=>{
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError});
                }

                return res.json({'status': Status.Success, 'message': 'Contractor permissions added successfully.'});
            });
        });
};


export const updateAllCompaniesPermissions = (req: Request, res: Response) => {
    const params = req.body;
    if (params.first == 'ZAhhNlQ561' && params.second == privateKey.key) {
        Company.find({}, (err: any, companies: ICompany[]) => {
            if(err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }
            const count = companies.length;

            let loopcount = 0;
            companies.forEach(company => {
                company.updateOne({userPermissions: UserPermissions}, (err: any, raw: any) => {
                    if(err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError});
                    }
                    loopcount ++;
                    if(loopcount == count) {
                        return res.json({'status': Status.Error, 'message': 'Default permissions updated'});
                    }

                });
            });
        });
    }
};
