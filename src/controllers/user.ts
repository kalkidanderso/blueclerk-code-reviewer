import {Request, Response} from 'express'
import { Status, Role, Messages } from '../common/constants'
import {sendEmail} from '../services/aws'

import { User, IUser } from '../models/User'
import { Subscriber, ISubscriber } from '../models/Subscriber'
import { NonSubscriber, INonSubscriber } from '../models/NonSubscriber'

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

export const createSubscriber = (req: Request, res: Response) => {

    checkEmailExists(req, res, (req: Request, res: Response)=>{

        const params = req.body

        const subscriber = new Subscriber(
            {
                auth: {
                    email: params.email,
                    password: params.password,
                },
                profile: {
                    firstName: params.firstName,
                    lastName: params.lastName,    
                    displayName: `${params.firstName} ${params.lastName}`,
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
                    role: Role.SUBSCRIBER,
                    extra: [],
                },
                company: {
                    companyName: params.companyName,
                    industry: params.industryId,
                },
            }
        )

        subscriber.save((err: any) => {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            sendEmail({to: params.email})
            login(req, res)

        })

    })

}

export const createManager = (req: Request, res: Response) => {
    createNonSubscriber(req, res, Role.MANAGER)
}

export const createTechnician = (req: Request, res: Response) => {
    createNonSubscriber(req, res, Role.TECHNICIAN)
}

export const createOfficeAdmin = (req: Request, res: Response) => {
    createNonSubscriber(req, res, Role.OFFICE_ADMIN)
}

export const getManagersList = (req: Request, res: Response) => {
    getNonSubscribersList(req, res, Role.MANAGER)
}

export const getTechniciansList = (req: Request, res: Response) => {
    getNonSubscribersList(req, res, Role.TECHNICIAN)
}

export const getOfficeAdminsList = (req: Request, res: Response) => {
    getNonSubscribersList(req, res, Role.OFFICE_ADMIN)
}

export const updateProfile = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user

    user.update(
        {
            'profile.firstName': params.firstName,
            'profile.lastName': params.lastName,
            'profile.imageUrl': params.imageUrl,
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
    const subscriber = <ISubscriber>req.user

    subscriber.update(
        {
            'company.companyName': params.companyName,
            'company.logoUrl': params.logoUrl,
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

}

const createNonSubscriber = (req: Request, res: Response, role: Role) => {

    checkEmailExists(req, res, (req: Request, res: Response)=>{

        const params = req.body
        const subscriber = <ISubscriber>req.user

        const nonSubscriber = new NonSubscriber(
            {
                auth: {
                    email: params.email,
                    password: params.password,
                },
                profile: {
                    firstName: params.firstName,
                    lastName: params.lastName,    
                    displayName: `${params.firstName} ${params.lastName}`,
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
                subscriber: subscriber._id
            }
        )

        nonSubscriber.save((err: any) => {

            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            subscriber.users.push(nonSubscriber._id)
            
            subscriber.update(
                {users: subscriber.users},
                (err: any, raw: any)=> {
                    
                    if (err) {
                        return res.json({'status': Status.Error, 'message': Messages.GenericError})
                    }
            
                    return res.json({'status': Status.Success, 'message': 'User created successfully.'})
                }
            )

        })

    })

}

const getNonSubscribersList = (req: Request, res: Response, role: Role) => {

    const user = <IUser>req.user

    Subscriber.findOne({_id: user._id})
    .populate({
        path: 'users',
        match: { 'permissions.role': { $eq: role } },
      })
    .exec((err: any, subscriber: ISubscriber) => {

        if (err || !subscriber) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        res.json({'status': Status.Success, 'users': subscriber.users})    

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