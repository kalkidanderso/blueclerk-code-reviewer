import JobReportServices from "../../../services/v3/jobReports";
import { JobReports } from "../../../models/v3/jobReports";
import { PrismaClient } from "@prisma/client";
import { Status, JobStatus } from "../../../common/constants";

jest.mock('@prisma/client', () => {
    const originalModule = jest.requireActual('@prisma/client');

    return {
        __esModule: true,
        ...originalModule,
        PrismaClient: jest.fn().mockImplementation(() => ({
            job: {
                findFirst: jest.fn(),
                create: jest.fn(),
                deleteMany: jest.fn(),
            },
        })),
    };
});

jest.mock('@prisma/client');
jest.mock('../../models/v3/jobReports');

describe('JobReportServices', () => {
    let jobReportServices: JobReportServices;
    let mockJobReportsModel: JobReports;
    let mockPrisma: PrismaClient;

    beforeEach(() => {
        mockPrisma = new PrismaClient();
        mockJobReportsModel = new JobReports(mockPrisma.jobReport);
        jobReportServices = new JobReportServices(mockPrisma);
        mockPrisma.job.findFirst = jest.fn().mockResolvedValue(null);
        mockJobReportsModel.create = jest.fn().mockResolvedValue({});
        mockJobReportsModel.deleteMany = jest.fn().mockReturnValue({ count: 1 });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    
    describe('createJobReport', () => {
        it('should throw an error if no job is found', async () => {
            mockPrisma.job.findFirst.mockResolvedValue(null);

            try {
                await jobReportServices.createJobReport(1, 1, 'Customer Name', 'Technician Name', new Date());
                throw new Error('Test failed, should have thrown an error');
            } catch (error) {
                expect(error.message).toBe('Job not found!');
            }
        });

        it('should throw an error if no job is found', async () => {
            mockPrisma.job.findFirst.mockResolvedValue(null);
        });
    
        it('should successfully create a job report', async () => {
            mockPrisma.job.findFirst.mockResolvedValue({ id: 1, status: JobStatus.FINISHED });
    
        });

        it('should successfully create a job report', async () => {
            mockPrisma.job.findFirst.mockResolvedValue({ id: 1, status: JobStatus.FINISHED });
            mockJobReportsModel.deleteMany.mockResolvedValue(true);
            mockJobReportsModel.create.mockResolvedValue({});

            const response = await jobReportServices.createJobReport(1, 1, 'Customer Name', 'Technician Name', new Date());
            expect(response.status).toBe(Status.Success);
            expect(response.message).toBe('Job report created successfully');
        });
    });

    describe('getAllJobReports', () => {
        it('should throw an error when an unexpected error occurs', async () => {
            // Setup mocks to simulate an error
            mockJobReportsModel.findWithPagination.mockRejectedValue(new Error('Unexpected error'));
            mockJobReportsModel.totalJobReports.mockResolvedValue(0);
    
            try {
                await jobReportServices.getAllJobReports('company-id', {});
                throw new Error('Test failed, should have thrown an error');
            } catch (error) {
                expect(error.message).toBe('Unexpected error');
            }
        });
    
        it('should successfully retrieve job reports with default filters', async () => {
            // Setup mocks for successful retrieval
            mockJobReportsModel.findWithPagination.mockResolvedValue([]);
            mockJobReportsModel.totalJobReports.mockResolvedValue(10);
    
            const response = await jobReportServices.getAllJobReports('company-id', {});
            expect(response.status).toBe(Status.Success);
            expect(response.reports).toEqual([]);
            expect(response.total).toBe(10);
        });
    
        it('should successfully retrieve job reports with custom filters', async () => {
            // Setup mocks for successful retrieval
            const customFilters = { keyword: 'test', startDate: '2023-01-01', endDate: '2023-01-31', currentPage: '1', pageSize: '5' };
            mockJobReportsModel.findWithPagination.mockResolvedValue([]);
            mockJobReportsModel.totalJobReports.mockResolvedValue(5);
    
            const response = await jobReportServices.getAllJobReports('company-id', customFilters);
            expect(response.status).toBe(Status.Success);
            expect(response.reports).toEqual([]);
            expect(response.total).toBe(5);
        });
    });

    describe('getJobReportDetails', () => {
        it('should throw an error if no report is found', async () => {
            mockJobReportsModel.findById.mockResolvedValue(null);

            try {
                await jobReportServices.getJobReportDetails(1, 1);
                throw new Error('Test failed, should have thrown an error');
            } catch (error) {
                expect(error.message).toBe('No report was found!');
            }
        });

        it('should successfully retrieve job report details', async () => {
            const mockReport = { id: 1, details: 'Some report details' };
            mockJobReportsModel.findById.mockResolvedValue(mockReport);

            const response = await jobReportServices.getJobReportDetails(1, 1);
            expect(response.status).toBe(Status.Success);
            expect(response.message).toEqual(mockReport);
        });
    });

    describe('deleteJobReportById', () => {
        it('should throw an error if no report is found or no permission to delete', async () => {
            mockJobReportsModel.deleteById.mockResolvedValue({ count: 0 });

            try {
                await jobReportServices.deleteJobReportById(1, 1);
                throw new Error('Test failed, should have thrown an error');
            } catch (error) {
                expect(error.message).toBe('No report found or you do not have permission to delete this report.');
            }
        });

        it('should successfully delete a job report', async () => {
            mockJobReportsModel.deleteById.mockResolvedValue({ count: 1 });

            const response = await jobReportServices.deleteJobReportById(1, 1);
            expect(response.status).toBe(Status.Success);
            expect(response.message).toBe('Job Report has been deleted successfully!');
        });
    });
    
    // Tests for sendJobReport method
    describe('sendJobReport', () => {
        const jobReportId = 123;
        const companyId = 456;
        const user = { name: 'Test User' };

        it('should throw an error if report is not found', async () => {
            mockJobReportsModel.findById.mockResolvedValue(null);

            try {
                await jobReportServices.sendJobReport(jobReportId, companyId, user);
                throw new Error('Test failed, should have thrown an error');
            } catch (error) {
                expect(error.message).toBe('Report was not found');
            }
        });

        it('should successfully send a job report', async () => {
            const report = { id: jobReportId, companyId: companyId };
            mockJobReportsModel.findById.mockResolvedValue(report);
            mockPrisma.jobReport.update.mockResolvedValue({ ...report, lastEmailSent: new Date() });

            try {
                const response = await jobReportServices.sendJobReport(jobReportId, companyId, user);
                expect(response.status).toBe(Status.Success);
                expect(response.message).toBe('Job Report has been sent successfully!');
            } catch (error) {
                throw new Error(`Unexpected error: ${error}`);
            }
        });
    });

    describe('getJobReportEmailTemplate', () => {
        const validReportId = 123;
        const companyId = 456;
        const company = { info: { companyName: 'Test Company', companyEmail: 'test@test.com' } };

        it('should throw an error if no job report is found', async () => {
            mockJobReportsModel.findById.mockResolvedValue(null);

            try {
                await jobReportServices.getJobReportEmailTemplate(validReportId, companyId, company);
                throw new Error('Test failed, should have thrown an error');
            } catch (error) {
                expect(error.message).toBe('Report was not found');
            }
        });

        it('should successfully return an email template for a job report', async () => {
            const jobReport = {
                job: {
                    tasks: [{ jobType: [{ title: 'Job Type 1', description: 'Description 1' }] }],
                    customer: { info: { email: 'customer@test.com' }, profile: { displayName: 'Customer Name' } },
                    jobLocation: { name: 'Location Name' },
                    jobId: '1234',
                },
                jobDate: new Date('2023-01-01'),
            };
            mockJobReportsModel.findById.mockResolvedValue(jobReport);

            const response = await jobReportServices.getJobReportEmailTemplate(validReportId, companyId, company);

            expect(response.status).toBe(Status.Success);
            expect(response.jobReport).toBe(jobReport);
            expect(response.emailTemplate).toBeDefined();
            expect(response.emailTemplate.from).toBe(company.info.companyEmail);
            expect(response.emailTemplate.to).toBe(jobReport.job.customer.info.email);
            expect(response.emailTemplate.subject).toContain(company.info.companyName);
        });
    });


});
