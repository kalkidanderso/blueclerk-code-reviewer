import { PrismaClient } from "@prisma/client";
import { Users } from '../../models/v3/user';

export class UserService {
    private prisma = new PrismaClient();
    constructor() {}

    async getDetailUser(id:number): Promise<any> {
        const user = new Users(this.prisma.user);
        return await user.findDetail(id)
    }
}