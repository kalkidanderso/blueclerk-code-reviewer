import { JobLocations } from '../../../models/v3/jobLocations'
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const cleanupDatabase = async () => {
    await prisma.homeOwners.deleteMany({where:{id:9999993}});
    await prisma.jobsite.deleteMany({where:{id:9999993}});
    await prisma.joblocation.deleteMany({where:{alternativeId:"jobLocationModelCreate"}});
    await prisma.joblocation.deleteMany({where:{id:9999993}});
    await prisma.contact.deleteMany({where:{id:9999993}});
    await prisma.customer.deleteMany({where:{id:9999993}});
    await prisma.paymentterm.deleteMany({where:{id:9999993}});
    await prisma.jobCosting.deleteMany({where:{id:9999993}});
    await prisma.priceTier.deleteMany({where:{id:9999993}});
    await prisma.companyadmin.deleteMany({where:{id:9999993}});
    await prisma.company.deleteMany({where:{id:9999993}});
    await prisma.companyBlockchain.deleteMany({where:{id:9999993}});
    await prisma.companyInfo.deleteMany({where:{id:9999993}});
    await prisma.industry.deleteMany({where:{id:9999993}});
    await prisma.worktype.deleteMany({where:{id:9999993}});
    await prisma.user.deleteMany({where:{id:9999993}});
    await prisma.userAuth.deleteMany({where:{id:9999993}});
};
const createDatabase = async () => {
    await prisma.userAuth.create({
        data: {
            id: 9999993,
            email: '9999993@gmail.com',
            password: 'aaa',
            resetPasswordToken: 'aaa',
            resetPasswordExpires: new Date('2023-10-15T07:43:30.016'),
            socialId: '9999993',
            connectorType: 0
        }
    });
    await prisma.user.create({
        data: {
            id: 9999993,
            alternativeId: 'jobLocationModel',
            accountType: 9999993,
            userAuthId: 9999993,
            profile: { displayName: 'aaa' },
            address: { displayName: 'aaa' },
            location: { displayName: 'aaa' },
            contact: { displayName: 'aaa' },
            permissions: { displayName: 'aaa' },
            emailPreferences: { displayName: 'aaa' },
            balance: 0,
            credit: 0,
            commission: 9999993,
            firebaseTokens: { displayName: 'aaa' },
            createdAt: new Date('2023-10-15T07:43:53.219'),
            updatedAt: new Date('2023-10-15T07:43:53.219')
        }
    });
    await prisma.worktype.create({
        data: {
            id: 9999993,
            alternativeId: 'jobLocationModel',
            title: 'aaa',
            createdAt: new Date('2023-10-15T07:56:47.344')
        }
    });
    await prisma.industry.create({
        data: {
            id: 9999993,
            alternativeId: 'jobLocationModel',
            title: 'aaaa',
            createdBy: 9999993,
        },
    });
    await prisma.companyInfo.create({
        data: {
            id: 9999993,
            companyName: 'aaa',
            industryId: 9999993,
            logoUrl: 'aaa',
            companyEmail: 'aaa',
            displayName: 'aaaa'
        }
    });
    await prisma.companyBlockchain.create({
        data: {
            id: 9999993,
            verified: true,
            verifiedAt: new Date('2023-10-15T07:45:35.740Z'),
            verifiedById: 9999993,
            deniedAt: new Date('2023-10-15T07:45:35.740Z'),
            deniedById: 9999993
        }
    });
    await prisma.company.create({
        data: {
            id: 9999993,
            alternativeId: 'jobLocationModel',
            companyInfoId: 9999993,
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
            type: 9999993,
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
            realmId: '9999993',
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
            currentInvoiceId: 9999993,
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
            companyBlockchainId: 9999993,
            createdAt: new Date('2023-10-15T07:46:22.047Z'),
            updatedAt: new Date('2023-10-15T07:46:22.047Z'),
            adminId: null,
            costing: {},
            employeeId: 9999993,
            itemTier: {}
        }
    });
    await prisma.companyadmin.create({
        data: {
            id: 9999993,
            alternativeId: 'jobLocationModel',
            userId: 9999993,
            companyId: 9999993
        },
    });
    await prisma.priceTier.create({
        data: {
            id: 9999993,
            alternativeId: 'jobLocationModel',
            companyId: 9999993,
            name: 'aaa',
            isActive: true,
            inactiveById: 9999993,
            inactiveAt: new Date('2023-10-17T04:33:42.640Z'),
            createdAt: new Date('2023-10-17T04:33:42.640Z'),
            updatedAt: new Date('2023-10-17T04:33:42.640Z'),
        },
    });
    await prisma.jobCosting.create({
        data: {
            id: 9999993,
            alternativeId: 'jobLocationModel',
            companyId: 9999993,
            name: 'aaa',
            isActive: true,
            inactiveById: 9999993,
            inactiveAt: new Date('2023-10-17T04:34:41.483Z'),
            createdAt: new Date('2023-10-17T04:34:41.483Z'),
            updatedAt: new Date('2023-10-17T04:34:41.483Z'),
        },
    });
    await prisma.paymentterm.create({
        data: {
            id: 9999993,
            alternativeId: 'jobLocationModel',
            name: 'aaa',
            dueDays: 9999993,
            isActive: true,
            companyId: 9999993,
            quickbookId: '9999993',
            createdById: 9999993,
            deleteAt: new Date('2023-10-17T04:36:51.105Z'),
            createdAt: new Date('2023-10-17T04:36:51.105Z'),
            updatedAt: new Date('2023-10-17T04:36:51.105Z'),
        },
    });
    await prisma.customer.create({
        data: {
            id: 9999993,
            alternativeId: 'jobLocationModel',
            profile: { displayName: 'aaaa' },
            address: { displayName: 'aaaa' },
            location: { displayName: 'aaaa' },
            contact: { displayName: 'aaaa' },
            permissions: "asd",  
            emailPreferences: { displayName: 'aaaa' },
            balance: 0,
            commission: 9999993,
            isActive: true,
            info: 'aaa',
            contactName: 'aaaa',
            quickbookId: '9999993',
            credit: 0,
            itemTierId: 9999993,
            jobCostingId: 9999993,
            isCustomPrice: false,
            customPrices: { displayName: 'aaaa' },
            discountPrices: { displayName: 'aaaa' },
            paymentTermId: 9999993,
            vendorId: '9999993',
            inactiveAt: new Date('2023-10-17T04:37:04.328Z'),
            inactiveById: 9999993,
            adminId: 9999993,
            isPORequired: false,
            notes: 'aaa',
        },
    });
    await prisma.contact.create({
        data: {
            id: 9999993,
            alternativeId: 'jobLocationModel',
            name: 'aaa',
            phone: 'aaa',
            email: 'aaa',
            isActive: true,
            userId: 9999993,
            createdAt: new Date('2023-10-17T04:39:31.601'),
            updatedAt: new Date('2023-10-17T04:39:31.601'),
            customerId: 9999993,
        },
    });
    await prisma.joblocation.create({
        data: {
            id: 9999993,
            alternativeId: 'jobLocationModel',
            name: 'aaa',
            contacts: { displayName: 'aaaa' },
            location: { displayName: 'aaaa' },
            address: { displayName: 'aaaa' },
            jobSites: { displayName: 'aaaa' },
            isActive: true,
            customerId: 9999993,
            companyId: 9999993,
            inactiveAt: new Date('2023-10-17T04:40:35.810'),
            inactiveById: 9999993,
            quickbookId: '9999993',
            createdAt: new Date('2023-10-17T04:40:35.810'),
            updatedAt: new Date('2023-10-17T04:40:35.810'),
        },
    });
    await prisma.jobsite.create({
        data: {
            id: 9999993,
            alternativeId: 'jobLocationModel',
            name: 'aaa',
            location: { displayName: 'aaaa' },
            isActive: true,
            address: { displayName: 'aaaa' },
            locationId: 9999993,
            customerId: 9999993,
        },
    });
    await prisma.homeOwners.create({
        data: {
            id: 9999993,
            alternativeId: 'jobLocationModel',
            profile: { displayName: 'aaaa' },
            info: { displayName: 'aaaa' },
            contact: { displayName: 'aaaa' },
            addressId: 9999993,
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
const jobLocation = new JobLocations(prisma.joblocation);
describe('JobLocations', () => {
    it('Should update job location by id', async () => {
        const input = {
            alternativeId: "jobLocationModelsUpdate",
            name: "jobLocationModelsUpdate",
            contacts: {
                email: "ts@gmail.com",
                phone: "9999993",
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
                9999993
            ],
            isActive: true,
            customerId: 9999993,
            companyId: 9999993,
            inactiveAt: new Date(),
            inactiveById: 9999993,
            quickbookId: "9999993",
        }
        const updateJobLocationById = await jobLocation.update({id: 9999993, data: input});
        expect(updateJobLocationById.id).toBeDefined();
    })
})