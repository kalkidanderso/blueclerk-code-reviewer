declare namespace Express {
    export interface Request {
       companyId?: string,
       otherCompanyId?: string,
       company?: any,
       supplierId?: string,
       supplier?: any,
       technician?: any,
       contractor?: any,
       userSession?: any,
       sessionId?: any,
       v3?: {
         userSession?: any,
         sessionId?: any,
         company?: any,
         companyId?: number,
       }
    }
 }