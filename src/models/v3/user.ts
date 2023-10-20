import { PrismaClient } from "@prisma/client";

export class Users {
    constructor(private readonly prisma: PrismaClient['user']) {}

    async findDetail(id:number): Promise<any>{
        try {
            return await this.prisma.findUnique({
                where: { id },
                select:{
                    id:true,
                    profile:true,
                    auth:true
                }
            });
        } catch (err) {
            throw new Error( err.message ) 
        }
    }
}