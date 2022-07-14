import { Request, Response, NextFunction } from 'express';
import { Status } from '../common/constants';
import { Session } from '../models/Session';

export const isLogin = () => {

    return async (req: Request, res: Response, next: NextFunction) => {

        const sessionId = req.authInfo;
        try {
            if (sessionId) {
                const session = await Session.findOne({ _id: sessionId });
                req.userSession = session;
                req.sessionId = session._id;
            }

            next();
            return
        } catch (err) {
            return res.json({ status: Status.Error, message: 'Session is expired or you are already logged out, please login again' })
        }
    }
}
