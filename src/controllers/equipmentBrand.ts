import {Request, Response} from 'express';
import { Status, Role, Messages } from '../common/constants';

import { EquipmentBrand, IEquipmentBrand } from '../models/EquipmentBrand';
import { IUser } from '../models/User';
import { Company, ICompany } from '../models/Company';

export const createEquipmentBrand = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    let userId: any = null;
    let industryId: any = null;

    if (user.permissions.role == Role.COMPANY_ADMIN || user.permissions.role == Role.ADMIN_EMPLOYEE) {
        userId = user._id;
    }

    if (user.permissions.role != Role.GLOBAL_ADMIN){
        userId = req.companyId;
    }


    if(user.permissions.role == Role.GLOBAL_ADMIN) {
        if(params.industryId == undefined) {
            return res.json({ status: Status.Error, message: 'Industry Id is required'});
        }else{
            industryId = params.industryId;
        }
    }

    if (industryId != null && industryId != undefined) {
        EquipmentBrand.findOne({title: params.title, industry: industryId,  createdBy: null}, (err: any, previousEquipmentBrand: IEquipmentBrand) =>{
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            if(previousEquipmentBrand != undefined || previousEquipmentBrand != null) {
                return res.json({'status': Status.Error, 'message': 'Equipment Brand already created for this industry'});
            }

            const brand = new EquipmentBrand({
                title: params.title,
                industry: industryId,
                createdBy:  userId
            });

            brand.save((err: any) => {

                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError});
                }

                return res.json({'status': Status.Success, 'message': 'Equipment brand created successfully.'});

            });
        });
    }else{
        const regex = new RegExp(['^', params.title, '$'].join(''), 'i');
        EquipmentBrand.findOne({title: regex,  createdBy: req.companyId}, (err: any, previousEquipmentBrand: IEquipmentBrand) =>{
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            if(previousEquipmentBrand != undefined || previousEquipmentBrand != null) {
                return res.json({'status': Status.Error, 'message': 'Equipment Brand already created'});
            }

            const brand = new EquipmentBrand({
                title: params.title,
                industry: industryId,
                createdBy:  userId
            });

            brand.save((err: any) => {

                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError});
                }

                return res.json({'status': Status.Success, 'message': 'Equipment brand created successfully.'});

            });
        });
    }



};

export const getEquipmentBrands = (req: Request, res: Response) => {

    const user = <IUser>req.user;
    let companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId;
    }
    if(user.permissions.role == Role.GLOBAL_ADMIN) {
        EquipmentBrand.find({},
            (err: any, brands: IEquipmentBrand[])=>{

                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError});
                }

                return res.json({'status': Status.Success, 'brands': brands});

            }
        );

    } else{
        Company.findById(companyId,
            (err: any, company: ICompany)=>{

                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError});
                }

                EquipmentBrand.find(
                    { $or : [ {createdBy: companyId} ,
                        { $and: [{industry: company.info.industry}, {createdBy: null}, ]}
                    ]},
                    (err: any, brands: IEquipmentBrand[])=>{

                        if (err) {
                            return res.json({'status': Status.Error, 'message': Messages.GenericError});
                        }

                        return res.json({'status': Status.Success, 'brands': brands});

                    }
                );

            });
    }

};
