import { InvoiceRequestBody } from "../../../types/v3/invoice";
import { InvoiceService } from "../../../services/v3/invoice";

describe("Invoice", () => {
  it("Should get invoice in response", async () => {
    const invoice = new InvoiceService();
    const paramObj: InvoiceRequestBody = {
      customerContactId: "",
      customerId: "",
      customerPO: "",
      dueDate: "",
      endAmount: 0,
      invoiceId: "",
      isDraft: false,
      isVoid: false,
      startDate: new Date(),
      endDate: new Date(),
      lastEmailEndDate: new Date(),
      lastEmailStartDate: new Date(),
      missingPO: false,
      startAmount: 0,
      bouncedEmailFlag: false,
    };

    const getUser = await invoice.GetInvoice(paramObj);
    expect(getUser).toEqual({
      data: [],
      total: 0,
    });
  }, 10000);

  it("Should get error", async () => {
    const invoice = new InvoiceService();

    try {
      const input: any = [];
      const user = invoice.GetInvoice(input);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });

  it("Should get invoices in response", async () => {
    const invoice = new InvoiceService();
    const response = await invoice.getInvoices({});

    expect(response.status).toEqual(1);
    expect(typeof response.total).toEqual("number");
  });

  it("Checking Buffer", async () => {
    const invoice = new InvoiceService();

    const paramObj: InvoiceRequestBody = {
      customerContactId: "",
      customerId: "",
      customerPO: "",
      dueDate: "",
      endAmount: 0,
      invoiceId: "",
      isDraft: false,
      isVoid: false,
      startDate: new Date(),
      endDate: new Date(),
      lastEmailEndDate: new Date(),
      lastEmailStartDate: new Date(),
      missingPO: false,
      startAmount: 0,
      bouncedEmailFlag: false,
    };

    const excel = await invoice.exportInvoicesToExcel(paramObj);

    expect(Buffer.isBuffer(excel)).toEqual(true);
  });

  it("Should get error in invoice email template in response", async () => {
    const invoice = new InvoiceService();

    const emailTemplate = await invoice.getInvoiceEmailTemplate(
      "INVOICES",
      "",
      ""
    );

    expect(emailTemplate.status).toEqual(0);
  });

  it("Should get error in current InvoiceNumber in response", async () => {
    const invoice = new InvoiceService();

    const currentInvoiceNumber = await invoice.getCurrentInvoiceNumber(0);

    expect(currentInvoiceNumber.status).toEqual(0);
  });

  it("Should get not found error in sending invoices in response", async () => {
    const invoice = new InvoiceService();

    const sendInvoice = await invoice.sendinvoice({
      copyToMyself: false,
      invoiceId: 999,
      message: "",
      recipients: [],
      subject: "",
    });

    expect(sendInvoice?.status).toEqual(0);
  });

  it("Should get not found invoice while sending empty array in request", async () => {
    const invoice = new InvoiceService();

    const sendInvoice = await invoice.sendinvoices({
      copyToMyself: false,
      customerId: 0,
      invoiceIds: [],
      message: "",
      recipients: [],
      subject: "",
    });

    expect(sendInvoice?.status).toEqual(0);
  });

  it("Should get not found invoice while Updating request", async () => {
    const invoice = new InvoiceService();

    const sendInvoice = await invoice.updateInvoice({
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
    });

    expect(sendInvoice).toEqual({
      status: 0,
      message: "Invoice not found",
    });
  });

  it("Should get 0 Status while generate InvoicePdf", async () => {
    const invoice = new InvoiceService();

    const sendInvoice = await invoice.generateInvoicePdf("0", "0");

    expect(sendInvoice.status).toEqual(0);
  });

  it("Should not found invoice in updateInvoiceMessages", async () => {
    const invoice = new InvoiceService();

    const sendInvoice = await invoice.updateInvoiceMessages({
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
    });

    expect(sendInvoice?.status).toEqual(0);
  });

  it("Should get Error in updateInvoiceMessages", async () => {
    const invoice = new InvoiceService();
    try {
      const parameter: any = [];
      const sendInvoice = await invoice.updateInvoiceMessages(parameter);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });

  it("Should not found invoice in getInvoiceDetail", async () => {
    const invoice = new InvoiceService();

    const sendInvoice = await invoice.getInvoiceDetail(0);

    expect(sendInvoice).toEqual({
      status: 0,
      error: "Invoice not found",
    });
  });

  it("Should get Error in getInvoiceDetail", async () => {
    const invoice = new InvoiceService();

    try {
      const parameter: any = "abc";
      const sendInvoice = await invoice.getInvoiceDetail(parameter);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });

  it("Should not found invoice in unvoidInvoice", async () => {
    const invoice = new InvoiceService();

    const response = await invoice.unvoidInvoice(0);
    expect(response).toEqual({
      status: 0,
      error: "Invoice not found",
    });
  });

  it("Should get Error in voidInvoice", async () => {
    const invoice = new InvoiceService();

    try {
      const parameter: any = [];
      const sendInvoice = await invoice.voidInvoice(parameter);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });

  it("Should get UnsyncedInvoices", async () => {
    const invoice = new InvoiceService();
    const unsyncedInvoices = await invoice.getUnsyncedInvoices({});

    expect(Array.isArray(unsyncedInvoices?.invoices)).toEqual(true);
  });

  it("Should get companyInvoices", async () => {
    const invoice = new InvoiceService();
    const companyInvoices = await invoice.getCompanyInvoices("");

    expect(companyInvoices.status).toEqual(1);
    expect(Array.isArray(companyInvoices?.companyInvoices)).toEqual(true);
  });

  it("Should get null in companyInvoicesDetail", async () => {
    const invoice = new InvoiceService();
    const companyInvoices = await invoice.getCompanyInvoiceDetails("0");

    expect(companyInvoices.status).toEqual(0);
    expect(companyInvoices?.companyInvoice).toEqual(undefined);
  });

  it("Should get null in companyInvoicesDetail", async () => {
    const invoice = new InvoiceService();
    const invoicesByCustomer = await invoice.getInvoicesByCustomerId("1");

    expect(invoicesByCustomer.status).toEqual(1);
    expect(Array.isArray(invoicesByCustomer.invoices)).toEqual(true);
  });

  it("Should get wrong input error response in companyInvoicesDetail", async () => {
    const invoice = new InvoiceService();
    const invoicesByCustomer = await invoice.getInvoicesByCustomerId("ac");

    expect(invoicesByCustomer.status).toEqual(0);
    expect(invoicesByCustomer.message).toEqual("Wrong Input");
  });

  it("Should get invoice in InvoicesByCustomer", async () => {
    const invoice = new InvoiceService();
    const invoicesByCustomer = await invoice.getInvoicesByContractor({
      id: "1",
      type: "vendor",
    });

    expect(invoicesByCustomer.status).toEqual(1);
    expect(Array.isArray(invoicesByCustomer.invoices)).toEqual(true);
  });

  it("Should get wrong id error response in InvoicesByCustomer", async () => {
    const invoice = new InvoiceService();
    const invoicesByCustomer = await invoice.getInvoicesByContractor({
      id: "ac",
      type: "vendor",
    });

    expect(invoicesByCustomer.status).toEqual(0);
    expect(invoicesByCustomer.message).toEqual("Id is required");
  });
});
