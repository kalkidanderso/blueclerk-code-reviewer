import supertest from "supertest";
export default function jobLocation(app:any) {
    let jobLocationId = 0
    
    describe('Create /api/v3/job-location', () => {
        it('should create a new job location', async () => {
            const input = {
                alternativeId: "createControllerJobLocation",
                name: "createControllerJobLocation",
                contacts: {
                    email: "ts@gmail.com",
                    phone: "22222",
                    name: "asd"
                },
                location: {
                    "long": "3434.343",
                    "lat": "222.22"
                },
                address: {
                    "zipCode": "123",
                    "state": "asd",
                    "city": "asd",
                    "unit": "asd",
                    "street": "asd"
                },
                jobSites: [
                    2
                ],
                isActive: true,
                customerId: 2,
                companyId: 2,
                inactiveAt: "2023-10-16T17:27:35.576Z",
                inactiveById: 2,
                quickbookId: "2",
            }
            const response = await supertest(app)
                .post('/api/v3/job-location')
                .send(input)
                .set('Accept', 'application/json')
                expect(response.status).toBe(200);
                jobLocationId = response.body.data.id
        });
        it('should error create a new job location', async () => {
            const input = {
                alternativeId: "test",
                name: "createControllerJobLocation",
                contacts: {
                    email: "ts@gmail.com",
                    phone: "22222",
                    name: "asd"
                },
                location: {
                    "long": "3434.343",
                    "lat": "222.22"
                },
                address: {
                    "zipCode": "123",
                    "state": "asd",
                    "city": "asd",
                    "unit": "asd",
                    "street": "asd"
                },
                jobSites: [
                    0
                ],
                isActive: true,
                customerId: 0,
                companyId: 0,
                inactiveAt: undefined as any,
                inactiveById: undefined as any,
                quickbookId: "0",
            }
            const response = await supertest(app)
                .post('/api/v3/job-location')
                .send(input)
                .set('Accept', 'application/json')
                expect(response.status).toBe(500);
        });
    })
    describe('Get /api/v3/job-location', () => {
        it('should get job location', async () => {
            const response = await supertest(app)
                .get('/api/v3/job-location')
                .set('accept', 'application/json');
                expect(response.status).toBe(200);
        });
        it('should error get job location', async () => {
            const response = await supertest(app)
                .get('/api/v3/job-location?id=null')
                .set('accept', 'application/json');
                expect(response.status).toBe(422);
        });
    })
    describe('Put /api/v3/job-location/reset-quick-book', () => {
        it('should put job location', async () => {
            const response = await supertest(app)
                .put('/api/v3/job-location/reset-quick-book')
                .send({companyId: 2})
                .set('accept', 'application/json');
                expect(response.status).toBe(200);
        });
        it('should error put job location', async () => {
            const response = await supertest(app)
                .put('/api/v3/job-location/reset-quick-book')
                .send({compns: 0})
                .set('accept', 'application/json');
                expect(response.status).toBe(422);
        });
    })
    describe('Update /api/v3/job-location/:id', () => {
        it('should update a new job location', async () => {
            const input = {
                alternativeId: "updateControllerJobLocation",
                name: "updateControllerJobLocation",
                contacts: {
                    email: "ts@gmail.com",
                    phone: "22222",
                    name: "asd"
                },
                location: {
                    "long": "3434.343",
                    "lat": "222.22"
                },
                address: {
                    "zipCode": "123",
                    "state": "asd",
                    "city": "asd",
                    "unit": "asd",
                    "street": "asd"
                },
                jobSites: [
                    2
                ],
                isActive: true,
                customerId: 2,
                companyId: 2,
                inactiveAt: "2023-10-16T17:27:35.576Z",
                inactiveById: 2,
                quickbookId: "2",
            }
            const response = await supertest(app)
                .put(`/api/v3/job-location/${jobLocationId}`)
                .send(input)
                .set('Accept', 'application/json')
                expect(response.status).toBe(200);
        });
        it('should error update a new job location', async () => {
            const input =  {
                alternativeId: "updateControllerJobLocation",
                name: "updateControllerJobLocation",
                contacts: {
                    email: "ts@gmail.com",
                    phone: "22222",
                    name: "asd"
                },
                location: {
                    "long": "3434.343",
                    "lat": "222.22"
                },
                address: {
                    "zipCode": "123",
                    "state": "asd",
                    "city": "asd",
                    "unit": "asd",
                    "street": "asd"
                },
                jobSites: [
                    2
                ],
                isActive: true,
                customerId: 1,
                companyId: 2,
                inactiveAt: "",
                inactiveById: 4,
                quickbookId: "2",
            }
            const response = await supertest(app)
                .put(`/api/v3/job-location/999232323232323`)
                .send(input)
                .set('Accept', 'application/json')
                expect(response.status).toBe(422);
        });
    })
    describe('delete /api/v3/job-location/:id', () => {
        it('should delete job location', async () => {
            const response = await supertest(app)
                .delete(`/api/v3/job-location/${jobLocationId}`)
                .set('accept', 'application/json')
                .set('Content-Type', 'application/json')
            expect(response.status).toBe(200);
        });
    
        it('should return error when id wrong', async () => {
            const response = await supertest(app)
                .delete(`/api/v3/job-location/0`)
                .set('accept', 'application/json')
                .set('Content-Type', 'application/json')
            expect(response.status).toBe(500);
        });
    });
}