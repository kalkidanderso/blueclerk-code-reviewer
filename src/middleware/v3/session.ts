import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { PrismaClient } from '@prisma/client';
import { Status } from 'src/common/constants';

export const isLogin = async (req: Request, res: Response, next: NextFunction) => {
    const prisma = new PrismaClient();
    const sessionId = req.authInfo;
    try {
        if (sessionId) {
            const session = await prisma.session.findFirst({where: {id: sessionId}});
            req.v3.userSession = session;
            req.v3.sessionId = session.id;
        }

        next();
        return
    } catch (err) {
        Sentry.captureException(err);
        return res.json({ status: Status.Error, message: 'Session is expired or you are already logged out, please login again' })
    }
}
