import { Request, Response } from 'express';
import { Status, Messages } from '../common/constants';
import { IUser } from '../models/User';
import { Part, IPart } from '../models/Part';

export const createPartInventory = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;

    Part.findOne({ company: req.companyId, itemCode: params.itemCode },
        (err: any, part: IPart) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }
            if (part != undefined || part != null) {
                return res.json({ 'status': Status.Error, 'message': 'Part aleady exist with itemCode ' + params.itemCode });
            }

            const newPart = new Part({
                name: params.name,
                description: params.description,
                itemCode: params.itemCode,
                totalQuantity: params.totalQuantity,
                availableQuantity: params.totalQuantity,
                cost: params.cost,
                price: params.price,
                company: req.companyId,
                createdBy: user._id,
                createdAt: Date.now()
            });

            newPart.save((err2: any) => {

                if (err2) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                }
        
                return res.json({ 'status': Status.Success, 'message': 'Part inventory created successfully.'});
            });
        }
    );
};

export const getPartInventory = (req: Request, res: Response) => {

    Part.find({ company: req.companyId })
        .exec((err: any, parts: IPart[]) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            return res.json({ 'status': Status.Success, 'parts': parts });
        });
};


export const removePartInventory = (req: Request, res: Response) => {

    const params = req.body;

    Part.findOne({ _id: params.partId, company: req.companyId })
        .exec((err: any, part: IPart) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }
            
            if (part == undefined || part == null) {
                return res.json({ 'status': Status.Error, 'message': 'Invalid part inventory id.'});
            }

            Part.deleteOne({_id: part._id}, 
                (err: any) => {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }

                    return res.json({ 'status': Status.Success, 'message': 'Part Inventory removed successfully.' });
                }
            );
        }
        );
};

export const updatePartInventory = (req: Request, res: Response) => {

    const params = req.body;

    Part.findOne({ _id: params.partId, company: req.companyId })
        .exec((err: any, part: IPart) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }
            
            if (part == undefined || part == null) {
                return res.json({ 'status': Status.Error, 'message': 'Invalid part inventory id.'});
            }


            part.name = params.name;
            part.description = params.description;
            part.cost = params.cost;
            part.price = params.price;
            part.itemCode = params.itemCode;
            part.totalQuantity = params.totalQuantity;
            part.availableQuantity = params.availableQuantity;

            part.updateOne(part, 
                (err: any) => {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }

                    return res.json({ 'status': Status.Success, 'message': 'Part inventory updated successfully.' });
                }
            );
        }
        );
};