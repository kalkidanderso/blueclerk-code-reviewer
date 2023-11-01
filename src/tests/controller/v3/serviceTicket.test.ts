import { PrismaClient } from "@prisma/client";
import supertest from "supertest";
const app = require("../../../server");
const prisma = new PrismaClient();
const cleanupDatabase = async () => {
    await prisma.servicetickets.deleteMany({where:{id:2}});
    await prisma.emailDefault.deleteMany();
    await prisma.servicetickets.deleteMany({where:{alternativeId:"createControllerServiceTicket"}});
    await prisma.servicetickets.deleteMany({where:{alternativeId:"updateControllerServiceTicket"}});
    await prisma.companyLocation.deleteMany({where:{id:2}});
    await prisma.items.deleteMany({where:{id:2}});
    await prisma.jobType.deleteMany({where:{id:2}});
    await prisma.homeOwners.deleteMany({where:{id:2}});
    await prisma.jobsite.deleteMany({where:{id:2}});
    await prisma.joblocation.deleteMany({where:{id:2}});
    await prisma.contact.deleteMany({where:{id:2}});
    await prisma.customer.deleteMany({where:{id:2}});
    await prisma.paymentterm.deleteMany({where:{id:2}});
    await prisma.jobCosting.deleteMany({where:{id:2}});
    await prisma.priceTier.deleteMany({where:{id:2}});
    await prisma.companyadmin.deleteMany({where:{id:2}});
    await prisma.company.deleteMany({where:{id:2}});
    await prisma.companyBlockchain.deleteMany({where:{id:2}});
    await prisma.companyInfo.deleteMany({where:{id:2}});
    await prisma.industry.deleteMany({where:{id:2}});
    await prisma.worktype.deleteMany({where:{id:2}});
    await prisma.user.deleteMany({where:{id:2}});
    await prisma.userAuth.deleteMany({where:{id:2}});
};

const createDatabase = async () => {
    await prisma.userAuth.create({
        data: {
            id: 2,
            email: '2@gmail.com',
            password: 'aaa',
            resetPasswordToken: 'aaa',
            resetPasswordExpires: new Date('2023-10-15T07:43:30.016'),
            socialId: '1',
            connectorType: 0
        }
    });
    await prisma.user.create({
        data: {
            id: 2,
            alternativeId: 'controllerService',
            accountType: 2,
            userAuthId: 2,
            profile: { displayName: 'aaa' },
            address: { displayName: 'aaa' },
            location: { displayName: 'aaa' },
            contact: { displayName: 'aaa' },
            permissions: { displayName: 'aaa' },
            emailPreferences: { displayName: 'aaa' },
            balance: 0,
            credit: 0,
            commission: 2,
            firebaseTokens: { displayName: 'aaa' },
            createdAt: new Date('2023-10-15T07:43:53.219'),
            updatedAt: new Date('2023-10-15T07:43:53.219')
        }
    });
    await prisma.worktype.create({
        data: {
            id: 2,
            alternativeId: 'controllerService',
            title: 'aaa',
            createdAt: new Date('2023-10-15T07:56:47.344')
        }
    });
    await prisma.industry.create({
        data: {
            id: 2,
            alternativeId: 'controllerService',
            title: 'aaaa',
            createdBy: 2,
        },
    });
    await prisma.companyInfo.create({
        data: {
            id: 2,
            companyName: 'aaa',
            industryId: 2,
            logoUrl: 'aaa',
            companyEmail: 'aaa',
            displayName: 'aaaa'
        }
    });
    await prisma.companyBlockchain.create({
        data: {
            id: 2,
            verified: true,
            verifiedAt: new Date('2023-10-15T07:45:35.740Z'),
            verifiedById: 2,
            deniedAt: new Date('2023-10-15T07:45:35.740Z'),
            deniedById: 2
        }
    });
    await prisma.company.create({
        data: {
            id: 2,
            alternativeId: 'controllerService',
            companyInfoId: 2,
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
            type: 2,
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
            realmId: '1',
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
            currentInvoiceId: 2,
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
            companyBlockchainId: 2,
            createdAt: new Date('2023-10-15T07:46:22.047Z'),
            updatedAt: new Date('2023-10-15T07:46:22.047Z'),
            adminId: null,
            costing: {},
            employeeId: 2,
            itemTier: {}
        }
    });
    await prisma.companyadmin.create({
        data: {
            id: 2,
            alternativeId: 'controllerService',
            userId: 2,
            companyId:2
        },
    });
    await prisma.priceTier.create({
        data: {
            id: 2,
            alternativeId: 'controllerService',
            companyId: 2,
            name: 'aaa',
            isActive: true,
            inactiveById: 2,
            inactiveAt: new Date('2023-10-17T04:33:42.640Z'),
            createdAt: new Date('2023-10-17T04:33:42.640Z'),
            updatedAt: new Date('2023-10-17T04:33:42.640Z'),
        },
    });
    await prisma.jobCosting.create({
        data: {
            id: 2,
            alternativeId: 'controllerService',
            companyId: 2,
            name: 'aaa',
            isActive: true,
            inactiveById: 2,
            inactiveAt: new Date('2023-10-17T04:34:41.483Z'),
            createdAt: new Date('2023-10-17T04:34:41.483Z'),
            updatedAt: new Date('2023-10-17T04:34:41.483Z'),
        },
    });
    await prisma.paymentterm.create({
        data: {
            id: 2,
            alternativeId: 'controllerService',
            name: 'aaa',
            dueDays: 2,
            isActive: true,
            companyId: 2,
            quickbookId: '1',
            createdById: 2,
            deleteAt: new Date('2023-10-17T04:36:51.105Z'),
            createdAt: new Date('2023-10-17T04:36:51.105Z'),
            updatedAt: new Date('2023-10-17T04:36:51.105Z'),
        },
    });
    await prisma.customer.create({
        data: {
            id: 2,
            alternativeId: 'controllerService',
            profile: { displayName: 'aaaa' },
            address: { displayName: 'aaaa' },
            location: { displayName: 'aaaa' },
            contact: { displayName: 'aaaa' },
            permissions: "asd",  
            emailPreferences: { displayName: 'aaaa' },
            balance: 0,
            commission: 2,
            isActive: true,
            info: 'aaa',
            contactName: 'aaaa',
            quickbookId: '1',
            credit: 0,
            itemTierId: 2,
            jobCostingId: 2,
            isCustomPrice: false,
            customPrices: { displayName: 'aaaa' },
            discountPrices: { displayName: 'aaaa' },
            paymentTermId: 2,
            vendorId: '1',
            inactiveAt: new Date('2023-10-17T04:37:04.328Z'),
            inactiveById: 2,
            adminId: 2,
            isPORequired: false,
            notes: 'aaa',
        },
    });
    await prisma.contact.create({
        data: {
            id: 2,
            alternativeId: 'controllerService',
            name: 'aaa',
            phone: 'aaa',
            email: 'aaa',
            isActive: true,
            userId: 2,
            createdAt: new Date('2023-10-17T04:39:31.601'),
            updatedAt: new Date('2023-10-17T04:39:31.601'),
            customerId: 2,
        },
    });
    await prisma.joblocation.create({
        data: {
            id: 2,
            alternativeId: 'controllerService',
            name: 'aaa',
            contacts: { displayName: 'aaaa' },
            location: { displayName: 'aaaa' },
            address: { displayName: 'aaaa' },
            jobSites: { displayName: 'aaaa' },
            isActive: true,
            customerId: 2,
            companyId: 2,
            inactiveAt: new Date('2023-10-17T04:40:35.810'),
            inactiveById: 2,
            quickbookId: '1',
            createdAt: new Date('2023-10-17T04:40:35.810'),
            updatedAt: new Date('2023-10-17T04:40:35.810'),
        },
    });
    await prisma.jobsite.create({
        data: {
            id: 2,
            alternativeId: 'controllerService',
            name: 'aaa',
            location: { displayName: 'aaaa' },
            isActive: true,
            address: { displayName: 'aaaa' },
            locationId: 2,
            customerId: 2,
        },
    });
    await prisma.homeOwners.create({
        data: {
            id: 2,
            alternativeId: 'controllerService',
            profile: { displayName: 'aaaa' },
            info: { displayName: 'aaaa' },
            contact: { displayName: 'aaaa' },
            subdivisionId: 2,
            addressId: 2,
        },
    });
    await prisma.jobType.create({
        data: {
            id: 2,
            alternativeId: 'controllerService',
            title: 'aa',
            description: 'aa',
            sku: 'aa',
            industryId: 2,
            createdBy: 2,
            isActive: true,
            quickbookId: '1',
            createdAt: new Date('2023-10-17T04:44:24.407'),
            updatedAt: new Date('2023-10-17T04:44:24.407'),
        },
    });
    await prisma.items.create({
        data: {
            id: 2,
            name: 'aaa',
            description: 'aaaa',
            sku: 'aaa',
            isFixed: true,
            charges: 2,
            tax: 2,
            isDiscountItem: true,
            isJobType: true,
            jobTypeId: 2,
            itemType: 'Service',
            productCost: 2,
            salePrice: 2,
            companyId: 2,
            isActive: true,
            quickbookId: '1',
            createdAt: true,
            updatedAt: true,
        },
    });
    await prisma.companyLocation.create({
        data: {
            id: 2,
            alternativeId: 'controllerService',
            name: 'aaaa',
            isActive: true,
            isMainLocation: true,
            contactName: 'aaa',
            info: { displayName: 'aaaa' },
            address: { displayName: 'aaaa' },
            isAddressAsBillingAddress: false,
            billingAddress: { displayName: 'aaaa' },
            contact: { displayName: 'aaaa' },
            companyId: 2,
            poRequestEmailSender: 'aaaa',
        },
    });
    await prisma.servicetickets.create({
        data: {
            id: 2,
            alternativeId: 'controllerService',
            createdAt: new Date('2023-10-17T04:47:55.602'),
            dueDate: new Date('2023-10-17T04:47:55.602'),
            customerId: 2,
            createdById: 2,
            note: 'aaa',
            customerContactId: 2,
            customerPO: 'aa',
            image: 'aaa',
            images: { displayName: 'aaaa' },
            companyId: 2,
            technicianId: 2,
            status: 0,
            track: { displayName: 'aaaa' },
            editedById: 2,
            editedAt: new Date('2023-10-17T04:47:55.602'),
            ticketId: '1',
            jobLocationId: 2,
            jobSiteId: 2,
            bouncedEmailFlag: false,
            isHomeOccupied: false,
            homeOwnerId: 2,
            homeJobLocationId: 2,
            homeJobSiteId: 2,
            jobTypeId: 2,
            itemId: 2,
            jobCreated: false,
            source: 'blueclerk',
            workTypeId: 2,
            companyLocationId: 2,
            pooverriddenById: 2,
            type: 'Ticket',
            emailHistory: { displayName: 'aaaa' },
            lastEmailSent: new Date('2023-10-17T04:47:55.602'),
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

let serviceTicketId = 0

describe('Create /api/v3/service-ticket', () => {
    it('should create a new service ticket', async () => {
        const response = await supertest(app)
            .post('/api/v3/service-tickets')
            .send({
                "userId": 2,
                "alternativeId": "createControllerServiceTicket",
                "dueDate": "2023-10-16T17:27:35.576Z",
                "customerId": 2,
                note: "string",
                customerContactId: 2,
                customerPO: "string",
                image: "string",
                images: [
                    "string"
                ],
                companyId: 2,
                technicianId: 2,
                status: 0,
                ticketId: "string",
                jobLocationId: 2,
                jobSiteId: 2,
                isHomeOccupied: true,
                homeOwnerId: 2,
                homeJobLocationId: 2,
                homeJobSiteId: 2,
                jobTypeId: 2,
                itemId: 2,
                jobCreated: true,
                source: "string",
                workTypeId: 2,
                companyLocationId: 2,
                pooverriddenById: 2,
                type: "Ticket",
                emailHistory: [
                    "string"
                ],
                bouncedEmailFlag: true
            })
            .set('Accept', 'application/json')
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            serviceTicketId = response.body.data.id
    });

    it('should error create a new service ticket with same alternativeId', async () => {
        const response = await supertest(app)
            .post('/api/v3/service-tickets')
            .set('accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send({
                userId: 3,
                alternativeId: "createControllerServiceTicket",
                dueDate: "2023-10-16T17:27:35.576Z",
                customerId: 2,
                note: "string",
                customerContactId: 3,
                customerPO: "string",
                image: "string",
                images: [
                    "string"
                ],
                companyId: 3,
                technicianId: 3,
                status: 0,
                ticketId: "string",
                jobLocationId: 3,
                jobSiteId: 3,
                isHomeOccupied: true,
                homeOwnerId: 3,
                homeJobLocationId: 3,
                homeJobSiteId: 3,
                jobTypeId: 3,
                itemId: 3,
                jobCreated: true,
                source: "string",
                workTypeId: 2,
                companyLocationId: 2,
                pooverriddenById: 2,
                type: "Ticket",
                emailHistory: [
                    "string"
                ],
                bouncedEmailFlag: true
            });
            expect(response.status).toBe(500);
    });
});

describe('Get /api/v3/service-tickets/po-request-email-template/:id', () => {
    it('should get service ticket po request email', async () => {
        const response = await supertest(app)
            .get(`/api/v3/service-tickets/po-request-email-template/${serviceTicketId}`)
            .set('accept', 'application/json')
            .set('Content-Type', 'application/json')
        expect(response.status).toBe(200);
    });

    it('should return error', async () => {
        const response = await supertest(app)
            .get(`/api/v3/service-tickets/po-request-email-template/asd`)
            .set('accept', 'application/json')
            .set('Content-Type', 'application/json')
        expect(response.status).toBe(422);
    });

    it('should return error wrong id', async () => {
        const response = await supertest(app)
            .get(`/api/v3/service-tickets/po-request-email-template/9999999`)
            .set('accept', 'application/json')
            .set('Content-Type', 'application/json')
        expect(response.status).toBe(500);
    });
});

describe('GET /api/v3/service-tickets', () => {
    it('should return a 200 status code and JSON response', async () => {
        const response = await supertest(app)
            .get('/api/v3/service-tickets?type=Ticket&currentPage=0&pageSize=30')
            .set('accept', 'application/json');
    
        expect(response.status).toBe(200);
        expect(response.header['content-type']).toMatch(/json/);
    });

    it('should return error when wrong query', async () => {
        const response = await supertest(app)
            .get('/api/v3/service-tickets?type=Tasicket&currentPage=-30&pageSize=30')
            .set('accept', 'application/json');
    
            expect(response.status).toBe(422);
    });

    it('should return error when wrong query add next & prev cursor', async () => {
        const response = await supertest(app)
            .get('/api/v3/service-tickets?type=Ticket&currentPage=0&pageSize=30&nextCursor=11&previousCursor=22')
            .set('accept', 'application/json');
    
            expect(response.status).toBe(500);
    });
});

describe('GET /api/v3/service-tickets/:id', () => {
    it('should return a 200 status code and JSON response', async () => {
        const response = await supertest(app)
            .get(`/api/v3/service-tickets/${serviceTicketId}`)
            expect(response.status).toBe(200);
    });

    it('should return error when wrong query', async () => {
        const response = await supertest(app)
            .get(`/api/v3/service-tickets/${serviceTicketId}?companyId=asd`)
            .set('accept', 'application/json');
    
            expect(response.status).toBe(422);
    });

    it('should return error when id wrong', async () => {
        const response = await supertest(app)
            .get('/api/v3/service-tickets/99999999999')
            expect(response.status).toBe(500);
    });
});

describe('Update put /api/v3/service-tickets/:id', () => {
    it('should update a service ticket', async () => {
        const response = await supertest(app)
            .put(`/api/v3/service-tickets/${serviceTicketId}`)
            .set('accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send({
            userId: 2,
            alternativeId: "updateControllerServiceTicket",
            dueDate: "2023-10-16T17:37:36.328Z",
            customerId: 2,
            note: "string",
            customerContactId: 2,
            customerPO: "string",
            image: "string",
            images: [
                "string"
            ],
            companyId: 2,
            technicianId: 2,
            status: 2,
            editedAt: "2023-10-16T17:37:36.328Z",
            ticketId: "1",
            jobLocationId: 2,
            jobSiteId: 2,
            isHomeOccupied: true,
            homeOwnerId: 2,
            homeJobLocationId: 2,
            homeJobSiteId: 2,
            jobTypeId: 2,
            itemId: 2,
            jobCreated: true,
            source: "string",
            workTypeId: 2,
            companyLocationId: 2,
            pooverriddenById: 2,
            type: "Ticket",
            emailHistory: [
                "string"
            ],
            bouncedEmailFlag: true
        });
        expect(response.status).toBe(200);
    });

    it('should return error when wrong data for update', async () => {
        const response = await supertest(app)
        .put(`/api/v3/service-tickets/${serviceTicketId}`)
        .set('accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({
        });

        expect(response.status).toBe(422);
    });

    it('should return error when wrong id', async () => {
        const response = await supertest(app)
            .put(`/api/v3/service-tickets/99999999`)
            .set('accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send({
            userId: 2,
            alternativeId: "updateControllerServiceTicket",
            dueDate: "2023-10-16T17:37:36.328Z",
            customerId: 2,
            note: "string",
            customerContactId: 2,
            customerPO: "string",
            image: "string",
            images: [
                "string"
            ],
            companyId: 2,
            technicianId: 2,
            status: 2,
            editedAt: "2023-10-16T17:37:36.328Z",
            ticketId: "1",
            jobLocationId: 2,
            jobSiteId: 2,
            isHomeOccupied: true,
            homeOwnerId: 2,
            homeJobLocationId: 2,
            homeJobSiteId: 2,
            jobTypeId: 2,
            itemId: 2,
            jobCreated: true,
            source: "string",
            workTypeId: 2,
            companyLocationId: 2,
            pooverriddenById: 2,
            type: "Ticket",
            emailHistory: [
                "string"
            ],
            bouncedEmailFlag: true
        });
        expect(response.status).toBe(500);
    });
});

describe('Update patch /api/v3/service-tickets/:id', () => {
    it('should update service ticket status', async () => {
        const response = await supertest(app)
            .patch(`/api/v3/service-tickets/${serviceTicketId}`)
            .set('accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send({
                    status: 0
            });
        expect(response.status).toBe(200);
    });

    it('should return error when status is invalid', async () => {
        const response = await supertest(app)
            .patch(`/api/v3/service-tickets/${serviceTicketId}`)
            .set('accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send({
            status: 'invalid_status'
            });
        expect(response.status).toBe(422);
    });

    it('should return error when status is invalid', async () => {
        const response = await supertest(app)
            .patch(`/api/v3/service-tickets/9999999999`)
            .set('accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send({
                status: 0
            });
        expect(response.status).toBe(500);
    });
});

describe('delete /api/v3/service-tickets/:id', () => {
    it('should delete service ticket status', async () => {
        const response = await supertest(app)
            .delete(`/api/v3/service-tickets/${serviceTicketId}`)
            .set('accept', 'application/json')
            .set('Content-Type', 'application/json')
        expect(response.status).toBe(200);
    });

    it('should return error when id wrong', async () => {
        const response = await supertest(app)
            .delete(`/api/v3/service-tickets/23333`)
            .set('accept', 'application/json')
            .set('Content-Type', 'application/json')
        expect(response.status).toBe(500);
    });
});