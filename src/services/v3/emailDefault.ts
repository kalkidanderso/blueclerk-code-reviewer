import { PrismaClient } from "@prisma/client";
import { EmailDefaults } from '../../models/v3/emailDefault';

export class EmailDefaultService {
    private prisma = new PrismaClient();
    constructor() {}

    async GetEmailDefaultByEmailTypeAndCompany(companyId:number, emailType:string): Promise<any> {
        const emaildefault = new EmailDefaults(this.prisma.emailDefault);
        return await emaildefault.findDetail(companyId, emailType)
    }

    async createEmailDefaultPORequest(companyId:number, emailType:string, DefaultPORequestEmailTemplate:any, userId:number, alternativeId:string): Promise<any>{
        const emaildefault = new EmailDefaults(this.prisma.emailDefault);
        return await emaildefault.create({
            alternativeId: alternativeId,
            subject: DefaultPORequestEmailTemplate.subject,
            message: DefaultPORequestEmailTemplate.message,
            companyId: companyId,
            updatedBy: userId,
            emailType
        })
    }

    async updateEmailDefaultPORequest(DefaultPORequestEmailTemplate:any, userId:number, id:number): Promise<any>{
        const emaildefault = new EmailDefaults(this.prisma.emailDefault);
        return await emaildefault.updateSubjectAndMessage({
            subject: DefaultPORequestEmailTemplate.subject,
            message: DefaultPORequestEmailTemplate.message,
            updatedBy: userId,
        }, id)
    }
}