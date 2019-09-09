import {Request, Response, NextFunction} from 'express'
import { Role, Status, Messages } from '../common/constants'
import { IUser } from '../models/User'

export const checkPermissions = (minAuth: Role) => {

    return async (req: Request, res: Response, next: NextFunction) => {

        const user = <IUser>req.user

        if (user.permissions.role < minAuth) {
            return res.json({'status': Status.Error, 'message': Messages.UnAuthorized})
        }

        next()

    }

}