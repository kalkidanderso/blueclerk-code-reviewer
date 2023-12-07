import { Prisma, PrismaClient } from "@prisma/client";
import { ICreatedJobLocation, IUpdateModelJobLocation } from "../../types/v3/jobLocation";
import { DefaultArgs } from "@prisma/client/runtime";
export class JobLocations {
    constructor(private readonly prisma: PrismaClient['joblocation']) {}
    async create({
        alternativeId,
        name,
        contacts,
        location,
        address,
        jobSites,
        isActive,
        customerId,
        companyId,
        inactiveAt, 
        inactiveById,
        quickbookId,
    } : ICreatedJobLocation) : Promise<any> {
        return await this.prisma.create({
            data: {
                alternativeId,
                name,
                contacts,
                location,
                address,
                jobSites,
                isActive,
                customerId,
                companyId,
                inactiveAt,
                inactiveById,
                quickbookId,
            }
        });
    }
    async updateById({
        id,
        alternativeId,
        name,
        contacts,
        location,
        address,
        jobSites,
        isActive,
        customerId,
        companyId,
        inactiveAt, 
        inactiveById,
        quickbookId,
    } : IUpdateModelJobLocation) : Promise<any> {
        return await this.prisma.update({
            where: { id }, 
            data: {
                alternativeId,
                name,
                contacts,
                location,
                address,
                jobSites,
                isActive,
                customerId,
                companyId,
                inactiveAt,
                inactiveById,
                quickbookId,
            }
        });
    }
    async findById({id, select} : {id: number, select?: Prisma.JoblocationSelect<DefaultArgs>}) : Promise<any> {
        return await this.prisma.findUnique({
            where: { id },
            select: select
        })
    }
    async update({id, data} : {id: number, data: object}) : Promise<any> {
        return await this.prisma.update({
            where: { id },
            data: data
        });
    }
    async find(whereClause: Prisma.JoblocationWhereInput) : Promise<any> {
        return await this.prisma.findMany({
            where: whereClause,
        })
    }
    async updateResetQb(companyId : number) : Promise<any> {
        return await this.prisma.updateMany({
            where: { companyId },
            data: {quickbookId: null}
        });
    }
    async deleteById(id:number): Promise<any>{
        return await this.prisma.delete({
            where: { id }
        });
    }
}