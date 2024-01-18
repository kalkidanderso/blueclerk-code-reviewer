import { CommissionService } from "../../../services/v3/commission";

describe("Commission", () => {
  const commissionService = new CommissionService();

  it("Should get invoices in getCommissionHistory response", async () => {
    const response = await commissionService.getCommissionHistory("0");

    expect(response.status).toEqual(0);
  });

  it("Should get error status invoices in getCommissionHistory response", async () => {
    const response = await commissionService.getCommissionHistory("abc");

    expect(response.status).toEqual(0);
    expect(response.message).toEqual("wrong input");
  });

  it("Should get invoices in getCommissionHistoryByJob response", async () => {
    const response = await commissionService.getCommissionHistoryByJob("0");

    expect(response.status).toEqual(0);
  });

  it("Should get error status invoices in getCommissionHistoryByJob response", async () => {
    const response = await commissionService.getCommissionHistoryByJob("abc");

    expect(response.status).toEqual(0);
    expect(response.message).toEqual("wrong input");
  });

  it("Should get invoices in updateCommissionCron response", async () => {
    const response = await commissionService.updateCommissionCron();

    expect(response.status).toEqual(200);
  });

  it("Should get error in updateCommission response", async () => {
    try {
      const response = await commissionService.updateCommission({
        jobId: 0,
        commissionType: "string",
        commissionEffectiveDate: "string",
        commission: 0,
        id: 0,
        type: "string",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });

  it("Should get error status invoices in updateJobCommission response", async () => {
    const response = await commissionService.updateJobCommission("0", {
      deduction: 0,
      additional: 0,
      jobId: 0,
      balance: 0,
    });

    expect(response.status).toEqual(0);
    expect(response.message).toEqual("wrong input");
  });

  it("Should get error in updateJobCommission response", async () => {
    try {
      const response = await commissionService.updateJobCommission("1000", {
        deduction: 0,
        additional: 0,
        jobId: 0,
        balance: 0,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });
});
