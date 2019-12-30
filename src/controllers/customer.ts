import {Request, Response} from 'express'
import { Status, Messages } from '../common/constants'

import { Customer, ICustomer } from '../models/Customer'
import {  Company, ICompany } from '../models/Company'

export const createCustomer = (req: Request, res: Response) => {

    const params = req.body
    var companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    const customer = new Customer(
        {
            info: {
                name: params.name,
                email: params.email,
            },
            address: {
                street: params.street,
                city: params.city,
                state: params.state,
                zipCode: params.zipCode,
            },
            contact: {
                name: params.contactName,
                phone: params.phone,
            },
            company: companyId
        }
    )

    customer.save((err: any) => {

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }
        Company.findById(req.companyId, function(err: any, company: ICompany){

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            company.customers.push(customer._id)
                
            company.updateOne(
                {customers: company.customers},
                (err: any, raw: any)=> {
                    
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }
            
                    return res.json({'status': Status.Success, 'message': 'Customer created successfully.'})
                }
            )
        })

    })

}

export const getCustomers = (req: Request, res: Response) => {

    const params = req.body
    var companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    var filter
    if (params.includeActive == 'true' && params.includeNonActive == 'true') {
        filter = {}
    }else if (params.includeActive == 'true') {
        filter = {'isActive': { $eq: true }}
    }else {
        filter = {'isActive': { $eq: false }}
    }
    var companyId = companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    Company.findOne({_id: companyId})
    .populate({
        path: 'customers',
        match: filter,
      })
    .exec((err: any, company: ICompany) => {

        if (err || !company) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        res.json({'status': Status.Success, 'customers': company.customers})    

    })
    
}

export const updateCustomer = (req: Request, res: Response) => {

    const params = req.body

    Customer.findById(params.customerId)
    .exec((err: any, customer: ICustomer)=>{
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        customer.updateOne(
            {
                'info.name': params.name,
                'info.email': params.email,
                'address.street': params.street,
                'address.city': params.city,
                'address.state': params.state,
                'address.zipCode': params.zipCode,
                'contact.name': params.contactName,
                'contact.phone': params.phone,
            },
            (err: any, raw: any)=> {
                        
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
        
                return res.json({'status': Status.Success, 'message': 'Customer data updated successfully.'})
            })
    })
}