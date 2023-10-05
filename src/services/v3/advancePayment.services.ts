import { PrismaClient, Prisma } from "@prisma/client";
import moment from "moment";
import { AdvancePayment } from "src/models/v3/advancePayment";
import { IAdvancePayment, ICreateAdvancePaymentInput } from "src/types/v3/advancePayment";


export class AdvancePaymentService {
    private prisma = new PrismaClient();

    constructor() {}

    async createAdvancePayment( { id, referenceNumber, paidAt, appliedAt, amount, paymentType,note, companyLocation, workType, type}: ICreateAdvancePaymentInput) {
    
    const userId = 3; // TODO: <IUser>req.user;
    let companyId = 9; // TODO: <ICompany>req.company;

    const advancePaymentEntry: any = {
        company: companyId,
        referenceNumber: referenceNumber,
        paidAt: paidAt ?? new Date(),
        appliedAt: appliedAt ?? new Date(),
        amount: amount,
        balance: amount,
        paymentType: paymentType,
        note: note,
        createdBy: userId,
      };


      if (companyLocation) {
        advancePaymentEntry["companyLocation"] = companyLocation;    
    }

    if (workType) {
        advancePaymentEntry["workType"] = workType;
    }
      const prisma = new PrismaClient();
      const advancePayment = new AdvancePayment(prisma.advancepayment);

      try {
        switch (type) {
          case 'vendor':
            // Check if vendor exists
            const contractor = await prisma.company.findUnique({ where: { id: id } });
    
            if (!contractor) {
              return { status: 'Error', message: 'Vendor not found' };
            }
    
            // Save the Advance Payment Vendor entry
            const advancePaymentVendor = await advancePayment.createVendor({
                contractor: contractor.id,
                ...advancePaymentEntry,
            });
    
            // Update contractor's credit
            await prisma.company.update({
              where: { id: contractor.id },
              data: { credit: { increment: params.amount } },
            });
    
            // Record advance payment for vendor is done, finish the request
            return { status: 'Success', message: 'Advance Payment successfully created.', advancePayment: advancePaymentVendor };
    
          case 'employee':
            // Check if employee exists
            const employee = await prisma.user.findUnique({ where: { id: params.id } });
    
            if (!employee) {
              return { status: 'Error', message: 'Employee not found' };
            }
    
            // Save the Advance Payment Employee entry
            const advancePaymentEmployee = await advancePayment.createEmployee({
              data: {
                employeeId: employee.id,
                ...advancePaymentEntry,
              },
            });
    
            // Update employee's credit
            await prisma.user.update({
              where: { id: employee.id },
              data: { credit: { increment: params.amount } },
            });
    
            // Record advance payment for employee is done, finish the request
            return { status: 'Success', message: 'Payment successfully created.', advancePayment: advancePaymentEmployee };
    
          default:
            return { status: 'Error', message: 'Type not supported. Available types to be used: vendor or employee.' };
        }
      } catch (error) {
        console.error(error);
        return { status: 'Error', message: 'Internal Server Error' };
      }
}

}