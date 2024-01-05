import supertest from "supertest";

export default function invoiceControllerTest(app: any) {
  describe("GET /api/v3/invoice", () => {
    it("should return a 200 status code and JSON response", async () => {
      const response = await supertest(app)
        .get("/api/v3/invoice")
        .set("accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toMatch(/json/);
    });

    it("should return a 404 status code", async () => {
      const response = await supertest(app)
        .get("/api/v3/invoices")
        .set("accept", "application/json");

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/v3/invoice/exportInvoicesToExcel", () => {
    it("should return a 200 status code", async () => {
      const response = await supertest(app)
        .get("/api/v3/invoice/exportInvoicesToExcel")
        .set("accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body.type).toMatch("Buffer");
    });

    it("should return a 404 status code", async () => {
      const response = await supertest(app)
        .get("/api/v3/invoices/exportInvoicesToExcels")
        .set("accept", "application/json");

      expect(response.status).toBe(404);
    });
  });
  describe("GET /api/v3/invoice/getInvoiceEmailTemplate", () => {
    it("should return a 200 status code", async () => {
      const response = await supertest(app)
        .get("/api/v3/invoice/exportInvoicesToExcel?emailType=INVOICES")
        .set("accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toMatch(/json/);
    });

    it("should return a 404 status code", async () => {
      const response = await supertest(app)
        .get("/api/v3/invoices/exportInvoicesToExcels")
        .set("accept", "application/json");

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/v3/invoice/getCurrentInvoiceNumber", () => {
    it("should return a 200 status code", async () => {
      const response = await supertest(app)
        .get("/api/v3/invoice/getCurrentInvoiceNumber?companyId=4")
        .set("accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toMatch(/json/);
    });
  });

  describe("POST /api/v3/invoice/sendinvoice", () => {
    it("should return a 200 status code", async () => {
      const response = await supertest(app)
        .post("/api/v3/invoice/sendinvoice")
        .send({
          message: "",
          subject: "",
          copyToMyself: false,
          recipients: [],
          invoiceId: 0,
        })
        .set("accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toMatch(/json/);
    });
  });

  describe("POST /api/v3/invoice/sendinvoice", () => {
    it("should return a 422 status code", async () => {
      const response = await supertest(app)
        .post("/api/v3/invoice/sendinvoice")
        .send({
          message: "",
          subject: "",
          copyToMyself: false,
          recipients: [],
          invoiceId: "",
        })
        .set("accept", "application/json");

      expect(response.status).toBe(422);
      expect(response.header["content-type"]).toMatch(/json/);
    });
  });


  describe("POST /api/v3/invoice/sendInvoices", () => {
    it("should return a 200 status code", async () => {
      const response = await supertest(app)
        .post("/api/v3/invoice/sendInvoices")
        .send({
          customerId: 0,
          message: "",
          subject: "",
          copyToMyself: false,
          recipients: [],
          invoiceIds: [],
        })
        .set("accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toMatch(/json/);
    });
  });

  describe("POST /api/v3/invoice/sendInvoices", () => {
    it("should return a 422 status code", async () => {
      const response = await supertest(app)
        .post("/api/v3/invoice/sendInvoices")
        .send({
          customerId: 0,
          message: "string",
          subject: "string",
          copyToMyself: true,
          recipients: ["string"],
          invoiceIds: [""],
        })
        .set("accept", "application/json");

      expect(response.status).toBe(422);
      expect(response.header["content-type"]).toMatch(/json/);
    });
  });
}
