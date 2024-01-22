import {Request, Response} from 'express';
import { Status, Messages, EquipmentStatus } from '../common/constants';
import { CompanyEquipment, ICompanyEquipment } from '../models/CompanyEquipment';
import { CompanyEquipmentHistory } from '../models/CompanyEquipmentHistory';
import { IUser } from '../models/User';

export const createCompanyEquipmentHistory = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    
    if (!params.nfcTag && !params.qrCode) {
        return res.json({'status': Status.Error, 'message': Messages.MissingParams});
    } 

    CompanyEquipment.findOne(
        { $or: [{nfcTag: params.nfcTag}, {qrCode: params.qrCode}] },
        (err: any, companyEquipment: ICompanyEquipment)=>{
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }
    
            const equipmentHistory =  {
                action: -1,
                dateTime: params.dateTime,
                companyEquipment: companyEquipment._id,
                createdBy: user._id,
            };
        
            if (params.action == EquipmentStatus.CHECKIN) {
                equipmentHistory.action = EquipmentStatus.CHECKIN;

            } else if (params.action == EquipmentStatus.CHECKOUT) {
                equipmentHistory.action = EquipmentStatus.CHECKIN;

            } else {
                return res.json({'status': Status.Error, 'message': 'Invalid input for action.'});
            }
        
            const companyEquipmentHistory = new CompanyEquipmentHistory(
                equipmentHistory
            );
        
            companyEquipmentHistory.save((err: any) => {
        
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError});
                }
        
                return res.json({'status': Status.Success, 'message': 'Company Equipment History created successfully.'});
        
            });
        });

};
