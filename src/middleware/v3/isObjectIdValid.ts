import {Request, Response, NextFunction} from 'express'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

export const isObjectIdValid= (req :Request,res: Response , next: NextFunction)=>{
    const { invoiceId, id } = req.body;

    if (!invoiceId && !id) {
        res.status(500).json({message: 'Marked bounced mails delivery status '})
    }

    // if(!mongoose.Types.ObjectId.isValid(invoiceId) && !mongoose.Types.ObjectId.isValid(id)){
    //     res.json({error: "Invalid param"})
    // }
    next();
}