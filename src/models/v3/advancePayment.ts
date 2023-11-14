import { PrismaClient } from "@prisma/client";
import moment from "moment";
import { Status } from "../../common/constants";
import { ICreateAdvancePaymentInput, ICreateAdvancePaymentRequestBody, IUpdateAdvancePaymentInput, IVoidAdvancePaymentInput } from "../../types/v3/advancePayment";

export class AdvancePayment {
    constructor(private readonly prisma: PrismaClient['advancepayment']) {}

    async create(body: {type: string}, advancePaymentEntry:ICreateAdvancePaymentInput, contractor?: any) : Promise<any> {
        // try {
            let result;
            switch (body.type) {
                case 'vendor':
                    if(!contractor || !contractor.id){
                        return { status: Status.Error, message: "Cannot read properties of undefined (reading 'id')." };
                    }
                    result = await this.prisma.create({
                        data: {
                            referenceNumber: advancePaymentEntry.referenceNumber,
                            paidAt: advancePaymentEntry.paidAt ?? new Date(),
                            appliedAt: advancePaymentEntry.appliedAt ?? new Date(),
                            amount: advancePaymentEntry.amount,
                            balance: advancePaymentEntry.amount,
                            paymentType: advancePaymentEntry.paymentType,
                            note: advancePaymentEntry.note,
                            company: {
                                connect: { id: advancePaymentEntry.company },
                            },
                            createdByUser: {
                                connect: { id: advancePaymentEntry.createdByUser },
                            },
                            updatedByUser: {
                                connect: { id: advancePaymentEntry.updatedByUser },
                            },
                            voidedByUser: {
                                connect: { id: advancePaymentEntry.voidedByUser },
                            },
                            advancePaymentVendor:{
                                create: {
                                    contractorId: contractor.id
                                }
                            }
                        }
                    });
                    break;
                    
  
                case 'employee':
                    // if(!advancePaymentEntry.createdByUser){
                    //     return { status: Status.Error, message: "Cannot read properties of undefined (reading 'id')." };
                    // }
                    result = await this.prisma.create({
                        data: {
                            referenceNumber: advancePaymentEntry.referenceNumber,
                            paidAt: advancePaymentEntry.paidAt ?? new Date(),
                            appliedAt: advancePaymentEntry.appliedAt ?? new Date(),
                            amount: advancePaymentEntry.amount,
                            balance: advancePaymentEntry.amount,
                            paymentType: advancePaymentEntry.paymentType,
                            note: advancePaymentEntry.note,
                            company: {
                                connect: { id: advancePaymentEntry.company },
                            },
                            createdByUser: {
                                connect: { id: advancePaymentEntry.createdByUser },
                            },
                            updatedByUser: {
                                connect: { id: advancePaymentEntry.updatedByUser },
                            },
                            voidedByUser: {
                                connect: { id: advancePaymentEntry.voidedByUser },
                            },
                            advancePaymentEmployee: {
                                create: {
                                    employeeId: advancePaymentEntry.createdByUser                                   }
                            },
                        }
                    });
                    break;
  
                default:
                    return { status: Status.Error, message: 'Type not supported. Available Type to be used: vendor or employee.' };
            }
            return result
        // } catch (err) {
        //     throw new Error( err.message )  
        // }      
    }

    async update(body: IUpdateAdvancePaymentInput, advancePaymentResult: any, userId: any) : Promise<any> {
        try {
            return await this.prisma.update({
                where: { id: body.advancePaymentId },
                data: {
                    amount: body.amount,
                    balance: advancePaymentResult.advancePayment.balance,
                    referenceNumber: body.referenceNumber,
                    paymentType: body.paymentType,
                    paidAt: body.paidAt ? new Date(moment(body.paidAt).format('YYYY-MM-DD')) : undefined,
                    appliedAt: body.appliedAt,
                    note: body.note,
                    updatedById: userId
                }
            });
        } catch (err) {
            throw new Error( err.message )  
        }      
    }

    async void(body:IVoidAdvancePaymentInput, userId: any) : Promise<any> {
        try {
            return await this.prisma.update({
                where: { id: body.advancePaymentId },
                data: {
                    isVoid: true,
                    voidedAt: new Date(),
                    updatedById: userId,
                    voidedById: userId
                }
            });
        } catch (err) {
            throw new Error( err.message )  
        }      
    }
}