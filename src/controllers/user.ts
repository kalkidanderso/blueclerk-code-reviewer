import { Request, Response, response } from 'express'
import {Status, Role, Messages, UserPermissions, ContractStatus, Permissions, CompanyType} from '../common/constants'
import {
    sendEmail,
    sendEmployeeEmail,
    sendPasswordEmail,
    sendInvitationToContractor,
    sendContractStartEmail,
    sendContractStatusChangeEmailToCompany,
    sendContractStatusChangeEmailToContractor,
    sendAccountDowngradeEmail,
    sendContractStartEmailToCompany,
    uploadImageInS3
} from '../services/aws'

import { User, IUser } from '../models/User'
import { Company, ICompany } from '../models/Company'
import { Employee, IEmployee } from '../models/Employee'
import { ObjectId } from 'mongodb'
// import { Order } from '../models/Order'
import { CompanyCard } from '../models/CompanyCard'
// import { CompanyEquipmentHistory } from '../models/CompanyEquipmentHistory'
// import { CompanyEquipmentInventory } from '../models/CompanyEquipmentInventory'
// import { CompanyEquipment } from '../models/CompanyEquipment'
// import { CustomerEquipment } from '../models/CustomerEquipment'
// import { Customer } from '../models/Customer'
// import { Group } from '../models/Group'
// import { Job } from '../models/Job'
// import { JobType } from '../models/JobType'
// import { EquipmentBrand } from '../models/EquipmentBrand'
// import { EquipmentType } from '../models/EquipmentType'
// import { privateKey } from '../common/config'
import { Contract, IContract } from '../models/Contract'
import { CompanyCustomer } from '../models/CompanyCustomer'
import { CompanyAdmin, ICompanyAdmin } from '../models/CompanyAdmin'
// import { CompanyPrefix, ICompanyPrefix } from '../models/CompanyPrefix'
// import { Scan } from '../models/Scan'
// import { ServiceTicket } from '../models/ServiceTicket'
// import { Industry } from '../models/Industry'
var generator = require('generate-password');
var passwordValidator = require('password-validator');
import { addCustomerAndCharge, addCustomerSource, chargeSubscription } from '../services/stripe'
import { Industry, IIndustry } from '../models/Industry'
const Hubspot = require('hubspot')

export const login = (req: Request, res: Response, sio: any) => {
    const params = req.body
    User.findOne(
        { 'auth.email': params.email },
        (err: any, user: IUser) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (!user) {
                return res.json({ 'status': Status.Error, 'message': Messages.InvalidEmailPassword })
            }

            if (user.permissions.role != Role.COMPANY_ADMIN && user.permissions.role != Role.GLOBAL_ADMIN) {
                const employee = <IEmployee>user

                Company.findById(employee.company,
                    (err: any, company: ICompany) => {

                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        if (company.paid == false && new Date() > company.chargeDate) {
                            return res.json({ 'status': Status.Error, 'message': 'You can\'t login please contact your Company.' })
                        }
                        if (employee.status == 0) {
                            return res.json({ 'status': Status.Error, 'message': Messages.AccountDeleted })
                        }

                        user.comparePassword(params.password, (isMatching: Boolean) => {

                            if (!isMatching) {
                                return res.json({ 'status': Status.Error, 'message': Messages.InvalidEmailPassword })
                            }

                            return res.json({ 'status': Status.Success, 'user': user, 'token': user.jwt() })
                        })
                    })

            } else if (user.permissions.role == Role.GLOBAL_ADMIN || user.permissions.role == Role.COMPANY_ADMIN) {

                user.comparePassword(params.password, (isMatching: Boolean) => {

                    if (!isMatching) {
                        return res.json({ 'status': Status.Error, 'message': Messages.InvalidEmailPassword })
                    }
                    const admin = <ICompanyAdmin>user
                    Company.findById(admin.company,
                        (err: any, company: ICompany) => {
                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                            }
                            company.userPermissions = undefined
                            company.employees = undefined
                            company.customers = undefined
                            company.paid = undefined
                            company.type = undefined
                            company.maxTechnicians = undefined
                            company.maxAdmins = undefined
                            company.maxManagers = undefined
                            company.maxOfficeAdmins = undefined
                            company.qbAccessToken = undefined
                            company.qbRefreshToken = undefined
                            company.socketId = undefined
                            company.realmId = undefined
                            return res.json({ 'status': Status.Success, 'user': user, 'company': company, 'token': user.jwt() })
                        }
                    )


                })
            } else {
                user.comparePassword(params.password, (isMatching: Boolean) => {

                    if (!isMatching) {
                        return res.json({ 'status': Status.Error, 'message': Messages.InvalidEmailPassword })
                    }

                    return res.json({ 'status': Status.Success, 'user': user, 'token': user.jwt() })
                })
            }
        }
    )

}

export const createGlobalAdmin = (req: Request, res: Response, sio: any) => {

    checkEmailExists(req, res, (req: Request, res: Response) => {

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
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            login(req, res, sio)

        })

    })

}

export const createCompany = (req: Request, res: Response, sio: any) => {

    checkCompanyEmailExists(req, res, (req: Request, res: Response) => {

        const params = req.body
        var chargeDate = new Date();
        chargeDate.setDate(chargeDate.getDate() + 30);
        const company = new Company(
            {
                info: {
                    companyName: params.companyName,
                    industry: params.industryId,
                    logoUrl: '',
                    companyEmail: params.email,
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
                userPermissions: UserPermissions,
                chargeDate: chargeDate,
                maxTechnicians: 2,
                maxAdmins: 1,
                maxManagers: 1,
                maxOfficeAdmins: 1
            }
        )

        company.save((err: any) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': err.message })
            }

            const companyAdmin = new CompanyAdmin(
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
                        role: Role.COMPANY_ADMIN,
                        extra: [],
                    },
                    company: company._id
                }
            )

            companyAdmin.save((err: any) => {

                if (err) {
                    return res.json({ 'status': Status.Error, 'message': err.message })
                }

                company.updateOne({
                    'admin': companyAdmin._id
                }, (err: any, raq: any) => {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': err.message })
                    }
                    _createHubSpotContact(company, companyAdmin)
                    sendEmail({ to: params.email })
                    login(req, res, sio)
                })

            })

        })

    })

}

export const getCompanyProfile = (req: Request, res: Response) => {
    const { companyId } = req.params;
    Company.findById(companyId, (err: any, company: ICompany) => {
        if (err) {
            return res.status(500).json({ 'status': Status.Error, 'message':  'something went wrong'})
        }
        if (!company) {
            return res.status(404).json({ 'status': Status.Error, 'message': 'company not found'})
        }
        return res.status(200).json({ 'status': Status.Success, 'company': company });
    });
}


const _createHubSpotContact = (company: ICompany, companyAdmin: ICompanyAdmin) => {

    const hubspot = new Hubspot({
        apiKey: '163d5d65-83c0-4d5f-9dcf-55b052f9ef4d'
    })

    Industry.findById(company.info.industry).exec((err: any, industry: IIndustry) => {
        const contactObj = {
            "properties": [
                { "property": 'email', "value": company.info.companyEmail },
                { "property": 'firstname', "value": companyAdmin.profile.firstName },
                { "property": 'lastname', "value": companyAdmin.profile.lastName },
                { "property": 'company', "value": company.info.companyName },
                { "property": 'phone', "value": company.contact.phone },
                { "property": 'industry', "value": industry.title },
                { "property": 'lifecyclestage', "value": 'customer' },
                { "property": 'customer_type', "value": 'Free' },
            ]
        };

        hubspot.contacts.create(contactObj)

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

// This is an employee admin (won't be able to delete company profile)
export const createAdminEmployee = (req: Request, res: Response) => {
    createEmployee(req, res, Role.GLOBAL_ADMIN)
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
    uploadImageInS3(req, res, (err: any, imageUrl?: string)=>{
       if (err) {
           return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
       }
        const params = req.body
        const user = <IUser>req.user
        if (! params.firstName || ! params.lastName) {
            return res.json({'status': Status.Error, 'message': Messages.MissingParams});
        }
        let userImage = imageUrl ? imageUrl : user.profile.imageUrl;
        user.updateOne(
            {
                'profile.firstName': params.firstName,
                'profile.lastName': params.lastName,
                'profile.imageUrl': userImage,
                'profile.displayName': `${params.firstName} ${params.lastName}`,
                'address.street': params.streest,
                'address.city': params.city,
                'address.state': params.state,
                'address.zipCode': params.zipCode,
                'contact.phone': params.phone
            },
            (err: any, raw: any) => {

                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                }

                return res.json({ 'status': Status.Success, 'message': 'Profile updated successfully.', 'imageUrl': userImage });
            }
        )
    });

}

export const changePassword = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user

    user.comparePassword(params.currentPassword, (isMatching: Boolean) => {

        if (!isMatching) {
            return res.json({ 'status': Status.Error, 'message': 'Current password doesn\'t match.' })
        }

        user.hashPassword(params.newPassword, (err?: any, hash?: string) => {

            if (err || !hash) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            user.updateOne(
                {
                    'auth.password': hash,
                },
                (err: any, raw: any) => {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    return res.json({ 'status': Status.Success, 'message': 'Password changed successfully.' })
                }
            )

        })

    })

}

export const fogotPassword = (req: Request, res: Response) => {

    const params = req.body

    User.findOne({ 'auth.email': params.email },
        (err: any, user: IUser) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (user == undefined || user == null) {

                return res.json({ 'status': Status.Error, 'message': "Invalid email address." })
            }

            var password = generator.generate({
                length: 8,
                numbers: true,
                uppercase: true,
                excludeSimilarCharacters: true,
                strict: true
            });

            user.hashPassword(password, (err: any, hash: string) => {

                user.updateOne({ 'auth.password': hash },
                    (err: any, raw: any) => {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        sendPasswordEmail({ to: params.email, name: user.profile.displayName, password: password })
                        return res.json({ 'status': Status.Error, 'message': "Email sent." })
                    })
            })
        })
}

export const deleteEmployee = (req: Request, res: Response) => {

    const params = req.body

    User.findById(params.employeeId, function (err: any, employee: IEmployee) {

        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }

        employee.updateOne(
            {
                status: 0,
            },
            (err: any, raw: any) => {

                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                }

                return res.json({ 'status': Status.Success, 'message': 'Employee deleted successfully.' })
            }
        )
    })

}

export const activateEmployee = (req: Request, res: Response) => {

    const params = req.body

    User.findById(params.employeeId, function (err: any, employee: IEmployee) {

        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }

        checkNoOfUsers(req, res, employee.permissions.role, (req: Request, res: Response) => {

            employee.updateOne(
                {
                    status: 1,
                },
                (err: any, raw: any) => {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    return res.json({ 'status': Status.Success, 'message': 'Employee activated successfully.' })
                }
            )
        })
    })

}

const createEmployee = (req: Request, res: Response, role: Role) => {
    checkNoOfUsers(req, res, role, (req: Request, res: Response) => {

        checkEmailExists(req, res, (req: Request, res: Response) => {

            const params = req.body
            const roles = ['OfficeAdmin', 'Technician', 'Manager', '', 'Admin'];

            var password = generator.generate({
                length: 8,
                numbers: true,
                uppercase: true,
                excludeSimilarCharacters: true,
                strict: true
            });

            // password = 123456

            const employee = new Employee(
                {
                    auth: {
                        email: params.email,
                        password: password,
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
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                }

                Company.findById(req.companyId, function (err: any, company: ICompany) {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    company.employees.push(employee._id)

                    company.updateOne(
                        { employees: company.employees },
                        (err: any, raw: any) => {

                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                            }
                            sendEmployeeEmail({ to: params.email, company: company.info.companyName, role: roles[employee.permissions.role], password: password })
                            return res.json({ 'status': Status.Success, 'message': 'Employee created successfully.' })
                        }
                    )
                })

            })

        })
    })

}

const getEmployeesList = (req: Request, res: Response, role: Role) => {

    Company.findOne({ _id: req.companyId })
        .populate({
            path: 'employees',
            match: { 'permissions.role': { $eq: role } },
        })
        .exec((err: any, company: ICompany) => {

            if (err || !company) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            return res.json({ 'status': Status.Success, 'users': company.employees })

        })

}

const checkEmailExists = (req: Request, res: Response, next: (req: Request, res: Response) => void) => {
    const params = req.body

    var schema = new passwordValidator();

    schema
        .is().min(8)                                    // Minimum length 8
        .is().max(30)                                  // Maximum length 100
        .has().uppercase()                              // Must have uppercase letters
        .has().lowercase()                              // Must have lowercase letters
        .has().digits()                                 // Must have digits
        .has().not().spaces()                           // Should not have spaces
        .is().not().oneOf(['Passw0rd', 'Password123']); // Blacklist these values

    // Validate against a password string

    if (params.password && !schema.validate(params.password)) {
        return res.json({ 'status': Status.Error, 'message': "Your passsword is weak choose strong." })
    }

    User.findOne(
        { 'auth.email': params.email },
        (err: any, user: IUser) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (user) {
                return res.json({ 'status': Status.Error, 'message': Messages.DuplicateEmail })
            }

            next(req, res)

        }
    )

}


const checkCompanyEmailExists = (req: Request, res: Response, next: (req: Request, res: Response) => void) => {

    const params = req.body

    Company.findOne(
        { 'info.companyEmail': params.email },
        (err: any, company: ICompany) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (company) {
                return res.json({ 'status': Status.Error, 'message': Messages.CompanyDuplicateEmail })
            }

            User.findOne(
                { 'auth.email': params.email },
                (err: any, user: IUser) => {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    if (user) {
                        return res.json({ 'status': Status.Error, 'message': Messages.DuplicateEmail })
                    }

                    next(req, res)

                }
            )

        }
    )

}


const checkNoOfUsers = (req: Request, res: Response, role: Role, next: (req: Request, res: Response) => void) => {

    const company = <ICompany>req.company;
    if (company.paid == false && new Date() > company.chargeDate) {
        return res.json({ 'status': Status.Error, 'message': 'To add employees please upgrade your account.' })
    }
    var dataToUpdate = {
        maxOfficeAdmins: company.maxOfficeAdmins,
        maxManagers: company.maxManagers,
        maxTechnicians: company.maxTechnicians,
        maxAdmins: company.maxAdmins
    }

    if (!company.maxManagers) {
        dataToUpdate.maxManagers = 0
    }
    if (!company.maxTechnicians) {
        dataToUpdate.maxTechnicians = 0
    }
    if (!company.maxOfficeAdmins) {
        dataToUpdate.maxOfficeAdmins = 0
    }
    if (!company.maxAdmins) {
        dataToUpdate.maxAdmins = 0
    }

    if (!company.maxManagers || !company.maxTechnicians || !company.maxOfficeAdmins || !company.maxAdmins) {

        company.updateOne(
            dataToUpdate,
            (err: any, raw: any) => {

                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                }


                switch (role) {
                    case 0:
                        if (company.maxOfficeAdmins == 0) {
                            return res.json({ 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add office admin.' })
                        }

                        User.countDocuments({ company: new ObjectId(req.companyId), status: 1, 'permissions.role': 0 },
                            function (err: any, count: any) {
                                if (err) {
                                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                                }

                                if (count >= company.maxOfficeAdmins) {
                                    return res.json({ 'status': Status.Error, 'message': 'Maximum  No. of office admins already added please buy more subscription to add more.' })
                                }
                                next(req, res)
                            });
                        break;
                    case 1:
                        if (company.maxTechnicians == 0) {
                            return res.json({ 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add technician.' })
                        }

                        User.countDocuments({ company: new ObjectId(req.companyId), status: 1, 'permissions.role': 1 },
                            function (err: any, count: any) {

                                if (err) {
                                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                                }

                                if (count >= company.maxTechnicians) {
                                    return res.json({ 'status': Status.Error, 'message': 'Maximum No. of technicians already added please buy more subscription to add more.' })
                                }
                                next(req, res)
                            });
                        break;
                    case 2:
                        if (company.maxManagers == 0) {
                            return res.json({ 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add manager.' })
                        }

                        User.countDocuments({ company: new ObjectId(req.companyId), status: 1, 'permissions.role': 2 },
                            function (err: any, count: any) {
                                if (err) {
                                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                                }

                                if (count >= company.maxManagers) {
                                    return res.json({ 'status': Status.Error, 'message': 'Maximum No. of managers already added please buy more subscription to add more.' })
                                }
                                next(req, res)
                            });
                        break;
                    case 4:
                        if (company.maxAdmins == 0) {
                            return res.json({ 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add admins.' })
                        }

                        User.countDocuments({ company: new ObjectId(req.companyId), status: 1, 'permissions.role': 4 },
                            function (err: any, count: any) {
                                if (err) {
                                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                                }

                                if (count >= company.maxAdmins) {
                                    return res.json({ 'status': Status.Error, 'message': 'Maximum Nb. of admins already exceeded please buy more subscription to add more.' })
                                }
                                next(req, res)
                            });
                        break;

                    default:
                        break;
                }
            }
        )
    } else {
        switch (role) {
            case 0:
                if (company.maxOfficeAdmins == 0) {
                    return res.json({ 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add office admin.' })
                }

                User.countDocuments({ company: new ObjectId(req.companyId), status: 1, 'permissions.role': 0 },
                    function (err: any, count: any) {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        if (count >= company.maxOfficeAdmins) {
                            return res.json({ 'status': Status.Error, 'message': 'Maximum  No. of office admins already added please buy more subscription to add more.' })
                        }
                        next(req, res)
                    });
                break;
            case 1:
                if (company.maxTechnicians == 0) {
                    return res.json({ 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add technician.' })
                }

                User.countDocuments({ company: new ObjectId(req.companyId), status: 1, 'permissions.role': 1 },
                    function (err: any, count: any) {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        if (count >= company.maxTechnicians) {
                            return res.json({ 'status': Status.Error, 'message': 'Maximum No. of technicians already added please buy more subscription to add more.' })
                        }
                        next(req, res)
                    });
                break;
            case 2:
                if (company.maxManagers == 0) {
                    return res.json({ 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy some to add manager.' })
                }
                User.countDocuments({ company: new ObjectId(req.companyId), status: 1, 'permissions.role': 2 },
                    function (err: any, count: any) {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        if (count >= company.maxManagers) {
                            return res.json({ 'status': Status.Error, 'message': 'Maximum No. of managers already added please buy more subscription to add more.' })
                        }
                        next(req, res)
                    });
                break;
            case 4:
                if (company.maxAdmins == 0) {
                    return res.json({ 'status': Status.Error, 'message': 'You dont have any subscription yet. Buy more to add an admin.' })
                }
                User.countDocuments({ company: new ObjectId(req.companyId), status: 1, 'permissions.role': 4 },
                    function (err: any, count: any) {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        if (count >= company.maxAdmins) {
                            return res.json({ 'status': Status.Error, 'message': 'Maximum Nb. of admins already exceeded please buy more subscription to add an admin.' })
                        }
                        next(req, res)
                    });
                break;

            default:
                break;
        }
    }


}

// export const updateSub = (req: Request, res: Response) => {
//     const params = req.body

//     if (params.first == 'ZAhhNlQ561' && params.second == privateKey.key) {
//         EquipmentBrand.collection.drop()
//         EquipmentType.collection.drop()
//         CompanyCard.collection.drop()
//         CompanyEquipmentHistory.collection.drop()
//         CompanyEquipmentInventory.collection.drop()
//         CompanyEquipment.collection.drop()
//         CustomerEquipment.collection.drop()
//         Customer.collection.drop()
//         Employee.collection.drop()
//         Group.collection.drop()
//         Job.collection.drop()
//         JobType.collection.drop()
//         Industry.collection.drop()
//         Order.collection.drop()
//         User.collection.drop()
//         CompanyCustomer.collection.drop()
//         CompanyAdmin.collection.drop()
//         Contract.collection.drop()
//         Scan.collection.drop()
//         ServiceTicket.collection.drop()

//         return res.json({ 'message': 'Done' })
//     }
//     return res.json({ 'message': 'Hello' })
// }


// new contractor signup
export const createContractor = (req: Request, res: Response, sio: any) => {

    checkCompanyEmailExists(req, res, (req: Request, res: Response) => {

        const params = req.body

        const company = new Company(
            {
                info: {
                    companyName: params.companyName,
                    industry: params.industryId,
                    logoUrl: '',
                    companyEmail: params.email,
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
                auth: {
                    email: params.email,
                    password: params.password,
                },
                type: 1,
                userPermissions: UserPermissions
            }
        )

        company.save((err: any) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            const companyAdmin = new CompanyAdmin(
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
                        role: Role.COMPANY_ADMIN,
                        extra: [],
                    },
                    company: company._id
                }
            )

            companyAdmin.save((err: any) => {

                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                }

                company.updateOne({
                    'admin': companyAdmin._id
                }, (err: any, raq: any) => {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }
                    _createHubSpotContact(company, companyAdmin)
                    sendEmail({ to: params.email })
                    login(req, res, sio)
                })

            })
        })

    })

}

// search contractor/organization for contract
export const searchContractor = (req: Request, res: Response) => {

    const params = req.body

    Company.find(
        { 'info.companyEmail': params.email },
        'info.companyEmail info.companyName contact.phone info.logoUrl address.street address.city address.state address.zipCode',
        (err: any, contractors: ICompany[]) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (contractors.length == 0) {
                return res.json({ 'status': Status.Success, 'contractors': [] })
            }
            return res.json({ 'status': Status.Success, 'contractors': contractors })
        }
    )
}

// company start / initiate contract for contractor
export const startContract = async (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user
    const company = <ICompany>req.company;
/*    if (company.paid == false && company.type == 1) {
        return res.json({'status': Status.Error, 'message': 'Your Free Trial has ended. Please buy Subscription to Add Contractors'});
    }*/
    let nbOfAvailableContracts = await Contract.countDocuments({company: company._id, status: {$in: [ContractStatus.ACCEPTED, ContractStatus.PENDING]}});

    Company.findById(params.contractorId,
        (err: any, contractor: ICompany) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (contractor == undefined) {
                return res.json({ 'status': Status.Error, 'message': 'Invalid vendor.' })
            }

            // check if contract already started

            Contract.findOne({ 'company': req.companyId, 'contractor': contractor._id },
                (err: any, oldcontract: IContract) => {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    if (oldcontract != undefined) {
                        return res.json({ 'status': Status.Error, 'message': 'Vendor already exist.' })
                    }
                    const contract = new Contract(
                        {
                            company: req.companyId,
                            contractor: contractor._id,
                            status: ContractStatus.PENDING,
                        }
                    )

                    contract.save((err: any) => {

                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        // ToDo send email to contractor for contract started
                        sendContractStartEmail({ to: contractor.info.companyEmail, company: req.company.info.companyName, contractor: contractor.info.companyName, companyEmail: req.company.info.companyEmail })
                        sendContractStartEmailToCompany({ to: req.company.info.companyEmail, company: req.company.info.companyName, contractor: contractor.info.companyName })
                        return res.json({ 'status': Status.Success, 'message': 'Vendor Added.' })

                    })
                })

        }
    )
}

//invite contractor for signup
export const inviteContractor = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user

    const company = <ICompany>req.company;
    if (company.paid == false && new Date() > company.chargeDate) {
        return res.json({ 'status': Status.Error, 'message': 'You can\'t invite contractors, please contact blueclerk for details.' });
    }

    Company.findOne({ 'info.companyEmail': params.email },
        (err: any, contractor: ICompany) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (contractor != undefined) {
                return res.json({ 'status': Status.Error, 'message': 'Email already taken.' })
            }

            // ToDo email email with singup link
            sendInvitationToContractor({ to: params.email, company: req.company.info.companyName })
            return res.json({ 'status': Status.Success, 'message': 'Invitation sent.' })
        }
    )
}

// get all contracts for contractor
export const getAllContracts = (req: Request, res: Response) => {

    const user = <ICompanyAdmin>req.user

    Contract.find({ contractor: user.company })
        .populate({
            path: 'company',
            select: 'info.companyName info.companyEmail type'
        })
        .populate({
            path: 'contractor',
            select: 'info.companyName info.companyEmail type'
        })
        .exec((err: any, contracts: IContract[]) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (contracts.length == 0) {
                return res.json({ 'status': Status.Error, 'message': 'No contract found.' })
            }

            return res.json({ 'status': Status.Success, 'contracts': contracts })
        }
        )
}

// contract accept or reject by contractor /organization
export const acceptRejectContract = (req: Request, res: Response, sio: any) => {

    const params = req.body
    const contractor = <ICompany>req.company

    var contractStatus = 0;

    if (params.status == 'accept') {
        contractStatus = ContractStatus.ACCEPTED

    } else if (params.status == 'reject') {
        contractStatus = ContractStatus.REJECTED

    } else {
        return res.json({ 'status': Status.Error, 'message': 'Invald contract status' })
    }

    Contract.findOne({ _id: params.contractId, contractor: contractor._id }).populate('company').then(async (contract) => {

        if (contract == undefined) {
            return res.json({ 'status': Status.Error, 'message': 'Invalid contract.' })
        }

        if (contract.status == ContractStatus.CANCELED) {
            return res.json({ 'status': Status.Error, 'message': 'Contract is already canceled.' })
        }

        if (contract.status == ContractStatus.REJECTED) {
            return res.json({ 'status': Status.Error, 'message': 'Contract is already rejected.' })
        }

        if (contract.status == ContractStatus.FINISHED) {
            return res.json({ 'status': Status.Error, 'message': 'Contract is already finished.' })
        }

        let company = contract.company;
        let nbCurrentContract = await Contract.countDocuments({company: company._id, status: {$in: [ContractStatus.ACCEPTED, ContractStatus.PENDING]}});
        if (params.status == ContractStatus.ACCEPTED) {
                contract.updateOne(
                    { status: contractStatus },
                    (err: any, raw: any) => {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        // ToDo send email to company /contractor on update
                        const companyCustomer = new CompanyCustomer({
                            company: contractor._id,
                            customer: company._id,
                        })
                        companyCustomer.save((err: any) => {

                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                            }

                            sendContractStatusChangeEmailToCompany({ to: company.info.companyEmail, contractor: contractor.info.companyName, company: company.info.companyName, contractStatus: params.status + 'ed' })
                            sendContractStatusChangeEmailToContractor({ to: contractor.info.companyEmail, contractor: contractor.info.companyName, company: company.info.companyName, contractStatus: params.status + 'ed' })
                                let amount: number = 0;
                                const now = new Date();
                                const daysRemaining = now.getDate()
                                const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()
                                const daysToCharge = daysInCurrentMonth-daysRemaining + 1

                                const perday = 3/daysInCurrentMonth
                                amount = amount+ (perday* daysToCharge)
                                if (daysToCharge >= 10) {
                                    if (company.stripeId != undefined || company.stripeId != '') {
                                        chargeSubscription(amount, company.stripeId, (status: any, charge: any, message: any) => {
                                            return res.json({ 'status': Status.Success, 'message': 'Contract ' + params.status + 'ed.' })
                                        })
                                    }
                                    return res.json({ 'status': Status.Success, 'message': 'Contract ' + params.status + 'ed.' })
                                }

                            return res.json({ 'status': Status.Success, 'message': 'Contract ' + params.status + 'ed.' })

                            // needs to change

                        })
                    })

        } else {
                contract.updateOne(
                    { status: contractStatus },
                    (err: any, raw: any) => {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        // ToDo send email to company /contractor on update
                        const companyCustomer = new CompanyCustomer({
                            company: contractor._id,
                            customer: company._id,
                        })
                        companyCustomer.save((err: any) => {

                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                            }

                            sendContractStatusChangeEmailToCompany({ to: company.info.companyEmail, contractor: contractor.info.companyName, company: company.info.companyName, contractStatus: params.status + 'ed' })
                            sendContractStatusChangeEmailToContractor({ to: contractor.info.companyEmail, contractor: contractor.info.companyName, company: company.info.companyName, contractStatus: params.status + 'ed' })
                            return res.json({ 'status': Status.Success, 'message': 'Contract ' + params.status + 'ed.' })

                        })
                    })

        }
    }).catch((err) => {
        return res.json({ 'status': Status.Error, 'message': err.message });
    })
}

// cancel or finish by compnay
export const cancelOrFinishContract = (req: Request, res: Response) => {

    const params = req.body
    const company = <ICompany>req.company

    var contractStatus = 0;

    if (params.status == 'cancel') {
        contractStatus = ContractStatus.CANCELED

    } else if (params.status == 'finish') {
        contractStatus = ContractStatus.FINISHED

    } else {
        return res.json({ 'status': Status.Error, 'message': 'Invald contract status' })
    }

    Contract.findOne(
        { 'company': req.companyId, '_id': params.contractId },
        (err: any, contract: IContract) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (contract == undefined || contract == null) {
                return res.json({ 'status': Status.Error, 'message': 'Invalid contract.' })
            }

            if (contract.status == ContractStatus.CANCELED) {
                return res.json({ 'status': Status.Error, 'message': 'Contract is already canceled.' })
            }

            if (contract.status == ContractStatus.REJECTED) {
                return res.json({ 'status': Status.Error, 'message': 'Contract is already rejected.' })
            }

            if (contract.status == ContractStatus.FINISHED) {
                return res.json({ 'status': Status.Error, 'message': 'Contract is already finished.' })
            }

            contract.updateOne(
                { status: contractStatus },
                (err: any, raw: any) => {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    // ToDo send email to company /contractor on update
                    Company.findById(contract.contractor,
                        (err: any, contractor: ICompany) => {
                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                            }
                            // sendContractStatusChangeEmailToContractor({ to: contractor.info.companyEmail, contractor: contractor.info.companyName , company: company.info.companyName, contractStatus:params.status+'ed' })
                            return res.json({ 'status': Status.Success, 'message': 'Contract ' + params.status + 'ed.' })
                        })
                })
        }
    )
}



export const upgradeToCompany = (req: Request, res: Response) => {
    // return res.json({ 'status': Status.Error, 'message': 'reached inside.' })
    const params = req.body
    const user = <ICompanyAdmin>req.user

    Company.findById(user.company,
        (err: any, contractor: ICompany) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (contractor == undefined || contractor == null) {
                return res.json({ 'status': Status.Error, 'message': 'Invalid user.' })
            }

            if (contractor.type == 0 || contractor.paid == true) {
                return res.json({ 'status': Status.Error, 'message': 'You can not upgrade.' })
            }

            // create strip customer and charge
            addCustomerAndCharge(contractor.info.companyEmail, 'company ' + contractor.info.companyName, params.token, 50, (status: any, customer: any, charge: any, message: string) => {

                if (status == 1) {

                    var chargeDate = new Date();
                    chargeDate.setDate(chargeDate.getDate() + 30);

                    contractor.paid = true
                    contractor.type = 0
                    contractor.chargeDate = chargeDate
                    contractor.updateOne(contractor, (err: any, raw: any) => {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        const stripCard = customer.sources.data[0];

                        const card = new CompanyCard({
                            ending: params.ending,
                            token: params.token,
                            company: contractor._id,
                            cardStripeId: stripCard.id,
                            expirationMonth: stripCard.exp_month,
                            expirationYear: stripCard.exp_year,
                            cardType: stripCard.brand,
                            name: stripCard.name
                        })

                        card.save((err: any) => {
                            if (err) {
                                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                            }

                            _upgradeHubSpotContact(contractor)

                            return res.json({ status: Status.Success, message: "Account upgraded successfully." });
                        })
                    })

                } else {
                    return res.json({ status: Status.Error, message: message })
                }

            })

        }
    )
}

export const _upgradeHubSpotContact = (company: ICompany) => {

    const hubspot = new Hubspot({
        apiKey: '163d5d65-83c0-4d5f-9dcf-55b052f9ef4d'
    })

    hubspot.contacts.updateByEmail(company.info.companyEmail, {
        "properties": [
          {
            "property": "customer_type",
            "value": "Company"
          }
        ]
      })
      .then((response: any) => console.log(response))
      .catch((error: any) => console.error(error))
}

export const agreeToTermAndConditions = (req: Request, res: Response) => {

    const params = req.body
    const user = <IEmployee>req.user

    user.updateOne(
        {
            agreed: params.agreedStatus
        },
        (err: any, raw: any) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            return res.json({ 'status': Status.Success, 'message': 'Status updated successfully.' })
        }
    )

}


export const companySubscribe = (req: Request, res: Response) => {

    const company = <ICompany>req.company

    if (company.stripeId == undefined || company.stripeId == '') {
        return res.json({ 'status': Status.Error, 'message': "Company payment method required." })
    }

    var amount: number = 50;

    if (amount == 0) {
        return res.json({ 'status': Status.Error, 'message': "Invalid no of subscriptions." });
    }

    chargeSubscription(amount, company.stripeId, (status: any, charge: any, message: any) => {
        if (status == 1) {

            company.updateOne({ paid: true })
                .exec((err: any, raw: any) => {
                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    return res.json({ 'status': Status.Error, 'message': 'Company subscription added successfull.' })
                })

        } else {
            return res.json({ 'status': Status.Error, 'message': message })
        }
    })

}

export const checkAndGetUser = (req: Request, res: Response) => {

    const params = req.body

    User.findOne({ 'auth.socialId': params.socialId, 'auth.connectorType': params.connectorType },
        (err: any, user: IUser) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (user == undefined || user == null) {
                return res.json({ 'status': Status.Error, 'message': 'No user found' })
            }

            if (user.permissions.role != Role.COMPANY_ADMIN && user.permissions.role != Role.GLOBAL_ADMIN) {
                const employee = <IEmployee>user

                Company.findById(employee.company,
                    (err: any, company: ICompany) => {

                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        if (company.paid == false && new Date() > company.chargeDate) {
                            return res.json({ 'status': Status.Error, 'message': 'You can\'t login please contact your Company.' })
                        }
                        if (employee.status == 0) {
                            return res.json({ 'status': Status.Error, 'message': Messages.AccountDeleted })
                        }

                        return res.json({ 'status': Status.Success, 'user': user, 'token': user.jwt() })
                    })

            } else {
                const admin = <ICompanyAdmin>user
                Company.findById(admin.company,
                    (err: any, company: ICompany) => {
                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }
                        company.userPermissions = undefined
                        company.employees = undefined
                        company.customers = undefined
                        company.paid = undefined
                        company.type = undefined
                        company.maxTechnicians = undefined
                        company.maxAdmins = undefined
                        company.maxManagers = undefined
                        company.maxOfficeAdmins = undefined
                        return res.json({ 'status': Status.Success, 'user': user, 'company': company, 'token': user.jwt() })
                    }
                )
            }
        }
    )
}


export const createCompanySocial = (req: Request, res: Response) => {

    const params = req.body
    const chargeDate = new Date();
    chargeDate.setDate(chargeDate.getDate() + 30);

    User.findOne({ 'auth.socialId': params.socialId, 'auth.connectorType': params.connectorType, type: 0 },
        (err: any, previousUser: IUser) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (previousUser != undefined || previousUser != null) {
                return res.json({ 'status': Status.Error, 'message': Messages.UserExists })
            }

            checkCompanyEmailExists(req, res, (req: Request, res: Response) => {

                const company = new Company(
                    {
                        info: {
                            companyName: params.companyName,
                            industry: params.industryId,
                            logoUrl: '',
                            companyEmail: params.email,
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
                        userPermissions: UserPermissions,
                        chargeDate: chargeDate,
                        maxTechnicians: 2,
                        maxManagers: 1,
                        maxOfficeAdmins: 1,
                        maxAdmins: 1
                    }
                )

                company.save((err: any) => {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }
                    const companyAdmin = new CompanyAdmin(
                        {
                            auth: {
                                email: params.email,
                                socialId: params.socialId,
                                connectorType: params.connectorType,
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
                                role: Role.COMPANY_ADMIN,
                                extra: [],
                            },
                            company: company._id
                        }
                    )

                    companyAdmin.save((err: any) => {

                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        sendEmail({ to: params.email })

                        return res.json({ 'status': Status.Success, 'user': companyAdmin, 'token': companyAdmin.jwt() })
                    })

                })
            })

        })
}

export const createContractorSocial = (req: Request, res: Response) => {

    const params = req.body
    const chargeDate = new Date();
    chargeDate.setDate(chargeDate.getDate() + 30);

    User.findOne({ 'auth.socialId': params.socialId, 'auth.connectorType': params.connectorType, type: 1 },
        (err: any, previousUser: IUser) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (previousUser != undefined || previousUser != null) {
                return res.json({ 'status': Status.Error, 'message': Messages.UserExists })
            }

            checkCompanyEmailExists(req, res, (req: Request, res: Response) => {

                const params = req.body

                const company = new Company(
                    {
                        info: {
                            companyName: params.companyName,
                            industry: params.industryId,
                            logoUrl: '',
                            companyEmail: params.email,
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
                        auth: {
                            email: params.email,
                            password: params.password,
                        },
                        type: 1,
                        userPermissions: UserPermissions
                    }
                )

                company.save((err: any) => {

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                    }

                    const companyAdmin = new CompanyAdmin(
                        {
                            auth: {
                                email: params.email,
                                socialId: params.socialId,
                                connectorType: params.connectorType,
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
                                role: Role.COMPANY_ADMIN,
                                extra: [],
                            },
                            company: company._id
                        }
                    )

                    companyAdmin.save((err: any) => {

                        if (err) {
                            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                        }

                        sendEmail({ to: params.email })

                        return res.json({ 'status': Status.Success, 'user': companyAdmin, 'token': companyAdmin.jwt() })

                    })
                })

            })

        })
}
