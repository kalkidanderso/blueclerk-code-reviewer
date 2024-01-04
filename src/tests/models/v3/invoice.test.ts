import { PrismaClient } from "@prisma/client";
import { Invoice } from "../../../models/v3/invoiceModel";

const prisma = new PrismaClient();

describe("Invoice", () => {
  it("Should get invoice in as Array", async () => {
    const invoice = new Invoice(prisma.invoice);

    const result = await invoice.getAll([]);

    expect(Array.isArray(result)).toEqual(true);
  });

  it("Should get error in invoice", async () => {
    const invoice = new Invoice(prisma.invoice);
    try {
      const result = await invoice.getAll([1]);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual("Error Occured");
    }
  });

  it("Should get EmailTemplate in as Object", async () => {
    const invoice = new Invoice(prisma.invoice);

    const result = await invoice.getEmailTemplate(1);
    if(!result) return;

    expect(Object.keys(result).length>0).toEqual(true);
  });

  it("Should get EmailTemplates in as Array", async () => {
    const invoice = new Invoice(prisma.invoice);
      const result = await invoice.getEmailTemplates([]);
      expect(Array.isArray(result)).toEqual(true);
  });
});
