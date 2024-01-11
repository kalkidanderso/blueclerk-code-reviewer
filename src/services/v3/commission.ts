import { PrismaClient } from "@prisma/client";
import { Status } from "../../common/constants";

const prisma = new PrismaClient();

export class CommissionService {
  constructor() {}

  async getCommissionHistory(beneficiaryId: string) {
    if (!parseInt(beneficiaryId)) {
      return { status: Status.Error, message: "wrong input" };
    }

    const commissionHistory = await prisma.commissionHistory.findFirst({
      where: {
        technicianIdORContractorId: parseInt(beneficiaryId),
      },
    });

    return { status: Status.OK, history: commissionHistory };
  }
  async getCommissionHistoryByJob(jobId: string) {
    if (!parseInt(jobId)) {
      return { status: Status.Error, message: "wrong input" };
    }

    const commissionHistory = await prisma.commissionHistory.findFirst({
      where: {
        id: parseInt(jobId),
      },
    });

    return { status: Status.OK, history: commissionHistory };
  }

  async updateCommissionCron() {
    let start = new Date();
    start.setHours(0, 0, 0, 0);

    let end = new Date();
    end.setHours(23, 59, 59, 999);
    // get commission_ histories whole effective date is today
    const commissionHistories = await prisma.commissionHistory.findMany({
      where: { effectiveDate: { gte: start, lte: end } },
    });
    if (commissionHistories?.length > 0) {
      await Promise.all(
        commissionHistories.map(async (history) => {
          if (history?.type === "vendor") {
            const contractor = await prisma.company.findUnique({
              where: { id: history.technicianIdORContractorId },
            });
            if (contractor) {
              contractor.commission = history.commission;
              await prisma.company.update({
                where: { id: contractor.id },
                data: { commission: history.commission },
              });
            }
          } else if (history?.type === "employee") {
            const employee = await prisma.user.findUnique({
              where: { id: history.technicianIdORContractorId },
            });
            if (employee) {
              employee.commission = history.commission;
              await prisma.user.update({
                where: { id: employee.id },
                data: { commission: history.commission },
              });
            }
          }
        })
      );
    }
    return { status: Status.OK };
  }

  //   async updateCommission({
  //     commissionEffectiveDate,
  //     id,
  //     type,
  //     commission,
  //     userId,
  //   }: {
  //     type: string;
  //     id: number;
  //     commission?: number;
  //     commissionEffectiveDate: string;
  //     userId: number;
  //   }) {
  //     await prisma.commissionHistory.create({
  //       data: {
  //         technicianIdORContractorId: id,
  //         effectiveDate: new Date(commissionEffectiveDate),
  //         commission: commission,
  //         // type: type,
  //         editedBy: { connect: { id: userId } },
  //         commissionType:type,
  //       },
  //     });
  //   }
}
