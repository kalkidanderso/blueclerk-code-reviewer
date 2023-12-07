import { JobSites } from '../../../models/v3/jobSites'
import { PrismaClient } from "@prisma/client";

// Mock the prisma object
let mockPrisma = {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
};

let jobSite : JobSites

beforeEach(async()=>{
    jobSite = new JobSites(mockPrisma as any);

})
afterAll(async()=>{
    jest.clearAllMocks();
})

describe('JobSites', () => {
    it('Should create job site', async () => {
        const input = {
            alternativeId: "jobSiteModelCreate" ,
            name: "test",
            address: "test",
            location: "test",
            isActive: true,
            jobLocationId: 9999991,
            customerId: 9999991,
            homeOwnerId: 9999991,
        }
        const createJobSite = await jobSite.create(input);
        expect(createJobSite.alternativeId).toEqual(input.alternativeId);
        expect(createJobSite.name).toEqual(input.name);
        expect(createJobSite.location).toEqual(input.location);
        expect(createJobSite.isActive).toEqual(input.isActive);
    })
    it('Should get job site by id', async () => {
        const getJobSiteById = await jobSite.findById(9999991);
        expect(getJobSiteById.alternativeId).toBeDefined();
        expect(getJobSiteById.name).toBeDefined();
        expect(getJobSiteById.location).toBeDefined();
        expect(getJobSiteById.isActive).toBeDefined();
    })
    it('Should get all job site', async () => {
        const getJobSiteById = await jobSite.find({});
        getJobSiteById.forEach((jobSite:any) => {
            expect(jobSite.alternativeId).toBeDefined();
            expect(jobSite.name).toBeDefined();
            expect(jobSite.location).toBeDefined();
            expect(jobSite.isActive).toBeDefined();
        })
    })
    it('Should get all job site with filter id', async () => {
        const getJobSiteById = await jobSite.find({ id: 9999991 });
        getJobSiteById.forEach((jobSite:any) => {
            expect(jobSite.alternativeId).toBeDefined();
            expect(jobSite.name).toBeDefined();
            expect(jobSite.location).toBeDefined();
            expect(jobSite.isActive).toBeDefined();
        })
    })
    it('Should get all job site with filter customerId and locationId', async () => {
        const getJobSiteById = await jobSite.find( { customerId: 9999991, locationId: 9999991, isActive: true });
        getJobSiteById.forEach((jobSite:any) => {
            expect(jobSite.alternativeId).toBeDefined();
            expect(jobSite.name).toBeDefined();
            expect(jobSite.location).toBeDefined();
            expect(jobSite.isActive).toBeDefined();
        })
    })
    it('Should update job site by id', async () => {
        const input = {
            id: 9999991,
            alternativeId: "jobSiteModelCreate" ,
            name: "asd",
            address: "asd",
            location: "asd",
            isActive: true,
            jobLocationId: 9999991,
            customerId: 9999991,
            homeOwnerId: 9999991,
        }
        const updateJobSiteById = await jobSite.update(input);
        expect(updateJobSiteById.alternativeId).toEqual(input.alternativeId);
        expect(updateJobSiteById.name).toEqual(input.name);
        expect(updateJobSiteById.location).toEqual(input.location);
        expect(updateJobSiteById.isActive).toEqual(input.isActive);
    })
    it('Should delete job site by id', async () => {
        const prismaC = new PrismaClient();
        await prismaC.homeOwners.deleteMany({where:{id:9999991}});
        await jobSite.deleteById(9999991);
    })
    it('Should error when delete job site id not found', async () => {
        try {
            await jobSite.deleteById(9999991);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Record to delete does not exist.');
        }
    })
});