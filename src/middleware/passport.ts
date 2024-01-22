import { Strategy, ExtractJwt, VerifiedCallback } from 'passport-jwt';
import { User, IUser } from '../models/User';
import { PassportStatic } from 'passport';

export default (passport: PassportStatic) => {

    passport.use(
        new Strategy(
            {
                jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
                secretOrKey: process.env.jwt_encryption,
            }, 
            (payload: any, done: VerifiedCallback) => {

                if (!payload.id) {
                    return done(null, false);
                }

                User.findOne(
                    {_id: payload.id},
                    (err: any, user: IUser) => {

                        if (err || !user) {
                            return done(err, false);
                        }

                        done(null, user, payload.sessionID);
                    }
                );

            }
        )
    );

};