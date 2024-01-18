import { CommissionService } from "../../services/v3/commission";
import { Controller, Route, Tags, Get, Query, Put, Path, Body } from "tsoa";

@Tags("Commission")
@Route("")
export class CommissionController extends Controller {
  @Get("/getCommissionHistory/{beneficiaryId}")
  public async getCommissionHistory(beneficiaryId: string) {
    const commissionService = new CommissionService();
    return await commissionService.getCommissionHistory(beneficiaryId);
  }

  @Get("/getCommissionHistoryByJob/{jobId}")
  public async getCommissionHistoryByJob(jobId: string) {
    const commissionService = new CommissionService();
    return await commissionService.getCommissionHistoryByJob(jobId);
  }

  @Put("/updateCommission")
  public async updateCommission(
    @Body()
    params: {
      type: string;
      id: number;
      commission?: number;
      commissionEffectiveDate: string;
      commissionType: string;
      jobId: number;
    }
  ) {
    const commissionService = new CommissionService();
    return await commissionService.updateCommission(params);
  }

  @Get("/updateCommissionCron")
  public async updateCommissionCron() {
    const commissionService = new CommissionService();
    return await commissionService.updateCommissionCron();
  }

  @Put("/updateJobCommission/{id}")
  public async updateJobCommission(
    id: string,
    @Body()
    body: {
      balance: number;
      jobId: number;
      additional: number;
      deduction: number;
    }
  ) {
    const commissionService = new CommissionService();
    return await commissionService.updateJobCommission(id, body);
  }
}
