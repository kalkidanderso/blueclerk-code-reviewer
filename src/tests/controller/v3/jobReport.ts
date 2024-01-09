import supertest from "supertest";
export default function jobReport(app:any) {
    
    describe('Create /api/v3/job-reports', () => {
        it('should retrieve all job reports', async () => {
            const response = await supertest(app)
                .get('/api/v3/job-reports')
                .set('Accept', 'application/json')
                console.log(response);
            expect(response.status).toBe(200);
        });
    })
}