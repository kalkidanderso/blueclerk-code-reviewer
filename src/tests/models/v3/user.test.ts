import { Users } from '../../../models/v3/user'
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
describe('Users', () => {
    it('Should get email default by company id and email type', async () => {
        const user = new Users(prisma.user);
        
        const getUser = await user.findDetail(1);
        expect(getUser).toEqual(getUser);
    })
    
    it('Should error get user by id', async () => {
        const user = new Users(prisma.user);
    
        try {
            await user.findDetail(7);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toEqual('User not found');
            expect(error.message).toContain('Expected error message');
        }
    });

    it('should throw an error when unable to find user', async () => {
        const prismaClient = new PrismaClient();
        prismaClient.user.findUnique = jest.fn().mockRejectedValue(new Error('User not found'));
        const users = new Users(prismaClient.user);
        try {
            await users.findDetail(123);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toEqual('User not found');
        }
    });
});
