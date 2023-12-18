import { Controller, Route, Tags, Query, Get } from 'tsoa';
import * as InvoiceService from '../../services/v3/invoice'
import * as InvoiceInterface from 'src/types/v3/invoice';

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
}