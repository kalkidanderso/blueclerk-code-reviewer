import {Request, Response} from 'express';
import { Status, Messages} from '../common/constants';
import { CompanyEquipment, ICompanyEquipment } from '../models/CompanyEquipment';
import { CompanyEquipmentInventory, ICompanyEquipmentInventory } from '../models/CompanyEquipmentInventory';
import { IUser } from '../models/User';
import { Group, IGroup } from '../models/Group';
import { ObjectId } from 'mongodb';


export const createCompanyEquipmentInventory = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;

    if (params.nfcTags == undefined && params.qrCodes == undefined) {
        return res.json({'status': Status.Error, 'message': Messages.MissingParams});
    }
    let nfcTags =[];
    if (params.nfcTags != undefined) {
        nfcTags = params.nfcTags.split(',');
    }
    let qrCodes = [];
    if (params.qrCodes != undefined) {
        qrCodes = params.qrCodes.split(',');
    }
    

    CompanyEquipment.find({ $or: [{'info.nfcTag' : {$in: nfcTags}}, {'info.qrCode' : {$in: qrCodes}}] },
        '_id',
        (err: any, companyEquipments: ICompanyEquipment[]) =>{
            
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }

            const ids = companyEquipments.map(function(item) {
                return item._id;
            });

            const companyEquipmentInventory = new CompanyEquipmentInventory({
                dateTime: params.dateTime,
                createdBy: user._id,
                noOfItems: ids.length,                
                companyEquipments: ids
            });

            companyEquipmentInventory.save((err: any)=>{
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError});
                }

                return res.json({'status': Status.Success, 'message': 'Inventory created successfully.'}); 
            });
            
        });
};

export const getIventoryHistory = (req: Request, res: Response) => {

    const user = <IUser> req.user;
    
    Group.findOne(
        {members: new ObjectId(user._id)},
        (err: any, group: IGroup)=>{

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError});
            }
            
            if (group == null || group == undefined) {
                
                return res.json({'status': Status.Success, 'companyEquipmentInventory': []}); 
            }
            
            const members = group.members.map((id)=>{
                
                return id;
            });

            
            CompanyEquipmentInventory.find({createdBy : {$in: members}})
                .populate({
                    path: 'createdBy',
                    select: 'profile.displayName',
                })
                .exec((err: any, companyEquipmentInventory: ICompanyEquipmentInventory[]) =>{
                
                    if (err) {
                    
                        return res.json({'status': Status.Error, 'message': Messages.GenericError});
                    }

                    return res.json({'status': Status.Success, 'companyEquipmentInventory': companyEquipmentInventory}); 
                });
            
        });

};
