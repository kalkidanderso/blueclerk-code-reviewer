import XLSX from "xlsx-js-style";
import { PrismaClient } from "@prisma/client";
import moment from "moment";
import { Invoice } from "../../models/v3/invoiceModel";
import { InvoiceRequestBody } from "../../types/v3/invoice";
import { _converInvoiceToRowExcel } from "../../controllers/v2/invoice";
import { EmailTypes } from  "../../models/EmailDefault"
import { InvoiceStatus, Messages, Status } from "../../common/constants"
import {transformPlaceholders, _createCompanyDefaultEmail} from "../../controllers/emailDefault"
// import { _createCompanyDefaultEmail } from "src/controllers/emailDefault";

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

    async getInvoiceEmailTemplate(emailType:string,invoiceIds:string,invoiceId:string){
        const invoiceModel = new Invoice(prisma.invoice);
        let invoice,invoices,customer,job;

        switch (emailType){
            case EmailTypes.INVOICES:
                if(!invoiceIds){
                    return {
                        status:Status.Error,
                        message:"Param invoiceIds is required for emailType INVOICES"
                    }
                }
                const invoiceIdsArray = JSON.parse(invoiceIds)?.map((id:string)=>parseInt(id));
                invoices = await invoiceModel.getEmailTemplates(invoiceIdsArray)
                if (!invoices.length) {
                    return { status: Status.Error, message: 'Invoices not found.' };
                }
    
                customer = invoices[0]?.customer;
                break;
            case EmailTypes.INVOICE:
                if (!invoiceId) {
                    return {
                        status:Status.Error,
                        message:"Param invoiceIds is required for emailType INVOICE"
                    }                    
                }
            default:
                invoice = await invoiceModel.getEmailTemplate(parseInt(invoiceId))
                if (!invoice) {
                    return { status: Status.Error, message: 'Invoice not found.' };
                }
                customer = invoice.customer;
                job = invoice.job
                break;
        }

        emailType = emailType ?? EmailTypes.INVOICE;

        let emailDefault:any = await prisma.emailDefault.findFirst({ where:{emailType} });

        await transformPlaceholders(emailDefault);

        return {
            status: Status.Success,
            emailType,
            emailTemplate: {
                from: "company_email",
                to: "customer_email",
                subject: eval('`' + emailDefault.subject + '`'),
                message: eval('`' + emailDefault.message + '`')
            },
            invoice, 
            invoices
        };
    }

    async getCurrentInvoiceNumber(companyId:number){
        try{
            const company = await prisma.company.findUnique({where:{id:companyId}});
            if(!company){
                return {
                    status:Status.Error, 
                    message:"No company found"
                }
            }
            return {
                status:Status.Success,
                invoicePrefix: company.invoicePrefix,
                currentInvoiceNumber: company.currentInvoiceId
            }
        }catch(e){
            return {
                status:Status.Error, 
                message:Messages.GenericError
            }
        }
    }

    // async createInvoice({
    //     companyLocation,
    //     estimateId,
    //     includePO,
    //     invoiceNumber,
    //     jobId,
    //     charges,
    //     customerContactId,
    //     customerId,
    //     customerPO,
    //     dueDate,
    //     isDraft,
    //     issuedDate,
    //     items,
    //     jobLocationId,
    //     note,
    //     paymentTermId,
    //     shippingCost,
    //     vendorId,
    //     jobSiteId,
    //     purchaseOrderId,
    //     workType
    //     }:{
    //     jobId:number,
    //     purchaseOrderId:string,
    //     estimateId :string,
    //     invoiceNumber:number,
    //     workType:string,
    //     companyLocation:string,
    //     customerId:number,
    //     charges:number,
    //     jobLocationId:number,
    //     jobSiteId:number,
    //     includePO:boolean,
    //     items:any[],
    //     paymentTermId:number,
    //     shippingCost:number,
    //     isDraft:boolean,
    //     issuedDate:string,
    //     dueDate:string,
    //     customerPO:any,
    //     customerContactId:number,
    //     vendorId:number,
    //     note:string
    // }){
    //     const invoiceModel = new Invoice(prisma.invoice);

    //     if(jobId){
    //         const previousInvoice =await invoiceModel.findInvoiceByJobId(jobId);
    //         if(previousInvoice){
    //             throw new Error('Invoice already created for this job')
    //         }
    //         const job = await prisma.job.findFirst({where:{id:jobId},include:{tasks:{include:{jobTypes:true}}}})
    //         if(!job){
    //             throw new Error('Invalid job id')
    //         }

    //         const jobTypes:any[] =[];
    //         job.tasks.forEach(task => {
    //             task.jobTypes.forEach(taskJobType => {
    //                 jobTypes.push({
    //                     id: taskJobType.jobTaskId,
    //                     quantity: taskJobType.completedCount || taskJobType.quantity,
    //                     price: taskJobType.price,
    //                 })
    //             })
    //         })
    //         // To merge job types when they have the same item
    //         const jobTypesFiltered = jobTypes.reduce((accumulator, currentObj) => {
    //             const existingItem = accumulator.find((item:any) => item.id.toString() === currentObj.id.toString());    
    //             if (existingItem) {
    //                 existingItem.quantity += currentObj.quantity;
    //             }else{
    //                 accumulator.push(currentObj);
    //             }
    //             return accumulator;
    //         }, []);
    //         if (!jobTypesFiltered.length) jobTypesFiltered.push({id: job.typeId, quantity: 1, price: 0});

    //         const items: any[] = []
    //         jobTypesFiltered.forEach(async (jobType:any) => {
    //             const item:any = await prisma.items.findFirst({where:{jobTypeId:jobType.id}})
    //             item["quantity"] = jobType.quantity;
    //             item["price"] = jobType.price;
    //             items.push(item);
    //         });

    //         this.populteInvoiceData({
    //             charges,
    //             companyLocation,
    //             customerContactId,
    //             customerId,
    //             customerPO,
    //             dueDate,
    //             includePO,
    //             invoiceNumber,
    //             isDraft,
    //             issuedDate,
    //             items,
    //             jobLocationId,
    //             jobSiteId,
    //             note,
    //             paymentTermId,
    //             shippingCost,
    //             vendorId,
    //             workType,
    //             job
    //         })
    //     }
    // }

    // async populteInvoiceData({
    //     charges:paraCharges,
    //     companyLocation:paraCompanyLocation,
    //     customerId,
    //     invoiceNumber,
    //     jobLocationId,
    //     workType:paraWorkType,
    //     customerContactId,
    //     customerPO,
    //     dueDate,
    //     includePO,
    //     isDraft,
    //     issuedDate,
    //     items,
    //     jobSiteId,
    //     note,
    //     paymentTermId,
    //     shippingCost:paraShippingCost,
    //     vendorId,
    //     job
    // }:{
    //     invoiceNumber:number,
    //     workType:string,
    //     companyLocation:string,
    //     customerId:number,
    //     charges:number,
    //     jobLocationId:number,
    //     jobSiteId:number,
    //     includePO:boolean,
    //     items:any[],
    //     paymentTermId:number,
    //     shippingCost:number,
    //     isDraft:boolean,
    //     issuedDate:string,
    //     dueDate:string,
    //     customerPO:any,
    //     customerContactId:number,
    //     vendorId:number,
    //     note:string,
    //     job:any
    // }){
    //     let taxAmount: number = 0;
    //     let charges: number = 0;
    //     let shippingCost: number = 0;
    //     let subTotalBeforeTax: number = 0
    //     let total: number = 0;
    //     let invoiceType: number = 0;
    //     let ticket: any;
    //     let customer: string
    //     let jobLocation: number;
    //     let jobSite: number;
    //     let jobId: number
    //     let timeSpent: number = 0
    //     let purchaseOrderId: string = null
    //     let estimateId: string = null
    //     let workType: string = paraWorkType;
    //     let companyLocation: string = paraCompanyLocation;    

    //     if(job){
    //         charges = job.charges;
    //         customer = job.customer;
    //         jobLocation = job.jobLocation;
    //         jobSite = job.jobSite;
    //         jobId : job.id;
    //         workType = job.workType;
    //         companyLocation = job.companyLocation;
    //         ticket:job.ticketId;
    //     }

    //     if(jobLocationId){
    //         const jobLocationObj =  await prisma.joblocation.findFirst({where:{id:jobLocationId,isActive:{not:false}}});
    //         if(!jobLocationObj){
    //             return { status: Status.Error, message: 'Subdivision not found' };
    //         }
    //         jobLocation = jobLocationObj.id
    //     }

    //     if(jobSiteId){
    //         const jobSiteObj = await prisma.jobsite.findFirst({where:{id:jobSiteId,isActive:{not:false}}})
    //         if(!jobSiteObj){
    //             return { status: Status.Error, message: 'Job Address not found' };
    //         }
    //         jobSite = jobSiteObj.id
    //     }

    //     let paymentTerm;
    //     if(paymentTermId){
    //         paymentTerm = await prisma.paymentterm.findFirst({where:{id:paymentTermId,isActive:{not:false}}}) 
    //     }

    //     let invoiceItems:any[]=[];
    //     if(items.length > 0){
    //         for (let i = 0; i < items.length; i++) {
    //             const item = items[i];
    //             if ((!item.hasOwnProperty('item') || !item.hasOwnProperty('tax') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity') || !item.hasOwnProperty('isFixed')) && (!item.hasOwnProperty('name') || !item.hasOwnProperty('description') || !item.hasOwnProperty('tax') || !item.hasOwnProperty('price') || !item.hasOwnProperty('quantity') || !item.hasOwnProperty('isFixed'))) {
    //                 return { 'status': Status.Error, 'message': 'Items format is invalid' }
    //             }
    //             let obj: any = {}
    //             let price = parseFloat(item.price)
    //             let quantity = parseFloat(item.quantity)
    //             let itemTax = 0
    //             let itemTaxAmount: number = 0
    //             let subTotal = price * quantity
    
    //             if (item.tax > 0) {
    //                 itemTax = parseFloat(item.tax)
    //                 itemTaxAmount = subTotal * itemTax / 100;
    //                 taxAmount += itemTaxAmount;
    //             }
    
    //             obj.quantity = item.quantity
    //             obj.price = Math.round(item.price * 100) / 100
    //             obj.isFixed = item.isFixed
    //             obj.tax = itemTax
    //             obj.taxAmount = Math.round(itemTaxAmount * 100) / 100
    //             obj.subTotal = Math.round(subTotal * 100) / 100
    
    //             if (item.item == undefined || item.item == null) {
    //                 obj.name = item.name
    //                 obj.description = item.description
    //             } else {
    //                 obj.item = item.item
    //                 obj.name = item.name || item.item?.name
    //                 obj.description = item.description || item.item?.description
    //             }
    //             invoiceItems.push(obj)
    //             subTotalBeforeTax += subTotal;
    //             total += subTotal;
    //         }
    //     }

    //     total += taxAmount;

    //     if(paraCharges) {
    //         charges = paraCharges;
    //         total += charges;
    //     }

    //     if (paraShippingCost) {
    //         shippingCost = paraShippingCost;
    //         total += shippingCost;
    //     }

    //     let status = InvoiceStatus.UNPAID;
    //     let paid = false;

        
    // }
}