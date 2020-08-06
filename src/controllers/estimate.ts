import { Request, Response } from 'express'
import { Status, Messages, EstimateStatus } from '../common/constants'
import { IUser } from '../models/User'
import { Estimate, IEstimate } from '../models/Estimate'
import { PurchaseOrder, IPurchaseOrder } from '../models/PurchaseOrder'

export const createEstimate = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    if(params.purchaseOrderId == null || params.purchaseOrderId == undefined) {

        if(params.customer == null || params.customer == undefined) {
            return res.json({ 'status': Status.Error, 'message': 'Customer id is required' })
        }

        var items: any = []
        if (params.items != undefined) {
            items = JSON.parse(params.items);
        }
        let estimateItems: any[] = []
        if (items.length > 0) {
    
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if ((!item.hasOwnProperty('part') || !item.hasOwnProperty('cost') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity')) && (!item.hasOwnProperty('name') || !item.hasOwnProperty('itemCode') || !item.hasOwnProperty('cost') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity'))) {
                    return res.json({ 'status': Status.Error, 'message': 'items format is invalid' })
                }
                let obj: any = {}
                obj.cost = item.cost
                obj.price = item.price
                obj.tax = item.tax
                obj.taxPercentage = item.taxPercentage
                obj.quantity = item.quantity

                if (item.part == undefined || item.part == null) {
                    obj.name = item.name
                    obj.itemCode = item.itemCode
                } else {
                    obj.part = item.part
                }
                estimateItems.push(obj)
            }
        }

        // let taxAmount = 0;
        // let total = params.total;
        
        // if(params.tax != undefined && params.tax != null) {
        //     if(params.tax > 0) {
        //         taxAmount = total * (params.tax / 100)
        //         total = total + taxAmount
        //     }    
        // }
    
        const estimate = new Estimate({
            note: params.note,
            items: estimateItems,
            total: params.total,
            customer: params.customer,
            company: req.companyId,
            createdBy: user._id,
            createdAt: Date.now(),
            // tax: taxAmount,
            // taxPercentage: params.tax,
        });
    
        estimate.save((err: any) => {
    
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }
    
            return res.json({ 'status': Status.Success, 'message': 'Estimate created successfully.' })
    
        })
    
    } else {
        PurchaseOrder.findById(params.purchaseOrderId)
        .exec((err: any, purchaseOrder: IPurchaseOrder) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }
    
            if (purchaseOrder == undefined || purchaseOrder == null) {
                return res.json({ 'status': Status.Error, 'message': 'Invalid purchase order id.' })
            }

            const estimate = new Estimate({
                note: purchaseOrder.note,
                items: purchaseOrder.items,
                total: purchaseOrder.total,
                customer: purchaseOrder.customer,
                company: req.companyId,
                createdBy: user._id,
                createdAt: Date.now(),
                // tax: purchaseOrder.tax,
                // taxPercentage: purchaseOrder.taxPercentage,
            });
        
            estimate.save((err: any) => {
        
                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                }
        
                return res.json({ 'status': Status.Success, 'message': 'Estimate created successfully.' })
        
            })
        })
    }
}

export const getEstimates = (req: Request, res: Response) => {

    let where : any = {}
    const params = req.body
    where.company = req.companyId
    if (params.customer != undefined || params.customer != null) {
        where.customer = params.customer
    }
    
    Estimate.find(where)
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
            select: 'name itemCode note cost price'
        })
        .exec((err: any, estimates: IEstimate[]) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            return res.json({ 'status': Status.Success, 'estimates': estimates })
        })
}

export const updateEstimateStatus = (req: Request, res: Response) => {

    const params = req.body

    Estimate.findOne({ company: req.companyId, _id: params.estimateId })
        .exec((err: any, estimate: IEstimate) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (estimate == undefined || estimate == null) {
                return res.json({ 'status': Status.Error, 'message': 'Invalid Estimate id.' })
            }

            // if (params.status != EstimateStatus.APPROVED && params.status != EstimateStatus.CANCELED) {
            //     return res.json({ 'status': Status.Error, 'message': 'Invalid estimate status.' })
            // }

            // if (estimate.status == EstimateStatus.CANCELED) {
            //     return res.json({ 'status': Status.Error, 'message': "Estimate already canceled" })
            // }

            estimate.updateOne({ status: params.status },
                (err: any) => {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    return res.json({ 'status': Status.Success, 'message': 'Estimate status updated successfully.' })
                }
            )
        })
}

export const updateEstimate = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user

    Estimate.findOne({ '_id': params.estimateId, 'company': req.companyId },
        (err: any, estimate: IEstimate) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (estimate == undefined || estimate == null) {
                return res.json({ 'status': Status.Error, 'message': 'Invalid Estimate id.' })
            }

            // if (estimate.status == EstimateStatus.APPROVED) {
            //     return res.json({ 'status': Status.Error, 'message': "You can\'t change approved Estimate." })
            // }

            if (estimate.status == EstimateStatus.CANCELED) {
                return res.json({ 'status': Status.Error, 'message': "You can\'t change canceled Estimate." })
            }
            let estimateItems: any[] = []

            var items: any = []
            if (params.items != undefined) {
                items = JSON.parse(params.items)
            }

            if (items.length > 0) {

                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if ((!item.hasOwnProperty('part') || !item.hasOwnProperty('cost') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity')) && (!item.hasOwnProperty('name') || !item.hasOwnProperty('itemCode') || !item.hasOwnProperty('cost') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity'))) {
                        return res.json({ 'status': Status.Error, 'message': 'items format is invalid' })
                    }
                    let obj: any = {}
                    obj.cost = item.cost
                    obj.price = item.price
                    obj.quantity = item.quantity
                    obj.tax = item.tax
                    obj.taxPercentage = item.taxPercentage

                    if (item.part == undefined || item.part == null) {
                        obj.name = item.name
                        obj.itemCode = item.itemCode
                    } else {
                        obj.part = item.part
                    }
                    
                    estimateItems.push(obj)
                }

            }
            
            
            // let total = params.total;

            estimate.updateOne({ items: estimateItems, total: params.total, customer: params.customer, note: params.note },
                (err: any, raw: any) => {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': err })
                    }

                    return res.json({ 'status': Status.Success, 'message': "Estimate updated successfully." })
                })
        });
}

export const cancelEstimate = (req: Request, res: Response) => {

    const params = req.body

    Estimate.findOne({_id: params.estimateId, company : req.companyId })
        .exec((err: any, estimate: IEstimate) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (estimate == undefined || estimate == null) {
                return res.json({ 'status': Status.Error, 'message': 'Invalid Estimate id.' })
            }

            // if (estimate.status == EstimateStatus.APPROVED){
            //     return res.json({ 'status': Status.Error, 'message': 'You can\'t delete approved estimate.' })
            // }

            if (estimate.status == EstimateStatus.CANCELED){
                return res.json({ 'status': Status.Error, 'message': 'Estimate is already canceled.' })
            }

            estimate.updateOne({ status: EstimateStatus.CANCELED})
                .exec((err: any, res: any) => {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    return res.json({ 'status': Status.Success, 'message': 'Estimate canceled.' })
                })
        })
}