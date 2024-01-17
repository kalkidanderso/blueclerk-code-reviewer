import { PrismaClient } from '@prisma/client'
import { Status, JobStatus, DefaultPageSize, Messages } from "../../common/constants"
import { JobReports } from "../../models/v3/jobReports"
import { ICreateJobReportsInput, IJobReportsQueryParams } from '../../types/v3/jobReports'
import moment from 'moment'; 

class JobReportServices {
    constructor(private readonly prisma: PrismaClient) {}

    private jobReportsModel = new JobReports(this.prisma.jobReport);

    async createJobReport(jobId: number, companyId: number, customerName: string | null, technicianName: string | null, date: Date, contractorId?: number): Promise<any> {
        // Find old job reports
        const oldJobReport = await this.jobReportsModel.find({where:{ jobId: jobId }});
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
            throw new Error('Job not found!');
        }
        // Delete all old reports related to this job
        await this.jobReportsModel.deleteMany({ where: { jobId: job.id } });
        const scans = await this.prisma.scan.findMany({
            where: {
                jobId: jobId
            }
        });
        const purchaseOrders = await this.prisma.purchaseOrder.findMany({
            where: {
                jobId: jobId
            }
        })
        //Create a new job report
        const jobReport: ICreateJobReportsInput = {
            jobId: job.id,
            scanIds: scans.map(scan => scan.id),
            customerName,
            technicianName,
            jobDate: date,
            purchaseOrderIds: purchaseOrders.map(po => po.id),
            companyId,
            contractorId,
            emailHistory: [],
        };
        if (oldJobReport) {
            // Case when job is reopen from completed status
            jobReport.invoiceId = oldJobReport.invoiceId;
            jobReport.invoiceCreated = oldJobReport.invoiceCreated;   
        }
        // Return the created report
        return await this.jobReportsModel.create(jobReport);
    }

    async getAllJobReports(companyId: number, {
        keyword,
        startDate,
        endDate,
        currentPage = 0,
        pageSize = DefaultPageSize
    }: IJobReportsQueryParams): Promise<{ status: number, reports: any[], total: number }> {
        const whereClause: { AND: any[]} = {
            AND: [
                {
                    OR: [
                        { contractorId: companyId },
                        { companyId: companyId }
                    ]
                }
                
            ]
        };

        if (keyword) {
            whereClause.AND.push({
                OR: [
                    { job: { jobId: { contains: keyword, mode: 'insensitive' } } },
                    { customerName: { contains: keyword, mode: 'insensitive' } },
                    { technicianName: { contains: keyword, mode: 'insensitive' } },
                ]
            });
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
    
        const totalJobReports = await this.jobReportsModel.totalJobReports(whereClause);
    
        const jobReports = await this.jobReportsModel.findWithPagination(whereClause, currentPage, pageSize)
    
        return {
            status: Status.Success,
            reports: jobReports,
            total: totalJobReports,
        };
    }
    

    async getJobReportDetails(jobReportId: number, companyId: number): Promise<{ status: number, message?: any }> {
        try {
            const report = await this.jobReportsModel.findById(jobReportId, companyId);
    
            if (!report) {
                return { status: Status.NotFound, message: Messages.ReportNotFound };
            }
    
            return { status: Status.Success, message: report };
        } catch (err) {
            return { status: Status.Error, message: err.message };
        }
    }
    

    async deleteJobReportById(jobReportId: number, companyId: number): Promise<{ status: number, message: string }> {
        try {
            //Perform delete operation
            const deleteResult = await this.jobReportsModel.deleteById(jobReportId, companyId)
    
            // Check if any reports have been deleted
            if (deleteResult.count === 0) {
                return { status: Status.NotFound, message: Messages.ReportNotFound };
            }
    
            return { status: Status.Success, message: 'Job Report has been deleted successfully!' };
        } catch (err) {
            // error handling
            return { status: Status.Error, message: err.message };
        }
    }
    

    async sendJobReport(jobReportId: number, companyId: number, user: any): Promise<{ status: number, message: string }> {
        try {
            // Find work report
            const report = await this.jobReportsModel.findById(jobReportId, companyId);
    
            // Check if the report exists
            if (!report) {
                return { status: Status.NotFound, message: Messages.ReportNotFound };
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
    async getJobReportEmailTemplate(jobReportId: number, companyId: number): Promise<{ status: number, jobReport?: JobReports, emailTemplate?: any, message?: any}> {
        try {
            const jobReport = await this.jobReportsModel.findById(jobReportId, companyId);
            // TODO CHANGE BY REQ.COMPANY ?
            const company = await this.prisma.company.findFirst({
                where: { id: companyId },
                include: {
                    info: true
                }
            })
            if (!jobReport) {
                return { status: Status.NotFound, message: Messages.ReportNotFound };
            }    
    
            // TODO REMOVE UNUSED ?
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
