import { PrismaClient } from '@prisma/client';
import { Status } from "../../common/constants"
import { JobReports } from "../../models/v3/jobReports"
import moment from 'moment'; 

const prisma = new PrismaClient();

class JobReportServices {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async createJobReport(jobId: number, companyId: number, customerName: string | null, technicianName: string | null, date: Date, contractorId?: string): Promise<JobReport | null> {
        // Find jobs with specific criteria
        const job = await this.prisma.job.findFirst({
            where: {
                AND: [
                    { id: jobId },
                    { OR: [{ contractorId: companyId }, { companyId }] },
                    { status: 'FINISHED' } 
                ]
            },
            include: {
                scans: true, 
                purchaseOrders: true 
            }
        });
    
        // If no job is found, return null
        if (!job) {
            return null;
        }
    
        // Delete all old reports related to this job
        await this.prisma.jobReports.deleteMany({ where: { jobId: job.id } });
    
        //Create a new job report
        const jobReport = await this.prisma.jobReports.create({
            data: {
                job: { connect: { id: job.id } },
                scans: { connect: job.scans.map(scan => ({ id: scan.id })) },
                purchaseOrders: { connect: job.purchaseOrders.map(po => ({ id: po.id })) },
                jobDate: date,
                customerName,
                technicianName,
                company: { connect: { id: companyId } },
                emailHistory: [], 
                invoiceCreated: job.invoiceCreated || false,
                invoiceVoid: false, 
                invoice: job.invoice ? { connect: { id: job.invoice.id } } : undefined
            }
        });
    
        // If contractorId is provided, update the report to include this information
        if (contractorId) {
            await this.prisma.jobReports.update({
                where: { id: jobReport.id },
                data: { contractor: { connect: { id: contractorId } } }
            });
        }
    
        // Return the created report
        return jobReport;
    }
    

    async getAllJobReports(companyId: string, queryParams: any): Promise<{ status: string, reports: JobReports[], total: number }> {
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
    
        const totalJobReports = await this.prisma.jobReports.count({ where: whereClause });
    
        const jobReports = await this.prisma.jobReport.findMany({
            where: whereClause,
            skip: currentPageNum * pageSizeNum,
            take: pageSizeNum,
            orderBy: { createdAt: 'desc' },
            include: {
                job: {
                    include: {
                        customer: true,
                        jobLocation: true,
                        jobSite: true,
                        tasks: {
                            include: {
                                technician: true,
                                contractor: true,
                                jobType: true,
                            }
                        }
                    }
                },
                scans: true,
                purchaseOrders: true,
                company: true,
                contractor: true,
                invoice: true,
                emailHistory: true,
            }
        });
    
        return {
            status: 'Success',
            reports: jobReports,
            total: totalJobReports,
        };
    }
    

    async getJobReportDetails(jobReportId: string, companyId: string): Promise<{ status: string, report?: any }> {
        try {
            const report = await this.prisma.jobReports.findFirst({
                where: {
                    id: jobReportId,
                    OR: [
                        { contractorId: companyId },
                        { companyId: companyId }
                    ]
                },
                include: {
                    job: {
                        include: {
                            ticket: {
                                select: {
                                    track: true,
                                    jobLocation: true,
                                    jobSite: true,
                                    customerContactId: true,
                                    createdBy: {
                                        select: {
                                            info: true,
                                            auth: true,
                                            profile: true,
                                            address: true,
                                            contactName: true
                                        }
                                    }
                                }
                            },
                            request: {
                                select: {
                                    track: true,
                                    jobLocation: true,
                                    jobSite: true,
                                    customerContact: true,
                                    createdBy: {
                                        select: {
                                            info: true,
                                            auth: true,
                                            profile: true,
                                            address: true,
                                            contactName: true
                                        }
                                    }
                                }
                            },
                            technician: {
                                select: {
                                    profile: true,
                                    auth: true,
                                    contact: true,
                                    permissions: true
                                }
                            },
                            tasks: {
                                include: {
                                    technician: true,
                                    jobType: true,
                                    timeUpdatedBy: {
                                        select: {
                                            profile: true
                                        }
                                    }
                                }
                            },
                            customer: {
                                select: {
                                    info: true,
                                    auth: true,
                                    profile: true,
                                    permissions: true,
                                    address: true,
                                    contact: true,
                                    notes: true
                                }
                            },
                            type: true,
                            company: {
                                select: {
                                    info: true,
                                    auth: true,
                                    profile: true,
                                    permissions: true,
                                    address: true,
                                    contact: true
                                }
                            },
                            createdBy: {
                                select: {
                                    info: true,
                                    auth: true,
                                    profile: true,
                                    permissions: true,
                                    address: true,
                                    contact: true
                                }
                            },
                            homeOwner: true,
                            jobSite: true,
                            jobLocation: true
                        }
                    },
                    scans: {
                        include: {
                            equipment: {
                                include: {
                                    brand: true,
                                    type: true
                                }
                            }
                        }
                    },
                    purchaseOrders: true,
                    invoice: {
                        include: {
                            paymentTerm: true,
                            customerContactId: true
                        }
                    }
                }
            });
    
            if (!report) {
                return { status: 'Error', message: 'No report was found!' };
            }
    
            return { status: 'Success', report: report };
        } catch (err) {
            return { status: 'Error', message: err.message };
        }
    }
    

    async deleteJobReportById(jobReportId: string, companyId: string): Promise<{ status: string, message: string }> {
        try {
            //Perform delete operation
            const deleteResult = await this.prisma.jobReports.deleteMany({
                where: {
                    id: jobReportId,
                    OR: [
                        { contractorId: companyId },
                        { companyId: companyId }
                    ]
                }
            });
    
            // Check if any reports have been deleted
            if (deleteResult.count === 0) {
                return { status: 'Error', message: 'No report found or you do not have permission to delete this report.' };
            }
    
            return { status: 'Success', message: 'Job Report has been deleted successfully!' };
        } catch (err) {
            // error handling
            return { status: 'Error', message: err.message };
        }
    }
    

    async sendJobReport(jobReportId: string, companyId: string, user: any): Promise<{ status: string, message: string }> {
        try {
            // Find work report
            const report = await this.prisma.jobReports.findFirst({
                where: {
                    id: jobReportId,
                    OR: [
                        { contractorId: companyId },
                        { companyId: companyId }
                    ]
                },
                include: {
                    // Contains the relevant information needed and adjust it according to your needs
                    job: true, 
                    scans: true,
                }
            });
    
            // Check if the report exists
            if (!report) {
                return { status: 'Error', message: 'Report was not found' };
            }
    
            //  Add logic for sending reports
            // For example, send an email to a customer or related person
    
            // Update reports, for example setting the last time an email was sent
            await this.prisma.jobReports.update({
                where: { id: report.id },
                data: {
                    lastEmailSent: new Date() //Set the current time as the last email sending time
                }
            });
    
            return { status: 'Success', message: 'Job Report has been sent successfully!' };
        } catch (err) {
            // error handling
            return { status: 'Error', message: err.message };
        }
    }

    async getJobReportEmailTemplate(jobReportId: string, companyId: string, company: Company): Promise<{ status: string, jobReport?: JobReport, emailTemplate?: any }> {
        try {
            const jobReport = await this.prisma.jobReports.findFirst({
                where: {
                    id: jobReportId,
                    OR: [
                        { contractorId: companyId },
                        { companyId: companyId }
                    ]
                },
                include: {
                    job: {
                        include: {
                            ticket: true,
                            request: true,
                            technician: true,
                            tasks: {
                                include: {
                                    technician: true,
                                    jobType: true
                                }
                            },
                            customer: true,
                            customerContactId: true,
                            type: true,
                            company: true,
                            createdBy: true,
                            homeOwner: true,
                            jobLocation: true,
                            jobSite: true
                        }
                    },
                    scans: {
                        include: {
                            equipment: {
                                include: {
                                    brand: true,
                                    type: true
                                }
                            }
                        }
                    },
                    purchaseOrders: true,
                    invoice: {
                        include: {
                            paymentTerm: true,
                            customerContactId: true
                        }
                    }
                }
            });
    
            if (!jobReport) {
                return { status: 'Error', message: "Report was not found" };
            }
    
            // 构建电子邮件模板
            const jobTypes = jobReport.job.tasks?.flatMap(task => task.jobType?.map(jobType => `${jobType.title} (${jobType.description})`)) ?? [];
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
                status: 'Success',
                jobReport: jobReport,
                emailTemplate: emailTemplate
            };
        } catch (err) {
            return { status: 'Error', message: err.message };
        }
    }
    
}

export default JobReportServices;
