import { ServiceTickets } from '../../../models/v3/serviceTicket'
import { PrismaClient } from "@prisma/client";
import { ICreateServiceTicketInput, IUpdateServiceTicketInput } from "../../../types/v3/serviceTickets"
const prisma = new PrismaClient();

const cleanupDatabase = async () => {
    await prisma.servicetickets.deleteMany({where:{id:3}});
    await prisma.emailDefault.deleteMany();
    await prisma.servicetickets.deleteMany({where:{alternativeId:"999443"}});
    await prisma.companyLocation.deleteMany({where:{id:3}});
    await prisma.items.deleteMany({where:{id:3}});
    await prisma.jobType.deleteMany({where:{id:3}});
    await prisma.homeOwners.deleteMany({where:{id:3}});
    await prisma.jobsite.deleteMany({where:{id:3}});
    await prisma.joblocation.deleteMany({where:{id:3}});
    await prisma.contact.deleteMany({where:{id:3}});
    await prisma.customer.deleteMany({where:{id:3}});
    await prisma.paymentterm.deleteMany({where:{id:3}});
    await prisma.jobCosting.deleteMany({where:{id:3}});
    await prisma.priceTier.deleteMany({where:{id:3}});
    await prisma.companyadmin.deleteMany({where:{id:3}});
    await prisma.company.deleteMany({where:{id:3}});
    await prisma.companyBlockchain.deleteMany({where:{id:3}});
    await prisma.companyInfo.deleteMany({where:{id:3}});
    await prisma.industry.deleteMany({where:{id:3}});
    await prisma.worktype.deleteMany({where:{id:3}});
    await prisma.user.deleteMany({where:{id:3}});
    await prisma.userAuth.deleteMany({where:{id:3}});
};

const createDatabase = async () => {
    await prisma.userAuth.create({
        data: {
            id:3,
            email: '3@gmail.com',
            password: 'aaa',
            resetPasswordToken: 'aaa',
            resetPasswordExpires: new Date('2023-10-15T07:43:30.016'),
            socialId: '1',
            connectorType: 0
        }
    });
    await prisma.user.create({
        data: {
            id: 3,
            alternativeId: 'serviceTicketModel',
            accountType: 3,
            userAuthId: 3,
            profile: { displayName: 'aaa' },
            address: { displayName: 'aaa' },
            location: { displayName: 'aaa' },
            contact: { displayName: 'aaa' },
            permissions: { displayName: 'aaa' },
            emailPreferences: { displayName: 'aaa' },
            balance: 0,
            credit: 0,
            commission: 3,
            firebaseTokens: { displayName: 'aaa' },
            createdAt: new Date('2023-10-15T07:43:53.219'),
            updatedAt: new Date('2023-10-15T07:43:53.219')
        }
    });
    await prisma.worktype.create({
        data: {
            id: 3,
            alternativeId: 'serviceTicketModel',
            title: 'aaa',
            createdAt: new Date('2023-10-15T07:56:47.344')
        }
    });
    await prisma.industry.create({
        data: {
            id: 3,
            alternativeId: 'serviceTicketModel',
            title: 'aaaa',
            createdBy: 3,
        },
    });
    await prisma.companyInfo.create({
        data: {
            id: 3,
            companyName: 'aaa',
            industryId: 3,
            logoUrl: 'aaa',
            companyEmail: 'aaa',
            displayName: 'aaaa'
        }
    });
    await prisma.companyBlockchain.create({
        data: {
            id: 3,
            verified: true,
            verifiedAt: new Date('2023-10-15T07:45:35.740Z'),
            verifiedById: 3,
            deniedAt: new Date('2023-10-15T07:45:35.740Z'),
            deniedById: 3
        }
    });
    await prisma.company.create({
        data: {
            id: 3,
            alternativeId: 'serviceTicketModel',
            companyInfoId: 3,
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
            type: 3,
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
            currentInvoiceId: 3,
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
            companyBlockchainId: 3,
            createdAt: new Date('2023-10-15T07:46:22.047Z'),
            updatedAt: new Date('2023-10-15T07:46:22.047Z'),
            adminId: null,
            costing: {},
            employeeId: 3,
            itemTier: {}
        }
    });
    await prisma.companyadmin.create({
        data: {
            id: 3,
            alternativeId: 'serviceTicketModel',
            userId: 3,
            companyId: 3
        },
    });
    await prisma.priceTier.create({
        data: {
            id: 3,
            alternativeId: 'serviceTicketModel',
            companyId: 3,
            name: 'aaa',
            isActive: true,
            inactiveById: 3,
            inactiveAt: new Date('2023-10-17T04:33:42.640Z'),
            createdAt: new Date('2023-10-17T04:33:42.640Z'),
            updatedAt: new Date('2023-10-17T04:33:42.640Z'),
        },
    });
    await prisma.jobCosting.create({
        data: {
            id: 3,
            alternativeId: 'serviceTicketModel',
            companyId: 3,
            name: 'aaa',
            isActive: true,
            inactiveById: 3,
            inactiveAt: new Date('2023-10-17T04:34:41.483Z'),
            createdAt: new Date('2023-10-17T04:34:41.483Z'),
            updatedAt: new Date('2023-10-17T04:34:41.483Z'),
        },
    });
    await prisma.paymentterm.create({
        data: {
            id: 3,
            alternativeId: 'serviceTicketModel',
            name: 'aaa',
            dueDays: 3,
            isActive: true,
            companyId: 3,
            quickbookId: '1',
            createdById: 3,
            deleteAt: new Date('2023-10-17T04:36:51.105Z'),
            createdAt: new Date('2023-10-17T04:36:51.105Z'),
            updatedAt: new Date('2023-10-17T04:36:51.105Z'),
        },
    });
    await prisma.customer.create({
        data: {
            id: 3,
            alternativeId: 'serviceTicketModel',
            profile: { displayName: 'aaaa' },
            address: { displayName: 'aaaa' },
            location: { displayName: 'aaaa' },
            contact: { displayName: 'aaaa' },
            permissions: "asd",  
            emailPreferences: { displayName: 'aaaa' },
            balance: 0,
            commission: 3,
            isActive: true,
            info: 'aaa',
            contactName: 'aaaa',
            quickbookId: '1',
            credit: 0,
            itemTierId: 3,
            jobCostingId: 3,
            isCustomPrice: false,
            customPrices: { displayName: 'aaaa' },
            discountPrices: { displayName: 'aaaa' },
            paymentTermId: 3,
            vendorId: '1',
            inactiveAt: new Date('2023-10-17T04:37:04.328Z'),
            inactiveById: 3,
            adminId: 3,
            isPORequired: false,
            notes: 'aaa',
        },
    });
    await prisma.contact.create({
        data: {
            id: 3,
            alternativeId: 'serviceTicketModel',
            name: 'aaa',
            phone: 'aaa',
            email: 'aaa',
            isActive: true,
            userId: 3,
            createdAt: new Date('2023-10-17T04:39:31.601'),
            updatedAt: new Date('2023-10-17T04:39:31.601'),
            customerId: 3,
        },
    });
    await prisma.joblocation.create({
        data: {
            id: 3,
            alternativeId: 'serviceTicketModel',
            name: 'aaa',
            contacts: { displayName: 'aaaa' },
            location: { displayName: 'aaaa' },
            address: { displayName: 'aaaa' },
            jobSites: { displayName: 'aaaa' },
            isActive: true,
            customerId: 3,
            companyId: 3,
            inactiveAt: new Date('2023-10-17T04:40:35.810'),
            inactiveById: 3,
            quickbookId: '1',
            createdAt: new Date('2023-10-17T04:40:35.810'),
            updatedAt: new Date('2023-10-17T04:40:35.810'),
        },
    });
    await prisma.jobsite.create({
        data: {
            id: 3,
            alternativeId: 'serviceTicketModel',
            name: 'aaa',
            location: { displayName: 'aaaa' },
            isActive: true,
            address: { displayName: 'aaaa' },
            locationId: 3,
            customerId: 3,
        },
    });
    await prisma.homeOwners.create({
        data: {
            id: 3,
            alternativeId: 'serviceTicketModel',
            profile: { displayName: 'aaaa' },
            info: { displayName: 'aaaa' },
            contact: { displayName: 'aaaa' },
            subdivisionId: 3,
            addressId: 3,
        },
    });
    await prisma.jobType.create({
        data: {
            id: 3,
            alternativeId: 'serviceTicketModel',
            title: 'aa',
            description: 'aa',
            sku: 'aa',
            industryId: 3,
            createdBy: 3,
            isActive: true,
            quickbookId: '1',
            createdAt: new Date('2023-10-17T04:44:24.407'),
            updatedAt: new Date('2023-10-17T04:44:24.407'),
        },
    });
    await prisma.items.create({
        data: {
            id: 3,
            name: 'aaa',
            description: 'aaaa',
            sku: 'aaa',
            isFixed: true,
            charges: 3,
            tax: 3,
            isDiscountItem: true,
            isJobType: true,
            jobTypeId: 3,
            itemType: 'Service',
            productCost: 3,
            salePrice: 3,
            companyId: 3,
            isActive: true,
            quickbookId: '1',
            createdAt: true,
            updatedAt: true,
        },
    });
    await prisma.companyLocation.create({
        data: {
            id: 3,
            alternativeId: 'serviceTicketModel',
            name: 'aaaa',
            isActive: true,
            isMainLocation: true,
            contactName: 'aaa',
            info: { displayName: 'aaaa' },
            address: { displayName: 'aaaa' },
            isAddressAsBillingAddress: false,
            billingAddress: { displayName: 'aaaa' },
            contact: { displayName: 'aaaa' },
            companyId: 3,
            poRequestEmailSender: 'aaaa',
        },
    });
    await prisma.servicetickets.create({
        data: {
            id: 3,
            alternativeId: 'serviceTicketModel',
            createdAt: new Date('2023-10-17T04:47:55.602'),
            dueDate: new Date('2023-10-17T04:47:55.602'),
            customerId: 3,
            createdById: 3,
            note: 'aaa',
            customerContactId: 3,
            customerPO: 'aa',
            image: 'aaa',
            images: { displayName: 'aaaa' },
            companyId: 3,
            technicianId: 3,
            status: 0,
            track: { displayName: 'aaaa' },
            editedById: 3,
            editedAt: new Date('2023-10-17T04:47:55.602'),
            ticketId: '1',
            jobLocationId: 3,
            jobSiteId: 3,
            bouncedEmailFlag: false,
            isHomeOccupied: false,
            homeOwnerId: 3,
            homeJobLocationId: 3,
            homeJobSiteId: 3,
            jobTypeId: 3,
            itemId: 3,
            jobCreated: false,
            source: 'blueclerk',
            workTypeId: 3,
            companyLocationId: 3,
            pooverriddenById: 3,
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

let idService = 0
let otherIdService = 0
const serviceticket = new ServiceTickets(prisma.servicetickets);
const input: ICreateServiceTicketInput = {
    alternativeId: '9998',
    userId: 3,
    dueDate: new Date(),
    customerId: 3,
    note: 'tes',
    customerContactId: 3,
    customerPO: 'asd',
    image: 'asd',
    images: [],
    companyId: 3,
    technicianId: 3,
    status: 0,
    ticketId: 'aas',
    jobLocationId: 3,
    jobSiteId: 3,
    isHomeOccupied: true,
    homeOwnerId: 3,
    homeJobLocationId: 3,
    homeJobSiteId: 3,
    jobTypeId: 3,
    itemId: 3,
    jobCreated: true,
    source: 'tes',
    workTypeId: 3,
    companyLocationId: 3,
    pooverriddenById: 3,
    type: 'Ticket',
    emailHistory: [],
    bouncedEmailFlag: true,
}

const tempInput: ICreateServiceTicketInput = {...input}

const inputUpdate : IUpdateServiceTicketInput = {
    alternativeId: '999443',
    userId: 3,
    dueDate: new Date(),
    customerId: 3,
    note: 'tes',
    customerContactId: 3,
    customerPO: 'asd',
    image: 'asd',
    images: [],
    companyId: 3,
    technicianId: 3,
    status: 0,
    ticketId: 'aas',
    jobLocationId: 3,
    jobSiteId: 3,
    isHomeOccupied: true,
    homeOwnerId: 3,
    homeJobLocationId: 3,
    homeJobSiteId: 3,
    jobTypeId: 3,
    itemId: 3,
    jobCreated: true,
    source: 'tes',
    workTypeId: 3,
    companyLocationId: 3,
    pooverriddenById: 3,
    type: 'Ticket',
    emailHistory: [],
    bouncedEmailFlag: true,
    editedAt: new Date
}

const tempInputUpdate : IUpdateServiceTicketInput = {...inputUpdate}
describe('ServiceTicketModel', () => {
    it('Should create service ticket', async () => {
        try {
            
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];

            const createServiceTicket = await serviceticket.create(input, track);
            input.alternativeId = '123123'
            const createServiceTicket2 = await serviceticket.create(input, track);
            input.alternativeId = tempInput.alternativeId
            idService = createServiceTicket.id
            otherIdService = createServiceTicket2.id
            
            expect(createServiceTicket.alternativeId).toEqual(input.alternativeId);
            expect(createServiceTicket.customerId).toEqual(input.customerId);
            expect(createServiceTicket.createdById).toEqual(input.userId);
            expect(createServiceTicket.note).toEqual(input.note);
            expect(createServiceTicket.customerContactId).toEqual(input.customerContactId);
            expect(createServiceTicket.customerPO).toEqual(input.customerPO);
            expect(createServiceTicket.image).toEqual(input.image);
            expect(createServiceTicket.images).toEqual(input.images);
            expect(createServiceTicket.companyId).toEqual(input.companyId);
            expect(createServiceTicket.technicianId).toEqual(input.technicianId);
            expect(createServiceTicket.status).toEqual(input.status);
            expect(createServiceTicket.track).toEqual(JSON.stringify(track));
            expect(createServiceTicket.editedById).toEqual(input.userId);
            expect(createServiceTicket.ticketId).toEqual(input.ticketId);
            expect(createServiceTicket.jobLocationId).toEqual(input.jobLocationId);
            expect(createServiceTicket.jobSiteId).toEqual(input.jobSiteId);
            expect(createServiceTicket.bouncedEmailFlag).toEqual(input.bouncedEmailFlag);
            expect(createServiceTicket.isHomeOccupied).toEqual(input.isHomeOccupied);
            expect(createServiceTicket.homeOwnerId).toEqual(input.homeOwnerId);
            expect(createServiceTicket.homeJobLocationId).toEqual(input.homeJobLocationId);
            expect(createServiceTicket.homeJobSiteId).toEqual(input.homeJobSiteId);
            expect(createServiceTicket.jobTypeId).toEqual(input.jobTypeId);
            expect(createServiceTicket.itemId).toEqual(input.itemId);
            expect(createServiceTicket.jobCreated).toEqual(input.jobCreated);
            expect(createServiceTicket.source).toEqual(input.source);
            expect(createServiceTicket.workTypeId).toEqual(input.workTypeId);
            expect(createServiceTicket.companyLocationId).toEqual(input.companyLocationId);
            expect(createServiceTicket.pooverriddenById).toEqual(input.pooverriddenById);
            expect(createServiceTicket.type).toEqual(input.type);
            expect(createServiceTicket.emailHistory).toEqual(input.emailHistory);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Expected error message');
        }
    })

    it('Should error when customer contact id not found', async () => {
        try {
            input.customerContactId = 9998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            input.alternativeId = '999123'
            await serviceticket.create(input, track);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Customer contact not found.');
            input.alternativeId = '9998'
            input.customerContactId = tempInput.customerContactId
        }
    })

    it('Should error when Technician id not found', async () => {
        try {
            input.technicianId = 9998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            input.alternativeId = '999123'
            await serviceticket.create(input, track);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Technician not found.');
            input.technicianId = tempInput.technicianId
            input.alternativeId = '9998'
        }
    })

    it('Should error when Customer id not found', async () => {
        try {
            input.customerId = 9998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            input.alternativeId = '999123'
            await serviceticket.create(input, track);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Customer not found.');
            input.customerId = tempInput.customerId
            input.alternativeId = '9998'
        }
    })

    it('Should error when Company id not found', async () => {
        try {
            input.companyId = 9998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            input.alternativeId = '999123'
            await serviceticket.create(input, track);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Company not found.');
            input.companyId = tempInput.companyId
            input.alternativeId = '9998'
        }
    })

    it('Should error when Job Location id not found', async () => {
        try {
            input.jobLocationId = 9998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            input.alternativeId = '999123'
            await serviceticket.create(input, track);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Job Location not found.');
            input.jobLocationId = tempInput.jobLocationId
            input.alternativeId = '9998'
        }
    })

    it('Should error when Job Site id not found', async () => {
        try {
            input.jobSiteId = 9998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            input.alternativeId = '999123'
            await serviceticket.create(input, track);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Job Site not found.');
            input.jobSiteId = tempInput.jobSiteId
            input.alternativeId = '9998'
        }
    })

    it('Should error when Home Owner id not found', async () => {
        try {
            input.homeOwnerId = 9998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            input.alternativeId = '999123'
            await serviceticket.create(input, track);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Home Owner not found.');
            input.homeOwnerId = tempInput.homeOwnerId
            input.alternativeId = '9998'
        }
    })

    it('Should error when Home Job Location id not found', async () => {
        try {
            input.homeJobLocationId = 9998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            input.alternativeId = '999123'
            await serviceticket.create(input, track);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Home Job Location not found.');
            input.homeJobLocationId = tempInput.homeJobLocationId
            input.alternativeId = '9998'
        }
    })

    it('Should error when Home Job Site id not found', async () => {
        try {
            input.homeJobSiteId = 9998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            input.alternativeId = '999123'
            await serviceticket.create(input, track);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Home Job Site not found.');
            input.homeJobSiteId = tempInput.homeJobSiteId
            input.alternativeId = '9998'
        }
    })

    it('Should error when Job Type id not found', async () => {
        try {
            input.jobTypeId = 9998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            input.alternativeId = '999123'
            await serviceticket.create(input, track);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Job Type not found.');
            input.jobTypeId = tempInput.jobTypeId
            input.alternativeId = '9998'
        }
    })

    it('Should error when Item id not found', async () => {
        try {
            input.itemId = 9998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            input.alternativeId = '999123'
            await serviceticket.create(input, track);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Item not found.');
            input.itemId = tempInput.itemId
            input.alternativeId = '9998'
        }
    })

    it('Should error when Work Type id not found', async () => {
        try {
            input.workTypeId = 9998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            input.alternativeId = '999123'
            await serviceticket.create(input, track);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Work Type not found.');
            input.workTypeId = tempInput.workTypeId
            input.alternativeId = '9998'
        }
    })

    it('Should error when Company Location id not found', async () => {
        try {
            input.companyLocationId = 9998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            input.alternativeId = '999123'
            await serviceticket.create(input, track);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Company Location not found.');
            input.companyLocationId = tempInput.companyLocationId
            input.alternativeId = '9998'
        }
    })
    
    it('Should error when user id not found', async () => {
        try {
            input.userId = 9998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            input.alternativeId = '999123'
            await serviceticket.create(input, track);
        } catch (error) {
            expect(error.message).toContain('Foreign key constraint failed: Servicetickets_createdById_fkey (index)');
            input.alternativeId = '9998'
            input.userId = tempInput.userId
        }
    })

    it('Should error when alternative id not unique', async () => {
        try {
            let track:any = '[]';
            await serviceticket.create(input, track);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Unique constraint failed on the fields: (`alternativeId`)');
        }
    })

    it('Should get all services ticket', async () => {
        const query = [];
        const currentPage = 0;
        const pageSize = 30;
        query.push({
            type: {
            not: "PORequest"
            }
        })
        const getAllServiceTicket = await serviceticket.findMany(query, currentPage, pageSize);
        getAllServiceTicket.forEach((ticket:any) => {
            expect(ticket.id).toBeDefined();
            expect(ticket.company).toBeDefined();
            expect(ticket.createdAt).toBeDefined();
            expect(ticket.createdByUser).toBeDefined();
            expect(ticket.customer).toBeDefined();
            expect(ticket.editedByUser).toBeDefined();
            expect(ticket.technicianUser).toBeDefined();
            expect(ticket.homeOwner).toBeDefined();
            expect(ticket.pooverriddenById).toBeDefined();
            expect(ticket.customerContactId).toBeDefined();
            expect(ticket.customerPO).toBeDefined();
            expect(ticket.dueDate).toBeDefined();
            expect(ticket.image).toBeDefined();
            expect(ticket.jobCreated).toBeDefined();
            expect(ticket.jobLocation).toBeDefined();
            expect(ticket.jobSite).toBeDefined();
            expect(ticket.jobType).toBeDefined();
            expect(ticket.note).toBeDefined();
            expect(ticket.status).toBeDefined();
            expect(ticket.source).toBeDefined();
            expect(ticket.ticketId).toBeDefined();
            expect(ticket.track).toBeDefined();
        });
    })

    it('Should Error get all services ticket', async () => {
        try {
            const query = [];
            const currentPage = -2;
            const pageSize = 30;
            query.push({
                type: {
                not: "PORequest"
                }
            })
            await serviceticket.findMany(query, currentPage, pageSize);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        }
    })

    test('Should handle errors in findMany', async () => {
    
        const query = {};
        const currentPage = 0;
        const pageSize = 30;
    
        try {
            await serviceticket.findMany(query, currentPage, pageSize);
    
            fail('Expected an error to be thrown');
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('fail is not defined');
        }
    });
    
    it('should throw an error when unable to find all services ticket', async () => {
        const prismaClient = new PrismaClient();
        prismaClient.servicetickets.findMany = jest.fn().mockRejectedValue(new Error('Data not found'));
        try {
            const query = [];
            const currentPage = 0;
            const pageSize = 30;
            query.push({
                type: {
                not: "PORequest"
                }
            })
            await serviceticket.findMany(query, currentPage, pageSize);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toEqual('Data not found');
        }
    });

    it('Should get detail unique by id and company', async () => {
        const query = {
            id: idService
        };

        const getDetailUnique = await serviceticket.findDetailUnique(query);
        const expectedProperties = [
            'id', 'alternativeId', 'createdAt', 'dueDate', 'customerId', 'createdById', 
            'note', 'customerContactId', 'customerPO', 'image', 'images', 'companyId',
            'technicianId', 'status', 'track', 'editedById', 'editedAt', 'ticketId',
            'jobLocationId', 'jobSiteId', 'bouncedEmailFlag', 'isHomeOccupied', 
            'homeOwnerId', 'homeJobLocationId', 'homeJobSiteId', 'jobTypeId', 'itemId',
            'jobCreated', 'source', 'workTypeId', 'companyLocationId', 'pooverriddenById',
            'type', 'emailHistory', 'lastEmailSent', 'customer', 'homeOwner','jobLocation',
            'jobSite','jobType','tasks','customerContact'
        ];
        
        for (const property of expectedProperties) {
            expect(getDetailUnique[property]).toBeDefined();
        }
    })

    it('should get services ticket status by id', async () => {
        const query = {
            id: idService
        };
        const getDetailUnique = await serviceticket.findUniqueIdStatus(query);
        expect(getDetailUnique.id).toBeDefined();
        expect(getDetailUnique.status).toBeDefined();
        expect(getDetailUnique.track).toBeDefined();
    })

    it('should error get services ticket status by id', async () => {
        const query = {
            id: 'asdasdasd'
        };
        try {
            await serviceticket.findUniqueIdStatus(query);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        }
    })

    it('should get services ticket by id', async () => {
        const getDetailUnique = await serviceticket.findDetailUniqueId(idService);
        const expectedProperties = [
            'id', 'alternativeId', 'createdAt', 'dueDate', 'customerId', 'createdById', 
            'note', 'customerContactId', 'customerPO', 'image', 'images', 'companyId',
            'technicianId', 'status', 'track', 'editedById', 'editedAt', 'ticketId',
            'jobLocationId', 'jobSiteId', 'bouncedEmailFlag', 'isHomeOccupied', 
            'homeOwnerId', 'homeJobLocationId', 'homeJobSiteId', 'jobTypeId', 'itemId',
            'jobCreated', 'source', 'workTypeId', 'companyLocationId', 'pooverriddenById',
            'type', 'emailHistory', 'lastEmailSent', 'customer'
        ];
        
        for (const property of expectedProperties) {
            expect(getDetailUnique[property]).toBeDefined();
        }
    })

    it('should error get services ticket by id', async () => {
        try {
            await serviceticket.findDetailUniqueId(99999999999);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        }
    })

    it('should update services ticket status by id', async () => {
        const query = {
            id: idService
        };
        const track:any = [];
        const body = {
            status: 0
        };
        const updateStatusServiceById = await serviceticket.updateStatusById(query, body, track, input.userId);
        const expectedProperties = [  
            "id", "alternativeId", "createdAt", "dueDate", "customerId", "createdById", "note", "customerContactId", "customerPO", "image", "images", "companyId", "technicianId", "status", "track", "editedById", "editedAt", "ticketId", "jobLocationId", "jobSiteId", "bouncedEmailFlag", "isHomeOccupied", "homeOwnerId", "homeJobLocationId", "homeJobSiteId", "jobTypeId", "itemId", "jobCreated", "source", "workTypeId", "companyLocationId", "pooverriddenById", "type", "emailHistory", "lastEmailSent",
        ];
        
        for (const property of expectedProperties) {
            expect(updateStatusServiceById[property]).toBeDefined();
        }
    })

    it('should error update services ticket status by id', async () => {
        const query = {
            id: 9999999999
        };
        const track:any = [];
        const body = {
            status: 0
        };
        try {
            await serviceticket.updateStatusById(query, body, track, input.userId);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        }
    })

    it('should update services ticket by id', async () => {
        const query = {
            id: idService
        };
        
        let track:any = [{"date": new Date(), "action": "archived the ticket"}];
        const updateServiceById = await serviceticket.updateById(inputUpdate, track, query);
        const expectedProperties = [
            'id', 'alternativeId', 'createdAt', 'dueDate', 'customerId', 'createdById', 
            'note', 'customerContactId', 'customerPO', 'image', 'images', 'companyId',
            'technicianId', 'status', 'track', 'editedById', 'editedAt', 'ticketId',
            'jobLocationId', 'jobSiteId', 'bouncedEmailFlag', 'isHomeOccupied', 
            'homeOwnerId', 'homeJobLocationId', 'homeJobSiteId', 'jobTypeId', 'itemId',
            'jobCreated', 'source', 'workTypeId', 'companyLocationId', 'pooverriddenById',
            'type', 'emailHistory', 'lastEmailSent'
        ];
        
        for (const property of expectedProperties) {
            expect(updateServiceById[property]).toBeDefined();
        }
    })

    it('Should error when customer contact id not found', async () => {
        try {
            const query = { id: idService };
            inputUpdate.customerContactId = 99998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            await serviceticket.updateById(inputUpdate, track, query);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Customer contact not found.');
            inputUpdate.customerContactId = tempInputUpdate.customerContactId
        }
    })

    it('Should error when Technician id not found', async () => {
        try {
            const query = { id: idService };
            inputUpdate.technicianId = 99998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            await serviceticket.updateById(inputUpdate, track, query);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Technician not found.');
            inputUpdate.technicianId = tempInputUpdate.technicianId
        }
    })

    it('Should error when Customer id not found', async () => {
        try {
            const query = { id: idService };
            inputUpdate.customerId = 99998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            await serviceticket.updateById(inputUpdate, track, query);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Customer not found.');
            inputUpdate.customerId = tempInputUpdate.customerId
        }
    })

    it('Should error when Company id not found', async () => {
        try {
            const query = { id: idService };
            inputUpdate.companyId = 99998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            await serviceticket.updateById(inputUpdate, track, query);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Company not found.');
            inputUpdate.companyId = tempInputUpdate.companyId
        }
    })

    it('Should error when Job Location id not found', async () => {
        try {
            const query = { id: idService };
            inputUpdate.jobLocationId = 99998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            await serviceticket.updateById(inputUpdate, track, query);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Job Location not found.');
            inputUpdate.jobLocationId = tempInputUpdate.jobLocationId
        }
    })

    it('Should error when Job Site id not found', async () => {
        try {
            const query = { id: idService };
            inputUpdate.jobSiteId = 99998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            await serviceticket.updateById(inputUpdate, track, query);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Job Site not found.');
            inputUpdate.jobSiteId = tempInputUpdate.jobSiteId
        }
    })

    it('Should error when Home Owner id not found', async () => {
        try {
            const query = { id: idService };
            inputUpdate.homeOwnerId = 99998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            await serviceticket.updateById(inputUpdate, track, query);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Home Owner not found.');
            inputUpdate.homeOwnerId = tempInputUpdate.homeOwnerId
        }
    })

    it('Should error when Home Job Location id not found', async () => {
        try {
            const query = { id: idService };
            inputUpdate.homeJobLocationId = 99998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            await serviceticket.updateById(inputUpdate, track, query);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Home Job Location not found.');
            inputUpdate.homeJobLocationId = tempInputUpdate.homeJobLocationId
        }
    })

    it('Should error when Home Job Site id not found', async () => {
        try {
            const query = { id: idService };
            inputUpdate.homeJobSiteId = 99998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            await serviceticket.updateById(inputUpdate, track, query);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Home Job Site not found.');
            inputUpdate.homeJobSiteId = tempInputUpdate.homeJobSiteId
        }
    })

    it('Should error when Job Type id not found', async () => {
        try {
            const query = { id: idService };
            inputUpdate.jobTypeId = 99998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            await serviceticket.updateById(inputUpdate, track, query);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Job Type not found.');
            inputUpdate.jobTypeId = tempInputUpdate.jobTypeId
        }
    })

    it('Should error when Item id not found', async () => {
        try {
            const query = { id: idService };
            inputUpdate.itemId = 99998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            await serviceticket.updateById(inputUpdate, track, query);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Item not found.');
            inputUpdate.itemId = tempInputUpdate.itemId
        }
    })

    it('Should error when Work Type id not found', async () => {
        try {
            const query = { id: idService };
            inputUpdate.workTypeId = 99998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            await serviceticket.updateById(inputUpdate, track, query);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Work Type not found.');
            inputUpdate.workTypeId = tempInputUpdate.workTypeId
        }
    })

    it('Should error when Company Location id not found', async () => {
        try {
            const query = { id: idService };
            inputUpdate.companyLocationId = 99998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            await serviceticket.updateById(inputUpdate, track, query);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Company Location not found.');
            inputUpdate.companyLocationId = tempInputUpdate.companyLocationId
        }
    })
    
    it('Should error when user id not found', async () => {
        try {
            const query = { id: idService };
            inputUpdate.userId = 99998
            let track:any = [{"date": new Date(), "action": "archived the ticket"}];
            await serviceticket.updateById(inputUpdate, track, query);
        } catch (error) {
            expect(error.message).toContain('Foreign key constraint failed: Servicetickets_editedById_fkey (index)');
            inputUpdate.userId = tempInputUpdate.userId
        }
    })

    it('Should error when alternative id not unique', async () => {
        try {
            const query = { id: 2323 };
            let track:any = '[]';
            await serviceticket.updateById(inputUpdate, track, query);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        }
    })

    it('should delete services ticket by id', async () => {
        const deleteServiceTicketById = await serviceticket.deleteById(otherIdService);
        const expectedProperties = [  
            "id", "alternativeId", "createdAt", "dueDate", "customerId", "createdById", "note", "customerContactId", "customerPO", "image", "images", "companyId", "technicianId", "status", "track", "editedById", "editedAt", "ticketId", "jobLocationId", "jobSiteId", "bouncedEmailFlag", "isHomeOccupied", "homeOwnerId", "homeJobLocationId", "homeJobSiteId", "jobTypeId", "itemId", "jobCreated", "source", "workTypeId", "companyLocationId", "pooverriddenById", "type", "emailHistory", "lastEmailSent",
        ];
        
        for (const property of expectedProperties) {
            expect(deleteServiceTicketById[property]).toBeDefined();
        }
    })

    it('Should error when alternative id not unique', async () => {
        try {
            await serviceticket.deleteById(123344);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Record to delete does not exist.');
        }
    })
})
