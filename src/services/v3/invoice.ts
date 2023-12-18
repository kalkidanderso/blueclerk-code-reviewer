import XLSX from "xlsx-js-style";
import { PrismaClient } from "@prisma/client";
import moment from "moment";
import { Invoice } from "../../models/v3/invoiceModel";
import { InvoiceRequestBody } from "../../types/v3/invoice";
import { _converInvoiceToRowExcel } from "../../controllers/v2/invoice";
const prisma = new PrismaClient();

export class InvoiceService {
    constructor() { }

    async GetInvoice({
        bouncedEmailFlag,
        customerContactId,
        customerId,
        customerPO,
        dueDate,
        endAmount,
        endDate,
        invoiceId,
        isDraft,
        isVoid,
        lastEmailEndDate,
        lastEmailStartDate,
        missingPO,
        startAmount,
        startDate }: InvoiceRequestBody): Promise<any> {
        const invoice = new Invoice(prisma.invoice);
        const returnQuery: any[] = [];
        if (startAmount) {
            returnQuery.push({ total: { gte: startAmount } })
        }
        if (endAmount) {
            returnQuery.push({ total: { lte: endAmount } })
        }
        if (invoiceId) {
            returnQuery.push({ invoiceId })
        }
        if (dueDate) {
            returnQuery.push({ dueDate })
        }
        if (customerPO) {
            returnQuery.push({ customerPO })
        }
        if (missingPO) {
            returnQuery.push({ OR: [{ customerPO: null }, { customerPO: "" }] })
        }
        if (bouncedEmailFlag) {
            returnQuery.push({ bouncedEmailFlag: true })
        }
        if (customerId) {
            returnQuery.push({ customerId })
        }
        if (customerContactId) {
            returnQuery.push({ customerContactId })
        }
        if (startDate && endDate) {
            const startDateMoment = moment.utc(startDate).startOf('day').format();
            const endDateMoment = moment.utc(endDate).endOf('day').format();
            returnQuery.push({ issuedDate: { gte: new Date(startDateMoment), lte: new Date(endDateMoment) } })
        }
        if (lastEmailStartDate && lastEmailEndDate) {
            const lastEmailStartDateMoment = moment(lastEmailStartDate).startOf('day').format();
            const lastEmailEndDateMoment = moment(lastEmailEndDate).endOf('day').format();
            returnQuery.push({ lastEmailSent: { gte: new Date(lastEmailStartDateMoment), lte: new Date(lastEmailEndDateMoment) } });
        }

        const allInvoice = await invoice.getAll(returnQuery)

        return {
            data: allInvoice,
            total: allInvoice.length
        }

    }

    async exportInvoicesToExcel(body: InvoiceRequestBody) {
        const allInvoice = await this.GetInvoice(body);

        const rows = allInvoice.data.map((invoice: any) => _converInvoiceToRowExcel(invoice));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows, { cellStyles: true });
        const headers = ["Payment Status", "Invoice ID", "Invoice Date", "Customer", "Subdivision", "Job Address", "PO", "Total", "Email Send Date", "Contact Name", "Contact Email"]
        const columnWidths = [{ wch: 14.17 }, { wch: 11.58 }, { wch: 12.17 }, { wch: 14.17 }, { wch: 14.38 }, { wch: 14.38 }, { wch: 8.38 }, { wch: 14.17 }, { wch: 12.17 }, { wch: 14.17 }, { wch: 14.17 }];
        worksheet['!cols'] = columnWidths;
        XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });

        const cellStyles: any = {
            PAID: {
                font: { color: { rgb: "00B04E" } }
            },
            UNPAID: {
                font: { color: { rgb: "FF0000" } }
            },
            PARTIALLY_PAID: {
                font: { color: { rgb: "FA8029" } }
            },
        };

        // Set the style for each cell in column A (Status) based on its value
        for (let rowIndex = 0; rowIndex <= rows.length; rowIndex++) {
            const cellRefStatus = XLSX.utils.encode_cell({ c: 0, r: rowIndex });
            let cellStatus = worksheet[cellRefStatus];
            if (cellStatus && cellStatus.v in cellStyles) {
                const cellStyle = cellStyles[cellStatus.v];
                if (cellStyles) {
                    cellStatus["s"] = cellStyle;
                }
            }
        }

        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        return buf;
    }
}