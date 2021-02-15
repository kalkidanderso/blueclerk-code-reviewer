import {Request, Response} from 'express'
import { Contact } from '../models/Contact'
import {Status} from '../common/constants'
import {Customer, ICustomer} from '../models/Customer'
import {JobLocation} from '../models/JobLocation'
import {IContact} from '../common/contact'


const createContact = async (name:string, email:string, phone:string) => {
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


const createContactForJobLocation = async (data: any, jobLocationId: string) => {
    const customer = await Customer.findOne({jobLocations: jobLocationId})
    const contact = await createContactForCustomer(data, customer)
    await JobLocation.findByIdAndUpdate(jobLocationId, {$push:{contacts: contact._id}}, {new: true})
    return contact
}

const addContactToTheJobLocation = async (contactId: string, jobLocationId: string) => {
    await JobLocation.findByIdAndUpdate(jobLocationId, {$push:{contacts: contactId}})
    const contact = await Contact.findById(contactId)
    return contact
}



export const addContact = async (req: Request, res: Response) => {
    try {
        let contact = null
        if(req.body.type === 'Customer') {
            const customer = await Customer.findOne({_id: req.body.referenceNumber})
            if(!customer) {
                return res.json({ 'status': Status.Error, 'message': 'Customer not found'})
            }
            const result = await createContactForCustomer({name: req.body.name, phone: req.body.phone, email: req.body.email}, customer)
            return res.json({'status': Status.Created, contact: result})
        } else if(req.body.type === 'JobLocation'){
            const jobLocation = await JobLocation.findOne({_id: req.body.referenceNumber})
            console.log('Job location::::::')
            console.log(jobLocation)
            if(!jobLocation) {
                return res.json({ status: Status.Error, message: 'Job location not found'})
            }
            if(req.body.contactId) {
                contact = await addContactToTheJobLocation(req.body.contactId, req.body.referenceNumber)
            } else {
                console.log('Before going to the create contact for the job location::::::::')
                contact = await createContactForJobLocation({name: req.body.name, email: req.body.email, phone: req.body.phone}, jobLocation._id)
            }
            return res.json({success: Status.Created, contact})
        }
    } catch (err) {
        return res.json({ 'status': Status.Error, 'message': 'Contact already added'})
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
            return res.json({status: Status.Success, contact: result})
        } else {
           return res.json({status: Status.Error, message: 'Contact not found'})
        }
    } catch (err) {
        return res.json({status: Status.Error, message: 'Error in updating contact'})
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
            JobLocation.findOne({_id: req.query.referenceNumber}).populate({ path : 'contacts'}).exec((err: any, customer: ICustomer)=> {
                if (customer) {
                    return res.json({status: Status.Success, result: customer.contacts})
                } else {
                    return res.json({ status: Status.Error, message: 'Customer not found'})
                }
            })
        }
    } catch (err) {
        return res.json({ status: Status.Error, message: 'Exception error'})
    }
}

export const removeContact = async (req: Request, res: Response) => {
    try {
        if(req.body.type === 'Customer') {
            const customer = await Customer.findOne({_id: req.body.referenceNumber})
            if(customer) {
                await Customer.findByIdAndUpdate(req.body.referenceNumber, {$pull: {contacts: req.body.contactId }}, { new: true})
                const contactCustomer = await Customer.findOne({contacts: req.body.contactId})
                if(!contactCustomer) {
                    await Contact.findByIdAndRemove(req.body.contactId)
                    console.log('Contact removed permanently.........')
                } else {
                    console.log('Contact removed from the customer only....')
                }
                return res.json({ status: Status.Success, message: 'Contact removed successfully'})
            } else {
                return res.json({status: Status.Error, message: 'Customer not found'})
            }
        } else {
            return res.json({ status: Status.Error, message: 'Under development'})
        }
    } catch (err) {
        return res.json({status: Status.Error, message: 'Removed the contact'})
    }
}
