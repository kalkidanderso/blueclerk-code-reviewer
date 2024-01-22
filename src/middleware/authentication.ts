import {Request} from 'express';
import passport from 'passport';

export function expressAuthentication(
    request: Request,
    securityName: string,
    scope?: string[]
): Promise<any> {
    if (securityName === 'jwt') {
        return new Promise((resolve: any, reject: any) => {
            passport.authenticate('jwt', {session:false},(err: any, user?: any, info?: any)=>{
                if(err)reject(err);
                
                request.authInfo = info;
                resolve(user);
                
            })(request);
        });
    }
}