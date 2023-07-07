import { Request, Response } from 'express';
import { Invoice } from '../models/Invoice';
import { indexOf } from 'lodash';
/**
 * To store bounced emails in db
 */
export const store = async (req: Request, res: Response) => {
    try {

        const { email } = req.body
        
        const invoice = await Invoice
        .findOne(
            { 'emailHistory.sentTo': email.trim()}
        );

        if (!invoice) {
            res.status(500).json({message:'Invoice not found'})
        }

        invoice.bouncedEmailFlag = true;
        invoice.save()

        res.status(200).json({message: 'Success'})

    } catch (error) {        
        res.status(500).json({message:'Failed to update bounced status'})
    }
}