import { PrismaClient } from "@prisma/client";

export class Invoice {
    constructor(private readonly prisma: PrismaClient['invoice']) { }

    async getAll(query: any[]): Promise<any> {
        try {
            return await this.prisma.findMany({
                where: { AND: query },
            })

        } catch (err) {
            throw new Error(err.message)
        }
    }

}