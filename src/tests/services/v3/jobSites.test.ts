import { JobSiteService } from '../../../services/v3/jobSites'
import { JobSites } from '../../../models/v3/jobSites';
import { PrismaClient } from "@prisma/client";
import { JobLocations } from '../../../models/v3/jobLocations';

let myJobSiteService: JobSiteService
let mockPrisma = {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
};

let mockJobSiteModel: jest.Mocked<JobSites> & {
    create: any,
    update: any,
    findById: any,
    find: any,
    deleteById: any,
} = new JobSites(mockPrisma as any) as any;

let mockJobLocationModel: jest.Mocked<JobLocations> & {
    create: any,
    updateResetQb: any,
    updateById: any,
    findById: any,
    find: any,
    deleteById: any,
} = new JobLocations(mockPrisma as any) as any;

const input = {
    alternativeId: "jobSiteServiceCreate",
    name: "test",
    isActive: true,
    location: {
        long: "test",
        lat: "test"
    },
    address: "test",
    locationId: 9999992,
    customerId: 9999992,
    homeOwnerId: 9999992
}

beforeAll(async()=>{
    myJobSiteService = new JobSiteService()
    myJobSiteService["jobSites"] = mockJobSiteModel;
    myJobSiteService["jobLocations"] = mockJobLocationModel;
})

afterAll(async()=>{
    jest.clearAllMocks();
})

describe('Create JobSites', () => {
    it('Should create job site', async () => {
        mockJobSiteModel.create = jest.fn(() => input)
        mockJobLocationModel.findById = jest.fn(() => ({customerId: 23}))
        const createJobSite = await myJobSiteService.createJobSite(input);
        expect(createJobSite.alternativeId).toEqual(input.alternativeId);
        expect(createJobSite.name).toEqual(input.name);
        expect(createJobSite.isActive).toEqual(input.isActive);
        expect(mockJobSiteModel.create).toHaveBeenCalled();
        expect(mockJobLocationModel.findById).toHaveBeenCalled();
    })

    it('Should error missing param create job site', async () => {
        try {
            await myJobSiteService.createJobSite({
                ...input,
                locationId: undefined
            });
            fail();
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(mockJobSiteModel.create).toHaveBeenCalledTimes(0);
            expect(error.message).toEqual("Parameters are missing: locationId")
        }
    })

    it('Should error on non-existing job location', async () => {
        try {
            mockJobLocationModel.findById = jest.fn(() => null)
            await myJobSiteService.createJobSite(input);
            fail();
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(mockJobSiteModel.create).toHaveBeenCalledTimes(0);
            expect(error.message).toEqual("Subdivision not found.")
        }
    })
})

describe('Update JobSites', () => {
    it('Should update job site', async () => {
        mockJobSiteModel.update = jest.fn(() => input)
        mockJobSiteModel.findById = jest.fn(() => input)
        mockJobLocationModel.findById = jest.fn(() => ({customerId: 23}))
        const updatedJobSite = await myJobSiteService.updateJobSite({id:1, ...input});
        expect(updatedJobSite.alternativeId).toEqual(input.alternativeId);
        expect(updatedJobSite.name).toEqual(input.name);
        expect(updatedJobSite.isActive).toEqual(input.isActive);
        expect(mockJobSiteModel.update).toHaveBeenCalled();
        expect(mockJobSiteModel.findById).toHaveBeenCalled();
        expect(mockJobLocationModel.findById).toHaveBeenCalled();
    })

    it('Should error missing param create job site', async () => {
        try {
            await myJobSiteService.updateJobSite({
                id: 12,
                ...input,
                locationId: undefined
            });
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(mockJobSiteModel.update).toHaveBeenCalledTimes(0);
            expect(error.message).toEqual("Parameters are missing: locationId")
        }
    })

    it('Should error on non-existing job location', async () => {
        mockJobSiteModel.findById = jest.fn(() => input)
        try {
            mockJobLocationModel.findById = jest.fn(() => null)
            await myJobSiteService.updateJobSite({
                id: 12,
                ...input
            });
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(mockJobSiteModel.update).toHaveBeenCalledTimes(0);
            expect(error.message).toEqual("Subdivision not found.")
        }
    })

    it('Should error on non-existing job location', async () => {
        mockJobSiteModel.findById = jest.fn(() => null)
        try {
            mockJobLocationModel.findById = jest.fn(() => null)
            await myJobSiteService.updateJobSite({
                id: 12,
                ...input
            });
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(mockJobSiteModel.update).toHaveBeenCalledTimes(0);
            expect(error.message).toEqual("JobSite not found.")
        }
    })
})

describe('Get JobSites by ID', () => {

    it('Should get job site input id', async () => {
        mockJobSiteModel.find = jest.fn(() => [input]);
        const getJobSite = await myJobSiteService.getJobSite({
            id:9999992,
            customerId: 9999992,
            locationId: 9999992,
            homeOwnerId: 9999992,
            isActive : true
        });
        getJobSite.forEach((jobSite:any) => {
            expect(jobSite.alternativeId).toBeDefined();
            expect(jobSite.name).toBeDefined();
            expect(jobSite.location).toBeDefined();
            expect(jobSite.isActive).toBeDefined();
        })
        expect(mockJobSiteModel.find).toHaveBeenCalled();
    })

    it('Should get job site input customerId & locationId', async () => {
        mockJobSiteModel.find = jest.fn(() => [input]);
        const getJobSite = await myJobSiteService.getJobSite({
            id:null,
            customerId: 9999992,
            locationId: 9999992,
            homeOwnerId: 9999992,
            isActive : true
        });
        getJobSite.forEach((jobSite:any) => {
            expect(jobSite.alternativeId).toBeDefined();
            expect(jobSite.name).toBeDefined();
            expect(jobSite.location).toBeDefined();
            expect(jobSite.isActive).toBeDefined();
        })
        expect(mockJobSiteModel.find).toHaveBeenCalled();
    })

    it('Should get job site input homeOwnerId & locationId', async () => {
        mockJobSiteModel.find = jest.fn(() => [input]);
        const getJobSite = await myJobSiteService.getJobSite({
            id:null,
            customerId: null,
            locationId: 9999992,
            homeOwnerId: 9999992,
            isActive : true
        });
        getJobSite.forEach((jobSite:any) => {
            expect(jobSite.alternativeId).toBeDefined();
            expect(jobSite.name).toBeDefined();
            expect(jobSite.location).toBeDefined();
            expect(jobSite.isActive).toBeDefined();
        })
        expect(mockJobSiteModel.find).toHaveBeenCalled();
    })

    it('Should get job site input customerId', async () => {
        mockJobSiteModel.find = jest.fn(() => [input]);
        const getJobSite = await myJobSiteService.getJobSite({
            id:null,
            customerId: 9999992,
            locationId: null,
            homeOwnerId: null,
            isActive : true
        });
        getJobSite.forEach((jobSite:any) => {
            expect(jobSite.alternativeId).toBeDefined();
            expect(jobSite.name).toBeDefined();
            expect(jobSite.location).toBeDefined();
            expect(jobSite.isActive).toBeDefined();
        })
        expect(mockJobSiteModel.find).toHaveBeenCalled();
    })

    it('Should get job site input customerId & homeOwnerId', async () => {
        mockJobSiteModel.find = jest.fn(() => [input]);
        const getJobSite = await myJobSiteService.getJobSite({
            id:null,
            customerId: 9999992,
            locationId: null,
            homeOwnerId: 9999992,
            isActive : ""
        });
        getJobSite.forEach((jobSite:any) => {
            expect(jobSite.alternativeId).toBeDefined();
            expect(jobSite.name).toBeDefined();
            expect(jobSite.location).toBeDefined();
            expect(jobSite.isActive).toBeDefined();
        })
        expect(mockJobSiteModel.find).toHaveBeenCalled();
    })

    it('Should get job site input homeOwnerId', async () => {
        mockJobSiteModel.find = jest.fn(() => [input]);
        const getJobSite = await myJobSiteService.getJobSite({
            id:null,
            customerId: null,
            locationId: null,
            homeOwnerId: 9999992,
            isActive : true
        });
        getJobSite.forEach((jobSite:any) => {
            expect(jobSite.alternativeId).toBeDefined();
            expect(jobSite.name).toBeDefined();
            expect(jobSite.location).toBeDefined();
            expect(jobSite.isActive).toBeDefined();
        })
        expect(mockJobSiteModel.find).toHaveBeenCalled();
    })

    it('Should get job site input homeOwnerId', async () => {
        mockJobSiteModel.find = jest.fn(() => [input]);
        const getJobSite = await myJobSiteService.getJobSite({
            id:null,
            customerId: null,
            locationId: 9999992,
            homeOwnerId: null,
            isActive : false
        });
        getJobSite.forEach((jobSite:any) => {
            expect(jobSite.alternativeId).toBeDefined();
            expect(jobSite.name).toBeDefined();
            expect(jobSite.location).toBeDefined();
            expect(jobSite.isActive).toBeDefined();
        })
        expect(mockJobSiteModel.find).toHaveBeenCalled();
    })
})

describe('Get JobSites by ID', () => {

    it('Should delete job site by id', async () => {
        mockJobSiteModel.deleteById = jest.fn(() => {input});
        await myJobSiteService.deleteJobSite(9999992);
        expect(mockJobSiteModel.deleteById).toHaveBeenCalled();
    })
});