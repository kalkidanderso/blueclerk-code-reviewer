import { Strategy, ExtractJwt, VerifiedCallback } from 'passport-jwt'
import { PassportStatic } from 'passport'
import { PrismaClient } from '@prisma/client'

export default (passport: PassportStatic) => {

    passport.use(
        new Strategy(
            {
                jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
                secretOrKey: process.env.jwt_encryption,
            }, 
            async (payload: any, done: VerifiedCallback) => {

                if (!payload.id) {
                    return done(null, false)
                }

                try {
                    const prisma = new PrismaClient();
                    const user = await prisma.user.findFirst({where: {id: payload.id}})
                    done(null, user, payload.sessionID)
                } catch (err: any) {
                    return done(err, false)
                }
            }
        )
    )

}