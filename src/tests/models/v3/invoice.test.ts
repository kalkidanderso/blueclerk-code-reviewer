import { PrismaClient } from "@prisma/client";
import { Invoice } from "../../../models/v3/invoiceModel";

const prisma = new PrismaClient();

describe("Invoice", () => {
  it("Should get invoice in as Array", async () => {
    const invoice = new Invoice(prisma.invoice);

    const result = await invoice.getAll([]);

    expect(Array.isArray(result)).toEqual(true);
  });

  it("Should get invoice in as Array", async () => {
    const invoice = new Invoice(prisma.invoice);
    try {
      const result = await invoice.getAll([1]);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual("Error Occured");
    }
  });
});
