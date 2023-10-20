import { ServiceTicketsService } from '../../../services/v3/serviceTickets'
import { IServiceTicketInput, ICreateServiceTicketInput, IUpdateServiceTicketInput } from "../../../types/v3/serviceTickets"
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const cleanupDatabase = async () => {
    await prisma.servicetickets.deleteMany({where:{id:4}});
    await prisma.emailDefault.deleteMany();
    await prisma.servicetickets.deleteMany({where:{alternativeId:"99999"}});
    await prisma.companyLocation.deleteMany({where:{id:4}});
    await prisma.items.deleteMany({where:{id:4}});
    await prisma.jobType.deleteMany({where:{id:4}});
    await prisma.homeOwners.deleteMany({where:{id:4}});
    await prisma.jobsite.deleteMany({where:{id:4}});
    await prisma.joblocation.deleteMany({where:{id:4}});
    await prisma.contact.deleteMany({where:{id:4}});
    await prisma.customer.deleteMany({where:{id:4}});
    await prisma.paymentterm.deleteMany({where:{id:4}});
    await prisma.jobCosting.deleteMany({where:{id:4}});
    await prisma.priceTier.deleteMany({where:{id:4}});
    await prisma.companyadmin.deleteMany({where:{id:4}});
    await prisma.company.deleteMany({where:{id:4}});
    await prisma.companyBlockchain.deleteMany({where:{id:4}});
    await prisma.companyInfo.deleteMany({where:{id:4}});
    await prisma.industry.deleteMany({where:{id:4}});
    await prisma.worktype.deleteMany({where:{id:4}});
    await prisma.user.deleteMany({where:{id:4}});
    await prisma.userAuth.deleteMany({where:{id:4}});
};

const createDatabase = async () => {
    await prisma.userAuth.create({
        data: {
            id: 4,
            email: '4@gmail.com',
            password: 'aaa',
            resetPasswordToken: 'aaa',
            resetPasswordExpires: new Date('2023-10-15T07:43:30.016'),
            socialId: '1',
            connectorType: 0
        }
    });
    await prisma.user.create({
        data: {
            id: 4,
            alternativeId: 'serviceTicketServices',
            accountType: 4,
            userAuthId: 4,
            profile: { displayName: 'aaa' },
            address: { displayName: 'aaa' },
            location: { displayName: 'aaa' },
            contact: { displayName: 'aaa' },
            permissions: { displayName: 'aaa' },
            emailPreferences: { displayName: 'aaa' },
            balance: 0,
            credit: 0,
            commission: 4,
            firebaseTokens: { displayName: 'aaa' },
            createdAt: new Date('2023-10-15T07:43:53.219'),
            updatedAt: new Date('2023-10-15T07:43:53.219')
        }
    });
    await prisma.worktype.create({
        data: {
            id: 4,
            alternativeId: 'serviceTicketServices',
            title: 'aaa',
            createdAt: new Date('2023-10-15T07:56:47.344')
        }
    });
    await prisma.industry.create({
        data: {
            id: 4,
            alternativeId: 'serviceTicketServices',
            title: 'aaaa',
            createdBy: 4,
        },
    });
    await prisma.companyInfo.create({
        data: {
            id: 4,
            companyName: 'aaa',
            industryId: 4,
            logoUrl: 'aaa',
            companyEmail: 'aaa',
            displayName: 'aaaa'
        }
    });
    await prisma.companyBlockchain.create({
        data: {
            id: 4,
            verified: true,
            verifiedAt: new Date('2023-10-15T07:45:35.740Z'),
            verifiedById: 4,
            deniedAt: new Date('2023-10-15T07:45:35.740Z'),
            deniedById: 4
        }
    });
    await prisma.company.create({
        data: {
            id: 4,
            alternativeId: 'serviceTicketServices',
            companyInfoId: 4,
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
            type: 4,
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
            currentInvoiceId: 4,
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
            companyBlockchainId: 4,
            createdAt: new Date('2023-10-15T07:46:22.047Z'),
            updatedAt: new Date('2023-10-15T07:46:22.047Z'),
            adminId: null,
            costing: {},
            employeeId: 4,
            itemTier: {}
        }
    });
    await prisma.companyadmin.create({
        data: {
            id: 4,
            alternativeId: 'serviceTicketServices',
            userId: 4,
            companyId: 4
        },
    });
    await prisma.priceTier.create({
        data: {
            id: 4,
            alternativeId: 'serviceTicketServices',
            companyId: 4,
            name: 'aaa',
            isActive: true,
            inactiveById: 4,
            inactiveAt: new Date('2023-10-17T04:33:42.640Z'),
            createdAt: new Date('2023-10-17T04:33:42.640Z'),
            updatedAt: new Date('2023-10-17T04:33:42.640Z'),
        },
    });
    await prisma.jobCosting.create({
        data: {
            id: 4,
            alternativeId: 'serviceTicketServices',
            companyId: 4,
            name: 'aaa',
            isActive: true,
            inactiveById: 4,
            inactiveAt: new Date('2023-10-17T04:34:41.483Z'),
            createdAt: new Date('2023-10-17T04:34:41.483Z'),
            updatedAt: new Date('2023-10-17T04:34:41.483Z'),
        },
    });
    await prisma.paymentterm.create({
        data: {
            id: 4,
            alternativeId: 'serviceTicketServices',
            name: 'aaa',
            dueDays: 4,
            isActive: true,
            companyId: 4,
            quickbookId: '1',
            createdById: 4,
            deleteAt: new Date('2023-10-17T04:36:51.105Z'),
            createdAt: new Date('2023-10-17T04:36:51.105Z'),
            updatedAt: new Date('2023-10-17T04:36:51.105Z'),
        },
    });
    await prisma.customer.create({
        data: {
            id: 4,
            alternativeId: 'serviceTicketServices',
            profile: { displayName: 'aaaa' },
            address: { displayName: 'aaaa' },
            location: { displayName: 'aaaa' },
            contact: { displayName: 'aaaa' },
            permissions: "asd",  
            emailPreferences: { displayName: 'aaaa' },
            balance: 0,
            commission: 4,
            isActive: true,
            info: 'aaa',
            contactName: 'aaaa',
            quickbookId: '1',
            credit: 0,
            itemTierId: 4,
            jobCostingId: 4,
            isCustomPrice: false,
            customPrices: { displayName: 'aaaa' },
            discountPrices: { displayName: 'aaaa' },
            paymentTermId: 4,
            vendorId: '1',
            inactiveAt: new Date('2023-10-17T04:37:04.328Z'),
            inactiveById: 4,
            adminId: 4,
            isPORequired: false,
            notes: 'aaa',
        },
    });
    await prisma.contact.create({
        data: {
            id: 4,
            alternativeId: 'serviceTicketServices',
            name: 'aaa',
            phone: 'aaa',
            email: 'aaa',
            isActive: true,
            userId: 4,
            createdAt: new Date('2023-10-17T04:39:31.601'),
            updatedAt: new Date('2023-10-17T04:39:31.601'),
            customerId: 4,
        },
    });
    await prisma.joblocation.create({
        data: {
            id: 4,
            alternativeId: 'serviceTicketServices',
            name: 'aaa',
            contacts: { displayName: 'aaaa' },
            location: { displayName: 'aaaa' },
            address: { displayName: 'aaaa' },
            jobSites: { displayName: 'aaaa' },
            isActive: true,
            customerId: 4,
            companyId: 4,
            inactiveAt: new Date('2023-10-17T04:40:35.810'),
            inactiveById: 4,
            quickbookId: '1',
            createdAt: new Date('2023-10-17T04:40:35.810'),
            updatedAt: new Date('2023-10-17T04:40:35.810'),
        },
    });
    await prisma.jobsite.create({
        data: {
            id: 4,
            alternativeId: 'serviceTicketServices',
            name: 'aaa',
            location: { displayName: 'aaaa' },
            isActive: true,
            address: { displayName: 'aaaa' },
            locationId: 4,
            customerId: 4,
        },
    });
    await prisma.homeOwners.create({
        data: {
            id: 4,
            alternativeId: 'serviceTicketServices',
            profile: { displayName: 'aaaa' },
            info: { displayName: 'aaaa' },
            contact: { displayName: 'aaaa' },
            subdivisionId: 4,
            addressId: 4,
        },
    });
    await prisma.jobType.create({
        data: {
            id: 4,
            alternativeId: 'serviceTicketServices',
            title: 'aa',
            description: 'aa',
            sku: 'aa',
            industryId: 4,
            createdBy: 4,
            isActive: true,
            quickbookId: '1',
            createdAt: new Date('2023-10-17T04:44:24.407'),
            updatedAt: new Date('2023-10-17T04:44:24.407'),
        },
    });
    await prisma.items.create({
        data: {
            id: 4,
            name: 'aaa',
            description: 'aaaa',
            sku: 'aaa',
            isFixed: true,
            charges: 4,
            tax: 4,
            isDiscountItem: true,
            isJobType: true,
            jobTypeId: 4,
            itemType: 'Service',
            productCost: 4,
            salePrice: 4,
            companyId: 4,
            isActive: true,
            quickbookId: '1',
            createdAt: true,
            updatedAt: true,
        },
    });
    await prisma.companyLocation.create({
        data: {
            id: 4,
            alternativeId: 'serviceTicketServices',
            name: 'aaaa',
            isActive: true,
            isMainLocation: true,
            contactName: 'aaa',
            info: { displayName: 'aaaa' },
            address: { displayName: 'aaaa' },
            isAddressAsBillingAddress: false,
            billingAddress: { displayName: 'aaaa' },
            contact: { displayName: 'aaaa' },
            companyId: 4,
            poRequestEmailSender: 'aaaa',
        },
    });
    await prisma.servicetickets.create({
        data: {
            id: 4,
            alternativeId: 'serviceTicketServices',
            createdAt: new Date('2023-10-17T04:47:55.602'),
            dueDate: new Date('2023-10-17T04:47:55.602'),
            customerId: 4,
            createdById: 4,
            note: 'aaa',
            customerContactId: 4,
            customerPO: 'aa',
            image: 'aaa',
            images: { displayName: 'aaaa' },
            companyId: 4,
            technicianId: 4,
            status: 0,
            track: { displayName: 'aaaa' },
            editedById: 4,
            editedAt: new Date('2023-10-17T04:47:55.602'),
            ticketId: '1',
            jobLocationId: 4,
            jobSiteId: 4,
            bouncedEmailFlag: false,
            isHomeOccupied: false,
            homeOwnerId: 4,
            homeJobLocationId: 4,
            homeJobSiteId: 4,
            jobTypeId: 4,
            itemId: 4,
            jobCreated: false,
            source: 'blueclerk',
            workTypeId: 4,
            companyLocationId: 4,
            pooverriddenById: 4,
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

describe('ServiceTicketService', () => {
    let idService = 0;
    let otherService = 0;
    const serviceTicketService = new ServiceTicketsService();
    const input: ICreateServiceTicketInput = {
        alternativeId: 'create',
        userId: 4,
        dueDate: new Date(),
        customerId: 4,
        note: 'tes',
        customerContactId: 4,
        customerPO: 'asd',
        image: 'asd',
        images: [],
        companyId: 4,
        technicianId: 4,
        status: 0,
        ticketId: 'aas',
        jobLocationId: 4,
        jobSiteId: 4,
        isHomeOccupied: true,
        homeOwnerId: 4,
        homeJobLocationId: 4,
        homeJobSiteId: 4,
        jobTypeId: 4,
        itemId: 4,
        jobCreated: true,
        source: 'tes',
        workTypeId: 4,
        companyLocationId: 4,
        pooverriddenById: 4,
        type: 'Ticket',
        emailHistory: [],
        bouncedEmailFlag: true,
    }

    const tempInput: ICreateServiceTicketInput = {...input}

    it('Should create service ticket', async () => {
        try {
            const createServiceTicket = await serviceTicketService.CreateServiceTicket(input, input.userId)
            input.alternativeId = "create2"
            const createServiceTicket2 = await serviceTicketService.CreateServiceTicket(input, input.userId)
            input.alternativeId = tempInput.alternativeId
            idService = createServiceTicket.data.id
            otherService = createServiceTicket2.data.id
            const expectedProperties = [
                'id', 'alternativeId', 'createdAt', 'dueDate', 'customerId', 'createdById', 
                'note', 'customerContactId', 'customerPO', 'image', 'images', 'companyId',
                'technicianId', 'status', 'track', 'editedById', 'editedAt', 'ticketId',
                'jobLocationId', 'jobSiteId', 'bouncedEmailFlag', 'isHomeOccupied', 
                'homeOwnerId', 'homeJobLocationId', 'homeJobSiteId', 'jobTypeId', 'itemId',
                'jobCreated', 'source', 'workTypeId', 'companyLocationId', 'pooverriddenById',
                'type', 'emailHistory'
            ];
            
            for (const property of expectedProperties) {
                expect(createServiceTicket.data[property]).toBeDefined();
            }
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Expected error message');
        }
    })

    it('Should get all services ticket', async () => {
        let query:any = []
        const type = "Ticket"
        const paramObj: any = {
            keyword: 'a',
            status: 0,
            startDate: '2023-10-15 12:33:16',
            endDate: '2023-10-15 12:33:16',
            customerId: 4,
            technicianIds: 4,
            nextCursor: 'test',
            previousCursor: null,
            currentPage: 0,
            pageSize: 30,
            companyId: 4,
            workType: ['asd'],
            companyLocation: 4,
            isHomeOccupied: 4,
            bouncedEmailFlag: true,
        }
        const getAllServiceTicket = await serviceTicketService.GetFilterServiceTickets(paramObj, query, type)
        expect(getAllServiceTicket.status).toEqual(1);
        const expectedProperties = [ 
            "id", "company", "createdAt", "createdByUser", "customer", "editedByUser", "technicianUser", "homeOwner", "pooverriddenById", "customerContactId", "customerPO", "dueDate", "image", "jobCreated", "jobLocation", "jobSite", "jobType", "note", "status", "source", "ticketId", "track"
        ];
        
        getAllServiceTicket.data.forEach((ticket:any) => {
            for (const property of expectedProperties) {
                expect(ticket[property]).toBeDefined();
            }
        });
    })

    it('Should get all services ticket technicianId string', async () => {
        let query:any = []
        const type = "Ticket"
        const paramObj: any = {
            keyword: 'a',
            status: 1,
            startDate: '2023-10-15 12:33:16',
            endDate: '2023-10-15 12:33:16',
            customerId: 4,
            technicianIds: '1',
            nextCursor: null,
            previousCursor: null,
            currentPage: 0,
            pageSize: 30,
            companyId: 4,
            workType: '1',
            companyLocation: '1',
            isHomeOccupied: 4,
            bouncedEmailFlag: true,
        }
        const getAllServiceTicket = await serviceTicketService.GetFilterServiceTickets(paramObj, query, type)
        expect(getAllServiceTicket.status).toEqual(1);
        const expectedProperties = [ 
            "id", "company", "createdAt", "createdByUser", "customer", "editedByUser", "technicianUser", "homeOwner", "pooverriddenById", "customerContactId", "customerPO", "dueDate", "image", "jobCreated", "jobLocation", "jobSite", "jobType", "note", "status", "source", "ticketId", "track"
        ];
        
        getAllServiceTicket.data.forEach((ticket:any) => {
            for (const property of expectedProperties) {
                expect(ticket[property]).toBeDefined();
            }
        });
    })

    it('Should error get all services ticket bacause fill next & prev cursor', async () => {
        let query:any = []
        const type = "Ticket"
        const paramObj: any = {
            keyword: 'a',
            status: 0,
            startDate: '2023-10-15 12:33:16',
            endDate: '2023-10-15 12:33:16',
            customerId: 4,
            technicianIds: 4,
            nextCursor: 'test',
            previousCursor: 'test',
            currentPage: 0,
            pageSize: 30,
            companyId: 4,
            workType: ['1'],
            companyLocation: '1',
            isHomeOccupied: 4,
        }

        try {
            await serviceTicketService.GetFilterServiceTickets(paramObj, query, type)
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Provided cursor could only be one of either nextCursor or previousCursor.');
        }
    })

    it('Should get all services ticket by type PO Request', async () => {
        let query:any = []
        const type = "PO Request"
        const paramObj: IServiceTicketInput = {
            keyword: null,
            status: null,
            startDate: null,
            endDate: null,
            customerId: null,
            technicianIds: null,
            nextCursor: null,
            previousCursor: null,
            currentPage: 0,
            pageSize: 30,
            companyId: null,
            workType: null,
            companyLocation: [1],
            isHomeOccupied: null,
        }
        const getAllServiceTicket = await serviceTicketService.GetFilterServiceTickets(paramObj, query, type)
        expect(getAllServiceTicket.status).toEqual(1);
        const expectedProperties = [ 
            "id", "company", "createdAt", "createdByUser", "customer", "editedByUser", "technicianUser", "homeOwner", "pooverriddenById", "customerContactId", "customerPO", "dueDate", "image", "jobCreated", "jobLocation", "jobSite", "jobType", "note", "status", "source", "ticketId", "track"
        ];
        
        getAllServiceTicket.data.forEach((ticket:any) => {
            for (const property of expectedProperties) {
                expect(ticket[property]).toBeDefined();
            }
        });
    })

    it('Should get all services ticket by type All PO Request', async () => {
        let query:any = []
        const type = "All PO Request"
        const paramObj: IServiceTicketInput = {
            keyword: "a",
            status: null,
            startDate: null,
            endDate: null,
            customerId: null,
            technicianIds: null,
            nextCursor: null,
            previousCursor: null,
            currentPage: 0,
            pageSize: 30,
            companyId: null,
            workType: null,
            companyLocation: null,
            isHomeOccupied: null,
        }
        const getAllServiceTicket = await serviceTicketService.GetFilterServiceTickets(paramObj, query, type)
        expect(getAllServiceTicket.status).toEqual(1);
        const expectedProperties = [ 
            "id", "company", "createdAt", "createdByUser", "customer", "editedByUser", "technicianUser", "homeOwner", "pooverriddenById", "customerContactId", "customerPO", "dueDate", "image", "jobCreated", "jobLocation", "jobSite", "jobType", "note", "status", "source", "ticketId", "track"
        ];
        
        getAllServiceTicket.data.forEach((ticket:any) => {
            for (const property of expectedProperties) {
                expect(ticket[property]).toBeDefined();
            }
        });
    })

    it('Should get detail service ticket by query', async () => {
        const query = {
            id: idService
        };
        const getDetailTicketByQuery = await serviceTicketService.GetDetailTicketByQuery(query);
        expect(getDetailTicketByQuery.status).toEqual(1);
        const expectedProperties = [
            'id', 'alternativeId', 'createdAt', 'dueDate', 'customerId', 'createdById', 
            'note', 'customerContactId', 'customerPO', 'image', 'images', 'companyId',
            'technicianId', 'status', 'track', 'editedById', 'editedAt', 'ticketId',
            'jobLocationId', 'jobSiteId', 'bouncedEmailFlag', 'isHomeOccupied', 
            'homeOwnerId', 'homeJobLocationId', 'homeJobSiteId', 'jobTypeId', 'itemId',
            'jobCreated', 'source', 'workTypeId', 'companyLocationId', 'pooverriddenById',
            'type', 'emailHistory'
        ];
        
        for (const property of expectedProperties) {
            expect(getDetailTicketByQuery.data[property]).toBeDefined();
        }
    })

    it('should update services ticket by id', async () => {
        const query = {
            id: idService
        };
        const input : IUpdateServiceTicketInput = {
            alternativeId: '99999',
            userId: 4,
            dueDate: new Date(),
            customerId: 4,
            note: 'tes',
            customerContactId: 4,
            customerPO: 'asd',
            image: 'asd',
            images: [],
            companyId: 4,
            technicianId: 4,
            status: 0,
            ticketId: 'aas',
            jobLocationId: 4,
            jobSiteId: 4,
            isHomeOccupied: true,
            homeOwnerId: 4,
            homeJobLocationId: 4,
            homeJobSiteId: 4,
            jobTypeId: 4,
            itemId: 4,
            jobCreated: true,
            source: 'tes',
            workTypeId: 4,
            companyLocationId: 4,
            pooverriddenById: 4,
            type: 'Ticket',
            emailHistory: [],
            bouncedEmailFlag: true,
            editedAt: new Date
        }
        const updateServiceById = await serviceTicketService.UpdateServiceTicket(input, query, input.userId);
        const expectedProperties = [
            'id', 'alternativeId', 'createdAt', 'dueDate', 'customerId', 'createdById', 
            'note', 'customerContactId', 'customerPO', 'image', 'images', 'companyId',
            'technicianId', 'status', 'track', 'editedById', 'editedAt', 'ticketId',
            'jobLocationId', 'jobSiteId', 'bouncedEmailFlag', 'isHomeOccupied', 
            'homeOwnerId', 'homeJobLocationId', 'homeJobSiteId', 'jobTypeId', 'itemId',
            'jobCreated', 'source', 'workTypeId', 'companyLocationId', 'pooverriddenById',
            'type', 'emailHistory'
        ];
        
        for (const property of expectedProperties) {
            expect(updateServiceById.data[property]).toBeDefined();
        }
    })

    it('Should update services ticket status by id and company', async () => {
        const query = {
            id: idService
        };
        const body = {
            status: 0
        };
        const updateStatusServiceById = await serviceTicketService.UpdateStatusServiceTicket(body, query, input.userId)
        expect(updateStatusServiceById.status).toEqual(1);
        const expectedProperties = [  
            "id", "alternativeId", "createdAt", "dueDate", "customerId", "createdById", "note", "customerContactId", "customerPO", "image", "images", "companyId", "technicianId", "status", "track", "editedById", "editedAt", "ticketId", "jobLocationId", "jobSiteId", "bouncedEmailFlag", "isHomeOccupied", "homeOwnerId", "homeJobLocationId", "homeJobSiteId", "jobTypeId", "itemId", "jobCreated", "source", "workTypeId", "companyLocationId", "pooverriddenById", "type", "emailHistory", "lastEmailSent",
        ];
        for (const property of expectedProperties) {
            expect(updateStatusServiceById.data[property]).toBeDefined();
        }
    })

    it('should add "active the ticket" action to track for ACTIVE status', async () => {
        const checkServiceTicket = await serviceTicketService.CheckServiceTicketStatus("[]", 0, {status:2});
        checkServiceTicket.forEach((status:any) => {
            expect(status.action).toBeDefined();
            expect(status.date).toBeDefined();
        });
    })

    it('should add "archived the ticket" action to track for ARCHIVED status', async () => {
        const checkServiceTicket = await serviceTicketService.CheckServiceTicketStatus("[]", 1, null);
        checkServiceTicket.forEach((status:any) => {
            expect(status.action).toBeDefined();
            expect(status.date).toBeDefined();
        });
    })

    it('should add "reactive the ticket" action to track for REACTIVE status', async () => {
        const checkServiceTicket = await serviceTicketService.CheckServiceTicketStatus("[]", 2, null);
        checkServiceTicket.forEach((status:any) => {
            expect(status.action).toBeDefined();
            expect(status.date).toBeDefined();
        });
    })

    it('should error check service ticket status when invalid ticket status', async () => {
        try {
            await serviceTicketService.CheckServiceTicketStatus("[]", 9, null);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Invalid ticket status');
        }
    })

    it('Should get po request email template and create emaiil default', async () => {
        const getPoRequestEmail = await serviceTicketService.GetPoRequestEmailTemplate(idService, input.userId);
        expect(getPoRequestEmail.status).toEqual(1);
        expect(getPoRequestEmail.emailTemplate).toBeDefined();
        expect(getPoRequestEmail.emailTemplate.from).toBeDefined();
        expect(getPoRequestEmail.emailTemplate.emailList).toBeDefined();
        expect(getPoRequestEmail.emailTemplate.to).toBeDefined();
        expect(getPoRequestEmail.emailTemplate.subject).toBeDefined();
        expect(getPoRequestEmail.emailTemplate.message).toBeDefined();
    })

    it('Should get po request email template and update emaiil default', async () => {
        const getPoRequestEmail = await serviceTicketService.GetPoRequestEmailTemplate(idService, input.userId);
        expect(getPoRequestEmail.status).toEqual(1);
        expect(getPoRequestEmail.emailTemplate).toBeDefined();
        expect(getPoRequestEmail.emailTemplate.from).toBeDefined();
        expect(getPoRequestEmail.emailTemplate.emailList).toBeDefined();
        expect(getPoRequestEmail.emailTemplate.to).toBeDefined();
        expect(getPoRequestEmail.emailTemplate.subject).toBeDefined();
        expect(getPoRequestEmail.emailTemplate.message).toBeDefined();
    })

    it('Should error get po request email template', async () => {
        try {
            await serviceTicketService.GetPoRequestEmailTemplate(10, 3);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Data Not Found');
        }
    })

    it('Should Filter id and company ticket status', async () => {
        const query = {}
        const input = {
            id: 3,
            companyId: 9
        };
        const filterIdAndCompany = await serviceTicketService.FilterIdAndCompanyOptional(input, query);
        expect(filterIdAndCompany.id).toEqual(input.id);
        expect(filterIdAndCompany.companyId).toEqual(input.companyId);
    })

    it('should delete services ticket by id', async () => {
        const deleteServiceTicketById = await serviceTicketService.DeleteServiceTicketById(otherService);
        const expectedProperties = [  
            "id", "alternativeId", "createdAt", "dueDate", "customerId", "createdById", "note", "customerContactId", "customerPO", "image", "images", "companyId", "technicianId", "status", "track", "editedById", "editedAt", "ticketId", "jobLocationId", "jobSiteId", "bouncedEmailFlag", "isHomeOccupied", "homeOwnerId", "homeJobLocationId", "homeJobSiteId", "jobTypeId", "itemId", "jobCreated", "source", "workTypeId", "companyLocationId", "pooverriddenById", "type", "emailHistory", "lastEmailSent",
        ];
        
        for (const property of expectedProperties) {
            expect(deleteServiceTicketById[property]).toBeDefined();
        }
    })
})