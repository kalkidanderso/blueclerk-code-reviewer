import { Request, Response } from 'express'
import { Status, Messages } from '../common/constants'
import { CompanyCard, ICompanyCard } from '../models/CompanyCard'
import { createCustomer, detachCustomerSource, addCustomerSource, createCard, checkCardExist, _getCustomerCard } from '../services/stripe'
import { ICompany } from '../models/Company'
import { ObjectId } from 'mongodb'
import * as Sentry from '@sentry/node';


export const createCompanyCard = async (req: Request, res: Response) => {

    const params = req.body
    const company = <ICompany>req.company

    if (company.stripeId) {
        return addCardToCompany(req, res)
    }
    try {
        const token = await createCard(params.cardNumber, params.exp, params.cvc, params.name, params.address, params.city, params.status, params.zipcode);
        createCustomer(company.info.companyEmail, 'company ' + company.info.companyName, token.id, (status: any, customer: any) => {
            if (status == 1) {
                company.updateOne({ stripeId: customer.id }).exec(async (err: any) => {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    const customerCard = await _getCustomerCard(customer.id, customer.default_source);
                    await addCompanyCard(token, customerCard, res, company, params.nickName ? params.nickName : null);
                });

            } else {
                return res.json({ status: Status.Error, message: status })
            }
        });

    } catch (err) {
        Sentry.captureException(err);
        return res.json({ 'status': Status.Error, 'message': err.message });
    }


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

const addCardToCompany = async (req: Request, res: Response) => {

    const params = req.body
    const company = <ICompany>req.company

    try {
        const token = await createCard(params.cardNumber, params.exp, params.cvc, params.name, params.address, params.city, params.state, params.zipcode);
        if (await checkCardExist(token, company.stripeId)) {
            return res.json({status: Status.Success, message: "Card already exist!"});
        }
            addCustomerSource(company.stripeId, token.id, async (status: any, source: any, message: any)=>{
            if(status == 1){
                await addCompanyCard(token, source, res, company, params.nickName ? params.nickName : null);
            } else {
                return res.json({status: Status.Error, message: message})
            }
        })
    } catch (err) {
        Sentry.captureException(err);
        return res.json({'status': Status.Error, 'message': err.message});
    }


}
let addCompanyCard = async (token: any, source: any, res: Response, company: any, nickName?: any) => {
    const card = new CompanyCard({
        ending: token.card.last4,
        token: token.id,
        cardStripeId: source.id,
        expirationMonth: source.exp_month,
        expirationYear: source.exp_year,
        cardType: source.brand,
        name: source.name,
        address: source.address_line1,
        city: source.address_city,
        state: source.address_state,
        zipcode: source.address_zip,
        company: company._id,
        nickName: nickName ? nickName : ''
    });

    card.save().then(() => {
        return res.json({status: Status.Success, message: "Company card added successfully."});
    }).catch((err) => {
        Sentry.captureException(err);
        return res.json({'status': Status.Error, 'message': err.message});
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
        '_id ending expirationMonth expirationYear name cardType',
        (err: any, cards: ICompanyCard[]) => {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            return res.json({'status': Status.Success, 'cards': cards})
        }
    )
}


