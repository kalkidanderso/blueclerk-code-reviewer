import { Request, Response } from 'express';
import { Invoice } from '../models/Invoice';
/**
 * To store bounced emails in db
 */
export const store = async (req: Request, res: Response) => {
    try {

        const { email } = req.body
        
        const invoice = await Invoice
        .findOneAndUpdate(
            { 'emailHistory.sentTo': email.trim() },
            { 
                $set: { 
                    'emailHistory.$.deliveryStatus': false,
                    bouncedEmailFlag: true
                },
            },
        );
       
        if (!invoice) {
            res.status(500).json({message: 'Invoice not found'})
        }

        res.status(200).json({message: 'Success'})

    } catch (error) {        
        res.status(500).json({message: 'Failed to update bounced status'})
    }
}