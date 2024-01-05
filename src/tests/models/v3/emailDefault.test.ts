import { EmailDefaults } from '../../../models/v3/emailDefault'
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const cleanupDatabase = async () => {
    await prisma.servicetickets.deleteMany({where:{id:1}});
    await prisma.emailDefault.deleteMany();
    await prisma.servicetickets.deleteMany({where:{id:1}});
    await prisma.companyLocation.deleteMany({where:{id:1}});
    await prisma.items.deleteMany({where:{id:1}});
    await prisma.jobType.deleteMany({where:{id:1}});
    await prisma.homeOwners.deleteMany({where:{id:1}});
    await prisma.jobsite.deleteMany({where:{id:1}});
    await prisma.joblocation.deleteMany({where:{id:1}});
    await prisma.contact.deleteMany({where:{id:1}});
    await prisma.customer.deleteMany({where:{id:1}});
    await prisma.paymentterm.deleteMany({where:{id:1}});
    await prisma.jobCosting.deleteMany({where:{id:1}});
    await prisma.priceTier.deleteMany({where:{id:1}});
    await prisma.companyadmin.deleteMany({where:{id:1}});
    await prisma.company.deleteMany({where:{id:1}});
    await prisma.companyBlockchain.deleteMany({where:{id:1}});
    await prisma.companyInfo.deleteMany({where:{id:1}});
    await prisma.industry.deleteMany({where:{id:1}});
    await prisma.worktype.deleteMany({where:{id:1}});
    await prisma.user.deleteMany({where:{id:1}});
    await prisma.userAuth.deleteMany({where:{id:1}});
};

const createDatabase = async () => {
    await prisma.userAuth.create({
        data: {
            id: 1,
            email: '1@gmail.com',
            password: 'aaa',
            resetPasswordToken: 'aaa',
            resetPasswordExpires: new Date('2023-10-15T07:43:30.016'),
            socialId: '1',
            connectorType: 0
        }
    });
    await prisma.user.create({
        data: {
            id: 1,
            alternativeId: 'emailDefaultModel',
            accountType: 1,
            userAuthId: 1,
            profile: { displayName: 'aaa' },
            address: { displayName: 'aaa' },
            location: { displayName: 'aaa' },
            contact: { displayName: 'aaa' },
            permissions: { displayName: 'aaa' },
            emailPreferences: { displayName: 'aaa' },
            balance: 0,
            credit: 0,
            commission: 1,
            firebaseTokens: { displayName: 'aaa' },
            createdAt: new Date('2023-10-15T07:43:53.219'),
            updatedAt: new Date('2023-10-15T07:43:53.219')
        }
    });
    await prisma.worktype.create({
        data: {
            id: 1,
            alternativeId: 'emailDefaultModel',
            title: 'aaa',
            createdAt: new Date('2023-10-15T07:56:47.344')
        }
    });
    await prisma.industry.create({
        data: {
            id: 1,
            alternativeId: 'emailDefaultModel',
            title: 'aaaa',
            createdBy: 1,
        },
    });
    await prisma.companyInfo.create({
        data: {
            id: 1,
            companyName: 'aaa',
            industryId: 1,
            logoUrl: 'aaa',
            companyEmail: 'aaa',
            displayName: 'aaaa'
        }
    });
    await prisma.companyBlockchain.create({
        data: {
            id: 1,
            verified: true,
            verifiedAt: new Date('2023-10-15T07:45:35.740Z'),
            verifiedById: 1,
            deniedAt: new Date('2023-10-15T07:45:35.740Z'),
            deniedById: 1
        }
    });
    await prisma.company.create({
        data: {
            id: 1,
            alternativeId: 'emailDefaultModel',
            companyInfoId: 1,
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
            type: 1,
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
            currentInvoiceId: 1,
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
            companyBlockchainId: 1,
            createdAt: new Date('2023-10-15T07:46:22.047Z'),
            updatedAt: new Date('2023-10-15T07:46:22.047Z'),
            adminId: null,
            costing: {},
            employeeId: 1,
            itemTier: {}
        }
    });
    await prisma.companyadmin.create({
        data: {
            id: 1,
            alternativeId: 'emailDefaultModel',
            userId: 1,
            companyId: 1
        },
    });
    await prisma.priceTier.create({
        data: {
            id: 1,
            alternativeId: 'emailDefaultModel',
            companyId: 1,
            name: 'aaa',
            isActive: true,
            inactiveById: 1,
            inactiveAt: new Date('2023-10-17T04:33:42.640Z'),
            createdAt: new Date('2023-10-17T04:33:42.640Z'),
            updatedAt: new Date('2023-10-17T04:33:42.640Z'),
        },
    });
    await prisma.jobCosting.create({
        data: {
            id: 1,
            alternativeId: 'emailDefaultModel',
            companyId: 1,
            name: 'aaa',
            isActive: true,
            inactiveById: 1,
            inactiveAt: new Date('2023-10-17T04:34:41.483Z'),
            createdAt: new Date('2023-10-17T04:34:41.483Z'),
            updatedAt: new Date('2023-10-17T04:34:41.483Z'),
        },
    });
    await prisma.paymentterm.create({
        data: {
            id: 1,
            alternativeId: 'emailDefaultModel',
            name: 'aaa',
            dueDays: 1,
            isActive: true,
            companyId: 1,
            quickbookId: '1',
            createdById: 1,
            deleteAt: new Date('2023-10-17T04:36:51.105Z'),
            createdAt: new Date('2023-10-17T04:36:51.105Z'),
            updatedAt: new Date('2023-10-17T04:36:51.105Z'),
        },
    });
    await prisma.customer.create({
        data: {
            id: 1,
            alternativeId: 'emailDefaultModel',
            profile: { displayName: 'aaaa' },
            address: { displayName: 'aaaa' },
            location: { displayName: 'aaaa' },
            contact: { displayName: 'aaaa' },
            permissions: "asd",  
            emailPreferences: { displayName: 'aaaa' },
            balance: 0,
            commission: 1,
            isActive: true,
            info: 'aaa',
            contactName: 'aaaa',
            quickbookId: '1',
            credit: 0,
            itemTierId: 1,
            jobCostingId: 1,
            isCustomPrice: false,
            customPrices: { displayName: 'aaaa' },
            discountPrices: { displayName: 'aaaa' },
            paymentTermId: 1,
            vendorId: '1',
            inactiveAt: new Date('2023-10-17T04:37:04.328Z'),
            inactiveById: 1,
            adminId: 1,
            isPORequired: false,
            notes: 'aaa',
        },
    });
    await prisma.contact.create({
        data: {
            id: 1,
            alternativeId: 'emailDefaultModel',
            name: 'aaa',
            phone: 'aaa',
            email: 'aaa',
            isActive: true,
            userId: 1,
            createdAt: new Date('2023-10-17T04:39:31.601'),
            updatedAt: new Date('2023-10-17T04:39:31.601'),
            customerId: 1,
        },
    });
    await prisma.joblocation.create({
        data: {
            id: 1,
            alternativeId: 'emailDefaultModel',
            name: 'aaa',
            contacts: { displayName: 'aaaa' },
            location: { displayName: 'aaaa' },
            address: { displayName: 'aaaa' },
            jobSites: { displayName: 'aaaa' },
            isActive: true,
            customerId: 1,
            companyId: 1,
            inactiveAt: new Date('2023-10-17T04:40:35.810'),
            inactiveById: 1,
            quickbookId: '1',
            createdAt: new Date('2023-10-17T04:40:35.810'),
            updatedAt: new Date('2023-10-17T04:40:35.810'),
        },
    });
    await prisma.jobsite.create({
        data: {
            id: 1,
            alternativeId: 'emailDefaultModel',
            name: 'aaa',
            location: { displayName: 'aaaa' },
            isActive: true,
            address: { displayName: 'aaaa' },
            locationId: 1,
            customerId: 1,
        },
    });
    await prisma.homeOwners.create({
        data: {
            id: 1,
            alternativeId: 'emailDefaultModel',
            profile: { displayName: 'aaaa' },
            info: { displayName: 'aaaa' },
            contact: { displayName: 'aaaa' },
            addressId: 1,
        },
    });
    await prisma.jobType.create({
        data: {
            id: 1,
            alternativeId: 'emailDefaultModel',
            title: 'aa',
            description: 'aa',
            sku: 'aa',
            industryId: 1,
            createdBy: 1,
            isActive: true,
            quickbookId: '1',
            createdAt: new Date('2023-10-17T04:44:24.407'),
            updatedAt: new Date('2023-10-17T04:44:24.407'),
        },
    });
    await prisma.items.create({
        data: {
            id: 1,
            name: 'aaa',
            description: 'aaaa',
            sku: 'aaa',
            isFixed: true,
            charges: 1,
            tax: 1,
            isDiscountItem: true,
            isJobType: true,
            jobTypeId: 1,
            itemType: 'Service',
            productCost: 1,
            salePrice: 1,
            companyId: 1,
            isActive: true,
            quickbookId: '1',
            createdAt: true,
            updatedAt: true,
        },
    });
    await prisma.companyLocation.create({
        data: {
            id: 1,
            alternativeId: 'emailDefaultModel',
            name: 'aaaa',
            isActive: true,
            isMainLocation: true,
            contactName: 'aaa',
            info: { displayName: 'aaaa' },
            address: { displayName: 'aaaa' },
            isAddressAsBillingAddress: false,
            billingAddress: { displayName: 'aaaa' },
            contact: { displayName: 'aaaa' },
            companyId: 1,
            poRequestEmailSender: 'aaaa',
        },
    });
    await prisma.servicetickets.create({
        data: {
            id: 1,
            alternativeId: 'emailDefaultModel',
            createdAt: new Date('2023-10-17T04:47:55.602'),
            dueDate: new Date('2023-10-17T04:47:55.602'),
            customerId: 1,
            createdById: 1,
            note: 'aaa',
            customerContactId: 1,
            customerPO: 'aa',
            image: 'aaa',
            images: { displayName: 'aaaa' },
            companyId: 1,
            technicianId: 1,
            status: 0,
            track: { displayName: 'aaaa' },
            editedById: 1,
            editedAt: new Date('2023-10-17T04:47:55.602'),
            ticketId: '1',
            jobLocationId: 1,
            jobSiteId: 1,
            bouncedEmailFlag: false,
            isHomeOccupied: false,
            homeOwnerId: 1,
            homeJobLocationId: 1,
            homeJobSiteId: 1,
            jobTypeId: 1,
            itemId: 1,
            jobCreated: false,
            source: 'blueclerk',
            workTypeId: 1,
            companyLocationId: 1,
            pooverriddenById: 1,
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

test('Should create email default', async () => {
    const emaildefault = new EmailDefaults(prisma.emailDefault);
    const inputEmail1 = {
        alternativeId: 'testUnique',
        subject:  `Ticket from Test`,
        message: `Dear User Test, \n\nPlease see the attached 3 for the work requested at. \nWe are not able to schedule the work until the po is received. Pricing subject to change due to items being added at the job site and/or item being heavily damaged. \n\nWe look forward to hearing from you at Ticket`,
        companyId: 1,
        updatedBy: 1,
        emailType: 'PO_REQUEST',
    };
    
    const createdEmail1 = await emaildefault.create(inputEmail1);
    expect(createdEmail1.alternativeId).toEqual(inputEmail1.alternativeId);
    expect(createdEmail1.subject).toEqual(inputEmail1.subject);
    expect(createdEmail1.message).toEqual(inputEmail1.message);
    expect(createdEmail1.companyId).toEqual(inputEmail1.companyId);
    expect(createdEmail1.updatedBy).toEqual(inputEmail1.updatedBy);
    expect(createdEmail1.emailType).toEqual(inputEmail1.emailType);
})

test('Should error unique alternativeId when create email default', async () => {
    const emaildefault = new EmailDefaults(prisma.emailDefault);
    const inputEmail1 = {
        alternativeId: 'testUnique',
        subject:  `Ticket from Test`,
        message: `Dear User Test, \n\nPlease see the attached 3 for the work requested at. \nWe are not able to schedule the work until the po is received. Pricing subject to change due to items being added at the job site and/or item being heavily damaged. \n\nWe look forward to hearing from you at Ticket`,
        companyId: 1,
        updatedBy: 1,
        emailType: 'PO_REQUEST',
    };

    try {
        await emaildefault.create(inputEmail1);
    } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Unique constraint failed on the fields: (`alternativeId`)');
    }
});

test('Should update email default', async () => {
    const emaildefault = new EmailDefaults(prisma.emailDefault);
    const inputEmail1 = {
        subject:  `Ticket from Test`,
        message: `Dear User Test, \n\nPlease see the attached 3 for the work requested at. \nWe are not able to schedule the work until the po is received. Pricing subject to change due to items being added at the job site and/or item being heavily damaged. \n\nWe look forward to hearing from you at Ticket`,
        updatedBy: 1,
    };
    
    const emailDefaultToBeUpdated = await emaildefault.findDetail(1, "PO_REQUEST");
    const createdEmail1 = await emaildefault.updateSubjectAndMessage(inputEmail1, emailDefaultToBeUpdated.id);
    expect(createdEmail1.subject).toEqual(inputEmail1.subject);
    expect(createdEmail1.message).toEqual(inputEmail1.message);
    expect(createdEmail1.updatedBy).toEqual(inputEmail1.updatedBy);
})

test('Should error update email default when id company not found', async () => {
    const emaildefault = new EmailDefaults(prisma.emailDefault);
    const inputEmail1 = {
        subject:  `Ticket from Test`,
        message: `Dear User Test, \n\nPlease see the attached 3 for the work requested at. \nWe are not able to schedule the work until the po is received. Pricing subject to change due to items being added at the job site and/or item being heavily damaged. \n\nWe look forward to hearing from you at Ticket`,
        updatedBy: 1,
    };
    
    try {
        await emaildefault.updateSubjectAndMessage(inputEmail1, 111);
    } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('An operation failed because it depends on one or more records that were required but not found.');
    }
})

test('Should get email default by company id and email type', async () => {
    const emaildefault = new EmailDefaults(prisma.emailDefault);
    const inputEmail1 = {
        companyId:  1,
        emailType: "PO_REQUEST"
    };
    
    const getEmailDefault1 = await emaildefault.findDetail(inputEmail1.companyId, inputEmail1.emailType);
    expect(getEmailDefault1.companyId).toBeDefined();
    expect(getEmailDefault1.emailType).toBeDefined();
})

test('Should error get email default by company id and email type wrong', async () => {
    const emaildefault = new EmailDefaults(prisma.emailDefault);
    const inputEmailWithError = {
        companyId:  2,
        emailType: "NonexistentType" 
    };

    try {
        await emaildefault.findDetail(inputEmailWithError.companyId, inputEmailWithError.emailType);
    } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Expected error message');
    }
});

test('should throw an error when unable to find email default', async () => {
    const prismaClient = new PrismaClient();
    prismaClient.emailDefault.findFirst = jest.fn().mockRejectedValue(new Error('Email default not found'));
    const emailDefaults = new EmailDefaults(prismaClient.emailDefault);
    try {
        await emailDefaults.findDetail(123, 'exampleEmailType'); 
    } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toEqual('Email default not found');
    }
});