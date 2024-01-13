import supertest from "supertest";

export default function comissionControllerTest(app: any) {
  describe("GET /api/v3/getCommissionHistory", () => {
    it("should return a 200 status code and JSON response", async () => {
      const response = await supertest(app)
        .get("/api/v3/getCommissionHistory/1")
        .set("accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toMatch(/json/);
    });

    it("should return a 404 status code", async () => {
      const response = await supertest(app)
        .get("/api/v3/getCommissionHistory")
        .set("accept", "application/json");

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/v3/getCommissionHistoryByJob", () => {
    it("should return a 200 status code and JSON response", async () => {
      const response = await supertest(app)
        .get("/api/v3/getCommissionHistoryByJob/10")
        .set("accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toMatch(/json/);
    });

    it("should return a 404 status code", async () => {
      const response = await supertest(app)
        .get("/api/v3/getCommissionHistoryByJob")
        .set("accept", "application/json");

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/v3/updateCommission", () => {
    it("should return a 500 status code and JSON response", async () => {
      const response = await supertest(app)
        .post("/api/v3/updateCommission")
        .send({
          jobId: 0,
          commissionType: "string",
          commissionEffectiveDate: "string",
          commission: 0,
          id: 0,
          type: "string",
        })
        .set("accept", "application/json");

      expect(response.status).toBe(500);
    });
  });

  describe("PUT /api/v3/updateCommissionCron", () => {
    it("should return a 200 status code", async () => {
      const response = await supertest(app)
        .put("/api/v3/updateJobCommission/0")
        .send({
          deduction: 0,
          additional: 0,
          jobId: 0,
          balance: 0,
        })
        .set("accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.header["content-type"]).toMatch(/json/);
    });

    it("should return a 404 status code", async () => {
      const response = await supertest(app).put("/api/v3/updateJobCommission");

      expect(response.status).toBe(404);
    });
  });
}
