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

let jobSite : JobSites

beforeEach(async()=>{
    jobSite = new JobSites(mockPrisma as any);

})
afterAll(async()=>{
    jest.clearAllMocks();
})

describe('Create JobSites', () => {
    it('Should create job site', async () => {
        mockPrisma.create = jest.fn(() => input);
        const createJobSite = await jobSite.create(input);
        expect(mockPrisma.create).toHaveBeenCalled();
        expect(createJobSite.alternativeId).toEqual(input.alternativeId);
        expect(createJobSite.name).toEqual(input.name);
        expect(createJobSite.location).toEqual(input.location);
        expect(createJobSite.isActive).toEqual(input.isActive);
    })

    it('Should not create job site on error', async () => {
        mockPrisma.create = jest.fn(() => {throw new Error("error")});
        try {
            await jobSite.create(input);
            fail();
        }
        catch(error) {
            expect(mockPrisma.create).toHaveBeenCalled();
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe("error");
        }
    })
})

describe('Update JobSites', () => {
    it('Should update job site', async () => {
        mockPrisma.update = jest.fn(() => input);
        const updateJobSite = await jobSite.update({id: 1, ...input});
        expect(mockPrisma.update).toHaveBeenCalled();
        expect(updateJobSite.alternativeId).toEqual(input.alternativeId);
        expect(updateJobSite.name).toEqual(input.name);
        expect(updateJobSite.location).toEqual(input.location);
        expect(updateJobSite.isActive).toEqual(input.isActive);
    })

    it('Should not update job site on error', async () => {
        mockPrisma.update = jest.fn(() => {throw new Error("error")});
        try {
            await jobSite.update({id: 1, ...input});
            fail();
        }
        catch(error) {
            expect(mockPrisma.update).toHaveBeenCalled();
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe("error");
        }
    })
})

describe('Get JobSites by ID', () => {

    it('Should get job site by id', async () => {
        mockPrisma.findUnique = jest.fn(() => input);
        const getJobSiteById = await jobSite.findById(9999991);
        expect(mockPrisma.findUnique).toHaveBeenCalled();
        expect(getJobSiteById.alternativeId).toBeDefined();
        expect(getJobSiteById.name).toBeDefined();
        expect(getJobSiteById.location).toBeDefined();
        expect(getJobSiteById.isActive).toBeDefined();
    })
})

describe('Get JobSites by query', () => {
    it('Should get all job site', async () => {
        mockPrisma.findMany = jest.fn(() => [input]);
        const getJobSiteById = await jobSite.find({});
        expect(mockPrisma.findMany).toHaveBeenCalled();
        getJobSiteById.forEach((jobSite:any) => {
            expect(jobSite.alternativeId).toBeDefined();
            expect(jobSite.name).toBeDefined();
            expect(jobSite.location).toBeDefined();
            expect(jobSite.isActive).toBeDefined();
        })
    })
    it('Should get all job site with filter id', async () => {
        mockPrisma.findMany = jest.fn(() => []);
        const getJobSiteById = await jobSite.find({ id: 9999991 });
        expect(getJobSiteById.length).toBe(0);
        expect(mockPrisma.findMany).toHaveBeenCalled();
    })
})

describe('Delete JobSites', () => {

    it('Should delete job site by id', async () => {
        mockPrisma.delete = jest.fn(() => []);
        await jobSite.deleteById(9999991);
        expect(mockPrisma.delete).toHaveBeenCalled();
    })
    it('Should error when delete job site id not found', async () => {
        mockPrisma.delete = jest.fn(() => {throw new Error("error")});
        try {
            await jobSite.deleteById(9999991);
            fail();
        } catch (error) {
            expect(mockPrisma.delete).toHaveBeenCalled();
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe("error");
        }
    })
});