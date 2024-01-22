import {Request, Response} from 'express';
import { Status, Messages } from '../common/constants';

import { CompanyEquipment, ICompanyEquipment } from '../models/CompanyEquipment';
import { isNull } from 'util';
import { ObjectId } from 'mongodb';

export const createCompanyEquipment = (req: Request, res: Response) => {

    const params = req.body;

    
    CompanyEquipment.findOne(  { $or: [{'info.nfcTag': params.nfcTag, company: new ObjectId(req.companyId)}, {'info.qrCode': params.qrCode, company: new ObjectId(req.companyId)}]}, 
        (err: any, compEquipmemnt: ICompanyEquipment)=>{
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError});
            }
        
            if(compEquipmemnt != undefined && !isNull(compEquipmemnt)){
                return res.json({ 'status': Status.Error, 'message': 'Equipment already added.'});
            
            }

            const equipment =  {
                info:{
                    imageUrl:  params.imageUrl,
                    model:  params.model,
                    serialNumber:  params.serialNumber,
                    nfcTag:'',
                    qrCode:'',
                },
                type: params.typeId,
                brand: params.brandId,
                company: req.companyId,
            };
            if (params.nfcTag) {
                equipment.info.nfcTag = params.nfcTag;
            
            } else  if (params.qrCode) {
                equipment.info.qrCode = params.qrCode;
    
            }else{
                return res.json({'status': Status.Error, 'message': Messages.MissingParams});
            }
        
            const companyEquipment = new CompanyEquipment(
                equipment
            );
    
            companyEquipment.save((err: any) => {
    
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError});
                }
    
                return res.json({'status': Status.Success, 'message': 'Company Equipment created successfully.'});
    
            });
        });

};

export const getCompanyEquipments = (req: Request, res: Response) => {

    CompanyEquipment.find({company: req.companyId})
        .populate({
            path: 'type',
            select: 'title'
        })
        .populate({
            path: 'brand',
            select: 'title'
        })
        .exec((err: any, companyEquipments: ICompanyEquipment[]) => {

            if (err || !companyEquipments) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            return res.json({'status': Status.Success, 'companyEquipments': companyEquipments});    
        });
};
