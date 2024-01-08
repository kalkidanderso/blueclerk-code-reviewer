import { PrismaClient } from "@prisma/client";

export class Invoice {
  constructor(private readonly prisma: PrismaClient["invoice"]) {}

  async getAll(query: any[]): Promise<any> {
    try {
      return await this.prisma.findMany({
        where: { AND: query },
      });
    } catch (err) {
      throw new Error("Error Occured");
    }
  }

  async getEmailTemplate(invoiceId: number) {
    try {
      return await this.prisma.findUnique({
        where: {
          id: invoiceId,
        },
        select: {
          customer: true,
          customerContactId: true,
          job: true,
        },
      });
    } catch (err) {
      throw new Error("Error Occured");
    }
  }

  async getEmailTemplates(invoiceIds: number[]) {
    try {
      return await this.prisma.findMany({
        where: {
          id: { in: invoiceIds },
        },
        select: {
          customer: true,
        },
      });
    } catch (err) {
      throw new Error("Error Occured");
    }
  }

  async findInvoiceByJobId(jobId: number) {
    return await this.prisma.findFirst({
      where: {
        jobId,
        isVoid: { not: true },
      },
      select: {
        customer: true,
      },
    });
  }

  // async createInvoice({
  //   invoiceId,
  //   invoiceType,
  //   jobId,
  //   purchaseOrderId,
  //   purchaseOrderIds,
  //   issuedDate,
  //   dueDate,
  //   isDraft,
  //   paymentTermId,
  //   jobLocationId,
  //   jobSiteId,
  //   note,
  //   charges,
  //   shippingCost,
  //   subTotalBeforeTax,
  //   taxAmount,
  //   total,
  //   status,
  //   invoiceItems,
  //   timeSpent,
  //   estimateId,
  //   companyLocationId,
  //   workTypeId,
  //   customerPO,
  //   quickbookId,
  // }: {
  //   invoiceId: string;
  //   invoiceType: number;
  //   jobId: number;
  //   purchaseOrderId: number;
  //   purchaseOrderIds: number;
  //   issuedDate: string;
  //   dueDate: string;
  //   isDraft: boolean;
  //   paymentTermId: number;
  //   jobLocationId: number;
  //   jobSiteId: number;
  //   note: string;
  //   charges: number;
  //   shippingCost: number;
  //   taxAmount: number;
  //   subTotalBeforeTax: number;
  //   total: number;
  //   status: number;
  //   timeSpent: number;
  //   invoiceItems: any[];
  //   estimateId: number;
  //   workTypeId: number;
  //   companyLocationId: number;
  //   customerPO: string;
  //   quickbookId: string;
  // }) {
  //   return await this.prisma.create({
  //     data: {
  //       vendorId: "",
  //       invoiceId,
  //       invoiceType,
  //       jobId,
  //       purchaseOrderId,
  //       issuedDate: issuedDate ? new Date(issuedDate) : new Date(),
  //       dueDate: dueDate ? new Date(dueDate) : new Date(),
  //       isDraft: isDraft ?? true,
  //       paymentTermId,
  //       jobLocationId,
  //       jobSiteId,
  //       note,
  //       charges: Math.round(charges * 100) / 100,
  //       shippingCost: Math.round(shippingCost * 100) / 100,
  //       taxAmount: Math.round(taxAmount * 100) / 100,
  //       subTotal: Math.round(subTotalBeforeTax * 100) / 100,
  //       total: Math.round(total * 100) / 100,
  //       balanceDue: Math.round(total * 100) / 100,
  //       timeSpent,
  //       items: invoiceItems,
  //       estimateId,
  //       emailHistory: [],
  //       lastEmailSent: null,
  //       workTypeId,
  //       companyLocationId,
  //       tax: taxAmount,
  //       taxPercentage: Math.round(taxAmount / charges) / 100,
  //       customerPO,
  //       quickbookId,
  //       technicianMessages: [],
  //     },
  //   });
  // }
}
