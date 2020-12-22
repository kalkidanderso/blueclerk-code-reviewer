import {Request, Response} from 'express'
import { Status, Role, Messages } from '../common/constants'

import { Customer, ICustomer } from '../models/Customer'
import {  CompanyCustomer, ICompanyCustomer } from '../models/CompanyCustomer'
import { User, IUser } from '../models/User'
import multer from 'multer'

var fs = require('fs');
var XLSX = require('xlsx')

export const uploadfile = (req: Request, res: Response) => {
    var companyId = req.companyId
    const path = __dirname+'/../uploads/'
    const time = Date.now()

    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
    
    var storage = multer.diskStorage({
        destination: function (req, file, cb) {
          cb(null, path)
        },
        filename: function (req, file, cb) {
          cb(null, time+file.originalname)
        }
    })

    var upload = multer({ storage: storage })
    const uploadSingle = upload.single('customerSheet')
    uploadSingle (req, res, (err)=>{
        if (err) {
            return res.json({'status': Status.Error, 'message': "No file available"})
        }

        const fileName = time + req.file.originalname

        if(fileName.split('.').pop() != "xlsx") {
            fs.unlinkSync(path+fileName)
            return res.json({'status': Status.Error, 'message': "File must be of type xlsx"})
        }

        let columnHeaders: any = []

        var workbook = XLSX.readFile(path+fileName)
        
        var sheet_name_list = workbook.SheetNames
        var worksheet = workbook.Sheets[sheet_name_list[0]]
        for (let key in worksheet) {
            let regEx = new RegExp("^\(\\w\)\(1\){1}$");
            if (regEx.test(key) == true) {
                columnHeaders.push(worksheet[key].v);
            }
        }

        var defaultColumnHeads: any = [ 'email', 'name', 'street', 'city', 'state', 'zipCode' , 'phone', 'contactName', 'latitude', 'longitude']
        if( !columnsEqual(defaultColumnHeads, columnHeaders)){
            return res.json({'status': Status.Error, 'message': 'Sheet must contain following columns email, name, street, city, state, zipCode, phone, contactName, latitude, longitude'})
        }

        
        var xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]])
        
        var customers: any = []
        xlData.map((obj: any)=>{
            var customer: any = []
            customer = new Customer({
                info: {
                    email: obj.email,
                },
                profile:{
                    firstName: obj.name,
                    lastName: obj.name,
                    displayName: obj.name,
                    imageUrl: '',
                },
                address: {
                    street: obj.street,
                    city: obj.city,
                    state: obj.state,
                    zipCode: obj.zipCode,
                },
                contact: {
                    phone: obj.phone,
                },
                company: req.companyId,
                permissions: {
                    role: Role.CUSTOMER,
                    extra: [],
                }
            })
            customers.push(customer)
            
        })

        fs.unlinkSync(path+fileName)

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
                customers.map((customer: any)=>{
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
                            })
                        })
                    }                    
                })        
                return res.json({'status': Status.Success, 'message': 'Customer created successfully.'})
            })    
        })                    
    })
}

function columnsEqual(_arr1: [any], _arr2: [any] ) {

    if (!Array.isArray(_arr1) || ! Array.isArray(_arr2) || _arr1.length !== _arr2.length)
      return false;

    var arr1 = _arr1.concat().sort();
    var arr2 = _arr2.concat().sort();

    for (var i = 0; i < arr1.length; i++) {

        if (arr1[i] !== arr2[i])
            return false;

    }

    return true;

}
