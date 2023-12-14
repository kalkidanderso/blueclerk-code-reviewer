import { PrismaClient } from '@prisma/client';
import { Status, JobStatus } from "../../common/constants"
import { JobReports } from "../../models/v3/jobReports"
import moment from 'moment'; 

const prisma = new PrismaClient();
const jobReportsModel = new JobReports(prisma.jobReport);
class JobReportServices {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async createJobReport(jobId: number, companyId: number, customerName: string | null, technicianName: string | null, date: Date, contractorId?: number): Promise<any> {
        // Find jobs with specific criteria
        const job = await this.prisma.job.findFirst({
            where: {
                AND: [
                    { id: jobId },
                    { OR: [{ contractorId: companyId }, { companyId }] },
                    { status: JobStatus.FINISHED } 
                ]
            }
        });
    
        // If no job is found, return error message
        if (!job) {
            return { status: Status.Error, message: 'Job not found!' }; // TODO THROW AN ERROR
        }
    
        // Delete all old reports related to this job
        await jobReportsModel.deleteMany({ where: { jobId: job.id } });
    
        //Create a new job report
        const jobReport = await jobReportsModel.create({
            jobId: job.id,
            scanIds: [], //TODO
            customerName,
            technicianName,
            jobDate: date,
            purchaseOrderIds: [], //TODO
            companyId,
            contractorId,
            emailHistory: [],
        });
    
        // Return the created report
        return { status: Status.Success, message: 'Job report created successfully' };
    }
    

    async getAllJobReports(companyId: string, queryParams: any): Promise<{ status: number, reports: any[], total: number }> {
        const { keyword, startDate, endDate, currentPage = 0, pageSize = 10 } = queryParams;
        let currentPageNum = parseInt(currentPage);
        let pageSizeNum = parseInt(pageSize);
    
        let whereClause: any = {
            OR: [
                { contractorId: companyId },
                { companyId: companyId }
            ]
        };
    
        if (keyword) {
            whereClause.AND = {
                OR: [
                    { job: { jobId: { contains: keyword, mode: 'insensitive' } } },
                    { customerName: { contains: keyword, mode: 'insensitive' } },
                    { technicianName: { contains: keyword, mode: 'insensitive' } },
                ]
            };
        }
    
        if (startDate && endDate) {
            if (!whereClause.AND) whereClause.AND = [];
            whereClause.AND.push({
                jobDate: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            });
        }
    
        const totalJobReports = await jobReportsModel.totalJobReports(whereClause);
    
        const jobReports = await jobReportsModel.findWithPagination(whereClause, currentPageNum, pageSizeNum)
    
        return {
            status: Status.Success,
            reports: jobReports,
            total: totalJobReports,
        };
    }
    

    async getJobReportDetails(jobReportId: number, companyId: number): Promise<{ status: number, message?: any }> {
        try {
            const report = await jobReportsModel.findById(jobReportId, companyId);
    
            if (!report) {
                return { status: Status.Error, message: 'No report was found!' };
            }
    
            return { status: Status.Success, message: report };
        } catch (err) {
            return { status: Status.Error, message: err.message };
        }
    }
    

    async deleteJobReportById(jobReportId: number, companyId: number): Promise<{ status: number, message: string }> {
        try {
            //Perform delete operation
            const deleteResult = await jobReportsModel.deleteById(jobReportId, companyId)
    
            // Check if any reports have been deleted
            if (deleteResult.count === 0) {
                return { status: Status.Error, message: 'No report found or you do not have permission to delete this report.' };
            }   // TODO CHANGE STATUS
    
            return { status: Status.Success, message: 'Job Report has been deleted successfully!' };
        } catch (err) {
            // error handling
            return { status: Status.Error, message: err.message }; // TODO CHANGE STATUS
        }
    }
    

    async sendJobReport(jobReportId: number, companyId: number, user: any): Promise<{ status: number, message: string }> {
        try {
            // Find work report
            const report = await jobReportsModel.findById(jobReportId, companyId);
    
            // Check if the report exists
            if (!report) {
                return { status: Status.Error, message: 'Report was not found' };
            }
    
            //  Add logic for sending reports
            // For example, send an email to a customer or related person
            // Update reports, for example setting the last time an email was sent
            await this.prisma.jobReport.update({
                where: { id: report.id },
                data: {
                    lastEmailSent: new Date() //Set the current time as the last email sending time
                }
            });
    
            return { status: Status.Success, message: 'Job Report has been sent successfully!' };
        } catch (err) {
            // error handling
            return { status: Status.Error, message: err.message };
        }
    }

    // TODO CHANGE ANY
    async getJobReportEmailTemplate(jobReportId: number, companyId: number, company: any): Promise<{ status: number, jobReport?: JobReports, emailTemplate?: any, message?: any}> {
        try {
            const jobReport = await jobReportsModel.findById(jobReportId, companyId);
    
            if (!jobReport) {
                return { status: Status.Error, message: "Report was not found" };
            }    
    
            const jobTypes = jobReport.job.tasks?.flatMap((task: { jobType: any[]; }) => task.jobType?.map(jobType => `${jobType.title} (${jobType.description})`)) ?? [];
            const customerEmail = jobReport.job.customer?.info?.email;
            const customerName = jobReport.job.customer?.profile?.displayName;
            const companyName = company.info?.companyName;
            const companyEmail = company.info?.companyEmail;
            const reportNumber = jobReport.job.jobId;
            const jobLocation = jobReport.job.jobLocation?.name;
            const workDate = moment(jobReport.jobDate).format('MMMM DD, YYYY');
    
            const emailTemplate = {
                from: companyEmail,
                to: customerEmail,
                subject: `${companyName} has sent you a job report`,
                message: `Dear ${customerName},\n\nPlease see Job Report ${reportNumber} from ${companyName} for the job at ${jobLocation} on ${workDate}.\n\nThank you for doing business with ${companyName}.\n\n${companyName}`
            };
    
            return {
                status: Status.Success,
                jobReport: jobReport,
                emailTemplate: emailTemplate
            };
        } catch (err) {
            return {status: Status.Error, message: err.message };
        }
    }
    
}

export default JobReportServices;
