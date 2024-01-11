import { InvoiceStatus } from '@prisma/client';
import { Controller, Route, Tags, Query, Get, Post, Body, BodyProp, Delete } from 'tsoa';
import * as InvoiceService from '../../services/v3/invoice'
import * as InvoiceInterface from "../../types/v3/invoice"

/**
 * @tags Invoice - For creating and getting invoices
 */
@Tags("Invoice")
@Route('invoice')
export class GetInvoiceController extends Controller {
    /**
   * @summary To get all invoice.
   */
    @Get()
    // @Security('jwt')
    public async getInvoice(
        @Query('invoiceId') invoiceId?: string,
        @Query('dueDate') dueDate?: string,
        @Query('startAmount') startAmount?: number,
        @Query('endAmount') endAmount?: number,
        @Query('customerPO') customerPO?: string,
        @Query('missingPO') missingPO?: boolean,
        @Query('customerId') customerId?: string,
        @Query('customerContactId') customerContactId?: string,
        @Query('isDraft') isDraft?: boolean,
        @Query('isVoid') isVoid?: boolean,
        @Query('startDate') startDate?: Date,
        @Query('endDate') endDate?: Date,
        @Query('lastEmailStartDate') lastEmailStartDate?: Date,
        @Query('lastEmailEndDate') lastEmailEndDate?: Date,
        @Query('bouncedEmailFlag') bouncedEmailFlag?: boolean
    ): Promise<any> {

        const invoiceService = new InvoiceService.InvoiceService();
        try {
            let query: any = []
            const paramObj: InvoiceInterface.InvoiceRequestBody = {
                customerContactId,
                customerId,
                customerPO,
                dueDate,
                endAmount,
                invoiceId,
                isDraft,
                isVoid,
                startDate,
                endDate,
                lastEmailEndDate,
                lastEmailStartDate,
                missingPO,
                startAmount,
                bouncedEmailFlag
            }
            return await invoiceService.GetInvoice(paramObj);
        } catch (err) {
            console.log(err);
            // throw new Error(err.message);
        }
    }

    @Post("getInvoices")
    public async getInvoices(
      @Body()
      params: {
        pageSize?: number;
        nextCursor?: string;
        previousCursor?: string;
        keyword?: string;
        startDate?: string;
        endDate?: string;
        jobId?: number;
        status?: "UNPAID" | "PARTIALLY_PAID" | "PAID";
        customerId?: number;
        customerContactId?: number;
        jobLocationId?: number;
        jobAddress?: string;
        jobCity?: string;
        jobState?: string;
        jobZip?: string;
        technicianId?: string;
        startAmount?: number;
        endAmount?: number;
        lastEmailStartDate?: string;
        lastEmailEndDate?: string;
        isDraft?: boolean;
        isVoid?: boolean;
        dueDate?: string;
        recentOnly?: boolean;
      }
    ) {
      const invoiceService = new InvoiceService.InvoiceService();
      return invoiceService.getInvoices(params);
    }
  
    /**
   * @summary get invoicein excel.
   */
    @Get("exportInvoicesToExcel")
    public async exportInvoicesToExcel(
        // @Request() req: express.Request, res: express.Response
        @Query('invoiceId') invoiceId?: string,
        @Query('dueDate') dueDate?: string,
        @Query('startAmount') startAmount?: number,
        @Query('endAmount') endAmount?: number,
        @Query('customerPO') customerPO?: string,
        @Query('missingPO') missingPO?: boolean,
        @Query('customerId') customerId?: string,
        @Query('customerContactId') customerContactId?: string,
        @Query('isDraft') isDraft?: boolean,
        @Query('isVoid') isVoid?: boolean,
        @Query('startDate') startDate?: Date,
        @Query('endDate') endDate?: Date,
        @Query('lastEmailStartDate') lastEmailStartDate?: Date,
        @Query('lastEmailEndDate') lastEmailEndDate?: Date,
        @Query('bouncedEmailFlag') bouncedEmailFlag?: boolean
    ): Promise<any> {

        const invoiceService = new InvoiceService.InvoiceService();
        try {
            const paramObj: InvoiceInterface.InvoiceRequestBody = {
                customerContactId,
                customerId,
                customerPO,
                dueDate,
                endAmount,
                invoiceId,
                isDraft,
                isVoid,
                startDate,
                endDate,
                lastEmailEndDate,
                lastEmailStartDate,
                missingPO,
                startAmount,
                bouncedEmailFlag
            }

            return await invoiceService.exportInvoicesToExcel(paramObj);
        } catch (err) {
            throw new Error(err.message);
        }
    }

    @Get("getInvoiceEmailTemplate")
    public async getInvoiceEmailTemplate(
        @Query('emailType') emailType: string,
        @Query('invoiceIds') invoiceIds?: string,        
        @Query('invoiceId') invoiceId?: string,
    ){
        const invoiceService = new InvoiceService.InvoiceService();
        return invoiceService.getInvoiceEmailTemplate(emailType,invoiceIds,invoiceId);
    }

    @Get("getCurrentInvoiceNumber")
    public async getCurrentInvoiceNumber(
        @Query('companyId') companyId: string,
    ){
        const invoiceService = new InvoiceService.InvoiceService();
        return invoiceService.getCurrentInvoiceNumber(parseInt(companyId));
    }

    // @Post("createInvoice")
    // public async createInvoice(
    //     @BodyProp("jobId") jobId :number,
    //     @BodyProp("purchaseOrderId") purchaseOrderId :string,
    //     @BodyProp("estimateId") estimateId :string,
    //     @BodyProp("invoiceNumber") invoiceNumber :number,
    //     @BodyProp("workType") workType :string,
    //     @BodyProp("companyLocation") companyLocation :string,
    //     @BodyProp("jobSiteId") jobSiteId :number,
    //     @BodyProp("includePO") includePO :boolean,
    //     @BodyProp("items") items :any[],
    //     @BodyProp("paymentTermId") paymentTermId :number,
    //     @BodyProp("issuedDate") issuedDate :string,
    //     @BodyProp("dueDate") dueDate :string,
    //     @BodyProp("isDraft") isDraft :boolean,
    //     @BodyProp("customerPO") customerPO :any,
    //     @BodyProp("customerContactId") customerContactId :number,
    //     @BodyProp("vendorId") vendorId :number,
    //     @BodyProp("note") note :string,
    //     @BodyProp("shippingCost") shippingCost :number,
    //     @BodyProp("jobLocationId") jobLocationId :number,
    //     @BodyProp("charges") charges :number,
    //     @BodyProp("customerId") customerId :number,
    // ){
    //     const invoiceService = new InvoiceService.InvoiceService();
    //     return invoiceService.createInvoice({
    //         jobId,
    //         purchaseOrderId,
    //         companyLocation,
    //         estimateId,
    //         includePO,
    //         invoiceNumber,
    //         jobSiteId,
    //         workType,
    //         charges,
    //         customerContactId,
    //         customerId,
    //         customerPO,
    //         dueDate,
    //         isDraft,
    //         issuedDate,
    //         items,
    //         jobLocationId,
    //         note,
    //         paymentTermId,
    //         shippingCost,
    //         vendorId
    //     })
    // }
    @Post("sendInvoice")
    public async sendinvoice(
        @Body()params:{ 
            invoiceId:number,
            recipients: string[],
            copyToMyself: boolean,
            subject:string,
            message:string
         }
    ){
        const invoiceService = new InvoiceService.InvoiceService();
        return invoiceService.sendinvoice(params);
    }

    @Post("sendInvoices")
    public async sendInvoices(
        @Body()params:{ 
            invoiceIds:number[],
            recipients:string[],
            copyToMyself: boolean,
            subject:string,
            message:string,
            customerId:number,
         }
    ){
        const invoiceService = new InvoiceService.InvoiceService();
        return invoiceService.sendinvoices(params);
    }

    @Post("updateInvoice")
    public async updateInvoice(
      @Body()
      params: {
        invoiceId: number;
        isDraft: boolean;
        paymentTermId: number;
        customerContactId: number;
        jobLocationId: number;
        jobSiteId: number;
        charges?: number;
        tax?: number;
        issuedDate: string | Date;
        dueDate: string | Date;
        timeSpent?: number;
        includePO?: boolean;
        items?: any[];
        shippingCost?: number;
        note: string;
        vendorId: string;
      }
    ) {
      const invoiceService = new InvoiceService.InvoiceService();
      return invoiceService.updateInvoice(params);
    }
  
    @Get("generateInvoicePdf")
    public async generateInvoicePdf(
      @Query("customerId") customerId: string,
      @Query("companyId") companyId: string,
    ) {
      const invoiceService = new InvoiceService.InvoiceService();
      return invoiceService.generateInvoicePdf(customerId,companyId);
    }

    @Post("updateInvoiceMessages")
    public async updateInvoiceMessages(
      @Body()
      params: {
        invoiceId: number;
        showJobId?: boolean;
        technicianMessages?: {
          notes: {
            id: string;
            comment: string;
          }[];
          images: string[];
        };
      }
    ) {
      const invoiceService = new InvoiceService.InvoiceService();
      return invoiceService.updateInvoiceMessages(params);
    }
  
    @Get("getInvoiceDetail")
    public async getInvoiceDetail(@Query("invoiceId") invoiceId: string) {
      const invoiceService = new InvoiceService.InvoiceService();
      return invoiceService.getInvoiceDetail(parseInt(invoiceId));
    }
  
  @Post("unvoidInvoice")
  public async unvoidInvoice(
    @BodyProp("invoiceId")
    invoiceId: number
  ) {
    const invoiceService = new InvoiceService.InvoiceService();
    return invoiceService.unvoidInvoice(invoiceId);
  }

  @Delete("voidInvoice")
  public async voidInvoice(
    @BodyProp("invoiceId")
    invoiceId: number
  ) {
    const invoiceService = new InvoiceService.InvoiceService();
    return invoiceService.voidInvoice(invoiceId);
  }

  @Get("getUnsyncedInvoices")
  public async getUnsyncedInvoices(
    @Query("keyword")
    keyword?: string,
    @Query("customerId")
    customerId?: string,
    @Query("status")
    status?: InvoiceStatus,
    @Query("dueDate")
    dueDate?: string,
    @Query("startDate")
    startDate?: string,
    @Query("endDate")
    endDate?: string
  ) {
    const invoiceService = new InvoiceService.InvoiceService();
    return invoiceService.getUnsyncedInvoices({
      keyword,
      customerId,
      status,
      dueDate,
      startDate,
      endDate,
    });
  }

  @Get("getCompanyInvoices")
  public async getCompanyInvoices(@Query("compantId") compantId?: string) {
    const invoiceService = new InvoiceService.InvoiceService();
    return invoiceService.getCompanyInvoices(compantId);
  }

  @Get("getCompanyInvoiceDetails")
  public async getCompanyInvoiceDetails(
    @Query("companyInvoiceId") companyInvoiceId: string
  ) {
    const invoiceService = new InvoiceService.InvoiceService();
    return invoiceService.getCompanyInvoiceDetails(companyInvoiceId);
  }

  @Get("getInvoicesByCustomerId")
  public async getInvoicesByCustomerId(
    @Query("customerId") customerId: string
  ) {
    const invoiceService = new InvoiceService.InvoiceService();
    return invoiceService.getInvoicesByCustomerId(customerId);
  }

  @Get("getInvoicesByContractor")
  public async getInvoicesByContractor(
    @Query("type") type: "vendor" | "employee",
    @Query("id") id: string,
    @Query("name") name?: string,
    //Filter of start issued date
    @Query("startDate") startDate?: string,
    //Filter of end issued date
    @Query("endDate") endDate?: string
  ) {
    const invoiceService = new InvoiceService.InvoiceService();
    return invoiceService.getInvoicesByContractor({
      type,
      id,
      name,
      startDate,
      endDate,
    });
  }

}