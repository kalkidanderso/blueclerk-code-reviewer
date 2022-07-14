declare namespace Express {
    export interface Request {
       companyId?: string,
       otherCompanyId?: string,
       company?: any,
       technician?: any,
       contractor?: any,
       userSession?: any,
       sessionId?: any
    }
 }