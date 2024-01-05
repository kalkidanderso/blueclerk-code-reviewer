import { InvoiceRequestBody } from '../../../types/v3/invoice'
import { InvoiceService } from "../../../services/v3/invoice"

describe('Invoice', () => {
  it('Should get invoice in response', async () => {
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
      bouncedEmailFlag: false
    }

    const getUser = await invoice.GetInvoice(paramObj);
    expect(getUser).toEqual({
      data: [],
      total: 0
    });
  },5000)

  it('Should get error', async () => {
    const invoice = new InvoiceService();

    try {
      const input: any = []
      const user = invoice.GetInvoice(input);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });

  it('Checking Buffer', async () => {
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
      bouncedEmailFlag: false
    }

    const excel = await invoice.exportInvoicesToExcel(paramObj);

    expect(Buffer.isBuffer(excel)).toEqual(true);

  });

  it('Should get error in invoice email template in response', async () => {
    const invoice = new InvoiceService();

    const emailTemplate = await invoice.getInvoiceEmailTemplate("INVOICES","","")

    expect(emailTemplate.status).toEqual(0);
  });

  it('Should get error in current InvoiceNumber in response', async () => {
    const invoice = new InvoiceService();

    const currentInvoiceNumber = await invoice.getCurrentInvoiceNumber(0)

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
},);
