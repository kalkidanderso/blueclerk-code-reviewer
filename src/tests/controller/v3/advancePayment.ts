
import supertest from "supertest";

export default function advancePayment(app: any) {
    let advancePaymentId = 0
    
    describe('Create /api/v3/advance-payment', () => {
        it('should create a new advancepayment', async () => {
            const body = {
                id: 2,
                type: 'vendor',
                amount: 0,
                balance: 0,
                referenceNumber: "string",
                paymentType: "string",
                paidAt: new Date("2023-10-11T11:51:08.682Z"),
                appliedAt: new Date("2023-10-11T11:51:08.682Z"),
                note: "string",
                createdByUser: 2,
                updatedByUser: 2,
                voidedByUser: 2,
                companyLocation: [1],
                workType: [1],
            };
            const response = await supertest(app)
                .post('/api/v3/advance-payment')
                .send(body)
                .set('Accept', 'application/json')
                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('data');
                advancePaymentId = response.body.data.id
        });
    
        it('should return error when wrong data', async () => {
            const body = {};
            const response = await supertest(app)
                .post('/api/v3/advance-payment')
                .send(body)
                .set('accept', 'application/json')
                .set('Content-Type', 'application/json')
        
                expect(response.status).toBe(422);
        });
    })
    
    describe('get /api/v3/advance-payment', () => {
        it('should get a advancepayment', async () => {
            const response = await supertest(app)
                .get('/api/v3/advance-payment?type=vendor&isActive=ALL&id=1&startDate=2023-10-18&endDate=2023-10-25&offset=%2B0700')
                .set('Accept', 'application/json')
                expect(response.status).toBe(200);
                expect(response.header['content-type']).toMatch(/json/);
        });
    
        it('should return error when wrong query', async () => {
            const response = await supertest(app)
                .get('/api/v3/advance-payment?type=set&isActive=ALL&id=1&startDate=2023-10-18&endDate=2023-10-25&offset=%2B0700')
                .set('accept', 'application/json')
                .set('Content-Type', 'application/json')
        
                expect(response.status).toBe(422);
        });
    })
    
    describe('Update /api/v3/advance-payment', () => {
        it('should Update a advancepayment', async () => {
            const body = {
                alternativeId: "2",
                company: 2,
                advancePaymentId: 2,
                id: 2,
                type: 'vendor',
                amount: 0,
                balance: 0,
                referenceNumber: "string",
                paymentType: "string",
                paidAt: new Date("2023-10-11T11:51:08.682Z"),
                appliedAt: new Date("2023-10-11T11:51:08.682Z"),
                note: "string",
                createdByUser: 2,
                updatedByUser: 2,
                voidedByUser: 2,
                companyLocation: [1],
                workType: [1],
            };
            const response = await supertest(app)
                .put('/api/v3/advance-payment')
                .send(body)
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                expect(response.status).toBe(200);
        });
    })
    
    describe('Void /api/v3/advance-payment', () => {
        it('should Void a advancepayment', async () => {
            const body = {
                advancePaymentId: 2,
                type: 'vendor',
            };
            const response = await supertest(app)
                .patch('/api/v3/advance-payment')
                .send(body)
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                expect(response.status).toBe(200);
        });
    })

}


