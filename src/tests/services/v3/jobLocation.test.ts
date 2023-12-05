import { JobLocationService } from '../../../services/v3/jobLocation'
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const cleanupDatabase = async () => {
    await prisma.homeOwners.deleteMany({where:{id:9999990}});
    await prisma.jobsite.deleteMany({where:{id:9999990}});
    await prisma.joblocation.deleteMany({where:{alternativeId:"jobLocationServiceCreate"}});
    await prisma.joblocation.deleteMany({where:{id:9999990}});
    await prisma.contact.deleteMany({where:{id:9999990}});
    await prisma.customer.deleteMany({where:{id:9999990}});
    await prisma.paymentterm.deleteMany({where:{id:9999990}});
    await prisma.jobCosting.deleteMany({where:{id:9999990}});
    await prisma.priceTier.deleteMany({where:{id:9999990}});
    await prisma.companyadmin.deleteMany({where:{id:9999990}});
    await prisma.company.deleteMany({where:{id:9999990}});
    await prisma.companyBlockchain.deleteMany({where:{id:9999990}});
    await prisma.companyInfo.deleteMany({where:{id:9999990}});
    await prisma.industry.deleteMany({where:{id:9999990}});
    await prisma.worktype.deleteMany({where:{id:9999990}});
    await prisma.user.deleteMany({where:{id:9999990}});
    await prisma.userAuth.deleteMany({where:{id:9999990}});
};
const createDatabase = async () => {
    await prisma.userAuth.create({
        data: {
            id: 9999990,
            email: '9999990@gmail.com',
            password: 'aaa',
            resetPasswordToken: 'aaa',
            resetPasswordExpires: new Date('2023-10-15T07:43:30.016'),
            socialId: '9999990',
            connectorType: 0
        }
    });
    await prisma.user.create({
        data: {
            id: 9999990,
            alternativeId: 'jobLocationService',
            accountType: 9999990,
            userAuthId: 9999990,
            profile: { displayName: 'aaa' },
            address: { displayName: 'aaa' },
            location: { displayName: 'aaa' },
            contact: { displayName: 'aaa' },
            permissions: { displayName: 'aaa' },
            emailPreferences: { displayName: 'aaa' },
            balance: 0,
            credit: 0,
            commission: 9999990,
            firebaseTokens: { displayName: 'aaa' },
            createdAt: new Date('2023-10-15T07:43:53.219'),
            updatedAt: new Date('2023-10-15T07:43:53.219')
        }
    });
    await prisma.worktype.create({
        data: {
            id: 9999990,
            alternativeId: 'jobLocationService',
            title: 'aaa',
            createdAt: new Date('2023-10-15T07:56:47.344')
        }
    });
    await prisma.industry.create({
        data: {
            id: 9999990,
            alternativeId: 'jobLocationService',
            title: 'aaaa',
            createdBy: 9999990,
        },
    });
    await prisma.companyInfo.create({
        data: {
            id: 9999990,
            companyName: 'aaa',
            industryId: 9999990,
            logoUrl: 'aaa',
            companyEmail: 'aaa',
            displayName: 'aaaa'
        }
    });
    await prisma.companyBlockchain.create({
        data: {
            id: 9999990,
            verified: true,
            verifiedAt: new Date('2023-10-15T07:45:35.740Z'),
            verifiedById: 9999990,
            deniedAt: new Date('2023-10-15T07:45:35.740Z'),
            deniedById: 9999990
        }
    });
    await prisma.company.create({
        data: {
            id: 9999990,
            alternativeId: 'jobLocationService',
            companyInfoId: 9999990,
            address: {
                displayName: 'aaa'
            },
            contact: {
                displayName: 'aaa'
            },
            other: {
                displayName: 'aaa'
            },
            stripeId: 'aaa',
            paid: true,
            type: 9999990,
            plan: 0,
            chargeDate: new Date('2023-10-15T07:46:22.047Z'),
            trialEndDate: new Date('2023-10-15T07:46:22.047Z'),
            maxTechnicians: 0,
            maxManagers: 0,
            maxOfficeAdmins: 0,
            maxAdmins: 0,
            userPermissions: {
                displayName: 'aaa'
            },
            currentJobId: 0,
            prefix: 'aaa',
            qbAccessToken: 'aa',
            qbRefreshToken: 'a',
            realmId: '9999990',
            qbCompanyName: 'aaa',
            qbCompanyEmail: 'aaa',
            customersSynced: true,
            customersSyncedAt: new Date('2023-10-15T07:46:22.047Z'),
            qbSync: {
                displayName: 'aaa'
            },
            socketId: 'aa',
            qbAuthorized: true,
            qbRefeshTokenExpiry: new Date('2023-10-15T07:46:22.047Z'),
            currentInvoiceId: 9999990,
            emailPreferences: {
                displayName: 'aaa'
            },
            invoicePrefix: 'aa',
            currentPOId: 0,
            currentEstimateId: 0,
            paymentTermId: null,
            balance: 0,
            credit: 0,
            commission: 0,
            commissionType: '%',
            companyBlockchainId: 9999990,
            createdAt: new Date('2023-10-15T07:46:22.047Z'),
            updatedAt: new Date('2023-10-15T07:46:22.047Z'),
            adminId: null,
            costing: {},
            employeeId: 9999990,
            itemTier: {}
        }
    });
    await prisma.companyadmin.create({
        data: {
            id: 9999990,
            alternativeId: 'jobLocationService',
            userId: 9999990,
            companyId: 9999990
        },
    });
    await prisma.priceTier.create({
        data: {
            id: 9999990,
            alternativeId: 'jobLocationService',
            companyId: 9999990,
            name: 'aaa',
            isActive: true,
            inactiveById: 9999990,
            inactiveAt: new Date('2023-10-17T04:33:42.640Z'),
            createdAt: new Date('2023-10-17T04:33:42.640Z'),
            updatedAt: new Date('2023-10-17T04:33:42.640Z'),
        },
    });
    await prisma.jobCosting.create({
        data: {
            id: 9999990,
            alternativeId: 'jobLocationService',
            companyId: 9999990,
            name: 'aaa',
            isActive: true,
            inactiveById: 9999990,
            inactiveAt: new Date('2023-10-17T04:34:41.483Z'),
            createdAt: new Date('2023-10-17T04:34:41.483Z'),
            updatedAt: new Date('2023-10-17T04:34:41.483Z'),
        },
    });
    await prisma.paymentterm.create({
        data: {
            id: 9999990,
            alternativeId: 'jobLocationService',
            name: 'aaa',
            dueDays: 9999990,
            isActive: true,
            companyId: 9999990,
            quickbookId: '9999990',
            createdById: 9999990,
            deleteAt: new Date('2023-10-17T04:36:51.105Z'),
            createdAt: new Date('2023-10-17T04:36:51.105Z'),
            updatedAt: new Date('2023-10-17T04:36:51.105Z'),
        },
    });
    await prisma.customer.create({
        data: {
            id: 9999990,
            alternativeId: 'jobLocationService',
            profile: { displayName: 'aaaa' },
            address: { displayName: 'aaaa' },
            location: { displayName: 'aaaa' },
            contact: { displayName: 'aaaa' },
            permissions: "asd",  
            emailPreferences: { displayName: 'aaaa' },
            balance: 0,
            commission: 9999990,
            isActive: true,
            info: 'aaa',
            contactName: 'aaaa',
            quickbookId: '9999990',
            credit: 0,
            itemTierId: 9999990,
            jobCostingId: 9999990,
            isCustomPrice: false,
            customPrices: { displayName: 'aaaa' },
            discountPrices: { displayName: 'aaaa' },
            paymentTermId: 9999990,
            vendorId: '9999990',
            inactiveAt: new Date('2023-10-17T04:37:04.328Z'),
            inactiveById: 9999990,
            adminId: 9999990,
            isPORequired: false,
            notes: 'aaa',
        },
    });
    await prisma.contact.create({
        data: {
            id: 9999990,
            alternativeId: 'jobLocationService',
            name: 'aaa',
            phone: 'aaa',
            email: 'aaa',
            isActive: true,
            userId: 9999990,
            createdAt: new Date('2023-10-17T04:39:31.601'),
            updatedAt: new Date('2023-10-17T04:39:31.601'),
            customerId: 9999990,
        },
    });
    await prisma.joblocation.create({
        data: {
            id: 9999990,
            alternativeId: 'jobLocationService',
            name: 'aaa',
            contacts: { displayName: 'aaaa' },
            location: { displayName: 'aaaa' },
            address: { displayName: 'aaaa' },
            jobSites: { displayName: 'aaaa' },
            isActive: true,
            customerId: 9999990,
            companyId: 9999990,
            inactiveAt: new Date('2023-10-17T04:40:35.810'),
            inactiveById: 9999990,
            quickbookId: '9999990',
            createdAt: new Date('2023-10-17T04:40:35.810'),
            updatedAt: new Date('2023-10-17T04:40:35.810'),
        },
    });
    await prisma.jobsite.create({
        data: {
            id: 9999990,
            alternativeId: 'jobLocationService',
            name: 'aaa',
            location: { displayName: 'aaaa' },
            isActive: true,
            address: { displayName: 'aaaa' },
            locationId: 9999990,
            customerId: 9999990,
        },
    });
    await prisma.homeOwners.create({
        data: {
            id: 9999990,
            alternativeId: 'jobLocationService',
            profile: { displayName: 'aaaa' },
            info: { displayName: 'aaaa' },
            contact: { displayName: 'aaaa' },
            addressId: 9999990,
        },
    });
}
beforeAll(async()=>{
    await cleanupDatabase()
    await createDatabase()
})
afterAll(async()=>{
    await cleanupDatabase()
})
const jobLocation = new JobLocationService();
describe('JobLocations', () => {
    it('Should create job location', async () => {
        const input = {
            alternativeId: "jobLocationServiceCreate",
            name: "jobLocationServiceCreate",
            contacts: {
                email: "ts@gmail.com",
                phone: "9999990",
                name: "asd"
            },
            location: {
                "long": "3434.343",
                "lat": "222.22"
            },
            address: {
                "zipCode": "123",
                "state": "asd",
                "city": "asd",
                "unit": "asd",
                "street": "asd"
            },
            jobSites: [
                9999990
            ],
            isActive: true,
            customerId: 9999990,
            companyId: 9999990,
            inactiveAt: new Date(),
            inactiveById: 9999990,
            quickbookId: "9999990",
        }
        const createJobLocation = await jobLocation.createJobLocation(input);
        expect(createJobLocation.data.alternativeId).toEqual(input.alternativeId);
        expect(createJobLocation.data.name).toEqual(input.name);
        expect(createJobLocation.data.isActive).toEqual(input.isActive);
    })
    it('Should error missing param create job location', async () => {
        const input = {
            alternativeId: "jobLocationServiceCreate",
            name: "jobLocationServiceCreate",
            contacts: {
                email: "ts@gmail.com",
                phone: "9999990",
                name: "asd"
            },
            location: {
                "long": "3434.343",
                "lat": "222.22"
            },
            address: {
                "zipCode": "123",
                "state": "asd",
                "city": "asd",
                "unit": "asd",
                "street": "asd"
            },
            jobSites: [
                9999990
            ],
            isActive: true,
            customerId: 0,
            companyId: 0,
            inactiveAt: new Date(),
            inactiveById: 0,
            quickbookId: "9999990",
        }
        try {
            await jobLocation.createJobLocation(input);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        }
    })
    it('Should error missing param create job location', async () => {
        const input = {
            alternativeId: "jobLocationServiceCreate",
            name: "jobLocationServiceCreate",
            contacts: {
                email: "ts@gmail.com",
                phone: "9999990",
                name: "asd"
            },
            location: {
                "long": undefined as any,
                "lat": undefined as any
            },
            address: {
                "zipCode": undefined as any,
                "state": undefined as any,
                "city": undefined as any,
                "unit": undefined as any,
                "street": undefined as any
            },
            jobSites: [
                9999990
            ],
            isActive: true,
            customerId: 0,
            companyId: 0,
            inactiveAt: new Date(),
            inactiveById: 0,
            quickbookId: "9999990",
        }
        try {
            await jobLocation.createJobLocation(input);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        }
    })
    it('Should update qb job location', async () => {
        const input = {
            companyId: 9999990
        }
        const updateQbJobLocation = await jobLocation.updateQbJobLocation(input.companyId);
        expect(updateQbJobLocation.status).toEqual(1);
    })
    it('Should get job location by id', async () => {
        const getJobLocation = await jobLocation.getLocationById(9999990);
        expect(getJobLocation.data).toBeDefined();
        expect(getJobLocation.status).toBeDefined();
    })
    it('Should get job location input id', async () => {
        const getJobLocation = await jobLocation.GetJobLocationFilter({
            id:9999990,
            customerId: 9999990,
            companyId: 9999990,
            isActive : true
        });
        getJobLocation.forEach((jobLocation:any) => {
            expect(jobLocation.alternativeId).toBeDefined();
            expect(jobLocation.name).toBeDefined();
            expect(jobLocation.location).toBeDefined();
            expect(jobLocation.isActive).toBeDefined();
        })
    })
    it('Should get job location input customerId & companyId', async () => {
        const getJobLocation = await jobLocation.GetJobLocationFilter({
            id:null,
            customerId: 9999990,
            companyId: 9999990,
            isActive : true
        });
        getJobLocation.forEach((jobLocation:any) => {
            expect(jobLocation.alternativeId).toBeDefined();
            expect(jobLocation.name).toBeDefined();
            expect(jobLocation.location).toBeDefined();
            expect(jobLocation.isActive).toBeDefined();
        })
    })
    it('Should get job location input homeOwnerId & companyId', async () => {
        const getJobLocation = await jobLocation.GetJobLocationFilter({
            id:null,
            customerId: null,
            companyId: 9999990,
            isActive : true
        });
        getJobLocation.forEach((jobLocation:any) => {
            expect(jobLocation.alternativeId).toBeDefined();
            expect(jobLocation.name).toBeDefined();
            expect(jobLocation.location).toBeDefined();
            expect(jobLocation.isActive).toBeDefined();
        })
    })
    it('Should get job location input customerId', async () => {
        const getJobLocation = await jobLocation.GetJobLocationFilter({
            id:null,
            customerId: 9999990,
            companyId: null,
            isActive : undefined
        });
        getJobLocation.forEach((jobLocation:any) => {
            expect(jobLocation.alternativeId).toBeDefined();
            expect(jobLocation.name).toBeDefined();
            expect(jobLocation.location).toBeDefined();
            expect(jobLocation.isActive).toBeDefined();
        })
    })
    it('Should get job location input customerId & homeOwnerId', async () => {
        const getJobLocation = await jobLocation.GetJobLocationFilter({
            id:null,
            customerId: 9999990,
            companyId: null,
            isActive : false
        });
        getJobLocation.forEach((jobLocation:any) => {
            expect(jobLocation.alternativeId).toBeDefined();
            expect(jobLocation.name).toBeDefined();
            expect(jobLocation.location).toBeDefined();
            expect(jobLocation.isActive).toBeDefined();
        })
    })
    it('Should get job location input homeOwnerId', async () => {
        const getJobLocation = await jobLocation.GetJobLocationFilter({
            id:null,
            customerId: null,
            companyId: null,
            isActive : false
        });
        getJobLocation.forEach((jobLocation:any) => {
            expect(jobLocation.alternativeId).toBeDefined();
            expect(jobLocation.name).toBeDefined();
            expect(jobLocation.location).toBeDefined();
            expect(jobLocation.isActive).toBeDefined();
        })
    })
    it('Should get job location input companyId', async () => {
        const getJobLocation = await jobLocation.GetJobLocationFilter({
            id:null,
            customerId: null,
            companyId: 9999990,
            isActive : true
        });
        getJobLocation.forEach((jobLocation:any) => {
            expect(jobLocation.alternativeId).toBeDefined();
            expect(jobLocation.name).toBeDefined();
            expect(jobLocation.location).toBeDefined();
            expect(jobLocation.isActive).toBeDefined();
        })
    })
    it('Should update job location', async () => {
        const input = {
            alternativeId: "jobLocationServiceUpdate",
            name: "jobLocationServiceUpdate",
            contacts: {
                email: "ts@gmail.com",
                phone: "9999990",
                name: "asd"
            },
            location: {
                "long": "3434.343",
                "lat": "222.22"
            },
            address: {
                "zipCode": "123",
                "state": "asd",
                "city": "asd",
                "unit": "asd",
                "street": "asd"
            },
            jobSites: [
                9999990
            ],
            isActive: true,
            customerId: 9999990,
            companyId: 9999990,
            inactiveAt: new Date(),
            inactiveById: 9999990,
            quickbookId: "9999990",
        }
        const updateJobLocation = await jobLocation.updateJobLocation(9999990, input);
        expect(updateJobLocation.data.alternativeId).toEqual(input.alternativeId);
        expect(updateJobLocation.data.name).toEqual(input.name);
        expect(updateJobLocation.data.isActive).toEqual(input.isActive);
    })
    it('Should error missing param update job location', async () => {
        const input = {
            alternativeId: "jobLocationServiceUpdate",
            name: "jobLocationServiceUpdate",
            contacts: {
                email: "ts@gmail.com",
                phone: "9999990",
                name: "asd"
            },
            location: {
                "long": "3434.343",
                "lat": "222.22"
            },
            address: {
                "zipCode": "123",
                "state": "asd",
                "city": "asd",
                "unit": "asd",
                "street": "asd"
            },
            jobSites: [
                9999990
            ],
            isActive: true,
            customerId: 0,
            companyId: 0,
            inactiveAt: new Date(),
            inactiveById: 0,
            quickbookId: "9999990",
        }
        try {
            await jobLocation.updateJobLocation(0, input);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        }
    })
    it('Should error missing param update job location', async () => {
        const input = {
            alternativeId: "jobLocationServiceUpdate",
            name: "jobLocationServiceUpdate",
            contacts: {
                email: "ts@gmail.com",
                phone: "9999990",
                name: "asd"
            },
            location: {
                "long": undefined as any,
                "lat": undefined as any
            },
            address: {
                "zipCode": undefined as any,
                "state": undefined as any,
                "city": undefined as any,
                "unit": undefined as any,
                "street": undefined as any
            },
            jobSites: [
                9999990
            ],
            isActive: true,
            customerId: 0,
            companyId: 0,
            inactiveAt: new Date(),
            inactiveById: 0,
            quickbookId: "9999990",
        }
        try {
            await jobLocation.updateJobLocation(9999990, input);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        }
    })
    it('Should delete job location by id', async () => {
        const prismaC = new PrismaClient();
        await prismaC.homeOwners.deleteMany({where:{id:9999990}});
        await prismaC.jobsite.deleteMany({where:{id:9999990}});
        await jobLocation.deleteJobLocationById(9999990);
    })
    it('Should error when delete job location id not found', async () => {
        try {
            await jobLocation.deleteJobLocationById(9999990);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Record to delete does not exist.');
        }
    })
});