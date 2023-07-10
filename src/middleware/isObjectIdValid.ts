import {Request, Response, NextFunction} from 'express'
import mongoose from 'mongoose';

export const isObjectIdValid= (req :Request,res: Response , next: NextFunction)=>{
    const {invoiceId}=req.body;

    if (!invoiceId) {
        res.status(500).json({message: 'Marked bounced mails delivery status '})
    }

    if(!mongoose.Types.ObjectId.isValid(invoiceId)){
        res.json({error: "Invalid InvoiceId"})
    }
    next();
}