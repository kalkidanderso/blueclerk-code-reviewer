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
    var data: any =  {
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
        contactName: params.contactName
    };

    if(params.latitude && params.longitude) {
        data.location = {
            coordinates: [params.longitude, params.latitude]
        }
    }
    const customer = new Customer(data)

    CompanyCustomer.find({company: companyId}, 
        (err: any, companyCustomers: ICompanyCustomer[])=>{
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            const customerIds = companyCustomers.length !== 0 ? companyCustomers.map((obj: any)=>{                        
                return obj.customer
            }) : []
            
            User.find({_id : {$in: customerIds}},
                'info.email',
                (err: any, users: IUser[]) =>{
                
                if (err) {                        
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
                if (users.length === 0 || (users.findIndex((element: any) => element.info.email === customer.info.email) < 0)) {
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
                } else {
                    return res.json({'status': Status.Error, 'message': 'This email is already registered so please try with other email again'})
                }                                  
                
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
            return res.json({'status': Status.Success, 'customers': []})
        }
        const customerIds = companyCustomers.map((obj: any)=>{
                
            return obj.customer
        })
        
        User.find({_id : {$in: customerIds}},
            'info.email auth.email profile.firstName profile.lastName profile.displayName address.street address.city address.state address.zipCode location contact.phone permissions.role isActive balance company',
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

        var data: any =  {
            'info.email': params.email,
            'profile.firstName': params.name,
            'profile.lastName': params.name,
            'profile.displayName': params.name,
            'address.street': params.street,
            'address.city': params.city,
            'address.state': params.state,
            'address.zipCode': params.zipCode,
            'contact.phone': params.phone,
            contactName: params.contactName
        }

        if(params.latitude && params.longitude) {
            data['location.coordinates'] = [params.longitude, params.latitude]
        }
        customer.updateOne(data, (err: any, raw: any)=> {           
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
    if (req.otherCompanyId != undefined) {
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

        if (customer.permissions.role == Role.CUSTOMER) {

            customer
            .populate({
                path: 'jobLocations',
                populate: {
                    path: 'jobSites'
                }
            })
            .populate('equipments', function(err: any) {
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }

                return res.json({'status': Status.Success, 'customer': customer})
            });
        }
        
    })
}