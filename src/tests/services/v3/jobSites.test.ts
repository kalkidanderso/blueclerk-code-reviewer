import { JobSiteService } from '../../../services/v3/jobSites'
import { JobSites } from '../../../models/v3/jobSites';
import { PrismaClient } from "@prisma/client";
// import { IServiceTicketInput, ICreateServiceTicketInput, IUpdateServiceTicketInput } from "../../../types/v3/jobSites"
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
    updateResetQb: any,
    updateById: any,
    findById: any,
    find: any,
    deleteById: any,
} = new JobSites(mockPrisma as any) as any;

beforeAll(async()=>{
    myJobSiteService = new JobSiteService()
    myJobSiteService["jobSites"] = mockJobSiteModel;
})
afterAll(async()=>{
    jest.clearAllMocks();
})
const jobSite = new JobSiteService();
describe('JobSites', () => {
    it('Should create job site', async () => {
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
        const createJobSite = await jobSite.createJobSite(input);
        expect(createJobSite.alternativeId).toEqual(input.alternativeId);
        expect(createJobSite.name).toEqual(input.name);
        expect(createJobSite.location).toEqual("{\"coordinates\":[\"test\",\"test\"]}");
        expect(createJobSite.isActive).toEqual(input.isActive);
    })
    it('Should error missing param create job site', async () => {
        const input = {
            alternativeId: "jobSiteServiceCreate",
            name: "test",
            isActive: true,
            location: {
                long: "test",
                lat: "test"
            },
            address: "test",
            locationId: 0,
            customerId: 9999992,
            homeOwnerId: 9999992
        }
        try {
            await jobSite.createJobSite(input);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        }
    })
    it('Should error create job site', async () => {
        const input = {
            alternativeId: "jobSiteServiceCreate",
            name: "test",
            isActive: true,
            location: {
                long: "test",
                lat: "test"
            },
            address: "test",
            locationId: 999999092,
            customerId: 9999992,
            homeOwnerId: 9999992
        }
        try {
            await jobSite.createJobSite(input);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        }
    })
    it('Should get job site input id', async () => {
        const getJobSite = await jobSite.getJobSite({
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
    })
    it('Should get job site input customerId & locationId', async () => {
        const getJobSite = await jobSite.getJobSite({
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
    })
    it('Should get job site input homeOwnerId & locationId', async () => {
        const getJobSite = await jobSite.getJobSite({
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
    })
    it('Should get job site input customerId', async () => {
        const getJobSite = await jobSite.getJobSite({
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
    })
    it('Should get job site input customerId & homeOwnerId', async () => {
        const getJobSite = await jobSite.getJobSite({
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
    })
    it('Should get job site input homeOwnerId', async () => {
        const getJobSite = await jobSite.getJobSite({
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
    })
    it('Should get job site input homeOwnerId', async () => {
        const getJobSite = await jobSite.getJobSite({
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
    })
    it('Should update job site by id', async () => {
        const input = {
            id: 9999992,
            alternativeId: "jobSiteServiceCreate" ,
            name: "asd",
            isActive: true,
            location: {
                long: "asd",
                lat: "asd"
            },
            address: "asd",
            locationId: 9999992,
            customerId: 9999992,
            homeOwnerId: 9999992
        }
        await jobSite.updateJobSite(input);
    })
    it('Should error missing param update job site', async () => {
        const input = {
            id: 9999992,
            alternativeId: "jobSiteServiceCreate",
            name: "test",
            isActive: true,
            location: {
                long: "test",
                lat: "test"
            },
            address: "test",
            locationId: 0,
            customerId: 9999992,
            homeOwnerId: 9999992
        }
        try {
            await jobSite.updateJobSite(input);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        }
    })
    it('Should error update job site', async () => {
        const input = {
            id: 9999992,
            alternativeId: "jobSiteServiceCreate",
            name: "test",
            isActive: true,
            location: {
                long: "test",
                lat: "test"
            },
            address: "test",
            locationId: 999999092,
            customerId: 9999992,
            homeOwnerId: 9999992
        }
        try {
            await jobSite.updateJobSite(input);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        }
    })
    it('Should error update job site when wrong id', async () => {
        const input = {
            id: 999999092,
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
        try {
            await jobSite.updateJobSite(input);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        }
    })
    it('Should delete job site by id', async () => {
        const prismaC = new PrismaClient();
        await prismaC.homeOwners.deleteMany({where:{id:9999992}});
        await jobSite.deleteJobSite(9999992);
    })
    // it('Should error when delete job site id not found', async () => {
    //     try {
    //         await jobSite.deleteById(9999992);
    //     } catch (error) {
    //         expect(error).toBeInstanceOf(Error);
    //         expect(error.message).toContain('Record to delete does not exist.');
    //     }
    // })
});