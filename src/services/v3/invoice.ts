import XLSX from "xlsx-js-style";
import { InvoiceStatus, PrismaClient } from "@prisma/client";
import moment from "moment";
import { Invoice } from "../../models/v3/invoiceModel";
import { InvoiceRequestBody } from "../../types/v3/invoice";
import { _converInvoiceToRowExcel } from "../../controllers/v2/invoice";
import { EmailTypes } from "../../models/EmailDefault";
import { DefaultCommission, Messages, Status } from "../../common/constants";
import {
  transformPlaceholders,
  _createCompanyDefaultEmail,
} from "../../controllers/emailDefault";
import { INVOICE_PDF_PATH } from "../../common/config";
import { _generateInvoicePdf } from "../../controllers/invoice";
import { sendInvoiceEmailToCustomer, uploadFileInS3 } from "../aws";
import * as helper from "../../services/helper";

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
    startDate,
  }: InvoiceRequestBody): Promise<any> {
    const invoice = new Invoice(prisma.invoice);
    const returnQuery: any[] = [];
    if (startAmount) {
      returnQuery.push({ total: { gte: startAmount } });
    }
    if (endAmount) {
      returnQuery.push({ total: { lte: endAmount } });
    }
    if (invoiceId) {
      returnQuery.push({ invoiceId });
    }
    if (dueDate) {
      returnQuery.push({ dueDate });
    }
    if (customerPO) {
      returnQuery.push({ customerPO });
    }
    if (missingPO) {
      returnQuery.push({ OR: [{ customerPO: null }, { customerPO: "" }] });
    }
    if (bouncedEmailFlag) {
      returnQuery.push({ bouncedEmailFlag: true });
    }
    if (customerId) {
      returnQuery.push({ customerId });
    }
    if (customerContactId) {
      returnQuery.push({ customerContactId });
    }
    if (startDate && endDate) {
      const startDateMoment = moment.utc(startDate).startOf("day").format();
      const endDateMoment = moment.utc(endDate).endOf("day").format();
      returnQuery.push({
        issuedDate: {
          gte: new Date(startDateMoment),
          lte: new Date(endDateMoment),
        },
      });
    }
    if (lastEmailStartDate && lastEmailEndDate) {
      const lastEmailStartDateMoment = moment(lastEmailStartDate)
        .startOf("day")
        .format();
      const lastEmailEndDateMoment = moment(lastEmailEndDate)
        .endOf("day")
        .format();
      returnQuery.push({
        lastEmailSent: {
          gte: new Date(lastEmailStartDateMoment),
          lte: new Date(lastEmailEndDateMoment),
        },
      });
    }

    const allInvoice = await invoice.getAll(returnQuery);

        return {
            data: allInvoice,
            total: allInvoice.length
        }

    }

    async getInvoices({
      customerContactId,
      customerId,
      dueDate,
      endAmount,
      endDate,
      isDraft,
      isVoid,
      jobAddress,
      jobCity,
      jobId,
      jobLocationId,
      jobState,
      jobZip,
      keyword,
      lastEmailEndDate,
      lastEmailStartDate,
      nextCursor,
      pageSize,
      previousCursor,
      recentOnly,
      startAmount,
      startDate,
      status,
      technicianId,
    }: {
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
    }) {
      let andQuery = [];
      let orQuery = [];

    if (nextCursor && previousCursor) {
      return {
        status: Status.Error,
        message:
          "Provided cursor could only be one of either nextCursor or previousCursor.",
      };
    }

    if (
      startDate &&
      endDate &&
      Number.isNaN(new Date(startDate)) &&
      Number.isNaN(new Date(endDate))
    ) {
      andQuery.push({
        issuedDate: { gte: new Date(startDate), lte: new Date(endDate) },
      });
    } else {
      andQuery.push({
        issuedDate: { gte: new Date(moment().subtract(90, "days").format()) },
      });
    }
 
    if (keyword) {
      orQuery.push(
        { invoiceId: { contains: keyword } },
        { customerPO: { contains: keyword } },
        { vendorId: { contains: keyword } },
        { customer: { profile: { string_contains: keyword } } },
        { jobLocation: { name: { contains: keyword } } },
        { jobLocation: { address: { string_contains: keyword } } },
        { jobSite: { address: { string_contains: keyword } } },
        { companyLocation: { address: { string_contains: keyword } } }
      );
      if (parseInt(keyword)) {
        orQuery.push({ jobId: { equals: parseInt(keyword) } });
      }
    }

    if (dueDate && new Date(dueDate) && Number.isNaN(new Date(dueDate))) {
      andQuery.push({ dueDate: { lte: new Date(dueDate) } });
    }


    if (status) {
      andQuery.push({ serviceType: { equals: status } });
    }

    if (startAmount) {
      andQuery.push({ total: { gte: startAmount } });
    }

    if (endAmount) {
      andQuery.push({ total: { lte: endAmount } });
    }

    if (customerId) {
      andQuery.push({ customerId });
    }

    if (customerContactId) {
      andQuery.push({ customerContactId: customerContactId });
    }

    if (jobLocationId) {
      andQuery.push({ jobLocationId });
    }

    if ([true, false].includes(isDraft)) {
      andQuery.push({ isDraft });
    }

    if (
      lastEmailStartDate &&
      Number.isNaN(new Date(lastEmailStartDate)) &&
      lastEmailEndDate &&
      Number.isNaN(new Date(lastEmailEndDate))
    ) {
      andQuery.push({
        lastEmailSent: {
          gte: new Date(lastEmailStartDate),
          lte: new Date(lastEmailEndDate),
        },
      });
    }

    if ([true, false].includes(isVoid)) {
      andQuery.push({
        isVoid,
      });
    }

    if (jobId) {
      andQuery.push({
        jobId,
      });
    }

    if (nextCursor) {
      const cursor = JSON.parse(helper.fromCursorHash(nextCursor));
      if (new Date(cursor.createdAt)) {
        orQuery.push({
          createdAt: { gte: new Date(cursor.createdAt) },
        });
      }
    }

    const invoices = await prisma.invoice.findMany({
      where: { AND: andQuery, OR: orQuery },
      include: {
        job: true,
        customer: true,
        jobLocation: true,
        jobSite: true,
        customerContact: true,
        paymentTerm: true,
        companyLocation: true,
      },
      take: pageSize || 30,
    });

    const invoiceCount = await prisma.invoice.count({
      where: { AND: andQuery, OR: orQuery },
    });
    let requestNextCursor = {
      createdAt: invoices[invoices.length - 1]?.createdAt,
      id: invoices[invoices.length - 1]?.id,
    };
    let requestPreviousCursor = {
      createdAt: invoices[0]?.createdAt,
      id: invoices[0]?.id,
    };

    const unsyncedInvoices = await prisma.invoice.findMany({
      where: {
        isDraft: { not: true },
        isVoid: { not: true },
        quickbookId: "null",
      },
    });

    return {
      status: Status.Success,
      total: invoiceCount,
      unsyncedInvoices,
      invoices,
      pagination: {
        nextCursor: helper.toCursorHash(JSON.stringify(requestNextCursor)),
        previousCursor: helper.toCursorHash(
          JSON.stringify(requestPreviousCursor)
        ),
        pageSize,
      },
    };
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
        font: { color: { rgb: "00B04E" } },
      },
      UNPAID: {
        font: { color: { rgb: "FF0000" } },
      },
      PARTIALLY_PAID: {
        font: { color: { rgb: "FA8029" } },
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

    async sendinvoice(params:{ 
        invoiceId:number,
        recipients: string[],
        copyToMyself: boolean,
        subject:string,
        message:string
     }){
        try{
            const invoice = await prisma.invoice.findUnique({ 
                where:{id:params.invoiceId},
                include:{
                    job:true,
                    customer:true,
                    jobLocation:true,
                    jobSite:true,
                    customerContact:true,
                    paymentTerm:true,
                    companyLocation:true
                }}) as any;
    
            if(!invoice) {
                return { status: Status.Error, message: 'Invoice not found.' };
            }
    
            const { customer, paymentTerm, customerContact, companyLocation, companyId } = invoice ;
            const filepath = `${INVOICE_PDF_PATH}/${invoice.invoiceId}.pdf`;
            const invoicePdfs = [{invoice, filepath}];
            const emailDefault =await prisma.emailDefault.findFirst({where:{ companyId, emailType:EmailTypes.INVOICE }});
            const { billingAddress } = companyLocation as any; 
            const sender_email = billingAddress?.emailSender || "" ;
            const company = await prisma.company.findUnique({where:{id:companyId}}) as any
            if(!company){
                return 
            }
    
            await _generateInvoicePdf( company, invoice);
    
            let recipientEmails: string[];
    
            if(params.recipients){
                recipientEmails = params.recipients.length > 0 ? 
                    params.recipients : [(customerContact?.email || customer?.info?.email)] 
            }
            if(params.copyToMyself){
                recipientEmails.push(sender_email)
            }
            
            await sendInvoiceEmailToCustomer({
                subject: params.subject ?? emailDefault?.subject,
                message: params.message ?? emailDefault?.message,
                sender_email: sender_email,
                company_name: company.info?.companyName,
                company_email: company.info?.companyEmail,
                company_logo: company.info?.logoUrl,
                customer_name: customer.profile?.displayName,
                customer_email: customerContact?.email ?? customer?.info?.email,
                recipient_emails: recipientEmails,
                invoice_number: invoice.invoiceId,
                invoice_amount: invoice.total,
                invoice_due_date: moment(invoice.dueDate).format('MMMM DD, YYYY'),
                invoice_pdfs: invoicePdfs,
                term_name: paymentTerm?.name,
                term_due_days: paymentTerm?.dueDays,
                has_cc: params.copyToMyself    
            })

            const sendingDate = new Date();

            recipientEmails.forEach((email)=>{
                invoice.emailHistory?.push({
                    sendTo:email,
                    sentAt:sendingDate,
                    deliveryStatus: true
                })
            })

            invoice.lastEmailSent = sendingDate;
            await prisma.invoice.update({where:{id: invoice.id}, data: invoice})
            return { status: Status.Success, message: 'Invoice has been sent successfully.' };
        }catch(e){
            return { status: Status.Error, message: Messages.GenericError }
        }
    }

    async sendinvoices(params:{ 
        invoiceIds: number[],
        recipients: string[],
        copyToMyself: boolean,
        subject:string,
        message:string,
        customerId:number,
     }){
        try{
            const invoices = await prisma.invoice.findMany({ 
                where:{id:{in: params.invoiceIds} },
                include:{
                    job:true,
                    customer:true,
                    jobLocation:true,
                    jobSite:true,
                    customerContact:true,
                    paymentTerm:true,
                    companyLocation:true
                }}) 
    
            if(!invoices?.length) {
                return { status: Status.Error, message: 'Invoices not found.' };
            }
    
            let invoicePdfs:any[] = [];
            let totalInvoiceAmount = 0;
            let invoiceSender = "";
        
            try{
                Promise.all(invoices.map(async(invoice:any)=>{
                    const filepath = `${INVOICE_PDF_PATH}/${invoice.invoiceId}.pdf`;
                    const company = await prisma.company.findUnique({where:{id:invoice.companyId}}) as any;
                    if(!company){
                        return 
                    }
                    await _generateInvoicePdf(company, invoice);
                    
                    totalInvoiceAmount += invoice.total;
            
                    invoicePdfs.push({invoice,filepath});

                    const companyInfo = await prisma.companyInfo.findUnique({where:{id:company.companyInfoId}})
                    const sendingDate = new Date();
                    
                    invoice.emailHistory?.push({
                        sendTo: companyInfo.companyEmail,
                        sentAt:sendingDate,
                        deliveryStatus: true
                    })
                    invoice.lastEmailSent = sendingDate;

                    await prisma.invoice.update({where:{id: invoice.id}, data: invoice})

                    const companyLocation = invoice.companyLocation as any;
                    invoiceSender = companyLocation?.billingAddress?.emailSender;
                }))
            }catch(e){
                return { status: Status.Error, message: Messages.GenericError };
            }

            let recipientEmails: string[];
    
            const currentInvoices = invoices.find((invoice)=>invoice.customerId=params.customerId) as any ;

            const sender_email = currentInvoices.customer?.contact?.email || ""
            const company = await prisma.company.findMany({where:{id:currentInvoices.companyId}}) as any;
            if(params.copyToMyself){
                if(currentInvoices) recipientEmails.push(currentInvoices.customer?.contact?.email)
            }
            const emailDefault = await prisma.emailDefault.findFirst({ where:{ company:{id:currentInvoices?.companyId}, emailType: EmailTypes.INVOICES}});

            await sendInvoiceEmailToCustomer({
                subject: params.subject ?? emailDefault?.subject,
                message: params.message ?? emailDefault?.message,
                sender_email: invoiceSender || sender_email,
                company_name: company.info?.companyName,
                company_email: company.info?.companyEmail,
                company_logo: company.info?.logoUrl,
                recipient_emails: params.recipients,
                invoice_total_amount: totalInvoiceAmount,
                invoice_pdfs: invoicePdfs,
            });
            return { status: Status.Success, message: 'Invoices has been sent successfully.' };
        }catch(e){
            return { status: Status.Error, message: Messages.GenericError }
        }
    }

    async updateInvoice(params: {
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
    }) {
      try {
        const invoice = await prisma.invoice.findUnique({
          where: { id: params.invoiceId },
        });
  
        if (!invoice) {
          return { status: Status.Error, message: "Invoice not found" };
        }
  
        if (params.isDraft && invoice.serviceType === InvoiceStatus.UNPAID) {
          return {
            status: Status.Error,
            message:
              "Cannot update a PAID/PARTIALLY PAID invoce to become draft.",
          };
        }
  
        const customer = (await prisma.customer.findUnique({
          where: { id: invoice.customerId },
          include: { paymentTerm: true },
        })) as any;
  
        const oldIsDraft = invoice.isDraft;
        const oldTotalInvoice = invoice.total;
  
        const paymentTerm = await prisma.paymentterm.findFirst({
          where: { id: params.paymentTermId, isActive: true },
        });
  
        if (!paymentTerm) {
          return { status: Status.Error, message: "Payment Term not found" };
        }
  
        const customerContact = await prisma.contact.findUnique({
          where: { id: params.customerContactId },
        });
        if (!customerContact) {
          return {
            status: Status.Error,
            message: "Customer Contact not found",
          };
        }
  
        const joblocation = await prisma.joblocation.findUnique({
          where: { id: params.jobLocationId },
        });
  
        if (!joblocation) {
          return { status: Status.Error, message: "Job Address not found" };
        }
  
        const jobsite = await prisma.jobsite.findUnique({
          where: { id: params.jobSiteId },
        });
  
        if (!jobsite) {
          return { status: Status.Error, message: "Subdivision not found" };
        }
  
        if (!params.charges && !params.tax) {
          return {
            status: Status.Error,
            message: "Tax Percentage or charges are required",
          };
        }
  
        const job = (await prisma.job.findUnique({
          where: { id: invoice.jobId },
        })) as any;
  
        if (!job) {
          return {
            status: Status.Error,
            message: "job for this invoice is not found",
          };
        }
        const issuedDate = params.issuedDate
          ? new Date(params.issuedDate)
          : invoice.issuedDate;
        const dueDate =
          params.paymentTermId && paymentTerm
            ? new Date(params.dueDate)
            : issuedDate;
        let charges: number = invoice.charges;
        let shippingCost: number = invoice.shippingCost;
        let taxAmount: number = 0;
        let subTotalBeforeTax: number = 0;
        let total: number = 0;
        let paymentApplied = invoice.paymentApplied ?? 0;
        let balanceDue =
          invoice.balanceDue ?? invoice.total - paymentApplied ?? invoice.total;
        let paid = invoice.paid;
        let status = invoice.serviceType;
        const oldTotal = invoice.total;
  
        if (!params.timeSpent) {
          return { status: Status.Error, message: "Time spent is required" };
        }
        invoice.timeSpent = params.timeSpent;
  
        let invoiceItems: any[] = [];
        if (params.items && params.items.length > 0) {
          let errorArr: any[] = [];
  
          params.items.map((item: any) => {
            if (
              (!item.hasOwnProperty("item") ||
                !item.hasOwnProperty("tax") ||
                !item.hasOwnProperty("price") ||
                !item.hasOwnProperty("quantity") ||
                !item.hasOwnProperty("isFixed")) &&
              (!item.hasOwnProperty("name") ||
                !item.hasOwnProperty("description") ||
                !item.hasOwnProperty("tax") ||
                !item.hasOwnProperty("price") ||
                !item.hasOwnProperty("quantity") ||
                !item.hasOwnProperty("isFixed"))
            ) {
              return errorArr.push({
                status: Status.Error,
                message: "Items format is invalid",
              });
            }
            let obj: any = {};
            let price = parseFloat(item.price);
            let quantity = parseFloat(item.quantity);
            let itemTax = 0;
            let itemTaxAmount: number = 0;
            let subTotal = price * quantity;
  
            if (item.tax > 0) {
              itemTax = parseFloat(item.tax);
              itemTaxAmount = (subTotal * itemTax) / 100;
              taxAmount += itemTaxAmount;
            }
  
            obj.quantity = item.quantity;
            obj.price = Math.round(item.price * 100) / 100;
            obj.isFixed = item.isFixed;
            obj.tax = itemTax;
            obj.taxAmount = Math.round(itemTaxAmount * 100) / 100;
            obj.subTotal = Math.round(subTotal * 100) / 100;
  
            if (!item.item) {
              obj.name = item.name;
              obj.description = item.description;
            } else {
              obj.item = item.item;
              obj.name = item.name || item.item?.name;
              obj.description = item.description || item.item?.description;
            }
            invoiceItems.push(obj);
  
            subTotalBeforeTax += subTotal;
            total += subTotal;
          });
          if (errorArr.length > 0) {
            return errorArr[0];
          }
        }
  
        total += taxAmount;
        balanceDue += total - oldTotal;
  
        if (balanceDue <= 0 || paymentApplied >= total) {
          customer.credit += Math.abs(balanceDue);
          paymentApplied = total;
          balanceDue = 0;
          status = InvoiceStatus.PAID;
          paid = true;
        } else {
          status =
            paymentApplied > 0
              ? InvoiceStatus.PARTIALLY_PAID
              : InvoiceStatus.UNPAID;
          paid = false;
        }
  
        if (job.tasksBackup?.length > 0 && customer.isCustomPrice) {
          const customPrice = customer.customPrices?.find(
            (cp: any) => cp.quantity === job.tasks?.length
          );
          total = customPrice?.price || 0;
        }
  
        if (!invoice.isDraft && job) {
          const invoiceCommission = (await prisma.invoicecommission.findFirst({
            where: { invoiceId: invoice.id },
          })) as any;
  
          if (invoiceCommission.technicians) {
            const totalTechnician = invoiceCommission.technicians?.length;
            for (const invoiceCommissionTechnician of invoiceCommission?.technicians) {
              if (invoiceCommissionTechnician.contractor) {
                const contractor = await prisma.company.findFirst({
                  where: { id: invoiceCommissionTechnician.contractor },
                });
                if (contractor && contractor.commissionType != "fixed") {
                  if (Number(total) !== Number(oldTotalInvoice)) {
                    const getCommission = (t: any) =>
                      ((t / totalTechnician) *
                        (contractor.commission ??
                          DefaultCommission.VENDOR_COMMISSION)) /
                      100;
                    const oldCommission = getCommission(oldTotal);
                    let commission = getCommission(total);
                    commission = Number(commission.toFixed(2));
                    contractor.balance -= Number(oldCommission.toFixed(2));
                    contractor.balance += Number(commission.toFixed(2));
                    invoiceCommissionTechnician.commissionAmount = Number(
                      commission.toFixed(2) || 0
                    );
                  }
  
                  await prisma.company.update({
                    where: { id: contractor.id },
                    data: contractor,
                  });
                }
              }
  
              if (
                invoiceCommissionTechnician.technician &&
                !invoiceCommissionTechnician.contractor
              ) {
                const technician = await prisma.user.findUnique({
                  where: { id: invoiceCommissionTechnician.technician },
                });
                if (technician) {
                  if (Number(total) !== Number(oldTotalInvoice)) {
                    const oldCommission =
                      ((oldTotal / totalTechnician) *
                        (technician.commission ??
                          DefaultCommission.EMPLOYEE_COMMISSION)) /
                      100;
                    const commission =
                      ((total / totalTechnician) *
                        (technician.commission ??
                          DefaultCommission.EMPLOYEE_COMMISSION)) /
                      100;
                    invoiceCommissionTechnician.commissionAmount = Number(
                      commission.toFixed(2)
                    );
                    technician.balance -= Number(oldCommission.toFixed(2));
                    technician.balance += Number(commission.toFixed(2));
                  }
  
                  await prisma.user.update({
                    where: { id: technician.id },
                    data: technician,
                  });
                }
              }
            }
          }
        }
  
        if (params.charges) {
          charges = params.charges;
          total += charges;
        }
        if (params.shippingCost) {
          shippingCost = params.shippingCost;
          total += shippingCost;
        }
  
        const updatedInvoice = await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            items: invoiceItems,
            shippingCost: helper.roundTwoDecimal(shippingCost),
            taxAmount: helper.roundTwoDecimal(taxAmount),
            subTotal: helper.roundTwoDecimal(subTotalBeforeTax),
            total: helper.roundTwoDecimal(total),
            balanceDue: helper.roundTwoDecimal(balanceDue),
            paymentApplied: helper.roundTwoDecimal(paymentApplied),
            serviceType: status,
            paid,
            charges,
            issuedDate,
            dueDate,
            note: params.note,
            isDraft: params.isDraft,
            customerContactId: customerContact.id,
            jobLocationId: joblocation.id || null,
            jobSiteId: jobsite.id || null,
            vendorId: params.vendorId,
            paymentTermId: params.paymentTermId || null,
          },
        });
  
        return {
          status: Status.Success,
          message: "Invoice updated successfully",
          invoice: updatedInvoice,
        };
      } catch (e) {
        return { status: Status.Error, message: Messages.GenericError };
      }
    }

    async generateInvoicePdf(cusId: string, invId: string) {
      const invoiceId = parseInt(invId);
      const customerId = parseInt(cusId);
      const invoice = (await prisma.invoice.findFirst({
        where: { id: invoiceId, customerId },
        include: {
          customer: true,
          jobLocation: true,
          jobSite: true,
          customerContact: true,
          paymentTerm: true,
          companyLocation: true,
          company: true,
        },
      })) as any;
  
      if(!invoice){
        return {status:Status.Error,message:"invoice not found"}
      }

      const filepath = `${INVOICE_PDF_PATH}/${invoice.invoiceId}.pdf`;
  
      await _generateInvoicePdf(invoice.company, invoice);
      const invoiceUrl = await uploadFileInS3(filepath, "pdf");
      return {
        status: Status.Success,
        message: "Invoice Successfully Generated",
        invoiceUrl: invoiceUrl,
      };
    }
  
  async updateInvoiceMessages(params: {
    invoiceId: number;
    showJobId?: boolean;
    technicianMessages?: {
      notes: {
        id: string;
        comment: string;
      }[];
      images: string[];
    };
  }) {
    const invoice = (await prisma.invoice.findFirst({
      where: { id: params.invoiceId },
    })) as any;

    if (!invoice) {
      return { status: Status.Error, error: "Invoice not found" };
    }

    invoice.technicianMessages = {
      notes:
        params.technicianMessages.notes || invoice.technicianMessages.notes,
      image:
        params.technicianMessages.images || invoice.technicianMessages.images,
    };

    if ([true, false].includes(params.showJobId)) {
      invoice.showJobId = params.showJobId;
    }
  }

  async getInvoiceDetail(invoiceId: number) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId },
      include: {
        job: true,
        paymentTerm: true,
        customer: true,
        jobLocation: true,
        jobSite: true,
        customerContact: true,
        company: true,
        companyLocation: true,
        createdBy: true,
        workType: true,
        paymentcustomer: true,
      },
    });

    if (!invoice) {
      return { status: Status.Error, error: "Invoice not found" };
    }
    const payments = await prisma.paymentcustomer.findMany({
      where: {
        OR: [
          { id: invoiceId },
          {
            companyLocations: {
              some: { invoice: { some: { id: invoiceId } } },
            },
          },
        ],
      },
    });

    return { status: Status.Success, invoice, payments };
  }

  async unvoidInvoice(invoiceId: number) {
    let invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return { status: Status.Error, error: "Invoice not found" };
    }

    if (invoice.isVoid === false) {
      return { status: Status.Error, message: "Invoice already un-voided." };
    }

    if (invoice.serviceType !== InvoiceStatus.UNPAID) {
      return {
        status: Status.Error,
        message:
          "Invoice already paid or partially paid, cannot void this invoice.",
      };
    }

    invoice.createdAt = new Date();
    invoice.updatedAt = new Date();
    invoice.invoiceId = `Invoice ${invoice.invoiceId.split(" ")[1] + 1}`;
    invoice.isVoid = false;
    invoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: invoice,
    });

    const updatedInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { job: true, customer: true, jobSite: true },
    });

    if (!updatedInvoice.isDraft) {
      if (updatedInvoice.job) {
        updatedInvoice.customer.balance += updatedInvoice.total;
        await prisma.customer.update({
          where: { id: updatedInvoice.customer.id },
          data: updatedInvoice.customer,
        });
      }
    }

    return {
      status: Status.Success,
      message: "Duplicate Job invoice created successfully.",
      invoice,
    };
  }

  async voidInvoice(invoiceId: number) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return { status: Status.Error, message: "Invoice not found." };
    }

    if (invoice.isVoid) {
      return { status: Status.Error, message: "Invoice already voided." };
    }

    if (invoice.serviceType !== InvoiceStatus.UNPAID) {
      return {
        status: Status.Error,
        message:
          "Invoice already paid or partially paid, cannot void this invoice.",
      };
    }

    const invoicecommission = prisma.invoicecommission.findUnique({
      where: { id: invoice.id },
    });

    if (invoicecommission) {
      prisma.invoicecommission.delete({ where: { id: invoice.id } });
    }

    invoice.isVoid = true;
    await prisma.invoice.update({ where: { id: invoice.id }, data: invoice });

    const customer = await prisma.customer.findUnique({
      where: { id: invoice.customerId },
    });

    if (customer) {
      customer.balance -= invoice.total;
      customer.balance = Math.round(customer.balance * 100) / 100;
      await prisma.customer.update({
        where: { id: customer.id },
        data: customer,
      });
    }

    return {
      status: Status.Success,
      message: "Invoice voided successfully",
      invoice,
    };
  }

  async getUnsyncedInvoices({
    customerId,
    dueDate,
    endDate,
    keyword,
    startDate,
    status,
  }: {
    keyword?: string;
    customerId?: string;
    status?: string;
    dueDate?: string;
    startDate?: string;
    endDate?: string;
  }) {
    try {
      const andQuery: any[] = [];
      const orQuery: any[] = [];
      andQuery.push(
        { isDraft: { not: true } },
        { isVoid: { not: true } },
        { quickbookId: "null" }
      );

      if (keyword) {
        orQuery.push(
          { invoiceId: { contains: keyword } },
          { serviceType: { in: "PAID" } },
          { customerPO: { contains: keyword } },
          { vendorId: { contains: keyword } },
          { jobId: { equals: parseInt(keyword) } },
          { customer: { contactName: { contains: keyword } } },
          { jobLocation: { name: { contains: keyword } } },
          { jobLocation: { address: { string_contains: keyword } } },
          { technicianMessages: { string_contains: keyword } }
        );
      }

      if (customerId) {
        andQuery.push({ customerId: customerId });
      }

      if (dueDate) {
        andQuery.push({ dueDate: { lte: new Date(dueDate) } });
      }

      if (startDate && endDate) {
        andQuery.push({
          issuedDate: { gte: new Date(startDate), lte: new Date(endDate) },
        });
      }

      if (status) {
        andQuery.push({ serviceType: { in: JSON.parse(status) } });
      }

      const invoices = await prisma.invoice.findMany({
        where: {
          AND: andQuery,
          OR: orQuery,
        },
        include: {
          company: true,
          companyLocation: true,
          customer: true,
          customerContact: true,
          invoicecommission: true,
          job: true,
          jobLocation: true,
          jobSite: true,
          paymentcustomer: true,
          paymentTerm: true,
          workType: true,
          paymentvendors: true,
          createdBy: true,
        },
      });

      return {
        status: Status.Success,
        total: invoices.length,
        invoices,
      };
    } catch (e) {
      console.log(e);
    }
  }

  async getCompanyInvoices(compantId?: string) {
    let andArr: any[] = [];
    if (compantId && parseInt(compantId)) {
      andArr = [{ companyId: parseInt(compantId) }];
    }
    const invoices = await prisma.companyinvoice.findMany({
      where: { AND: andArr },
      include: { company: true },
    });

    return { status: Status.Success, companyInvoices: invoices };
  }

  async getCompanyInvoiceDetails(companyInvoiceId: string) {
    if (!parseInt(companyInvoiceId)) {
      return { status: Status.Error, message: "Wrong Input" };
    }

    const invoice = await prisma.companyinvoice.findUnique({
      where: { id: parseInt(companyInvoiceId) },
      include: { company: true },
    });

    return { status: Status.Success, companyInvoice: invoice };
  }

  async getInvoicesByCustomerId(customerId: string) {
    if (!parseInt(customerId)) {
      return { status: Status.Error, message: "Wrong Input" };
    }

    const invoices = await prisma.invoice.findMany({
      where: { customerId: parseInt(customerId) },
      include: {
        company: true,
        companyLocation: true,
        customer: true,
        customerContact: true,
        invoicecommission: true,
        job: true,
        jobLocation: true,
        jobSite: true,
        paymentcustomer: true,
        paymentTerm: true,
        workType: true,
        paymentvendors: true,
        createdBy: true,
      },
    });

    return { status: Status.Success, invoices: invoices };
  }

  async getInvoicesByContractor({
    id,
    type,
    endDate,
    name,
    startDate,
  }: {
    type: string;
    id: string;
    name?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const andQuery: any[] = [];
    const orQuery: any[] = [];

    if (startDate && endDate) {
      andQuery.push({
        issuedDate: { gte: new Date(startDate), lte: new Date(endDate) },
      });
    }

    if (name) {
      orQuery.push(
        { note: { contains: name } },
        { vendorId: { contains: name } },
        { invoiceId: { contains: name } }
      );
    }

    if (!id || !parseInt(id)) {
      return {
        status: Status.Error,
        message: "Id is required",
      };
    }

    let jobQuery;

    switch (type) {
      case "vendor":
        jobQuery = {
          contractor: { id: parseInt(id) },
        };
        break;
      case "employee":
        jobQuery = {
          technician: { id: parseInt(id) },
        };
        break;
      default:
        return { status: Status.Error, message: "Type is required" };
    }

    const jobs = await prisma.job.findMany({
      where: {
        tasks: {
          some: jobQuery,
        },
      },
      select: { id: true },
    });

    if (jobs.length) {
      andQuery.push({ jobId: { in: jobs.map((job) => job.id) } });
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        AND: andQuery,
        OR: orQuery,
      },
      include: {
        company: true,
        companyLocation: true,
        customer: true,
        customerContact: true,
        invoicecommission: true,
        job: true,
        jobLocation: true,
        jobSite: true,
        paymentcustomer: true,
        paymentTerm: true,
        workType: true,
        paymentvendors: true,
        createdBy: true,
      },
    });

    return { status: Status.Success, invoices };
  }
}