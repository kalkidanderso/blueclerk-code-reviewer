import { Request, Response } from 'express'
import { Status, Messages, PurchaseOrderStatus } from '../common/constants'
import { IUser } from '../models/User'
import { PurchaseOrder, IPurchaseOrder } from '../models/PurchaseOrder'

export const createPO = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;

    var items = JSON.parse(params.items);

    if (items.length == 0) {
        return res.json({ 'status': Status.Error, 'message': 'items are required' })
    }

    let POItems: any[] = []
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.hasOwnProperty('part') && (!item.hasOwnProperty('name') || !item.hasOwnProperty('itemCode') || !item.hasOwnProperty('cost') || !item.hasOwnProperty('price'))) {
            return res.json({ 'status': Status.Error, 'message': 'items format is invalid' })
        }
        let obj: any = {}
        if (item.part == undefined || item.part == null) {
            obj.name = item.name
            obj.itemCode = item.itemCode
            obj.cost = item.cost
            obj.price = item.price
            obj.quantity = item.quantity
        } else {
            obj.part = item.part
            obj.quantity = item.quantity
        }

        POItems.push(obj)
    }

    const purchaseOrder = new PurchaseOrder({
        items: POItems,
        total: params.total,
        job: params.job,
        customer: params.customer,
        company: req.companyId,
        createdBy: user._id,
        createdAt: Date.now()
    });

    purchaseOrder.save((err: any) => {

        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }

        return res.json({ 'status': Status.Success, 'message': 'Purchase order created successfully.' })

    })
}

export const getAllPO = (req: Request, res: Response) => {

    PurchaseOrder.find({ company: req.companyId })
        .populate({
            path: 'customer',
            select: 'profile.displayName info.email'
        })
        .populate({
            path: 'createdBy',
            select: 'info.companyName auth.email profile.displayName'
        })
        .populate({
            path: 'items.part',
            select: 'name itemCode description cost price'
        })
        .exec((err: any, purchaseOrders: IPurchaseOrder[]) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            return res.json({ 'status': Status.Success, 'purchaseOrders': purchaseOrders })
        })
}

export const updatePOStatus = (req: Request, res: Response) => {

    const params = req.body

    PurchaseOrder.findOne({ company: req.companyId, _id: params.purchaseOrderId })
        .exec((err: any, purchaseOrder: IPurchaseOrder) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (purchaseOrder == undefined || purchaseOrder == null) {
                return res.json({ 'status': Status.Error, 'message': 'Invalid purchase order id.' })
            }

            if (params.status != PurchaseOrderStatus.APPROVED && params.status != PurchaseOrderStatus.CANCELED) {
                return res.json({ 'status': Status.Error, 'message': 'Invalid purchase order status.' })
            }

            if (purchaseOrder.status == PurchaseOrderStatus.CANCELED) {
                return res.json({ 'status': Status.Error, 'message': "Purchase orde already canceled" })
            }

            purchaseOrder.updateOne({ status: params.status },
                (err: any) => {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    return res.json({ 'status': Status.Success, 'message': 'Purchase order status updated successfully.' })
                }
            )
        })
}


export const updatePO = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user

    PurchaseOrder.findOne({ '_id': params.purchaseOrderId, 'company': req.companyId },
        (err: any, purchaseOrder: IPurchaseOrder) => {
            
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (purchaseOrder == undefined || purchaseOrder == null) {
                return res.json({ 'status': Status.Error, 'message': 'Invalid purchase order id.' })
            }
            
            if (purchaseOrder.status == PurchaseOrderStatus.APPROVED) {
                return res.json({ 'status': Status.Error, 'message': "You can\'t change approved purchase order." })
            }
            
            if (purchaseOrder.status == PurchaseOrderStatus.CANCELED) {
                return res.json({ 'status': Status.Error, 'message': "You can\'t change canceled purchase order." })
            }

            var items = JSON.parse(params.items);

            if (items.length == 0) {
                return res.json({ 'status': Status.Error, 'message': 'items are required' })
            }
        
            let POItems: any[] = []
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (!item.hasOwnProperty('part') && (!item.hasOwnProperty('name') || !item.hasOwnProperty('itemCode') || !item.hasOwnProperty('cost') || !item.hasOwnProperty('price'))) {
                    return res.json({ 'status': Status.Error, 'message': 'items format is invalid' })
                }
                let obj: any = {}
                if (item.part == undefined || item.part == null) {
                    obj.name = item.name
                    obj.itemCode = item.itemCode
                    obj.cost = item.cost
                    obj.price = item.price
                    obj.quantity = item.quantity
                } else {
                    obj.part = item.part
                    obj.quantity = item.quantity
                }
        
                POItems.push(obj)
            }

            purchaseOrder.update({items: POItems, total: params.total, customer: params.customer, job: params.job},
                (err: any, raw: any) => {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    return res.json({ 'status': Status.Success, 'message': "Purchase Order updated successfully." })
                })
        });
}