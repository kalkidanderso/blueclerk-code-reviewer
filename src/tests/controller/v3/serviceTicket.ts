import supertest from "supertest";

export default function serviceTicket(app:any) {

    let serviceTicketId = 0
    
    describe('Create /api/v3/service-ticket', () => {
        it('should create a new service ticket', async () => {
            const response = await supertest(app)
                .post('/api/v3/service-tickets')
                .send({
                    "userId": 2,
                    "alternativeId": "createControllerServiceTicket",
                    "dueDate": "2023-10-16T17:27:35.576Z",
                    "customerId": 2,
                    note: "string",
                    customerContactId: 2,
                    customerPO: "string",
                    image: "string",
                    images: [
                        "string"
                    ],
                    companyId: 2,
                    technicianId: 2,
                    status: 0,
                    ticketId: "string",
                    jobLocationId: 2,
                    jobSiteId: 2,
                    isHomeOccupied: true,
                    homeOwnerId: 2,
                    homeJobLocationId: 2,
                    homeJobSiteId: 2,
                    jobTypeId: 2,
                    itemId: 2,
                    jobCreated: true,
                    source: "string",
                    workTypeId: 2,
                    companyLocationId: 2,
                    pooverriddenById: 2,
                    type: "Ticket",
                    emailHistory: [
                        "string"
                    ],
                    bouncedEmailFlag: true
                })
                .set('Accept', 'application/json')
                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('data');
                serviceTicketId = response.body.data.id
        });
    
        it('should error create a new service ticket with same alternativeId', async () => {
            const response = await supertest(app)
                .post('/api/v3/service-tickets')
                .set('accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({
                    userId: 3,
                    alternativeId: "createControllerServiceTicket",
                    dueDate: "2023-10-16T17:27:35.576Z",
                    customerId: 2,
                    note: "string",
                    customerContactId: 3,
                    customerPO: "string",
                    image: "string",
                    images: [
                        "string"
                    ],
                    companyId: 3,
                    technicianId: 3,
                    status: 0,
                    ticketId: "string",
                    jobLocationId: 3,
                    jobSiteId: 3,
                    isHomeOccupied: true,
                    homeOwnerId: 3,
                    homeJobLocationId: 3,
                    homeJobSiteId: 3,
                    jobTypeId: 3,
                    itemId: 3,
                    jobCreated: true,
                    source: "string",
                    workTypeId: 2,
                    companyLocationId: 2,
                    pooverriddenById: 2,
                    type: "Ticket",
                    emailHistory: [
                        "string"
                    ],
                    bouncedEmailFlag: true
                });
                expect(response.status).toBe(500);
        });
    });
    
    describe('Get /api/v3/service-tickets/po-request-email-template/:id', () => {
        it('should get service ticket po request email', async () => {
            const response = await supertest(app)
                .get(`/api/v3/service-tickets/po-request-email-template/${serviceTicketId}`)
                .set('accept', 'application/json')
                .set('Content-Type', 'application/json')
            expect(response.status).toBe(200);
        });
    
        it('should return error', async () => {
            const response = await supertest(app)
                .get(`/api/v3/service-tickets/po-request-email-template/asd`)
                .set('accept', 'application/json')
                .set('Content-Type', 'application/json')
            expect(response.status).toBe(422);
        });
    
        it('should return error wrong id', async () => {
            const response = await supertest(app)
                .get(`/api/v3/service-tickets/po-request-email-template/9999999`)
                .set('accept', 'application/json')
                .set('Content-Type', 'application/json')
            expect(response.status).toBe(500);
        });
    });
    
    describe('GET /api/v3/service-tickets', () => {
        it('should return a 200 status code and JSON response', async () => {
            const response = await supertest(app)
                .get('/api/v3/service-tickets?type=Ticket&currentPage=0&pageSize=30')
                .set('accept', 'application/json');
        
            expect(response.status).toBe(200);
            expect(response.header['content-type']).toMatch(/json/);
        });
    
        it('should return error when wrong query', async () => {
            const response = await supertest(app)
                .get('/api/v3/service-tickets?type=Tasicket&currentPage=-30&pageSize=30')
                .set('accept', 'application/json');
        
                expect(response.status).toBe(422);
        });
    
        it('should return error when wrong query add next & prev cursor', async () => {
            const response = await supertest(app)
                .get('/api/v3/service-tickets?type=Ticket&currentPage=0&pageSize=30&nextCursor=11&previousCursor=22')
                .set('accept', 'application/json');
        
                expect(response.status).toBe(500);
        });
    });
    
    describe('GET /api/v3/service-tickets/:id', () => {
        it('should return a 200 status code and JSON response', async () => {
            const response = await supertest(app)
                .get(`/api/v3/service-tickets/${serviceTicketId}`)
                expect(response.status).toBe(200);
        });
    
        it('should return error when wrong query', async () => {
            const response = await supertest(app)
                .get(`/api/v3/service-tickets/${serviceTicketId}?companyId=asd`)
                .set('accept', 'application/json');
        
                expect(response.status).toBe(422);
        });
    
        it('should return error when id wrong', async () => {
            const response = await supertest(app)
                .get('/api/v3/service-tickets/99999999999')
                expect(response.status).toBe(500);
        });
    });
    
    describe('Update put /api/v3/service-tickets/:id', () => {
        it('should update a service ticket', async () => {
            const response = await supertest(app)
                .put(`/api/v3/service-tickets/${serviceTicketId}`)
                .set('accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({
                userId: 2,
                alternativeId: "updateControllerServiceTicket",
                dueDate: "2023-10-16T17:37:36.328Z",
                customerId: 2,
                note: "string",
                customerContactId: 2,
                customerPO: "string",
                image: "string",
                images: [
                    "string"
                ],
                companyId: 2,
                technicianId: 2,
                status: 2,
                editedAt: "2023-10-16T17:37:36.328Z",
                ticketId: "1",
                jobLocationId: 2,
                jobSiteId: 2,
                isHomeOccupied: true,
                homeOwnerId: 2,
                homeJobLocationId: 2,
                homeJobSiteId: 2,
                jobTypeId: 2,
                itemId: 2,
                jobCreated: true,
                source: "string",
                workTypeId: 2,
                companyLocationId: 2,
                pooverriddenById: 2,
                type: "Ticket",
                emailHistory: [
                    "string"
                ],
                bouncedEmailFlag: true
            });
            expect(response.status).toBe(200);
        });
    
        it('should return error when wrong data for update', async () => {
            const response = await supertest(app)
            .put(`/api/v3/service-tickets/${serviceTicketId}`)
            .set('accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send({
            });
    
            expect(response.status).toBe(422);
        });
    
        it('should return error when wrong id', async () => {
            const response = await supertest(app)
                .put(`/api/v3/service-tickets/99999999`)
                .set('accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({
                userId: 2,
                alternativeId: "updateControllerServiceTicket",
                dueDate: "2023-10-16T17:37:36.328Z",
                customerId: 2,
                note: "string",
                customerContactId: 2,
                customerPO: "string",
                image: "string",
                images: [
                    "string"
                ],
                companyId: 2,
                technicianId: 2,
                status: 2,
                editedAt: "2023-10-16T17:37:36.328Z",
                ticketId: "1",
                jobLocationId: 2,
                jobSiteId: 2,
                isHomeOccupied: true,
                homeOwnerId: 2,
                homeJobLocationId: 2,
                homeJobSiteId: 2,
                jobTypeId: 2,
                itemId: 2,
                jobCreated: true,
                source: "string",
                workTypeId: 2,
                companyLocationId: 2,
                pooverriddenById: 2,
                type: "Ticket",
                emailHistory: [
                    "string"
                ],
                bouncedEmailFlag: true
            });
            expect(response.status).toBe(500);
        });
    });
    
    describe('Update patch /api/v3/service-tickets/:id', () => {
        it('should update service ticket status', async () => {
            const response = await supertest(app)
                .patch(`/api/v3/service-tickets/${serviceTicketId}`)
                .set('accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({
                        status: 0
                });
            expect(response.status).toBe(200);
        });
    
        it('should return error when status is invalid', async () => {
            const response = await supertest(app)
                .patch(`/api/v3/service-tickets/${serviceTicketId}`)
                .set('accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({
                status: 'invalid_status'
                });
            expect(response.status).toBe(422);
        });
    
        it('should return error when status is invalid', async () => {
            const response = await supertest(app)
                .patch(`/api/v3/service-tickets/9999999999`)
                .set('accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({
                    status: 0
                });
            expect(response.status).toBe(500);
        });
    });
    
    describe('delete /api/v3/service-tickets/:id', () => {
        it('should delete service ticket status', async () => {
            const response = await supertest(app)
                .delete(`/api/v3/service-tickets/${serviceTicketId}`)
                .set('accept', 'application/json')
                .set('Content-Type', 'application/json')
            expect(response.status).toBe(200);
        });
    
        it('should return error when id wrong', async () => {
            const response = await supertest(app)
                .delete(`/api/v3/service-tickets/23333`)
                .set('accept', 'application/json')
                .set('Content-Type', 'application/json')
            expect(response.status).toBe(500);
        });
    });
}

