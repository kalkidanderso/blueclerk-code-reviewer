import { Advancepayment, Prisma, PrismaClient } from "@prisma/client";
import { IAdvancePayment } from "src/types/v3/advancePayment";

export class AdvancePayment {
    constructor(private readonly prisma: PrismaClient['advancepayment']) {}

    async findById(id: number) : Promise<IAdvancePayment> {
        return await this.prisma.findUnique({
            where: { id },
        })
    }

    async create({
        name,
        address,
        location,
        jobLocationId,
        customerId,
        homeOwnerId,
    } : {
        name: string,
        location: Prisma.JsonValue,
        address: Prisma.JsonValue,
        jobLocationId: number,
        customerId: number,
        homeOwnerId: number,
    }) : Promise<IAdvancePayment> {
        return this.prisma.create({
            data: {
                name,
                address: address,
                location: location,
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
}