import supertest from "supertest";
import { Status, Messages } from '../../../common/constants';
export default function jobReport(app:any) {
    
    describe('Get /api/v3/job-reports', () => {
        it('should retrieve all job reports', async () => {
            const response = await supertest(app)
                .get('/api/v3/job-reports')
                .set('Accept', 'application/json')
            expect(response.status).toBe(200);
            expect(response.body.reports.length).toBe(2);
            expect(response.body.total).toBe(2);
            expect(response.body.status).toBe(Status.Success);
        });

        it('should retrieve 1 job report filtered by keyword', async () => {
            const response = await supertest(app)
                .get('/api/v3/job-reports?keyword=test')
                .set('Accept', 'application/json')
            expect(response.status).toBe(200);
            expect(response.body.reports.length).toBe(1);
            expect(response.body.total).toBe(1);
            expect(response.body.status).toBe(Status.Success);
        });

        it('should retrieve all job reports', async () => {
            const response = await supertest(app)
                .get('/api/v3/job-reports?pageSize=1&currentPage=1')
                .set('Accept', 'application/json')
            expect(response.status).toBe(200);
            expect(response.body.reports.length).toBe(1);
            expect(response.body.total).toBe(2);
            expect(response.body.status).toBe(Status.Success);
        });

        it('should retrieve 1 job report filtering by date', async () => {
            const response = await supertest(app)
                .get('/api/v3/job-reports?startDate=2023-01-01&endDate=2023-12-31')
                .set('Accept', 'application/json')
            expect(response.status).toBe(200);
            expect(response.body.reports.length).toBe(1);
            expect(response.body.total).toBe(1);
            expect(response.body.status).toBe(Status.Success);
        });
    })

    describe('Get /api/v3/job-reports/{id}', () => {
        it('should retrieve 1 job report by id', async () => {
            const response = await supertest(app)
                .get('/api/v3/job-reports/2')
                .set('Accept', 'application/json');
            expect(response.body.status).toBe(Status.Success);
            expect(response.body.message.job).toBeDefined();
            expect(response.body.message.scans).toBeDefined();
            expect(response.body.message.company).toBeDefined();
            expect(response.body.message.contractor).toBeDefined();
            expect(response.body.message.job.id).toBe(2);
            expect(response.body.message.scans).toBeDefined();
            expect(response.body.message.customerName).toBe('test customer')
            expect(response.body.message.technicianName).toBe('test technician');
            expect(response.body.message.jobDate).toBeDefined();
            expect(response.body.message.purchaseOrders).toBeDefined();
            expect(response.body.message.emailHistory).toBeDefined();
            expect(response.body.message.lastEmailSent).toBe('2023-10-15T05:43:53.219Z');
            expect(response.body.message.createdAt).toBe('2023-10-15T05:43:53.219Z');
            expect(response.body.message.invoiceCreated).toBe(false);
            expect(response.body.message.invoiceVoid).toBe(false);
            expect(response.body.message.invoice).toBeDefined();
        });

        it('should throw error on no job report found', async () => {
            const response = await supertest(app)
                .get('/api/v3/job-reports/238374938')
                .set('Accept', 'application/json');
            expect(response.body.status).toBe(Status.NotFound);
            expect(response.body.message).toBe(Messages.ReportNotFound);
        })
    })

    describe('Delete /api/v3/job-reports/{id}', () => {
        it('should delete 1 job report by id', async () => {
            const response = await supertest(app)
                .delete('/api/v3/job-reports/3')
                .set('Accept', 'application/json');
            expect(response.body.status).toBe(Status.Success);
            expect(response.body.message).toBe('Job Report has been deleted successfully!');
        })
        it('should throw error on no job report found', async () => {
            const response = await supertest(app)
                .delete('/api/v3/job-reports/1002938')
                .set('Accept', 'application/json');
            expect(response.body.status).toBe(Status.NotFound);
            expect(response.body.message).toBe(Messages.ReportNotFound);
        })
    })

    describe('Get /api/v3/job-reports/email-template/{id}', () => {
        it('should retrieve 1 job report email template by id', async () => {
            const response = await supertest(app)
                .get('/api/v3/job-reports/email-template/2')
                .set('Accept', 'application/json');
                expect(response.body.status).toBe(Status.Success);
            expect(response.body.jobReport.job).toBeDefined();
            expect(response.body.jobReport.scans).toBeDefined();
            expect(response.body.jobReport.company).toBeDefined();
            expect(response.body.jobReport.contractor).toBeDefined();
            expect(response.body.jobReport.job.id).toBe(2);
            expect(response.body.jobReport.scans).toBeDefined();
            expect(response.body.jobReport.customerName).toBe('test customer')
            expect(response.body.jobReport.technicianName).toBe('test technician');
            expect(response.body.jobReport.jobDate).toBeDefined();
            expect(response.body.jobReport.purchaseOrders).toBeDefined();
            expect(response.body.jobReport.emailHistory).toBeDefined();
            expect(response.body.jobReport.lastEmailSent).toBe('2023-10-15T05:43:53.219Z');
            expect(response.body.jobReport.createdAt).toBe('2023-10-15T05:43:53.219Z');
            expect(response.body.jobReport.invoiceCreated).toBe(false);
            expect(response.body.jobReport.invoiceVoid).toBe(false);
            expect(response.body.jobReport.invoice).toBeDefined();
            expect(response.body.emailTemplate).toStrictEqual({
                from: 'aaa',
                subject: 'aaa has sent you a job report',
                message: 'Dear undefined,\n\nPlease see Job Report null from aaa for the job at undefined on October 15, 2023.\n\nThank you for doing business with aaa.\n\naaa'
            })
        })

        it('should throw error on no job report found', async () => {
            const response = await supertest(app)
                .get('/api/v3/job-reports/email-template/238374938')
                .set('Accept', 'application/json');
            expect(response.body.status).toBe(Status.NotFound);
            expect(response.body.message).toBe(Messages.ReportNotFound);
        })
    })
}