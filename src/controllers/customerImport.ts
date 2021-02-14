import { Request, Response } from 'express'
import { Status, Role, Messages } from '../common/constants'

import { Customer, ICustomer } from '../models/Customer'
import { CompanyCustomer, ICompanyCustomer } from '../models/CompanyCustomer'
import { User, IUser } from '../models/User'
import multer from 'multer'
import { JobLocation, IJobLocation } from '../models/JobLocation';
import { Contact } from '../models/Contact'
import { IContact } from '../common/contact'

var fs = require('fs');
var XLSX = require('xlsx')

export const uploadfile = (req: Request, res: Response) => {
    try {
    const companyId = req.companyId
    const path = __dirname + '/../uploads/'
    const time = Date.now()
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }

    var storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, path)
        },
        filename: function (req, file, cb) {
            cb(null, time + file.originalname)
        }
    })
    var upload = multer({ storage: storage })
    const uploadSingle = upload.single('customerSheet')
    uploadSingle(req, res, async (err) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': "No file available" })
        }
        const fileName = time + req.file.originalname
        if (fileName.split('.').pop() != "xlsx") {
            fs.unlinkSync(path + fileName)
            return res.json({ 'status': Status.Error, 'message': "File must be of type xlsx" })
        }
        let columnHeaders: any = []
        var workbook = XLSX.readFile(path + fileName)
        var sheet_name_list = workbook.SheetNames
        var worksheet = workbook.Sheets[sheet_name_list[0]]
        for (let key in worksheet) {
            let regEx = new RegExp("^\(\\w\)\(1\){1}$");
            if (regEx.test(key) == true) {
                columnHeaders.push(worksheet[key].v);
            }
        }

        var defaultColumnHeads: any = [
            'vendorNumber', 'name', 'email', 'contactName', 'contactEmail', 'phone', 'street', 'city', 'state', 'zipCode',
            'latitude', 'longitude', 'jobLocationName', 'jobLocationContactName', 'jobLocationContactEmail', 'jobLocationContactPhone',
            'jobLocationStreet', 'jobLocationCity', 'jobLocationState', 'jobLocationZipCode', 'jobLocationLatitude', 'jobLocationLongitude'
        ]        
        if (!columnsEqual(defaultColumnHeads, columnHeaders)) {
            return res.json({ 'status': Status.Error, 'message': `Sheet must contain following columns: ${defaultColumnHeads.join(', ')}` })
        }

        var xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]], {raw: true, defval:null})
        
        var customers: ICustomer[] = []
        const jobLocations: any[] = []
        const customerContacts: IContact[] = []
        const jobLocationContacts: IContact[] = []        
        xlData.map((obj: any) => {
            const customer = new Customer({
                contactName: obj.contactName,
                info: {
                    email: obj.email || '',
                },
                profile: {
                    firstName: obj.name,
                    lastName: obj.name,
                    displayName: obj.name,
                    imageUrl: '',
                },
                address: {
                    street: obj.street || '',
                    city: obj.city || '',
                    state: obj.state || '',
                    zipCode: obj.zipCode || '',
                },
                contact: {
                    phone: obj.phone || '',
                },
                company: req.companyId,
                permissions: {
                    role: Role.CUSTOMER,
                    extra: [],
                },
                location: {
                    coordinates: [obj.longitude || 0, obj.latitude || 0]
                },
                vendorId: obj.vendorNumber || '',
                contacts: []
            })            
            const contact = new Contact({
                name: obj.contactName,
                phone: obj.phone,
                email: obj.contactEmail
            })
            customers.push(customer)
            customerContacts.push(contact)

            const jobLocation = {
                companyId: companyId,
                name: obj.jobLocationName || '',                
                address: {
                    city: obj.jobLocationCity || '',
                    state: obj.jobLocationState || '',
                    street: obj.jobLocationStreet || '',
                    zipcode: obj.jobLocationZipCode || ''
                },
                location: {
                    coordinates: [obj.jobLocationLongitude || 0, obj.jobLocationLatitude || 0]
                }                
            }            
            const jobLocationContact = new Contact({            
                    name: obj.jobLocationContactName || '',
                    phone: obj.jobLocationContactPhone || '',
                    email: obj.jobLocationContactEmail || ''                
            })
            jobLocationContacts.push(jobLocationContact)
            jobLocations.push(jobLocation)
        })

        fs.unlinkSync(path + fileName)

        await handleCustomerXlCreation(companyId, res, customers, jobLocations, customerContacts, jobLocationContacts)
    })
    } catch (err) {
        console.log(err);
        throw err;
    }
}

//**** upload file helper functions ******/ 
function columnsEqual(_arr1: [any], _arr2: [any]) {

    if (!Array.isArray(_arr1) || !Array.isArray(_arr2) || _arr1.length !== _arr2.length)
        return false;

    var arr1 = _arr1.concat().sort();
    var arr2 = _arr2.concat().sort();    
    for (var i = 0; i < arr1.length; i++) {        
        if (arr1[i] !== arr2[i]){
            return false;
        }
            

    }

    return true;

}

async function fetchCompanyCustomers(companyId: string, res: Response) {
    let userList: IUser[] = []
    let companyCustomerList: ICompanyCustomer[] = []

    await CompanyCustomer.find({ company: companyId })
        .then((companyCustomers) => {
            if (companyCustomers.length !== 0) {
                companyCustomerList = companyCustomers.map((obj: any) => obj.customer)
            } else {
                companyCustomerList = companyCustomers
            }
        })
        .catch(() => {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
        })

    if (companyCustomerList.length !== 0) {
        await User.find({ _id: { $in: companyCustomerList } }, 'profile.firstName')
            .then((users: IUser[]) => userList = users)
            .catch(() => {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            })
    }

    return userList
}

async function findOrCreateContact(contact: IContact) {
    let cnt = null    
    let { email, phone} = contact 
    cnt = await Contact.findOne({ email, phone})
    if(!cnt) {
        cnt = await Contact.create(contact)
    }
    return cnt
}



async function handleCustomerXlCreation(
    companyId: string,
    res: Response,
    customers: ICustomer[],
    jobLocations: IJobLocation[],
    customerContacts: IContact[],
    jobLocationContacts: IContact[]
) {
    try {
    for (let index = 0; index < customers.length; index++) {
        const customer = customers[index];
        const users = await fetchCompanyCustomers(companyId, res);
        // const fetchedJobLocations = await fetchCompanyJobLocations(companyId);
        if (users.length === 0 || (users.findIndex((element: any) => element.profile.firstName === customer.profile.firstName) < 0)) {
            // check for customer duplicates on each alteration and only save if the current customer doesn't exist
            const selectedJobLocation = jobLocations[index]
            selectedJobLocation.customerId = customer._id
            // Creating contact
            const contact = await findOrCreateContact(customerContacts[index])
            customer.contacts[0] = contact._id
            // Creating Job Location
            const newJobLocation: IJobLocation = new JobLocation(selectedJobLocation)
            const jobLocationContact = await findOrCreateContact(jobLocationContacts[index])
            
            if(customer.contacts.indexOf(jobLocationContact._id) < 0) {
                customer.contacts.push(jobLocationContact._id)    
            }            
            newJobLocation.contacts = [jobLocationContact._id]
            customer.jobLocations.push(newJobLocation._id)            
            await Customer.create(customer).catch((err) => {                
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError, 'error': err })
            })
            // create company customer here
            const companyCustomer = new CompanyCustomer({
                company: companyId,
                customer: customer._id,
                createdAt: Date.now()
            })

            await CompanyCustomer.create(companyCustomer).catch(() => {

                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            })
            await JobLocation.create(newJobLocation).catch((err) => {                
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError, 'error': err })
            })
            
        } else {
            const customer = customers[index]
            const extCustomer = await Customer.findOne({ 'profile.firstName': customer.profile.firstName, company: companyId });
            const selectedJobLocation = jobLocations[index]
            if(extCustomer.info.email != customer.info.email) {
                const emailContact = await findOrCreateContact(new Contact({phone: customer.contact.phone, email: customer.info.email}))
                if(extCustomer.contacts.indexOf(emailContact._id) < 0) {
                    extCustomer.contacts.push(emailContact._id)
                }
            }


            const contact = await findOrCreateContact(jobLocationContacts[index])            
            const contactIndex = extCustomer.contacts.indexOf(contact._id)
            // Updating the contact inforamtion to the existing customer.
            if(contactIndex < 0) {
                extCustomer.contacts.push(contact._id)
            }

            const extJobLocation = await JobLocation.findOne({name: selectedJobLocation.name, companyId: companyId, customerId: extCustomer._id })
            if(!extJobLocation) {
                selectedJobLocation.customerId = extCustomer._id
                selectedJobLocation.contacts = [contact._id]
                const newJobLocation: IJobLocation = new JobLocation(selectedJobLocation)
                extCustomer.jobLocations.push(newJobLocation._id)
                await JobLocation.create(newJobLocation).catch((err) => {                
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError, 'error': err })
                })
            } else {
                if(extJobLocation.contacts.indexOf(contact._id) < 0) {
                    extJobLocation.contacts.push(contact._id)                    
                }
            }
            
            
            await extCustomer.save()

            
        }
    }

    return res.json({ 'status': Status.Success, 'message': 'Customer data upload successful.' })
    } catch (err) {
        return res.json({ 'status': Status.Error, 'message': err })
    } 
}
//**** upload file helper functions ****//

