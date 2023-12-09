import supertest from "supertest";
export default function jobSites(app:any) {
    let jobSiteId = 0
    
    describe('Create /api/v3/job-sites', () => {
        it('should create a new job sites', async () => {
            const input = {
                alternativeId: "jobSiteControllerCreate",
                name: "test",
                isActive: true,
                location: {
                    long: "test",
                    lat: "test"
                },
                address: "test",
                locationId: 2,
                customerId: 2,
                homeOwnerId: 2
            }
            const response = await supertest(app)
                .post('/api/v3/job-sites')
                .send(input)
                .set('Accept', 'application/json')
                expect(response.status).toBe(200);
                jobSiteId = response.body.id
        });
        it('should error create a new job sites', async () => {
            const input = {
                alternativeId: "jobSiteControllerCreate",
                name: "test",
                isActive: "asdasd",
                location: {
                    long: "test",
                    lat: "test"
                },
                address: "test",
                locationId: 54354,
                customerId: 234234,
                homeOwnerId: 234234
            }
            const response = await supertest(app)
                .post('/api/v3/job-sites')
                .send(input)
                .set('Accept', 'application/json')
                expect(response.status).toBe(422);
        });
    })
    describe('Get /api/v3/job-sites', () => {
        it('should get job sites', async () => {
            const response = await supertest(app)
                .get('/api/v3/job-sites')
                .set('accept', 'application/json');
                expect(response.status).toBe(200);
        });
        it('should error get job sites', async () => {
            const response = await supertest(app)
                .get('/api/v3/job-sites?id=null')
                .set('accept', 'application/json');
                expect(response.status).toBe(422);
        });
    })
    describe('Update /api/v3/job-sites/:id', () => {
        it('should update a new job sites', async () => {
            const input = {
                alternativeId: "jobSiteControllerUpdate",
                name: "test",
                isActive: true,
                location: {
                    long: "test",
                    lat: "test"
                },
                address: "test",
                locationId: 2,
                customerId: 2,
                homeOwnerId: 2
            }
            const response = await supertest(app)
                .put(`/api/v3/job-sites/${jobSiteId}`)
                .send(input)
                .set('Accept', 'application/json')
                expect(response.status).toBe(200);
        });
        it('should error update a new job sites', async () => {
            const input = {
                id: 99999999123123,
                alternativeId: "jobSiteControllerUpdate",
                name: "test",
                isActive: "asdasd",
                location: {
                    long: "test",
                    lat: "test"
                },
                address: "test",
                locationId: 54354,
                customerId: 234234,
                homeOwnerId: 234234
            }
            const response = await supertest(app)
                .put(`/api/v3/job-sites/999232323232323`)
                .send(input)
                .set('Accept', 'application/json')
                expect(response.status).toBe(422);
        });
    })
    describe('delete /api/v3/job-sites/:id', () => {
        it('should delete job sites', async () => {
            const response = await supertest(app)
                .delete(`/api/v3/job-sites/${jobSiteId}`)
                .set('accept', 'application/json')
                .set('Content-Type', 'application/json')
            expect(response.status).toBe(200);
        });
    
        it('should return error when id wrong', async () => {
            const response = await supertest(app)
                .delete(`/api/v3/job-sites/23333`)
                .set('accept', 'application/json')
                .set('Content-Type', 'application/json')
            expect(response.status).toBe(500);
        });
    });
}