import { PrismaClient } from "@prisma/client";
import { ICreateJobReportsInput } from "src/types/v3/jobReports";

export class JobReports {
    constructor(private readonly prisma: PrismaClient['jobReports']) {}

    async create({
        jobId,
        scanIds,
        customerName,
        technicianName,
        jobDate,
        purchaseOrderIds,
        companyId,
        contractorId,
        emailHistory,
        lastEmailSent,
        createdAt,
        invoiceCreated,
        invoiceVoid,
        invoiceId
    }: ICreateJobReportsInput): Promise<any> {
        try {
            return await this.prisma.create({
                data: {
                    jobId,
                    scans: { connect: scanIds.map(id => ({ id })) },
                    customerName,
                    technicianName,
                    jobDate,
                    purchaseOrders: { connect: purchaseOrderIds.map(id => ({ id })) },
                    companyId,
                    contractorId,
                    emailHistory,
                    lastEmailSent,
                    createdAt,
                    invoiceCreated,
                    invoiceVoid,
                    invoice: invoiceId ? { connect: { id: invoiceId } } : undefined
                }
            });
        } catch (err) {
            throw new Error(err.message);
        }
    }

    // Additional methods for update, find, delete, etc. similar to HomeOwners class
    async updateById(id: string, {
        jobId,
        scanIds,
        customerName,
        technicianName,
        jobDate,
        purchaseOrderIds,
        companyId,
        contractorId,
        emailHistory,
        lastEmailSent,
        createdAt,
        invoiceCreated,
        invoiceVoid,
        invoiceId
    }: ICreateJobReportsInput): Promise<any> {
        try {
            return await this.prisma.update({
                where: { id },
                data: {
                    jobId,
                    scans: { connect: scanIds.map(id => ({ id })) },
                    customerName,
                    technicianName,
                    jobDate,
                    purchaseOrders: { connect: purchaseOrderIds.map(id => ({ id })) },
                    companyId,
                    contractorId,
                    emailHistory,
                    lastEmailSent,
                    createdAt,
                    invoiceCreated,
                    invoiceVoid,
                    invoice: invoiceId ? { connect: { id: invoiceId } } : undefined
                }
            });
        } catch (err) {
            throw new Error(err.message);
        }
    }

    async find(query: any): Promise<any> {
        return await this.prisma.findMany({
            where: query,
            select: {
                job: true,
                scans: true,
                customerName: true,
                technicianName: true,
                jobDate: true,
                purchaseOrders: true,
                company: true,
                contractor: true,
                emailHistory: true,
                lastEmailSent: true,
                createdAt: true,
                invoiceCreated: true,
                invoiceVoid: true,
                invoice: true
            }
        });
    }

    async findById(id: string): Promise<any> {
        return await this.prisma.findUnique({
            where: { id },
            select: {
                job: true,
                scans: true,
                customerName: true,
                technicianName: true,
                jobDate: true,
                purchaseOrders: true,
                company: true,
                contractor: true,
                emailHistory: true,
                lastEmailSent: true,
                createdAt: true,
                invoiceCreated: true,
                invoiceVoid: true,
                invoice: true
            }
        });
    }

    async deleteById(id: string): Promise<any> {
    return await this.prisma.delete({
        where: { id }
    });
}

    
}
