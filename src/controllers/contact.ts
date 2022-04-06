import * as _ from 'lodash';
import { Request, Response } from 'express'
import { Contact } from '../models/Contact'
import { Messages, Role, Status } from '../common/constants'
import { Customer, ICustomer } from '../models/Customer'
import { IJobLocation, JobLocation } from '../models/JobLocation'
import { IContact } from '../common/contact'
import { ICompany } from '../models/Company'
import { CustomerContact, ICustomerContact } from '../models/CustomerContact';
import { sendCustomerContactNewPassword } from '../services/aws';

const generator = require('generate-password');

const createContact = async (name: string, email: string, phone: string, isActive: boolean, referenceNumber: string) => {
    const contact = new Contact({
        name: name,
        email: email,
        phone: phone,
        referenceNumber
    })
    await contact.save()
    return contact
}

const createContactForCustomer = async (data: any, customer: ICustomer) => {
    let contact = null
    contact = await Contact.findOne({ name: data.name, phone: data.phone, email: data.email })
    if (contact) {
        if (customer.contacts.indexOf(contact._id) > -1) {
            throw new Error('CONTACT_ALREADY_ADDED')
        }

    } else {
        contact = await createContact(data.name, data.email, data.phone, data.isActive, data.referenceNumber)
    }
    customer.contacts.push(contact._id)
    await customer.save()
    return contact
}

const createContactForJobLocation = async (data: any, jobLocationId: string) => {
    const customer = await Customer.findOne({ jobLocations: jobLocationId })
    const contact = await createContactForCustomer(data, customer)
    await JobLocation.findByIdAndUpdate(jobLocationId, { $push: { contacts: contact._id } }, { new: true })
    return contact
}

const addContactToTheJobLocation = async (contactId: string, jobLocationId: string) => {
    await JobLocation.findByIdAndUpdate(jobLocationId, { $push: { contacts: contactId } })
    const contact = await Contact.findById(contactId)
    return contact
}

export const addContact = async (req: Request, res: Response) => {
    let contact = null;
    const params = req.body;
    const customerContact = await CustomerContact.find({
        $or: [{ 'info.email': params.email }, { 'auth.email': params.email }]
    })

    if (customerContact.length) {
        return res.json({ status: Status.Error, messages: 'This email is already used' })
    }

    switch (params.type) {
        case 'Customer':
            const customer = await Customer.findOne({ _id: params.referenceNumber })

            if (!customer) {
                return res.json({ 'status': Status.Error, 'message': 'Customer not found' })
            }

            const result = await createContactForCustomer({ name: params.name, phone: params.phone, email: params.email, referenceNumber: customer._id }, customer)

            if (params.email) {
                await createCustomerContact({ contact: result, customer });
            }

            return res.json({ 'status': Status.Created, contact: result });

        case 'JobLocation':
            const jobLocation = await JobLocation.findOne({ _id: params.referenceNumber })

            if (!jobLocation) {
                return res.json({ status: Status.Error, message: 'Job location not found' })
            }

            if (req.body.contactId) {
                contact = await addContactToTheJobLocation(params.contactId, params.referenceNumber)
            } else {
                contact = await createContactForJobLocation({ name: params.name, email: params.email, phone: params.phone, referenceNumber: jobLocation._id }, jobLocation._id)
            }

            if (params.email) {
                await createCustomerContact({ contact, jobLocation })
            }

            return res.json({ success: Status.Created, contact });
        default:
            return res.json({ status: Status.Error, message: 'type must be selected' })
    }
}

export const updateContact = async (req: Request, res: Response) => {

    const params = req.body;

    try {
        const contact = await Contact.findById(params._id);
        if (!contact) {
            return res.json({ status: Status.Error, message: 'Contact not found' });
        }

        const isActive = req.body.isActive === undefined || req.body.isActive === null
            ? contact.isActive
            : req.body.isActive === 'false'
                ? false
                : !!req.body.isActive

        // when params data not available, use the old data
        const updateEntry = {
            name: params.name ?? contact.name,
            email: params.email,
            phone: params.phone ?? contact.phone,
            isActive
        }

        // Find contact in customer
        const customerContact = await CustomerContact.findOne({ contactId: params._id });

        if (customerContact) {
            // Update customer contact email when email contact is udpated
            await updateCustomerContact({ customerContact, contact, updateEntry: <IContact>updateEntry })
        }

        // Create new when customer contact is unavailable in user collection
        if (!customerContact && updateEntry.email) {
            const jobLocation = await JobLocation.findOne({ contacts: params._id });
            const customer = await Customer.findOne({ contacts: params._id });
            await createCustomerContact({ contact: <IContact>updateEntry, customer, jobLocation });
            customerContact.contactId = contact._id;
            customerContact.save();
        }

        // Only update contact when contact type is not in customer contacts
        const result = await Contact.findByIdAndUpdate(req.body._id, updateEntry, { new: true });

        return res.json({ status: Status.Success, contact: result });
    } catch (err) {
        return res.json({ status: Status.Error, message: 'Error in updating contact' })
    }
}

export const getContacts = async (req: Request, res: Response) => {
    try {
        if (req.query.type === 'Customer') {
            Customer.findOne({ _id: req.query.referenceNumber }).populate({ path: 'contacts' }).exec(async (err: any, customer: ICustomer) => {
                const customerContacts = <IContact[]>customer?.contacts;
                const contacts = await _handlefindIsActiveContact(req.query.isActive, customerContacts)

                if (customer && contacts.length) {
                    return res.json({ result: contacts });
                } else {
                    return res.json({ status: Status.Error, message: 'Customer not found' });
                }
            });
        } else {
            JobLocation.findOne({ _id: req.query.referenceNumber }).populate({ path: 'contacts' }).exec(async (err: any, customer: ICustomer) => {
                const customerContacts = <IContact[]>customer?.contacts;
                const contacts = await _handlefindIsActiveContact(req.query.isActive, customerContacts)

                if (customer && contacts.length) {
                    return res.json({ status: Status.Success, result: contacts })
                } else {
                    return res.json({ status: Status.Error, message: 'Customer not found' })
                }
            })
        }
    } catch (err) {
        return res.json({ status: Status.Error, message: 'Exception error' })
    }
}

export const getCustomerAllContacts = async (req: Request, res: Response) => {

    const params = req.query;
    const company = <ICompany>req.company;

    const customer = await Customer
        .findOne({ _id: params.customerId, company: company._id })
        .populate({ path: 'contacts', select: '-__v' })

    if (!customer) {
        return res.json({ status: Status.Error, message: 'Customer not found' });
    }

    const contacts = [];

    // Add the Customer's email for the first value
    contacts.push({
        name: customer.profile?.displayName,
        email: customer.info?.email,
        phone: customer.contact?.phone
    });

    // Push all the contacts from the Customer
    for (const contact of <IContact[]>customer.contacts) {
        contacts.push({
            name: contact?.name,
            email: contact?.email,
            phone: contact?.phone
        });
    }

    // Sort the list by name incasesensitive then by email
    const sortedContacts = _.sortBy(contacts, [contact => contact.name?.toLowerCase(), 'email']);

    return res.json({ status: Status.Success, contacts: sortedContacts });

}

export const removeContact = async (req: Request, res: Response) => {
    try {
        if (req.body.type === 'Customer') {
            const customer = await Customer.findOne({ _id: req.body.referenceNumber })
            if (customer) {
                // Inactive customer contact when remove contact
                await CustomerContact.findOneAndUpdate({ contactId: req.body.contactId }, { isActive: false });
                await Contact.findByIdAndUpdate(req.body.contactId, { isActive: false });
                return res.json({ status: Status.Success, message: 'Contact removed successfully' });
            } else {
                return res.json({ status: Status.Error, message: 'Customer not found' });
            }
        } else if (req.body.type === 'JobLocation') {
            // Find and check Job Location if exist
            const jobLocation = await JobLocation.findById(req.body.referenceNumber)
            if (jobLocation) {
                await CustomerContact.findOneAndUpdate({ contactId: req.body.contactId }, { isActive: false });
                await Contact.findByIdAndUpdate(req.body.contactId, { isActive: false });
            } else {
                return res.json({ status: Status.Error, message: 'Job Location not found' });
            }

            return res.json({ status: Status.Success, message: 'Contact removed successfully' });
        }
    } catch (err) {
        return res.json({ status: Status.Error, message: err ?? Messages.GenericError });
    }
}

const _handlefindIsActiveContact = async (isActive: string | boolean, customerContacts: IContact[]): Promise<IContact[]> => {

    const contacts: any[] = [];

    switch (isActive) {
        case 'true':
        case true:
            customerContacts?.forEach((contact: IContact) => {
                if (contact.isActive === true) {
                    contacts.push(contact)
                }
            });
            break;

        case 'false':
        case false:
            customerContacts?.forEach((contact: IContact) => {
                if (contact.isActive === false) {
                    contacts.push(contact)
                }
            });
            break;

        default:
            // Retrieve all contacts
            contacts.push(...customerContacts);
    }

    return contacts;

}

// Create customer contact in user collection
const createCustomerContact = async ({
    contact,
    customer,
    jobLocation
}: {
    contact: IContact,
    customer?: ICustomer,
    jobLocation?: IJobLocation
}) => {

    const contactName = contact.name.split(' ')
    const customerContactEntry: any = {
        info: { email: contact.email },
        profile: { firstName: contactName[0], lastName: contactName.length > 1 ? contactName[contactName.length - 1] : '', displayName: contact.name },
        address: customer?.address ?? jobLocation?.address,
        contact: { phone: contact.phone },
        company: customer?.company ?? jobLocation?.companyId,
        permissions: { role: Role.CUSTOMER_CONTACT, extra: [] },
        contactName: contact.name,
        contactId: contact._id,
        location: customer?.location ?? jobLocation?.location
    }

    const customerContact = await new CustomerContact(customerContactEntry).save();
    await sendCustomerContactEmail(customerContact);
    return
}

// Send customer contact default password via email
const sendCustomerContactEmail = async (contact: ICustomerContact) => {
    const contactPassword = generator.generate({
        length: 9,
        number: true,
        symbols: '!@#$%&',
        uppercase: true,
        excludeSimilarCharacters: true,
        strict: true
    });

    contact.hashPassword(contactPassword, async (err: any, hash: string) => {
        await contact.updateOne({ _id: contact._id, 'auth.email': contact.info.email, 'auth.password': hash });
    })

    const options = {
        to: contact?.auth?.email ?? contact?.info?.email,
        name: contact?.profile?.displayName ?? contact?.info?.email,
        password: contactPassword,
    }

    sendCustomerContactNewPassword(options);
    return;
}

const updateCustomerContact = async ({
    customerContact,
    contact,
    updateEntry,
}: {
    customerContact: ICustomerContact,
    contact: IContact,
    updateEntry: IContact
}) => {

    if (contact.email !== updateEntry.email) {
        customerContact.auth.email = updateEntry.email;
        customerContact.info.email = updateEntry.email;

        // Inactive customer contact account when email on contact is removed
        if (!updateEntry.email) {
            customerContact.isActive = false
            updateEntry.isActive = false
        }

        // Create a new customer contact account when email added in contact and contact have a customer
        if (!contact.email && updateEntry.email) {
            customerContact.auth.email = updateEntry.email;
            customerContact.info.email = updateEntry.email;
            customerContact.isActive = true
            updateEntry.isActive = true
        }
    }

    // Send customer contact email when not have password
    if (!customerContact?.auth?.password) {
        await sendCustomerContactEmail(customerContact);
    }

    // Update customer contact account when contact name updated
    if (contact.name !== updateEntry.name) {
        if (customerContact) {
            const contactName = updateEntry.name ? updateEntry.name.split(' ') : contact.name;
            customerContact.profile.firstName = contactName[0];
            customerContact.profile.lastName = contactName.length > 1 ? contactName[contactName.length - 1] : '';
            customerContact.profile.displayName = updateEntry.name;
            customerContact.contactName = updateEntry.name;
        }
    }

    // Update contact phone
    if (contact.phone !== updateEntry.phone) {
        if (customerContact) {
            customerContact.contact.phone = updateEntry.phone;
        }
    }

    // Update active status on customer contact and contact
    if (contact.isActive !== updateEntry.isActive) {
        customerContact.isActive = updateEntry.isActive;
        contact.isActive = updateEntry.isActive;
    }

    customerContact.save();
    return;
}
