import {Request, Response} from 'express'
import { Contact } from '../models/Contact'
import {Status} from '../common/constants'
import {Customer, ICustomer} from '../models/Customer'
import {JobLocation} from '../models/JobLocation'
import {IContact} from '../common/contact'


const createContact = async (name:String, email:String, phone:String) => {    
    const contact = new Contact({
        name: name, 
        email: email,
        phone: phone
    })
    await contact.save()
    return contact
}

const createContactForCustomer = async (data: any, customer: ICustomer) => {
    let contact = null
     contact = await Contact.findOne({ name: data.name, phone: data.phone, email: data.email})
    if(contact) {
        if(customer.contacts.indexOf(contact._id) > -1) {
            throw new Error('CONTACT_ALREADY_ADDED')
        }

    } else  {
        contact = await createContact(data.name, data.email, data.phone)        
    }
    customer.contacts.push(contact._id)
    await customer.save()
    return contact
}


const createContactForJobLocation = async (data: any, jobLocationId: String) => {

}



export const addContact = async (req: Request, res: Response) => {
    try {
        if(req.body.type === 'Customer') {
            const customer = await Customer.findOne({_id: req.body.referenceNumber})
            if(!customer) {
                return res.json({ 'status': Status.Error, 'message': 'Customer not found'})
            }
            const result = await createContactForCustomer({name: req.body.name, phone: req.body.phone, email: req.body.email}, customer)
            return res.json({'status': Status.Created, contact: result})
        } else if(req.body.type === 'JobLocation'){
            //TODO: Yet to implement.
        }
    } catch (err) {
        console.log(err)
        res.json({ 'status': Status.Error, 'message': 'Contact already added'})
    }
}

export const updateContact = async (req: Request, res: Response) => {
    try {
        const result = await Contact.findByIdAndUpdate(req.body._id, {name: req.body.name, phone: req.body.phone, email: req.body.email}, {
            new: true
        })
        console.log('Result::::')
        console.log(result)
        if(result) {
            res.json({status: Status.Success, contact: result})
        } else {
            res.json({status: Status.Error, message: 'Contact not found'})
        }
    } catch (err) {
        console.log(err)
        res.json({status: Status.Error, message: 'Error in updating contact'})
    }
}

export const getContacts = async (req: Request, res: Response) => {
    try {
        if(req.query.type === 'Customer') {
            Customer.findOne({_id: req.query.referenceNumber}).populate({ path : 'contacts'}).exec((err: any, customer: ICustomer)=> {
                if (customer) {
                    return res.json({result: customer.contacts})
                } else {
                    return res.json({ status: Status.Error, message: 'Customer not found'})
                }
            })
            
        } else {

        }
    } catch (err) {
        console.log(err)
        res.json({ status: Status.Error, message: 'Exception error'})
    }
}

export const removeContact = async (req: Request, res: Response) => {
    try {
        if(req.body.type === 'Customer') {
            const customer = await Customer.findOne({_id: req.body.referenceNumber})
            if(customer) {
                await Customer.findByIdAndUpdate(req.body.referenceNumber, {$pull: {contacts: req.body._id }}, { new: true})
                const contactCustomer = await Customer.findOne({contacts: req.body._id})
                if(!contactCustomer) {
                    await Contact.findByIdAndRemove(req.body._id)
                } else {
                    console.log('Contact removed from the customer only....')
                }
            } else {
                res.json({status: Status.Error, message: 'Customer not found'})
            }
        } else {
            res.json({ status: Status.Error, message: 'Under development'})
        }
    } catch (err) {
        return res.json({status: Status.Error, message: 'Removed the contact'})
    }
}