import { Request, Response } from 'express';
import { Status, Role, Messages } from '../common/constants';

import { EquipmentType, IEquipmentType } from '../models/EquipmentType';
import { IUser } from '../models/User';
import { Company, ICompany } from '../models/Company';

export const createEquipmentType = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;

    let userId: any = null;
    let industryId: any = null;

    if (user.permissions.role == Role.COMPANY_ADMIN || user.permissions.role == Role.ADMIN_EMPLOYEE) {
        userId = user._id;
    }

    if (user.permissions.role != Role.GLOBAL_ADMIN) {
        userId = req.companyId;
    }

    if (user.permissions.role == Role.GLOBAL_ADMIN) {
        if (params.industryId == undefined) {
            return res.json({ status: Status.Error, message: 'Industry Id is required'});
        } else {
            industryId = params.industryId;
        }
    }
    if (industryId != null) {
        EquipmentType.findOne({title: params.title, industry: industryId, createdBy: null}, (err: any, previousEquipmentType: IEquipmentType) =>{
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            if (previousEquipmentType != undefined || previousEquipmentType != null) {
                return res.json({'status': Status.Error, 'message': 'Equipment Type already created fot this industry'});
            }

            const type = new EquipmentType({
                title: params.title,
                industry: industryId,
                createdBy:  userId
            });

            type.save((err: any) => {

                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError});
                }

                return res.json({'status': Status.Success, 'message': 'Equipment type created successfully.'});

            });
        });
    } else {
        const regex = new RegExp(['^', params.title, '$'].join(''), 'i');
        EquipmentType.findOne({title: regex, createdBy: req.companyId}, (err: any, previousEquipmentType: IEquipmentType) =>{
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            if (previousEquipmentType != undefined || previousEquipmentType != null) {
                return res.json({'status': Status.Error, 'message': 'Equipment Type already created'});
            }

            const type = new EquipmentType({
                title: params.title,
                industry: industryId,
                createdBy:  userId
            });

            type.save((err: any) => {

                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError});
                }

                return res.json({'status': Status.Success, 'message': 'Equipment type created successfully.'});

            });
        });
    }



};

export const getEquipmentTypes = (req: Request, res: Response) => {

    const user = <IUser>req.user;
    let companyId = req.companyId;
    if (req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    if (user.permissions.role == Role.GLOBAL_ADMIN) {

        EquipmentType.find({},
            (err: any, types: IEquipmentType[])=>{

                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError});
                }

                return res.json({'status': Status.Success, 'types': types});

            }
        );

    } else {

        Company.findById(companyId,
            (err: any, company: ICompany)=>{

                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError});
                }

                EquipmentType.find(
                    { $or : [ {createdBy: companyId} ,
                        { $and: [{industry: company.info.industry}, {createdBy: null}, ]}
                    ]},
                    (err: any, types: IEquipmentType[])=>{

                        if (err) {
                            return res.json({'status': Status.Error, 'message': Messages.GenericError});
                        }

                        return res.json({'status': Status.Success, 'types': types});

                    }
                );

            });

    }
};
