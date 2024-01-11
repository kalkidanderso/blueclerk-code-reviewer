import supertest from "supertest";
import { Status } from '../../../common/constants';
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
}