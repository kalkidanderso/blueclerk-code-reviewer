import { PrismaClient, Prisma } from "@prisma/client";
import { ICreateJobReportsInput } from "src/types/v3/jobReports";

export class JobReports {
    constructor(private readonly prisma: PrismaClient['jobReport']) {}

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
                    customerName,
                    technicianName,
                    jobDate,
                    companyId,
                    contractorId,
                    emailHistory: emailHistory as unknown as Prisma.JsonArray,
                    lastEmailSent,
                    createdAt,
                    invoiceCreated,
                    invoiceVoid,
                    invoiceId,
                    scans: {
                        connect: scanIds.map(id => ({ id }))
                    },
                    purchaseOrders: {
                        connect: purchaseOrderIds.map(id => ({ id }))
                    }
                }
            });
        } catch (err) {
            throw new Error(err.message);
        }
    }

    // Additional methods for update, find, delete, etc. similar to HomeOwners class
    async updateById(id: number, {
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
                    customerName,
                    technicianName,
                    jobDate,
                    companyId,
                    contractorId,
                    emailHistory: emailHistory as unknown as Prisma.JsonArray,
                    lastEmailSent,
                    createdAt,
                    invoiceCreated,
                    invoiceVoid,
                    invoiceId,
                    scans: {
                        connect: scanIds.map(id => ({ id }))
                    },
                    purchaseOrders: {
                        connect: purchaseOrderIds.map(id => ({ id }))
                    }
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
                emailHistory: true, // TODO remove this ?
                lastEmailSent: true,
                createdAt: true,
                invoiceCreated: true,
                invoiceVoid: true,
                invoice: true
            }
        });
    }

    async findWithPagination(query: any, currentPageNum: number, pageSizeNum: number) {
        return await this.prisma.findMany({
            where: query,
            skip: currentPageNum * pageSizeNum,
            take: pageSizeNum,
            orderBy: { createdAt: 'desc' },
            select: {
                job: true,
                scans: true,
                customerName: true,
                technicianName: true,
                jobDate: true, // TODO REMOVE THIS ?
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

    async findById(id: number, companyId: number): Promise<any> {
        return await this.prisma.findFirst({
            where: { AND: [
                { id },
                { OR: [{ contractorId: companyId }, { companyId }] },
            ]},
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
            },
        });
    }
    async deleteMany(query: any): Promise<{ count: number }> {
        try {
            const result = await this.prisma.deleteMany({
                where: query,
            });
            return { count: result.count };
        } catch (err) {
            throw new Error(err.message);
        }
    }

    async totalJobReports(query: any): Promise<number> {
        try {
            return await this.prisma.count({
                where: query
            });
        } catch (err) {
            throw new Error(err.message);
        }
    }    
    
    async deleteById(id: number, companyId: number): Promise<any> {
    return await this.prisma.deleteMany({
        where: { AND: [
            { id },
            { OR: [{ contractorId: companyId }, { companyId }] },
        ]},
    });
}

    
}
