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

  describe("POST /api/v3/invoice/getInvoices", () => {
    it("should return a 200 status code", async () => {
      const response = await supertest(app)
        .post("/api/v3/invoice/getInvoices")
        .send({})
        .set("accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toMatch(/json/);
    });

    it("should return a 422 status code", async () => {
      const response = await supertest(app)
        .post("/api/v3/invoice/getInvoices")
        .send([])
        .set("accept", "application/json");

      expect(response.status).toBe(422);
      expect(response.header["content-type"]).toMatch(/json/);
    });
  });

  describe("POST /api/v3/invoice/updateInvoice", () => {
    it("should return a 200 status code", async () => {
      const response = await supertest(app)
        .post("/api/v3/invoice/updateInvoice")
        .send({
          vendorId: "string",
          note: "string",
          shippingCost: 0,
          items: ["string"],
          includePO: true,
          timeSpent: 0,
          dueDate: "string",
          issuedDate: "string",
          tax: 0,
          charges: 0,
          jobSiteId: 0,
          jobLocationId: 0,
          customerContactId: 0,
          paymentTermId: 0,
          isDraft: true,
          invoiceId: 0,
        })
        .set("accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toMatch(/json/);
    });

    it("should return a 422 status code", async () => {
      const response = await supertest(app)
        .post("/api/v3/invoice/updateInvoice")
        .send({})
        .set("accept", "application/json");

      expect(response.status).toBe(422);
      expect(response.header["content-type"]).toMatch(/json/);
    });
  });

  describe("GET /api/v3/invoice/generateInvoicePdf", () => {
    it("should return a 200 status code", async () => {
      const response = await supertest(app)
        .get("/api/v3/invoice/generateInvoicePdf?customerId=1&companyId=1")
        .set("accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toMatch(/json/);
    });

    it("should return a 500 status code", async () => {
      const response = await supertest(app)
        .get("api/v3/invoice/generateInvoicePdf?customerId=a&companyId=c")
        .set("accept", "application/json");

      expect(response.status).toBe(404);
      expect(response.header["content-type"]).toMatch(/json/);
    });
  });

  describe("POST /api/v3/invoice/updateInvoiceMessages", () => {
    it("should return a 200 status code", async () => {
      const response = await supertest(app)
        .post("/api/v3/invoice/updateInvoiceMessages")
        .send({
          technicianMessages: {
            images: ["string"],
            notes: [
              {
                comment: "string",
                id: "string",
              },
            ],
          },
          showJobId: true,
          invoiceId: 0,
        })
        .set("accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toMatch(/json/);
    });

    it("should return a 422 status code", async () => {
      const response = await supertest(app)
        .post("/api/v3/invoice/updateInvoiceMessages")
        .send([])
        .set("accept", "application/json");

      expect(response.status).toBe(422);
    });
  });

  describe("GET /api/v3/invoice/getInvoiceDetail", () => {
    it("should return a 200 status code", async () => {
      const response = await supertest(app).get(
        "/api/v3/invoice/getInvoiceDetail?invoiceId=1"
      );

      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toMatch(/json/);
    });

    it("should return a 500 status code", async () => {
      const response = await supertest(app).get(
        "/api/v3/invoice/getInvoiceDetail?invoiceId=iu"
      );

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/v3/invoice/unvoidInvoice", () => {
    it("should return a 200 status code", async () => {
      const response = await supertest(app)
        .post("/api/v3/invoice/unvoidInvoice")
        .send({
          invoiceId: 0,
        })
        .set("accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toMatch(/json/);
    });

    it("should return a 422 status code", async () => {
      const response = await supertest(app)
        .post("/api/v3/invoice/unvoidInvoice")
        .send({
          invoiceId: "tr",
        })
        .set("accept", "application/json");

      expect(response.status).toBe(422);
      expect(response.header["content-type"]).toMatch(/json/);
    });
  });

  describe("DELETE /api/v3/invoice/voidInvoice", () => {
    it("should return a 200 status code", async () => {
      const response = await supertest(app)
        .delete("/api/v3/invoice/voidInvoice")
        .send({
          invoiceId: 0,
        })
        .set("accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toMatch(/json/);
    });

    it("should return a 422 status code", async () => {
      const response = await supertest(app)
        .delete("/api/v3/invoice/voidInvoice")
        .send({
          invoiceId: "ui",
        })
        .set("accept", "application/json");

      expect(response.status).toBe(422);
      expect(response.header["content-type"]).toMatch(/json/);
    });
  });

  describe("POST /api/v3/invoice/getUnsyncedInvoices", () => {
    it("should return a 200 status code", async () => {
      const response = await supertest(app)
        .get("/api/v3/invoice/getUnsyncedInvoices")
        .set("accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toMatch(/json/);
    });
  });

  describe("GET /api/v3/invoice/getCompanyInvoices", () => {
    it("should return a 200 status code", async () => {
      const response = await supertest(app).get(
        "/api/v3/invoice/getCompanyInvoices?compantId=2"
      );

      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toMatch(/json/);
    });
  });

  describe("GET /api/v3/invoice/getCompanyInvoiceDetails", () => {
    it("should return a 200 status code", async () => {
      const response = await supertest(app)
        .get("/api/v3/invoice/getCompanyInvoiceDetails?companyInvoiceId=12")
        .set("accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toMatch(/json/);
    });
  });

  describe("GET /api/v3/invoice/getInvoicesByCustomerId", () => {
    it("should return a 200 status code", async () => {
      const response = await supertest(app).get(
        "/api/v3/invoice/getInvoicesByCustomerId?customerId=2"
      );

      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toMatch(/json/);
    });
  });

  describe("GET /api/v3/invoice/getInvoicesByContractor", () => {
    it("should return a 200 status code", async () => {
      const response = await supertest(app).get(
        "/api/v3/invoice/getInvoicesByContractor?type=vendor&id=4"
      );

      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toMatch(/json/);
    });
  });
}
