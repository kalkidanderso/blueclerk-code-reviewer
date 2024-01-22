import { Request, Response } from 'express';
import { Invoice } from '../models/Invoice';
import { ServiceTicket } from '../models/ServiceTicket';

/**
 * To store bounced emails in db
 */
export const storeforInvoices = async (req: Request, res: Response) => {
    try {

        const { email } = req.body;
        
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
            res.status(500).json({message: 'Invoice not found'});
        }

        res.status(200).json({message: 'Success'});

    } catch (error) {        
        res.status(500).json({message: 'Failed to update bounced status'});
    }
};

export const storeforPO = async (req: Request, res: Response) => {
    try {

        const { email } = req.body;
        
        const poTicket = await ServiceTicket
            .findOneAndUpdate(
                { 'emailHistory.sentTo': email.trim() },
                { 
                    $set: { 
                        'emailHistory.$.deliveryStatus': false,
                        bouncedEmailFlag: true
                    },
                },
            );

        if (!poTicket) {
            res.status(500).json({message: 'poTicket not found'});
        }

        res.status(200).json({message: 'Success'});

    } catch (error) {        
        res.status(500).json({message: 'Failed to update bounced status'});
    }
};
/**
 * mark the bounced emails as read 
 */
export const markReadInvoiceNBounce = async (req: Request, res: Response) => {
    try {

        const { invoiceId } = req.body;
        
        await Invoice
            .findOneAndUpdate(
                { '_id': invoiceId.trim() },
                { $set: { bouncedEmailFlag: false } }
            );

        res.status(200).json({message: 'Success'});

    } catch (error) {        
        res.status(500).json({message: 'Failed to mark all bounced emails delivery status '});
    }
};

/**
 * mark the bounced emails as read 
 */
export const markReadPOBounce = async (req: Request, res: Response) => {
    try {

        const { id } = req.body;
        
        await ServiceTicket
            .findOneAndUpdate(
                { '_id': id.trim() },
                { $set: { bouncedEmailFlag: false } }
            );

        res.status(200).json({message: 'Success'});

    } catch (error) {        
        res.status(500).json({message: 'Failed to mark all bounced emails delivery status '});
    }
};