import { Request, Response } from 'express';
import { BouncedEmail , IBouncedEmail } from '../models/BounceEmail'
/**
 * To store bounced emails in db
 */
export const store = async (req: Request, res: Response) => {
    try {

        const { email }: IBouncedEmail = req.body
        
        // TODO: 
        // 1. Design alert symbol according to figma
        // 2. update invoice object where email exists in emailHistory and has latest sentAt value
        // 3. remove BouncedEmail model and document


        const bouncedEmail = new BouncedEmail({ email })
        const savedBounceEmail = await bouncedEmail.save()

        res.json(savedBounceEmail)
    } catch (error) {
        
        res.status(500).json({message:'Failed to insert data'})
    }
}