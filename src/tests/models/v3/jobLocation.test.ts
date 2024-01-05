import { JobLocations } from '../../../models/v3/jobLocations'

// Mock the prisma object
let mockPrisma = {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
};

let jobLocation : JobLocations

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

beforeEach(async()=>{
    jobLocation = new JobLocations(mockPrisma as any);
})

afterAll(()=>{
    jest.clearAllMocks();
})

describe('Create JobLocations', () => {
    it('Should create job location', async () => {
        mockPrisma.create = jest.fn(() => {
            return input;
        })
        const location = await jobLocation.create(input);
        expect(mockPrisma.create).toHaveBeenCalled();
        expect(location.alternativeId).toBeDefined();
    })

    it('Should not create job location on error', async () => {
        mockPrisma.create = jest.fn(() => {
            throw new Error("test");
        })
        try {
            await jobLocation.create(input);
            fail('Test should have failed but it did not');
        }
        catch(err) {
            expect(mockPrisma.create).toHaveBeenCalled();
            expect(err.message).toBeDefined();
        }
    })
})

describe('JobLocations', () => {
    it('Should update job location by id', async () => {
        mockPrisma.update = jest.fn(() => {
            return input;
        })
        const updateJobLocationById = await jobLocation.updateById({id: 1, ...input});
        expect(mockPrisma.update).toHaveBeenCalled();
        expect(updateJobLocationById.alternativeId).toBeDefined();
    })

    it('Should not update job location by id', async () => {
        mockPrisma.update = jest.fn(() => {
            throw new Error("test");
        })
        try {
            await jobLocation.updateById({id: 3, ...input});
            fail('Test should have failed but it did not');
        }
        catch(err) {
            expect(mockPrisma.update).toHaveBeenCalled();
            expect(err.message).toBeDefined();
        }
    })
})

describe('updateById JobLocations', () => {
    it('Should update job location by id', async () => {
        mockPrisma.update = jest.fn(() => {
            return input;
        })
        const updateJobLocationById = await jobLocation.updateById({id: 1, ...input});
        expect(mockPrisma.update).toHaveBeenCalled();
        expect(updateJobLocationById.alternativeId).toBeDefined();
    })

    it('Should not update job location by id', async () => {
        mockPrisma.update = jest.fn(() => {
            throw new Error("test");
        })
        try {
            await jobLocation.updateById({id: 3, ...input});
            fail('Test should have failed but it did not');
        }
        catch(err) {
            expect(mockPrisma.update).toHaveBeenCalled();
            expect(err.message).toBeDefined();
        }
    })
})

describe('update JobLocations', () => {
    it('Should update job location by id', async () => {
        mockPrisma.update = jest.fn(() => {
            return input;
        })
        const updateJobLocationById = await jobLocation.update({id: 1, data: input});
        expect(mockPrisma.update).toHaveBeenCalled();
        expect(updateJobLocationById.alternativeId).toBeDefined();
    })

    it('Should not update job location by id', async () => {
        mockPrisma.update = jest.fn(() => {
            throw new Error("test");
        })
        try {
            await jobLocation.update({id: 3, data: input});
            fail('Test should have failed but it did not');
        }
        catch(err) {
            expect(mockPrisma.update).toHaveBeenCalled();
            expect(err.message).toBeDefined();
        }
    })
})

describe('deleteById JobLocations', () => {
    it('Should delete job location by id', async () => {
        mockPrisma.delete = jest.fn(() => {
            return input;
        })
        const location = await jobLocation.deleteById(1);
        expect(mockPrisma.delete).toHaveBeenCalled();
        expect(location.alternativeId).toBeDefined();
    })

    it('Should not delete job location by id', async () => {
        mockPrisma.delete = jest.fn(() => {
            throw new Error("test");
        })
        try {
            await jobLocation.deleteById(1);
            fail('Test should have failed but it did not');
        }
        catch(err) {
            expect(mockPrisma.delete).toHaveBeenCalled();
            expect(err.message).toBeDefined();
        }
    })
})