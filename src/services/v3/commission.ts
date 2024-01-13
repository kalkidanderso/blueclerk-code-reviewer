import { PrismaClient } from "@prisma/client";
import moment from "moment";
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

  async updateCommission({
    commissionEffectiveDate,
    id,
    type,
    commission,
    commissionType,
    jobId,
  }: {
    type: string;
    id: number;
    commission?: number;
    commissionEffectiveDate: string;
    commissionType: string;
    jobId: number;
  }) {
    await prisma.commissionHistory.create({
      data: {
        alternativeId: "",
        type,
        jobId,
        commissionType,
        effectiveDate: new Date(commissionEffectiveDate),
        technicianIdORContractorId: id,
        commission,
      },
    });

    let commissionBalance = 0;

    const isFixed = commissionType
      ? commissionType === "fixed"
        ? true
        : false
      : false;

    switch (type) {
      case "vendor":
        const contractor = await prisma.company.findUnique({ where: { id } });
        if (!contractor) {
          return {
            status: Status.Error,
            message: "Vendor not found",
          };
        }

        contractor.commissionType = commissionType;
        if (isFixed) {
          contractor.commission = 0;
        } else {
          contractor.commission = commission || null;
        }

        if (
          moment.utc(commissionEffectiveDate).isSameOrBefore(moment(), "day") &&
          !isFixed
        ) {
          // Update vendor's commission rate
          contractor.commission = commission || null;
          let contractorInvoiceCommissions =
            await prisma.invoicecommission.findMany({
              include: { invoice: true },
            });

          contractorInvoiceCommissions = contractorInvoiceCommissions.filter(
            (invoice: any) => {
              if (
                invoice?.technicians &&
                invoice?.technicians.contractorId === contractor.id
              ) {
                return true;
              }
              return false;
            }
          );

          if (contractorInvoiceCommissions?.length) {
            await Promise.all(
              contractorInvoiceCommissions.map(
                async (invoiceCommission: any) => {
                  const invoice = invoiceCommission.invoice;
                  const totalTechnician = Array.isArray(
                    invoiceCommission?.technicians
                  )
                    ? invoiceCommission?.technicians.length
                    : 0;
                  const contractorCommission =
                    invoiceCommission?.technicians?.find(
                      (technician: any) =>
                        technician?.contractorId === contractor.id
                    );

                  if (!contractorCommission) return;

                  if (!contractorCommission.paid) {
                    if (
                      moment
                        .utc(commissionEffectiveDate)
                        .isSameOrBefore(
                          moment.utc(invoice?.issuedDate ?? invoice?.createdAt),
                          "day"
                        )
                    ) {
                      contractorCommission.commission = commission ?? null;
                      const commissionAmount =
                        (((invoice?.total ?? 0) / totalTechnician) *
                          Number(commission ?? 0)) /
                        100;
                      contractorCommission.commissionAmount = Number(
                        commissionAmount?.toFixed(2)
                      );
                    }
                  }

                  commissionBalance +=
                    contractorCommission.commissionAmount || 0;
                  await prisma.invoicecommission.update({
                    where: { id: invoiceCommission.id },
                    data: invoiceCommission,
                  });
                }
              )
            );
          }
        }
      case "employee":
        const employee = await prisma.user.findUnique({ where: { id } });
        if (!employee) {
          return {
            status: Status.Error,
            message: "Employee not found",
          };
        }

        if (
          moment.utc(commissionEffectiveDate).isSameOrBefore(moment(), "day")
        ) {
          employee.commission = commission || null;

          let employeeInvoiceCommissions =
            await prisma.invoicecommission.findMany({
              include: { invoice: true },
            });

          employeeInvoiceCommissions = employeeInvoiceCommissions.filter(
            (invoice: any) => {
              if (
                invoice.technicians &&
                invoice.technicians.technician === employee.id
              ) {
                return true;
              }
              return false;
            }
          );

          if (employeeInvoiceCommissions?.length) {
            // Iterate all invoice commissions
            await Promise.all(
              employeeInvoiceCommissions.map(async (invoiceCommission: any) => {
                const invoice = invoiceCommission.invoice;
                const totalTechnician = Array.isArray(
                  invoiceCommission?.technicians
                )
                  ? invoiceCommission?.technicians.length
                  : 0;
                const employeeCommission = invoiceCommission.technicians?.find(
                  (technician: any) => technician?.technicianId === employee.id
                );

                if (!employeeCommission) {
                  return;
                }

                if (!employeeCommission.paid) {
                  if (
                    moment
                      .utc(commissionEffectiveDate)
                      .isSameOrBefore(
                        moment.utc(invoice?.issuedDate ?? invoice?.createdAt),
                        "day"
                      )
                  ) {
                    employeeCommission.commission = commission ?? null;
                    const commissionAmount =
                      (((invoice?.total ?? 0) / totalTechnician) *
                        Number(commission || 0)) /
                      100;
                    employeeCommission.commissionAmount = Number(
                      commissionAmount?.toFixed(2)
                    );
                  }
                }

                commissionBalance += employeeCommission.commissionAmount || 0;

                await prisma.invoicecommission.update({
                  where: { id: invoiceCommission.id },
                  data: invoiceCommission,
                });
              })
            );
          }

          employee.balance = commissionBalance;
        }

        await prisma.user.update({
          where: { id: employee.id },
          data: employee,
        });

        return {
          status: Status.Success,
          message: "Commission updated successfully",
          employee,
        };
      default:
        return {
          status: Status.Success,
          message:
            "Type not supported. Available Type to be used: vendor or employee.",
        };
    }
  }

  async updateJobCommission(
    id: string,
    body: {
      balance: number;
      jobId: number;
      additional: number;
      deduction: number;
    }
  ) {
    if (!parseInt(id)) return { status: Status.Error, message: "wrong input" };

    const { additional, balance, deduction, jobId } = body;

    await prisma.company.update({
      where: { id: parseInt(id) },
      data: {
        balance,
      },
    });

    await prisma.commissionHistory.create({
      data: {
        alternativeId: "",
        technicianIdORContractorId: parseInt(id),
        jobId,
        commissionType: "additions & deductions",
        effectiveDate: new Date(),
        commission: balance,
        addition: additional,
        deduction,
        type: "additions & deductions",
      },
    });

    return { status: Status.Success, message: "Update successful" };
  }
}
