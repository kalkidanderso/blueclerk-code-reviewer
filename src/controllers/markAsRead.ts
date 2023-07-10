import { Request, Response } from 'express';
import { Invoice } from '../models/Invoice';

/**
 * mark the bounced emails as read 
 */
export const markRead = async (req: Request, res: Response) => {
    try {

        const { invoiceId } = req.body
        
        await Invoice
        .findOneAndUpdate(
            { '_id': invoiceId.trim() },
            { $set: { bouncedEmailFlag: false } }
        );

        res.status(200).json({message: 'Success'})

    } catch (error) {        
        res.status(500).json({message: 'Failed to mark all bounced emails delivery status '})
    }
}