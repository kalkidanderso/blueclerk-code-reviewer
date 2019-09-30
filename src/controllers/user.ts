import {Request, Response} from 'express'
import { Status, Role, Messages } from '../common/constants'
import {sendEmail} from '../services/aws'

import { User, IUser } from '../models/User'
import { Company, ICompany } from '../models/Company'
import { Employee, IEmployee } from '../models/Employee'

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

    user.update(
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

            user.update(
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
        
        company.update(
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

const createEmployee = (req: Request, res: Response, role: Role) => {

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
                company: req.companyId
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
                
                company.update(
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

        res.json({'status': Status.Success, 'users': company.employees})    

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