import {Request, Response} from 'express'
import { Status, Messages, Role} from '../common/constants'

import { Customer, ICustomer } from '../models/Customer'
import {  Company, ICompany } from '../models/Company'
import {  CompanyCustomer, ICompanyCustomer } from '../models/CompanyCustomer'
import { User, IUser } from '../models/User'
import { CustomerEquipment, ICustomerEquipment } from '../models/CustomerEquipment'

export const createCustomer = (req: Request, res: Response) => {

    const params = req.body
    var companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    
    const customer = new Customer(
        {
            info: {
                email: params.email,
            },
            profile:{
                firstName: params.name,
                lastName: params.name,
                displayName: params.name,
                imageUrl: '',
            },
            address: {
                street: params.street,
                city: params.city,
                state: params.state,
                zipCode: params.zipCode,
            },
            contact: {
                phone: params.phone,
            },
            company: companyId,
            permissions: {
                role: Role.CUSTOMER,
                extra: [],
            },
        }
    )

    customer.save((err: any) => {

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError, 'error' : err})
        }
        
        // create company customer here
        const companyCustomer = new CompanyCustomer({
            company: companyId,
            customer: customer._id,
            createdAt: Date.now()
        })

        companyCustomer.save((err: any) => {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            return res.json({'status': Status.Success, 'message': 'Customer created successfully.'})
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
    
    CompanyCustomer.find({company: companyId}, 
    (err: any, companyCustomers: ICompanyCustomer[])=>{
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }
        
        if (companyCustomers.length == 0) {
            return res.json({'status': Status.Error, 'message': 'No customer found.'})
        }
        const customerIds = companyCustomers.map((obj: any)=>{
                
            return obj.customer
        })
        
        User.find({_id : {$in: customerIds}},
            'info.email auth.email profile.firstName profile.lastName profile.displayName address.street address.city address.state address.zipCode contact.phone permissions.role isActive',
            (err: any, users: IUser[]) =>{
            
            if (err) {
                
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            return res.json({'status': Status.Success, 'customers': users}) 
        })

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
                'info.email': params.email,
                'profile.firstName': params.name,
                'profile.lastName': params.name,
                'profile.displayName': params.name,
                'address.street': params.street,
                'address.city': params.city,
                'address.state': params.state,
                'address.zipCode': params.zipCode,
                'contact.phone': params.phone,
            },
            (err: any, raw: any)=> {
                        
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
        
                return res.json({'status': Status.Success, 'message': 'Customer updated successfully.'})
            })
    })
}

export const customerDetail = (req: Request, res: Response) => {

    const params = req.body

    var companyId = req.companyId;
    if(req.otherCompanyId != undefined) {
        companyId = req.otherCompanyId
    }
    
    CompanyCustomer.findOne({ 'customer': params.customerId, company: companyId})
    .populate({
        path: 'customer'
    })
    .exec((err: any, companyCustomer: ICompanyCustomer)=>{
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }
        
        if (companyCustomer == undefined || companyCustomer == null) {
            return res.json({'status': Status.Error, 'message': 'No customer found'})
        }
        const customer: any = companyCustomer.customer

        if(customer.permissions.role == Role.CUSTOMER) {

            customer.populate('equipments', function(err: any) {
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }

                return res.json({'status': Status.Success, 'customer': customer})
            });
        }
        
    })
}