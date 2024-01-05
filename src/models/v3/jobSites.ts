import { Prisma, PrismaClient } from "@prisma/client";
import { IJobSite } from "../../types/v3/jobSites";
export class JobSites {
    constructor(private readonly prisma: PrismaClient['jobsite']) {}
    async findById(id: number) : Promise<IJobSite> {
        return await this.prisma.findUnique({
            where: { id },
        })
    }
    async find(whereClause: Prisma.JobsiteWhereInput) : Promise<IJobSite []> {
        return await this.prisma.findMany({
            where: whereClause,
        })
    }
    async create({
        alternativeId,
        name,
        address,
        location,
        isActive,
        jobLocationId,
        customerId,
        homeOwnerId,
    } : {
        alternativeId: string,
        name: string,
        location: Prisma.JsonValue,
        isActive: boolean,
        address: Prisma.JsonValue,
        jobLocationId: number,
        customerId: number,
        homeOwnerId: number | undefined,
    }) : Promise<any> {
        return this.prisma.create({
            data: {
                alternativeId,
                name,
                address: address,
                location: location,
                isActive,
                jobLocation: {
                    connect: {
                        id: jobLocationId
                    }
                },
                customer: {
                    connect: {
                        id: customerId
                    }
                },
                homeOwner: {
                    connect: {
                        id: homeOwnerId
                    }
                }
            }
        });
    }
    async update({
        id,
        alternativeId,
        name,
        address,
        location,
        isActive,
        jobLocationId,
        customerId,
        homeOwnerId,
    } : {
        id: number
        alternativeId: string,
        name: string,
        isActive: boolean,
        location: Prisma.JsonValue,
        address: Prisma.JsonValue,
        jobLocationId: number,
        customerId: number,
        homeOwnerId: number,
    }) {
        return this.prisma.update({
            where: { id },
            data: {
                alternativeId,
                name,
                location,
                isActive,
                address,
                locationId: jobLocationId,
                customerId: customerId,
                homeOwnerId: homeOwnerId
            }
        })
    }
    async deleteById(id:number): Promise<any>{
        try {
            return await this.prisma.delete({
                where: { id }
            });
        } catch (err) {
            throw new Error( err.message )
        }
    }
}