import {Request, Response} from 'express'
import { Status, Messages } from '../common/constants'
import { CompanyCard, ICompanyCard } from '../models/CompanyCard'
import { createCustomer, detachCustomerSource, addCustomerSource} from '../services/stripe'
import { ICompany } from '../models/Company'
import { ObjectId } from 'mongodb'

export const createCompanyCard = (req: Request, res: Response) => {

    const params = req.body
    const company = <ICompany>req.company

    if(company.stripeId){
        return addCardToCompany(req, res)
    }

    createCustomer(company.info.companyEmail, 'company '+ company.info.companyName, params.token, (status: any, customer: any)=>{
        if(status == 1)
        {
            company.updateOne({stripeId: customer.id})
            .exec((err: any)=>{
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }

                // adding card
                const card = new CompanyCard({
                    ending: params.ending,
                    token: params.token,
                    company: req.companyId
                })
            
                card.save((err: any) => {
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }
                    addCustomerSource(customer.id, params.token, (status: any, source: any, message: any)=>{
                        if(status == 1){
                            
                            card.updateOne({
                                cardStripeId: source.id,
                                expiryMonth: source.exp_month,
                                expiryYear: source.exp_year,
                                cardType: source.brand,
                                name: source.name
                            }).exec((err: any, raw: any)=>{
                                if (err) {
                                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                                }
                                return res.json({status: Status.Success, message: "Company card added successfully."});
                            })
            
                        } else {
                            return res.json({status: Status.Error, message: message})
                        }
                    })
                    
                })
            })
            
        } else {
            return res.json({status: Status.Error, message: status})
        }
        
    })


    // const card = new CompanyCard({
    //     ending: params.ending,
    //     token: params.token,
    //     company: req.companyId
    // })

    // card.save((err: any) => {

    //     if (err) {
    //         return res.json({'status': Status.Error, 'message': Messages.GenericError})
    //     }

    //     createCustomer(company.auth.email, 'company '+ company.profile.displayName, params.token, (status: any, customer: any)=>{
    //         if(status == 1){
    //             company.updateOne({stripeId: customer.id})
    //             .exec((err: any)=>{
    //                 if (err) {
    //                     return res.json({'status': Status.Error, 'message': Messages.GenericError})
    //                 }
                    
    //                 // after customer add card
    //                 card.updateOne({
    //                     cardStripeId: customer.sources.data[0].id
    //                 }).exec((err: any, raw: any)=>{
    //                     if (err) {
    //                         return res.json({'status': Status.Error, 'message': Messages.GenericError})
    //                     }
    //                     return res.json({status: Status.Success, message: "Company card added successfully."});
    //                 })
    //             })

    //         } else {
    //             return res.json({status: Status.Error, message: status})
    //         }
    //     })
        
    // })

}

const addCardToCompany = (req: Request, res: Response) => {

    const params = req.body
    const company = <ICompany>req.company

    const card = new CompanyCard({
        ending: params.ending,
        token: params.token,
        company: req.companyId
    })

    card.save((err: any) => {

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        addCustomerSource(company.stripeId, params.token, (status: any, source: any, message: any)=>{
            if(status == 1){
                card.updateOne({
                    cardStripeId: source.id,
                    expiryMonth: source.exp_month,
                    expiryYear: source.exp_year,
                    cardType: source.brand,
                    name: source.name
                }).exec((err: any, raw: any)=>{
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }

                    return res.json({status: Status.Success, message: "Company card added successfully."});
                })

            } else {
                return res.json({status: Status.Error, message: message})
            }
        })
        
    })

}

export const removeCompanyCard = (req: Request, res: Response) => {

    const params = req.body
    const company = <ICompany>req.company

    CompanyCard.findOne({ company: req.companyId, _id: params.cardId}, 
        (err: any, card: ICompanyCard)=>{
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
            
            if(card == undefined || card == null) {
                return res.json({'status': Status.Error, 'message': "No Card found"})
            }
            if(card.cardStripeId == undefined) {
                CompanyCard.findByIdAndDelete(card._id)
                    .exec((err: any) => {

                        if (err) {
                            return res.json({'status': Status.Error, 'message': Messages.GenericError})
                        }

                        return res.json({'status': Status.Success, 'message': 'Company card removed successfully.'})    
                    })
            }else{

                detachCustomerSource(company.stripeId, card.cardStripeId, (status: any)=>{
                    
                    if(status == 0){
                        CompanyCard.findByIdAndDelete(card._id)
                        .exec((err: any) => {
    
                            if (err) {
                                return res.json({'status': Status.Error, 'message': Messages.GenericError})
                            }
    
                            return res.json({'status': Status.Success, 'message': 'Company card removed successfully.'})    
                        })
        
                    } else {
                        return res.json({status: Status.Error, message: status})
                    }
                })
            }
    })
}


export const getCompanyCards = (req: Request, res: Response) => {

    CompanyCard.find(
        {company: new ObjectId(req.companyId)},
        '_id ending expiryMonth expiryYear name cardType',
        (err: any, cards: ICompanyCard[]) => {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            return res.json({'status': Status.Success, 'cards': cards})    
        }
    )
}


