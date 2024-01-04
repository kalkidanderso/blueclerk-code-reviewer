import { JobReports } from '../../../models/v3/jobReports';
import { ICreateJobReportsInput } from "../../../types/v3/jobReports";

class CustomError extends Error {
    code: string;
    meta: {
        field_name?: string;
    };
    constructor(fieldName: string, code: string, message?: string) {
        super(message || '');
        this.meta = { field_name: fieldName };
        this.code = code;
    }
}

let mockPrisma = {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),     
    count: jest.fn(), 
    findFirst: jest.fn()
};

let jobReports: JobReports;

beforeEach(() => {
    jobReports = new JobReports(mockPrisma as any);
});

afterAll(() => {
    jest.clearAllMocks();
});

// Sample input and return object
const input: ICreateJobReportsInput = {
    jobId: 123,
    scanIds: [101, 102, 103],
    customerName: "Acme Corp",
    technicianName: "Jane Doe",
    jobDate: new Date('2023-01-01'),
    purchaseOrderIds: [301, 302],
    companyId: 10,
    contractorId: 20,
    emailHistory: [
        { sentTo: "customer@example.com", sentAt: new Date('2023-01-02') },
        { sentTo: "followup@example.com", sentAt: new Date('2023-01-03') }
    ],
    lastEmailSent: new Date('2023-01-04'),
    createdAt: new Date('2023-01-01'),
    invoiceCreated: true,
    invoiceVoid: false,
    invoiceId: 400
};

const jobReportReturn = {
    jobId: input.jobId,
    scans: input?.scanIds?.map(id => ({ id })),
    customerName: input.customerName,
    technicianName: input.technicianName,
    jobDate: input.jobDate,
    purchaseOrders: input?.purchaseOrderIds?.map(id => ({ id })),
    companyId: input.companyId,
    contractorId: input.contractorId,
    emailHistory: input.emailHistory,
    lastEmailSent: input.lastEmailSent,
    createdAt: input.createdAt,
    invoiceCreated: input.invoiceCreated,
    invoiceVoid: input.invoiceVoid,
    invoiceId: input.invoiceId
};

describe('JobReports tests', () => {
    // Creation of test report
    it('create job report successfully', async () => {
        mockPrisma.create = jest.fn().mockResolvedValue(input);
        const result = await jobReports.create(input);
        expect(mockPrisma.create).toHaveBeenCalled();
        expect(result).toEqual(input);
    });

    it('create job report with database error', async () => {
        mockPrisma.create = jest.fn(() => {
            throw new CustomError('jobId', 'P2002', 'Unique constraint failed on the field: jobId');
        });
        try {
            await jobReports.create(input);
            fail('Test should have failed but it did not');
        } catch (error) {
            expect(mockPrisma.create).toHaveBeenCalled();
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Unique constraint failed on the field: jobId');
        }
    });

    // Creation of test update
    it('update job report successfully', async () => {
        mockPrisma.update = jest.fn().mockResolvedValue(jobReportReturn);
        const result = await jobReports.updateById(1, input);
        expect(mockPrisma.update).toHaveBeenCalled();
        expect(result).toEqual(jobReportReturn);
    });

    it('update job report with database error', async () => {
        mockPrisma.update = jest.fn(() => {
            throw new CustomError('jobId', 'P2002', 'Constraint failed on the field: jobId');
        });
        try {
            await jobReports.updateById(1, input);
            fail('Test should have failed but it did not');
        } catch (error) {
            expect(mockPrisma.update).toHaveBeenCalled();
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Constraint failed on the field: jobId');
        }
    });

    //Test find report by ID
    it('find job report by id successfully', async () => {
        mockPrisma.findFirst = jest.fn().mockResolvedValue(jobReportReturn);
        const result = await jobReports.findById(1, 1);
        expect(mockPrisma.findFirst).toHaveBeenCalled();
        expect(result).toEqual(jobReportReturn);
    });

    it('find job report by id with database error', async () => {
        mockPrisma.findFirst = jest.fn(() => {
            throw new CustomError('id', 'P2025', 'Record not found.');
        });
        try {
            await jobReports.findById(1, 1);
            fail('Test should have failed but it did not');
        } catch (error) {
            expect(mockPrisma.findFirst).toHaveBeenCalled();
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Record not found.');
        }
    });

    //Test to find the report by condition
    it('find job reports successfully', async () => {
        mockPrisma.findMany = jest.fn().mockResolvedValue([jobReportReturn]);
        const result = await jobReports.find(1);
        expect(mockPrisma.findMany).toHaveBeenCalled();
        expect(result).toEqual([jobReportReturn]);
    });

    it('find job reports with database error', async () => {
        mockPrisma.findMany = jest.fn(() => {
            throw new CustomError('query', 'P2000', 'Query error');
        });
        try {
            await jobReports.find(1);
            fail('Test should have failed but it did not');
        } catch (error) {
            expect(mockPrisma.findMany).toHaveBeenCalled();
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Query error');
        }
    });

    //Test deleting report by ID
    it('delete job report by id successfully', async () => {
        mockPrisma.deleteMany = jest.fn().mockResolvedValue(jobReportReturn);
        const result = await jobReports.deleteById(1, 1);
        expect(mockPrisma.deleteMany).toHaveBeenCalled();
        expect(result).toEqual(jobReportReturn);
    });

    it('delete job report by id with database error', async () => {
        mockPrisma.deleteMany = jest.fn(() => {
            throw new CustomError('id', 'P2025', 'Record to delete does not exist.');
        });
        try {
            await jobReports.deleteById(1, 1);
            fail('Test should have failed but it did not');
        } catch (error) {
            expect(mockPrisma.deleteMany).toHaveBeenCalled();
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('Record to delete does not exist.');
        }
    });
});