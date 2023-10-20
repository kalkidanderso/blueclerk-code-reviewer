import { PrismaClient } from "@prisma/client";
import { IEmailDefault } from "../../types/v3/emailDefault"

export class EmailDefaults {
    constructor(private readonly prisma: PrismaClient['emailDefault']) {}

    async findDetail(companyId:number, emailType:string): Promise<any>{
        try {
            return await this.prisma.findFirst({
                where: {companyId, emailType}
            });
        } catch (err) {
            throw new Error( err.message ) 
        }
    }

    async create({
        alternativeId,
        subject,
        message,
        companyId,
        updatedBy,
        emailType
    }:any): Promise<any>{
        try {
            return await this.prisma.create({
                data: {
                    alternativeId,
                    subject,
                    message,
                    companyId,
                    updatedBy,
                    emailType,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            });
        } catch (err) {
            throw new Error( err.message ) 
        }
    }

    async updateSubjectAndMessage({
        subject,
        message,
        updatedBy,
    }:any, id:number): Promise<any>{
        try {
            return await this.prisma.update({
                where: {id},
                data: {
                    subject,
                    message,
                    updatedBy,
                    updatedAt: new Date(),
                }
            });
        } catch (err) {
            throw new Error( err.message ) 
        }
    }

}