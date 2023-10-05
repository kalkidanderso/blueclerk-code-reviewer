  import { PrismaClient } from "@prisma/client";
  import { Status } from "../../common/constants";
  import moment from "moment";
  import { AdvancePayment } from "../../models/v3/advancePayment";
  import { IAdvancePayment, ICreateAdvancePaymentInput, ICreateAdvancePaymentRequestBody, IUpdateAdvancePaymentInput, IVoidAdvancePaymentInput } from "../../types/v3/advancePayment";


  export class AdvancePaymentService {
    private prisma = new PrismaClient();
    constructor() {}

    async createAdvancePayment( body: ICreateAdvancePaymentRequestBody, userId: number, companyId: number ): Promise<any> {
        const advancePayment = new AdvancePayment(this.prisma.advancepayment);

        const advancePaymentEntry: ICreateAdvancePaymentInput = {
          company: companyId,
          referenceNumber: body.referenceNumber,
          paidAt: body.paidAt ?? new Date(),
          appliedAt: body.appliedAt ?? new Date(),
          amount: body.amount,
          balance: body.amount,
          paymentType: body.paymentType,
          note: body.note,
          createdByUser: userId,
          updatedByUser: userId,
          voidedByUser: userId,
        };

        if (body.companyLocation) {
            advancePaymentEntry["companyLocation"] = body.companyLocation;
        }

        if (body.workType) {
            advancePaymentEntry["workType"] = body.workType;
        }

        let advancePaymentResult
        
        switch (body.type) {                                          
          case 'vendor':
              const contractor = await this.prisma.company.findUnique({ where: { id: body.id } });
              if (!contractor) {
                return { status: Status.Error, message: 'Vendor not found' };
              }
              
              advancePaymentResult = await advancePayment.create(body, advancePaymentEntry, contractor)

              await this.prisma.company.update({
                where: { id: contractor.id },
                data: { credit: { increment: body.amount } }
            });

            break;

          case 'employee':
              const employee = await this.prisma.user.findUnique({ where: { id: body.id } });
              if (!employee) {
                return { status: Status.Error, message: 'Employee not found' };
              }
              
              advancePaymentResult = await advancePayment.create(body, advancePaymentEntry, employee)

              await this.prisma.user.update({
                where: { id: employee.id },
                data: { credit: { increment: body.amount } }
            });
            break;

            default:
              return { status: Status.Error, message: 'Type not supported. Available Type to be used: vendor or employee.' };
        }

      return {
        status: Status.Success,
        message: 'Advance Payment successfully created.',
        data: advancePaymentResult,
      } 
    }

  async getAdvancePayment( paramObj: IAdvancePayment, query:any, companyId: number ): Promise<any> {
    const startDate = moment(paramObj.startDate).startOf('day').utcOffset(paramObj.offset ?? '', true).utc().format();
    const endDate = moment(paramObj.endDate).endOf('day').utcOffset(paramObj.offset ?? '', true).utc().format();

    if (paramObj.startDate && paramObj.endDate) {
        query.paidAt = {
            gte: startDate,
            lte: endDate
        };
    }

    switch (paramObj.isActive) {
        case 'active':
            query.isVoid = false;
            break;

        case 'void':
            query.isVoid = true;
            break;

        default:
            break;
    }

    // try {
        switch (paramObj.type) {
        case 'vendor':
                const contractorAdvancePayments = await this.prisma.advancepaymentvendor.findMany({
                    where: {
                        advancePayment: {
                            ...query,
                            companyId: companyId
                        },
                        contractorId: paramObj.id
                    },
                    include: {
                        advancePayment: {
                            include: {
                                company: {
                                  select: {
                                    info: true,
                                    address: true,
                                    contact: true,
                                  },
                                },
                                createdByUser: {
                                  select: {
                                    auth: {
                                      select: {
                                        email: true,
                                      },
                                    },
                                    profile: true,
                                  },
                                },
                            }
                        },
                        contractor: {
                          select: {
                            info: true,
                            address: true,
                            contact: true,
                          },
                        }
                    }
                });
                return { status: Status.Success, data: contractorAdvancePayments };

            case 'employee':
                const employeeAdvancePayments = await this.prisma.advancepaymentemployee.findMany({
                    where: {
                        advancePayment: {
                            ...query,
                            companyId: companyId
                        },
                        employeeId: paramObj.id
                    },
                    include: {
                      advancePayment: {
                        include: {
                            company: {
                              select: {
                                info: true,
                                address: true,
                                contact: true,
                              },
                            },
                            createdByUser: {
                              select: {
                                auth: {
                                  select: {
                                    email: true,
                                  },
                                },
                                profile: true,
                              },
                            },
                        }
                      },
                        employee: {
                          select: {
                            auth: {
                              select: {
                                email: true,
                              },
                            },
                            profile: true,
                            location: true,
                            contact: true,
                          },
                        }
                    }
                });
                return { status: Status.Success, advancePayments: employeeAdvancePayments };

            default:
                return { status: Status.Error, message: 'Type not supported. Available Type to be used: vendor or employee.' };
        }
    // } catch (err) {
        // throw new Error( err.message )
    // }
  }


  async updateAdvancePayment( body: IUpdateAdvancePaymentInput, userId: number, companyId: number ): Promise<any> {
      const advancePayment = new AdvancePayment(this.prisma.advancepayment);
      let advancePaymentResult;

      // try {
          switch (body.type) {
              case 'vendor':
                  const contractor = await this.prisma.company.findUnique({ where: { id: body.id } });
                  if (!contractor) {
                      return { status: Status.Error, message: 'Vendor not found.' };
                  }

                  advancePaymentResult = await this.prisma.advancepaymentvendor.findFirst({
                      where: {
                          advancePaymentId: body.advancePaymentId,
                          contractorId: contractor.id,
                          advancePayment: {
                              companyId: companyId
                          }
                      },
                      include: {
                          advancePayment: {
                              include: {
                                  company: true,
                                  createdByUser: true
                              }
                          },
                      }
                      
                  });

                  if (!advancePaymentResult) {
                      return { status: Status.Error, message: 'Advance Payment not found or does not belong to the contractor.' };
                  }
                  break;

              case 'employee':
                  const employee = await this.prisma.user.findUnique({ where: { id: body.id } });
                  if (!employee) {
                      return { status: Status.Error, message: 'Employee not found.' };
                  }

                  advancePaymentResult = await this.prisma.advancepaymentemployee.findFirst({
                      where: {
                          advancePaymentId: body.advancePaymentId,
                          employeeId: employee.id,
                          advancePayment: {
                              companyId: companyId
                          }
                      },
                      include: {
                          advancePayment: {
                              include: {
                                  company: true,
                                  createdByUser: true
                              }
                          },
                      }
                  });

                  if (!advancePaymentResult) {
                      return { status: Status.Error, message: 'Advance Payment not found or does not belong to the employee.' };
                  }
                  break;

              default:
                  return { status: Status.Error, message: 'Type not supported. Available Type to be used: vendor or employee.' };
          }

        //   if (!advancePaymentResult) {
        //     return { status: Status.Error, message: 'Advance Payment not found or does not belong to the employee or vendor.' };
        // }

          if (advancePaymentResult.advancePayment.isVoid) {
              return { status: Status.Error, message: 'Advance Payment already voided' };
          }

          let updatedAdvancePayment = await advancePayment.update(body, advancePaymentResult, userId)

          return { status: Status.Success, advancePayment: updatedAdvancePayment };

      // } catch (err) {
        // throw new Error( err.message )  
      // }
  }

  async voidAdvancePayment( body: IVoidAdvancePaymentInput, userId: number, companyId: number ): Promise<any> {
    const advancePayment = new AdvancePayment(this.prisma.advancepayment);
    
    let advancePaymentResult;

    // try {
        switch (body.type) {
            case 'vendor':
                advancePaymentResult = await this.prisma.advancepaymentvendor.findFirst({
                    where: {
                        advancePaymentId: body.advancePaymentId,
                        advancePayment: {
                            companyId: companyId
                        }
                    },
                    include: {
                        advancePayment: {
                            include: {
                                company: true,
                                createdByUser: true
                            }
                        },
                    }
                });

                if (!advancePaymentResult) {
                    return { status: Status.Error, message: 'Advance Payment not found or does not belong to the contractor.' };
                }
                break;

            case 'employee':
                advancePaymentResult = await this.prisma.advancepaymentemployee.findFirst({
                    where: {
                        advancePaymentId: body.advancePaymentId,
                        advancePayment: {
                            companyId: companyId
                        }
                    },
                    include: {
                        advancePayment: {
                            include: {
                                company: true,
                                createdByUser: true
                            }
                        },
                    }
                });

                if (!advancePaymentResult) {
                    return { status: Status.Error, message: 'Advance Payment not found or does not belong to the employee.' };
                }
                break;

            default:
                return { status: Status.Error, message: 'Type not supported. Available Type to be used: vendor or employee.' };
        }

        if (advancePaymentResult.advancePayment.isVoid) {
            return { status: Status.Error, message: 'Advance Payment already voided' };
        }

        if (advancePaymentResult.advancePayment.balance < advancePaymentResult.advancePayment.amount) {
            return { status: Status.Error, message: 'Advance Payment is already used, cannot void it.' };
        }

        const voidedAdvancePayment = await advancePayment.void(body ,userId)

        return { status: Status.Success, message: 'Advance Payment voided successfully', advancePayment: voidedAdvancePayment };

    // } catch (err) {
      // throw new Error( err.message )  
    // }
  }
}