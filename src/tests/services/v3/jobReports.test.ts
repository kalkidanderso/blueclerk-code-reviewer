import JobReportServices from "../../../services/v3/jobReports";
import { JobReports } from "../../../models/v3/jobReports";
import { Status, JobStatus, DefaultPageSize } from "../../../common/constants";

let jobReportServices: JobReportServices
let mockPrisma = {
    job: {
        findFirst: jest.fn(),
    },
    jobReport: {
        update: jest.fn()
    },
    scan: {
        findMany: jest.fn()
    },
    purchaseOrder: {
        findMany: jest.fn()
    },
    company: {
        findFirst: jest.fn()
    }
};

let mockJobReportsModel: jest.Mocked<JobReports> & {
    create: any,
    updateById: any,
    find: any,
    findWithPagination: any,
    findById: any,
    deleteMany: any,
    totalJobReports: any,
    deleteById: any
} = new JobReports(mockPrisma as any) as any;


describe('JobReportServices', () => {

    beforeEach(() => {
        jobReportServices = new JobReportServices(mockPrisma as any);
        jobReportServices["jobReportsModel"] = mockJobReportsModel;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    
    describe('createJobReport', () => {
        it('should throw an error if no job is found', async () => {
            mockPrisma.job.findFirst = jest.fn(() => undefined);
            mockJobReportsModel.find = jest.fn(async () => {
                return {
                    invoiceId: 1,
                    invoiceCreated: true
                } 
            })
            try {
                await jobReportServices.createJobReport(1, 1, 'Customer Name', 'Technician Name', new Date());
                throw new Error('Test failed, should have thrown an error');
            } catch (error) {
                expect(mockJobReportsModel.find).toHaveBeenCalledTimes(1);
                expect(mockPrisma.job.findFirst).toHaveBeenCalledTimes(1);
                expect(error.message).toBe('Job not found!');
            }
        });

        it('should successfully create a job report', async () => {
            mockPrisma.job.findFirst = jest.fn(async () => ({ id: 1, status: JobStatus.FINISHED }));
            mockPrisma.scan.findMany = jest.fn(async () => [
                {id: 1}, {id: 2}, {id: 3}
            ]);
            mockPrisma.purchaseOrder.findMany = jest.fn(async () => [
                {id: 4}, {id: 5}, {id: 6}
            ]);
            mockJobReportsModel.deleteMany = jest.fn(async () => true);
            mockJobReportsModel.create = jest.fn(async () => 'test');
            mockJobReportsModel.find = jest.fn(async () => {
                return {
                    invoiceId: 1,
                    invoiceCreated: true
                } 
            })
            let myDate = new Date();
            try {
                const response = await jobReportServices.createJobReport(1, 1, 'Customer Name', 'Technician Name', myDate);
                expect(response).toBe('test');
                expect(mockJobReportsModel.create).toHaveBeenCalledTimes(1);
                expect(mockJobReportsModel.create).toHaveBeenCalledWith({
                    jobId: 1,
                    scanIds: [1, 2, 3],
                    customerName: 'Customer Name',
                    technicianName: 'Technician Name',
                    jobDate: myDate,
                    purchaseOrderIds: [4, 5, 6],
                    companyId: 1,
                    contractorId: undefined,
                    emailHistory: [],
                    invoiceCreated: true,
                    invoiceId: 1
                });
                expect(mockJobReportsModel.deleteMany).toHaveBeenCalledTimes(1);
                expect(mockJobReportsModel.find).toHaveBeenCalledTimes(1);
                expect(mockPrisma.scan.findMany).toHaveBeenCalledTimes(1);
                expect(mockPrisma.purchaseOrder.findMany).toHaveBeenCalledTimes(1);
                expect(mockPrisma.job.findFirst).toHaveBeenCalledTimes(1);
            }
            catch(err) {
                throw new Error('should not have failed: ' + err.message);
            }
        });
    });

    describe('getAllJobReports', () => {
        it('should throw an error when an unexpected error occurs', async () => {
            // Setup mocks to simulate an error
            mockJobReportsModel.findWithPagination = jest.fn(() => { throw new Error('Unexpected error')});
            mockJobReportsModel.totalJobReports = jest.fn(async () => 0);
    
            try {
                await jobReportServices.getAllJobReports(1, {});
                throw new Error('Test failed, should have thrown an error');
            } catch (error) {
                expect(error.message).toBe('Unexpected error');
                expect(mockJobReportsModel.findWithPagination).toHaveBeenCalledWith({ 
                    AND: [
                        {
                            OR: [
                                { contractorId: 1 },
                                { companyId: 1 }
                            ]
                        }
                        
                    ]
                }, 0, DefaultPageSize);
                expect(mockJobReportsModel.totalJobReports).toHaveBeenCalledTimes(1);
            }
        });
    
        it('should successfully retrieve job reports with default filters', async () => {
            // Setup mocks for successful retrieval
            mockJobReportsModel.findWithPagination = jest.fn(async () => []);
            mockJobReportsModel.totalJobReports = jest.fn(async () => 10);
    
            const response = await jobReportServices.getAllJobReports(1, {});
            expect(response.status).toBe(Status.Success);
            expect(response.reports).toEqual([]);
            expect(response.total).toBe(10);
            expect(mockJobReportsModel.findWithPagination).toHaveBeenCalledWith({ 
                AND: [
                    {
                        OR: [
                            { contractorId: 1 },
                            { companyId: 1 }
                        ]
                    }
                    
                ]
            }, 0, DefaultPageSize);
            expect(mockJobReportsModel.totalJobReports).toHaveBeenCalledTimes(1);
        });
    
        it('should successfully retrieve job reports with custom filters', async () => {
            // Setup mocks for successful retrieval
            const customFilters = { keyword: 'test', startDate: new Date('2023-01-01'), endDate: new Date('2023-01-31'), currentPage: 1, pageSize: 5 };
            mockJobReportsModel.findWithPagination = jest.fn(async () => []);
            mockJobReportsModel.totalJobReports = jest.fn(async () => 5);
    
            const response = await jobReportServices.getAllJobReports(1, customFilters);
            expect(response.status).toBe(Status.Success);
            expect(response.reports).toEqual([]);
            expect(response.total).toBe(5);
            expect(mockJobReportsModel.findWithPagination).toHaveBeenCalledWith({ 
                AND: [
                    {
                        OR: [
                            { contractorId: 1 },
                            { companyId: 1 }
                        ]
                    },
                    {
                        OR: [
                            { job: { jobId: { contains: 'test', mode: 'insensitive' } } },
                            { customerName: { contains: 'test', mode: 'insensitive' } },
                            { technicianName: { contains: 'test', mode: 'insensitive' } },
                        ]
                    },
                    {
                        jobDate: {
                            gte: new Date('2023-01-01'),
                            lte: new Date('2023-01-31')
                        }
                    }
                ]
            }, 1, 5);
        });
    });

    describe('getJobReportDetails', () => {
        it('should throw an error if no report is found', async () => {
            mockJobReportsModel.findById = jest.fn(async () => undefined);

            try {
                const error = await jobReportServices.getJobReportDetails(1, 1);
                expect(error.message).toBe('No report was found');
                expect(error.status).toBe(Status.NotFound);
            } catch (error) {
                throw new Error('should not have failed: ' + error.message);
            }
        });

        it('should successfully retrieve job report details', async () => {
            const mockReport = { id: 1, details: 'Some report details' };
            mockJobReportsModel.findById = jest.fn(async () => mockReport);

            const response = await jobReportServices.getJobReportDetails(1, 1);
            expect(response.status).toBe(Status.Success);
            expect(response.message).toEqual(mockReport);
            expect(mockJobReportsModel.findById).toHaveBeenCalledWith(1, 1);
        });

        it('should throw an error on unexpected error', async () => {
            mockJobReportsModel.findById = jest.fn(async () => { throw new Error("test error")});

            try {
                const error = await jobReportServices.getJobReportDetails(1, 1);
                expect(error.message).toBe('test error');
                expect(error.status).toBe(Status.Error);
                expect(mockJobReportsModel.findById).toHaveBeenCalledWith(1, 1);
            } catch (error) {
                throw new Error('should not have failed: ' + error.message);
            }
        });
    });

    describe('deleteJobReportById', () => {
        it('should throw an error if no report is found or no permission to delete', async () => {
            mockJobReportsModel.deleteById = jest.fn(() => ({ count: 0 }));

            const error = await jobReportServices.deleteJobReportById(1, 1);
            expect(error.message).toBe('No report found or you do not have permission to delete this report.');
            expect(error.status).toBe(Status.NotFound);
            expect(mockJobReportsModel.deleteById).toHaveBeenCalledWith(1, 1);
        });

        it('should successfully delete a job report', async () => {
            mockJobReportsModel.deleteById = jest.fn(() => ({ count: 1 }));

            const response = await jobReportServices.deleteJobReportById(1, 1);
            expect(response.status).toBe(Status.Success);
            expect(response.message).toBe('Job Report has been deleted successfully!');
            expect(mockJobReportsModel.deleteById).toHaveBeenCalledWith(1, 1);
        });

        it('should throw an error on unexpected error', async () => {
            mockJobReportsModel.deleteById = jest.fn(async () => { throw new Error("test error")});

            const error = await jobReportServices.deleteJobReportById(1, 1);
            expect(error.message).toBe('test error');
            expect(error.status).toBe(Status.Error);
            expect(mockJobReportsModel.deleteById).toHaveBeenCalled();
            expect(mockJobReportsModel.deleteById).toHaveBeenCalledWith(1, 1);
        });
    });
    
    // Tests for sendJobReport method
    describe('sendJobReport', () => {
        const jobReportId = 123;
        const companyId = 456;
        const user = { name: 'Test User' };

        it('should throw an error if report is not found', async () => {
            mockJobReportsModel.findById.mockResolvedValue(null);

            const error = await jobReportServices.sendJobReport(jobReportId, companyId, user);
            expect(error.message).toBe('Report was not found');
            expect(error.status).toBe(Status.NotFound);
        });

        it('should throw an error on unexpected error', async () => {
            mockJobReportsModel.findById = jest.fn(async () => { throw new Error("test error")});

            const error = await jobReportServices.sendJobReport(jobReportId, companyId, user);
            expect(error.message).toBe('test error');
            expect(error.status).toBe(Status.Error);
            expect(mockJobReportsModel.findById).toHaveBeenCalled();
            expect(mockJobReportsModel.findById).toHaveBeenCalledWith(123, 456);
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
            mockPrisma.company.findFirst = jest.fn(() => company);
            
            const error = await jobReportServices.getJobReportEmailTemplate(validReportId, companyId);
            expect(error.message).toBe('Report was not found');
            expect(error.status).toBe(Status.NotFound);
        });

        it('should throw an error on unexpected error', async () => {
            mockJobReportsModel.findById = jest.fn(async () => { throw new Error("test error")});
            mockPrisma.company.findFirst = jest.fn(() => company);

            const error = await jobReportServices.getJobReportEmailTemplate(validReportId, companyId);
            expect(error.message).toBe('test error');
            expect(error.status).toBe(Status.Error);
            expect(mockJobReportsModel.findById).toHaveBeenCalled();
            expect(mockJobReportsModel.findById).toHaveBeenCalledWith(123, 456);
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

            mockPrisma.company.findFirst = jest.fn(() => company);
            mockJobReportsModel.findById.mockResolvedValue(jobReport);

            const response = await jobReportServices.getJobReportEmailTemplate(validReportId, companyId);

            expect(response.status).toBe(Status.Success);
            expect(response.jobReport).toBe(jobReport);
            expect(response.emailTemplate).toBeDefined();
            expect(response.emailTemplate.from).toBe(company.info.companyEmail);
            expect(response.emailTemplate.to).toBe(jobReport.job.customer.info.email);
            expect(response.emailTemplate.subject).toContain(company.info.companyName);
        });
    });
});
