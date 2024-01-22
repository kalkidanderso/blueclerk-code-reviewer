import { Request, Response } from 'express';
import { Status, Messages, PurchaseOrderStatus, EstimateStatus } from '../common/constants';
import { IUser } from '../models/User';
import { PurchaseOrder, IPurchaseOrder } from '../models/PurchaseOrder';
import { Estimate, IEstimate } from '../models/Estimate';
import { CustomerEquipment, ICustomerEquipment } from '../models/CustomerEquipment';
import * as Sentry from '@sentry/node';

export const createPO = (req: Request, res: Response) => {


    const params = req.body;
    const user = <IUser>req.user;
    const company = req.company;

    let items: any = [];
    if(params.items != undefined){
        items = JSON.parse(params.items);
    }

    const POItems: any[] = [];
    if(items.length > 0) {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if ((!item.hasOwnProperty('part') || !item.hasOwnProperty('cost') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity')) && (!item.hasOwnProperty('name') || !item.hasOwnProperty('itemCode') || !item.hasOwnProperty('cost') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity'))) {
                return res.json({ 'status': Status.Error, 'message': 'items format is invalid' });
            }
            const obj: any = {};
            obj.cost = item.cost;
            obj.price = item.price;
            obj.quantity = item.quantity;
            obj.taxPercentage = item.taxPercentage;
            obj.tax = item.tax;

            if (item.part == undefined || item.part == null) {
                obj.name = item.name;
                obj.itemCode = item.itemCode;
            } else {
                obj.part = item.part;
            }

            POItems.push(obj);
        }
    }

    // let taxAmount = 0;
    // let total = params.total;

    // if(params.tax != undefined && params.tax != null) {
    //     if(params.tax > 0) {
    //         taxAmount = total * (params.tax / 100)
    //         total = parseInt(total) + taxAmount
    //     }
    // }
    let POId = 1;
    if(company.currentPOId) {
        POId = company.currentPOId + 1;
    }

    const purchaseOrder = new PurchaseOrder({
        purchaseOrderId: 'Purchase Order ' + POId,
        items: POItems,
        note : params.note,
        total: params.total,
        job: params.job,
        customer: params.customer,
        company: req.companyId,
        createdBy: user._id,
        createdAt: Date.now(),
        // tax: taxAmount,
        // taxPercentage: params.tax,
    });

    if(params.equipmentId != undefined && params.equipmentId != null) {
        purchaseOrder.equipment = params.equipmentId;
    }

    purchaseOrder.save((err: any) => {

        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
        }

        company.updateOne({currentPOId: POId}, (err: any, raw: any) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            return res.json({ 'status': Status.Success, 'message': 'Purchase order created successfully.' });
        });

    });

};

export const createPOEstimate = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    const company = req.company;

    PurchaseOrder.findOne({ 'estimate': params.estimateId, 'company': req.companyId })
        .exec((err: any, estimate: IEstimate) => {

            if (estimate != undefined || estimate != null) {
                return res.json( {'status' : Status.Error, 'message' : 'Purchase Order already created for this estimate'});
            }

            Estimate.findOne({ _id: params.estimateId })
                .exec((err: any, estimate: IEstimate) => {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }

                    if(estimate == undefined || estimate == null ){
                        return res.json({ 'status': Status.Error, 'message': 'Invalid estimate id' });
                    }

                    // if(estimate.status == EstimateStatus.PENDING){
                    //     return res.json({ 'status': Status.Error, 'message': 'You can\'t create purchase order from pending estimate. It should be approved.' })
                    // }

                    if(estimate.status == EstimateStatus.CANCELED){
                        return res.json({ 'status': Status.Error, 'message': 'you can\'t create purchase order from canceled estimate.' });
                    }

                    const items = estimate.items;
                    if (items.length < 1 && estimate.note == undefined && estimate.note == '""') {

                        return res.json({ 'status': Status.Error, 'message': 'This estimate must have some items or note to create purchase order from estimate' });
                    }

                    const POItems: any[] = [];
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];

                        const obj: any = {};

                        obj.cost = item.cost;
                        obj.price = item.price;
                        obj.quantity = item.quantity;
                        obj.taxPercentage = item.taxPercentage;
                        obj.tax = item.tax;

                        if (item.part == undefined || item.part == null) {
                            obj.name = item.name;
                            obj.itemCode = item.itemCode;
                        } else {
                            obj.part = item.part;
                        }

                        POItems.push(obj);
                    }
                    const POId = company.currentPOId + 1;
                    const purchaseOrder = new PurchaseOrder({
                        purchaseOrderId: 'Purchase Order ' + POId,
                        items: POItems,
                        total: estimate.total,
                        note : estimate.note,
                        estimate: estimate._id,
                        customer: estimate.customer,
                        company: req.companyId,
                        createdBy: user._id,
                        createdAt: Date.now(),
                        estimateConverted: true
                    // tax: estimate.tax,
                    // taxPercentage: estimate.taxPercentage,
                    });
                    purchaseOrder.save((err: any) => {

                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                        }

                        company.updateOne({currentPOId: POId}, (err: any, raw: any) => {
                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                            }

                            return res.json({ 'status': Status.Success, 'message': 'Purchase order created successfully.' });
                        });

                    });
                });
        });
};


export const getAllPO = (req: Request, res: Response) => {

    PurchaseOrder.find({ company: req.companyId })
        .populate({
            path: 'customer',
            select: 'profile.displayName info.email contactName'
        })
        .populate({
            path: 'createdBy',
            select: 'info.companyName auth.email profile.displayName'
        })
        .populate({
            path: 'items.part',
            select: 'name itemCode description cost price'
        })
        .populate({
            path: 'estimate',
            select: 'total note'
        })
        .populate({
            path: 'equipment',
            select: 'info.model info.serialNumber info.location images'
        })
        .populate({
            path: 'job',
            populate: [
                {
                    path: 'ticket',
                    populate: 'customerContactId'
                },
                {
                    path: 'jobLocation'
                },
                {
                    path: 'jobSite'
                }
            ]
        })
        .exec((err: any, purchaseOrders: IPurchaseOrder[]) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            return res.json({ 'status': Status.Success, 'purchaseOrders': purchaseOrders });
        });
};

export const getAllEquipmentPurchaseOrder = (req: Request, res: Response) => {

    const params = req.body;

    PurchaseOrder.find({ company: req.companyId, equipment: params.equipmentId })
        .populate({
            path: 'customer',
            select: 'profile.displayName info.email contactName'
        })
        .populate({
            path: 'createdBy',
            select: 'info.companyName auth.email profile.displayName'
        })
        .populate({
            path: 'items.part',
            select: 'name itemCode description cost price'
        })
        .populate({
            path: 'estimate',
            select: 'total note'
        })
        .populate({
            path: 'equipment',
            select: 'info.model info.serialNumber info.location images'
        })
        .exec((err: any, purchaseOrders: IPurchaseOrder[]) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            return res.json({ 'status': Status.Success, 'purchaseOrders': purchaseOrders });
        });
};

export const updatePOStatus = (req: Request, res: Response) => {

    const params = req.body;

    PurchaseOrder.findOne({ company: req.companyId, _id: params.purchaseOrderId })
        .exec((err: any, purchaseOrder: IPurchaseOrder) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (purchaseOrder == undefined || purchaseOrder == null) {
                return res.json({ 'status': Status.Error, 'message': 'Invalid purchase order id.' });
            }

            // if (params.status != PurchaseOrderStatus.APPROVED && params.status != PurchaseOrderStatus.CANCELED) {
            //     return res.json({ 'status': Status.Error, 'message': 'Invalid purchase order status.' })
            // }

            // if (purchaseOrder.status == PurchaseOrderStatus.CANCELED) {
            //     return res.json({ 'status': Status.Error, 'message': "Purchase orde already canceled" })
            // }

            purchaseOrder.updateOne({ status: params.status },
                (err: any) => {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }

                    return res.json({ 'status': Status.Success, 'message': 'Purchase order status updated successfully.' });
                }
            );
        });
};


export const updatePO = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;

    PurchaseOrder.findOne({ '_id': params.purchaseOrderId, 'company': req.companyId },
        (err: any, purchaseOrder: IPurchaseOrder) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (purchaseOrder == undefined || purchaseOrder == null) {
                return res.json({ 'status': Status.Error, 'message': 'Invalid purchase order id.' });
            }

            // if (purchaseOrder.status == PurchaseOrderStatus.APPROVED) {
            //     return res.json({ 'status': Status.Error, 'message': "You can\'t change approved purchase order." })
            // }

            // if (purchaseOrder.status == PurchaseOrderStatus.CANCELED) {
            //     return res.json({ 'status': Status.Error, 'message': "You can\'t change canceled purchase order." })
            // }
            let items: any [];
            const POItems: any[] = [];

            if (params.items != undefined) {
                try {
                    items = JSON.parse(params.items);
                } catch (error) {
                    Sentry.captureException(error);
                    return res.json({ 'status': Status.Error, 'message': 'Items json is invalid' });
                }

                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if ((!item.hasOwnProperty('part') || !item.hasOwnProperty('cost') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity')) && (!item.hasOwnProperty('name') || !item.hasOwnProperty('itemCode') || !item.hasOwnProperty('cost') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity'))) {
                        return res.json({ 'status': Status.Error, 'message': 'items format is invalid' });
                    }
                    const obj: any = {};

                    obj.cost = item.cost;
                    obj.price = item.price;
                    obj.quantity = item.quantity;
                    obj.tax = item.tax;
                    obj.taxPercentage = item.taxPercentage;

                    if (item.part == undefined || item.part == null) {
                        obj.name = item.name;
                        obj.itemCode = item.itemCode;
                    } else {
                        obj.part = item.part;
                    }

                    POItems.push(obj);
                }
            }


            if(params.equipmentId != undefined && params.equipmentId != null) {
                purchaseOrder.update({items: POItems, job: params.job, total: params.total, note: params.note, equipment: params.equipmentId},
                    (err: any, raw: any) => {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                        }

                        return res.json({ 'status': Status.Success, 'message': 'Purchase Order updated successfully.' });
                    });
            }else{

                purchaseOrder.update({items: POItems, total: params.total, job: params.job, note: params.note},
                    (err: any, raw: any) => {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                        }

                        return res.json({ 'status': Status.Success, 'message': 'Purchase Order updated successfully.' });
                    });

            }


        });
};
