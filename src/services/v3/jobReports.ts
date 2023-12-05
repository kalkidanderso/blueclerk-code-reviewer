import { PrismaClient } from '@prisma/client';
import { Status } from "../../common/constants"
import { JobReports } from "../../models/v3/jobReports"
import moment from 'moment'; // 假设使用 moment.js 处理日期

const prisma = new PrismaClient();

export const createJobReport = async (jobId: string, companyId: string, customerName: string | null, technicianName: string | null, date: Date, contractorId?: string) => {

    const job = await prisma.job.findFirst({
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

    if (!job) {
        return null;
    }

    await prisma.jobReports.deleteMany({ where: { jobId: job.id } });

    const jobReport = await prisma.jobReports.create({
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

    if (contractorId) {
        await prisma.jobReports.update({
            where: { id: jobReport.id },
            data: { contractor: { connect: { id: contractorId } } }
        });
    }

    return jobReport;
};

export const getAllJobReports = async (req: Request, res: Response) => {
    const params = req.query;
    const companyId = req.companyId;
    let currentPage = parseInt(params.currentPage) || 0;
    let pageSize = parseInt(params.pageSize) || 10;

    let whereClause: any = {
        OR: [
            { contractorId: companyId },
            { companyId: companyId }
        ]
    };

    if (params.keyword) {
        whereClause.AND = {
            OR: [
                { job: { jobId: { contains: params.keyword, mode: 'insensitive' } } },
                { customerName: { contains: params.keyword, mode: 'insensitive' } },
                { technicianName: { contains: params.keyword, mode: 'insensitive' } },
                { 'jobObj.customerObj.profile.displayName': { contains: keyword, mode: 'insensitive' } },
                { 'jobObj.jobLocationObj.address.street': { contains: keyword, mode: 'insensitive' } },
                { 'jobObj.jobSiteObj.name': { contains: keyword, mode: 'insensitive' } },
                { 'jobObj.technicianObj.profile.displayName': { contains: keyword, mode: 'insensitive' } },
                { 'jobObj.contractorsObj.info.companyName': { contains: keyword, mode: 'insensitive' } },
            ]
        };
    }

    if (params.startDate && params.endDate) {
        whereClause.AND.push({
            jobDate: {
                gte: new Date(params.startDate),
                lte: new Date(params.endDate)
            }
        });
    }

    const totalJobReports = await prisma.jobReports.count({ where: whereClause });

    const jobReports = await prisma.jobReport.findMany({
        where: whereClause,
        skip: currentPage * pageSize,
        take: pageSize,
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
    

    return res.json({
        status: 'Success',
        reports: jobReports,
        total: totalJobReports,
    });
};


export const getJobReportDetails = async (req: Request, res: Response) => {
    const jobReportId = req.query.jobReportId;
    const companyId = req.companyId;

    try {
        const report = await prisma.jobReports.findFirst({
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

        if (report) {
            return res.json({ 'status' : 'Success', 'report': report });
        } else {
            return res.json({ 'status' : 'Success', 'message': 'No report was found!' });
        }
    } catch (err) {
        return res.json({ 'status': 'Error', 'message': err.message });
    }
};

export const deleteJobReportById = async (req: Request, res: Response) => {
    const jobReportId = req.query.jobReportId;
    const companyId =  req.companyId;

    try {
        await prisma.jobReports.deleteMany({
            where: {
                id: jobReportId,
                OR: [
                    { contractorId: companyId },
                    { companyId: companyId }
                ]
            }
        });

        return res.json({ 'status': 'Success', 'message': 'Job Report Has Been Deleted Successfully!' });
    } catch (err) {
        return res.json({ 'status': 'Error', 'message': err.message });
    }
};


export const sendJobReport = async (req: Request, res: Response) => {
    const params = req.body;
    const user = req.user; 
    const companyId = req.companyId;

    try {
        const report = await prisma.jobReports.findFirst({
            where: {
                id: params.jobReportId,
                OR: [
                    { contractorId: companyId },
                    { companyId: companyId }
                ]
            },
            include: {
                job: {
                    include: {
                        ticket: true,
                        request: {
                            include: {
                                track: true,
                                jobLocation: true,
                                jobSite: true,
                                customerContact: true,
                                createdBy: true
                            }
                        },
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
                purchaseOrders: true
            }
        });

        if (report) {
            const updateData = {
                emailHistory: {
                    // ... 更新 emailHistory 的逻辑
                },
                lastEmailSent: new Date()
            };

            await prisma.jobReports.update({
                where: { id: report.id },
                data: updateData
            });

            return res.json({ 'status': 'Success', 'message': 'Job Report Has Been Sent Successfully!' });
        } else {
            return res.json({ 'status': 'Error', 'message': 'Report was not found' });
        }
    } catch (err) {
        return res.json({ 'status': 'Error', 'message': err.message });
    }
};

export const getJobReportEmailTemplate = async (req: Request, res: Response) => {
    const params = req.query;
    const company = req.company; 
    const companyId = req.companyId;

    try {
        const jobReport = await prisma.jobReports.findFirst({
            where: {
                id: params.jobReportId,
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
            return res.json({ 'status': 'Error', 'message': "Report was not found" });
        }

        const jobTypes = jobReport.job.tasks?.flatMap(task => task.jobTypes?.map(jobType => `${jobType.title} (${jobType.description})`)) ?? [];
        const customerEmail = jobReport.job.customer?.info?.email;
        const customerName = jobReport.job.customer?.profile?.displayName;
        const companyName = company.info?.companyName;
        const companyEmail = company.info?.companyEmail;
        const reportNumber = jobReport.job.jobId;
        const jobLocation = jobReport.job.jobLocation?.name;
        const workDate = moment(jobReport.jobDate).format('MMMM DD, YYYY');

        const message = `Dear ${customerName},\n\nPlease see Job Report ${reportNumber} from ${companyName} for the job at ${jobLocation} on ${workDate}.\n\nThank you for doing business with ${companyName}.\n\n${companyName}`;

        return res.json({
            status: 'Success',
            jobReport: jobReport,
            emailTemplate: {
                from: companyEmail,
                to: customerEmail,
                subject: `${companyName} has sent you a job report`,
                message: message
            }
        });
    } catch (err) {
        return res.json({ 'status': 'Error', 'message': err.message });
    }
};
