import {Request, Response} from 'express'
import { Status, Messages } from '../common/constants'

import { chargeSubscription, subscribe, unsubscribe } from '../services/stripe'
import { ICompany, Company } from '../models/Company'

export const addCompanySubscriptions = (req: Request, res: Response) => {

    const company = <ICompany>req.company
    const params = req.body

    if(company.stripeId == undefined || company.stripeId == '') {
        return res.json({status: Status.Error, message: "Company payment method required."})
    }

    const now = new Date();
    const daysRemaining = now.getDate()
    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()
    const daysToCharge = daysInCurrentMonth-daysRemaining + 1

    var amount: number = 0;
    if(params.noOfOfficeAdmins > 0){
        const perday = 30/daysInCurrentMonth
        amount = amount+(params.noOfOfficeAdmins * (perday* daysToCharge))
    }
    
    if(params.noOfTechnicians > 0){
        const perday = 50/daysInCurrentMonth
        amount = amount+(params.noOfTechnicians * (perday *daysToCharge))
    }
    
    if(params.noOfManagers > 0){
        const perday = 50/daysInCurrentMonth
        amount = amount+(params.noOfManagers * (perday * daysToCharge))
    }

    if (amount == 0) {
        
        return res.json({ 'status': Status.Error, 'message': "Invalid no of subscriptions."});
    }

    chargeSubscription( amount , company.stripeId, (status:any, charge: any, message: any)=>{
        if(status == 1){
            
            const noOfTechs: number = company.maxTechnicians + parseInt(params.noOfTechnicians)
            const noOfManagers: number = company.maxManagers + parseInt(params.noOfManagers)
            const noOfOfficeAdmins: number = company.maxOfficeAdmins + parseInt(params.noOfOfficeAdmins)
            company.updateOne({maxTechnicians: noOfTechs, maxManagers: noOfManagers, maxOfficeAdmins: noOfOfficeAdmins })
            .exec((err: any, raw: any)=>{
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
                
                return res.json({'status': Status.Error, 'message': 'Company subscriptions added successfull.'})
            })

        } else {
            return res.json({status: Status.Error, message: message})
        }
    })
}

export const removeCompanySubscriptions = (req: Request, res: Response) => {

    const company = <ICompany>req.company
    const params = req.body

    if(company.stripeId == undefined || company.stripeId == '') {
        return res.json({status: Status.Error, message: "Company payment method required."})
    }

    if (parseInt(params.noOfTechnicians) > company.maxTechnicians || parseInt(params.noOfManagers) > company.maxManagers || parseInt(params.noOfOfficeAdmins) > company.maxOfficeAdmins) {
        return res.json({status: Status.Error, message: "Invalid no of subscriptions to cancel."})
    }
    
    const noOfTechs: number = company.maxTechnicians - parseInt(params.noOfTechnicians)
    const noOfManagers: number = company.maxManagers - parseInt(params.noOfManagers)
    const noOfOfficeAdmins: number = company.maxOfficeAdmins - parseInt(params.noOfOfficeAdmins)

    company.updateOne({maxTechnicians: noOfTechs, maxManagers: noOfManagers, maxOfficeAdmins: noOfOfficeAdmins })
    .exec((err: any, raw: any)=>{
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }
        
        return res.json({'status': Status.Error, 'message': 'Company subscriptions deleted successfull.'})
    })
}

export const chargeCompanySubscription = (req: Request, res: Response) => {

    Company.find(
        {$or: [{maxManagers: { $gt: 0 }}, {maxOfficeAdmins: { $gt: 0 }}, {maxTechnicians: { $gt: 0 }}]  },
        (err: any, companies: ICompany[])=>{
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
            const companiesToCharge:number = companies.length
            let companiesCharged: number = 0;
            for (let index = 0; index < companies.length; index++) {
                const company = companies[index];

                var amount: number = 0;
                
                if(company.maxOfficeAdmins > 0){
                    amount = amount + (company.maxOfficeAdmins * 30)
                }
                if(company.maxManagers > 0){
                    amount = amount + (company.maxManagers * 50)
                }
                if(company.maxTechnicians > 0){
                    amount = amount + (company.maxTechnicians * 50)
                }

                if(amount > 0) {

                    chargeSubscription( amount , company.stripeId, (status:any, charge: any, message: any)=>{
                        if(status == 1){
                            companiesCharged ++;  
                            if(companiesToCharge == companiesCharged) {
    
                                return res.json({'status': Status.Success, 'message': 'Done.'})
                            }
                
                        }else{
                            console.log("Unable to charge" + company._id + "\n")
                        }
                    })
                }
                
            }
           
        })
}
