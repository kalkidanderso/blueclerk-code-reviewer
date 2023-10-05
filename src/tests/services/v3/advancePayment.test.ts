import { PrismaClient } from "@prisma/client";
import { AdvancePaymentService } from "../../../services/v3/advancePayment";
import { Status } from "../../../common/constants";

describe('Create Advance Payment', () => {
    let service: any;

    beforeEach(() => {
        service = new AdvancePaymentService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return error when vendor is not found', async () => {
        const mockFindUnique = jest.fn();
        const mockPrisma: jest.Mocked<PrismaClient> & { company: { findUnique: typeof mockFindUnique } } = new PrismaClient() as any;
        service['prisma'] = mockPrisma;
        mockPrisma.company.findUnique = mockFindUnique;

        mockFindUnique.mockResolvedValue(null); // Mocking that the vendor isn't found
        
        const result = await service.createAdvancePayment(
            {
                type: 'vendor',
                amount: 0,
                balance: 0,
                referenceNumber: "string",
                paymentType: "string",
                paidAt: new Date("2023-10-11T11:51:08.682Z"),
                appliedAt: new Date("2023-10-11T11:51:08.682Z"),
                note: "string",
                company: 0,
                createdByUser: 0,
                updatedByUser: 0,
                voidedByUser: 0,
                companyLocation: [1],
                workType: [1],
            }
            , 1, 1);
    
        expect(result.status).toBe(Status.Error);
        expect(result.message).toBe('Vendor not found');
      });

      it('should return error when employee is not found', async () => {
        const mockFindUnique = jest.fn();
        const mockPrisma: jest.Mocked<PrismaClient> & { user: { findUnique: typeof mockFindUnique } } = new PrismaClient() as any;
        service['prisma'] = mockPrisma;
        mockPrisma.user.findUnique = mockFindUnique;

        mockFindUnique.mockResolvedValue(null); // Mocking that the employee isn't found
        
        const result = await service.createAdvancePayment(
            {
                type: 'employee',
                amount: 0,
                balance: 0,
                referenceNumber: "string",
                paymentType: "string",
                paidAt: new Date("2023-10-11T11:51:08.682Z"),
                appliedAt: new Date("2023-10-11T11:51:08.682Z"),
                note: "string",
                company: 0,
                createdByUser: 0,
                updatedByUser: 0,
                voidedByUser: 0,
                companyLocation: [1],
                workType: [1],
            }
            , 1, 1);
    
        expect(result.status).toBe(Status.Error);
        expect(result.message).toBe('Employee not found');
      });

      it('should create advance payment for vendor', async () => {
        const mockFindUnique = jest.fn();
        const mockUpdate = jest.fn();
        const mockCreateAdvancePayment = jest.fn();

        const mockPrisma: jest.Mocked<PrismaClient> & {
            advancepayment: {
                create: typeof mockCreateAdvancePayment
            },
            company: {
                findUnique: typeof mockFindUnique,
                update: typeof mockUpdate
            }
        } = new PrismaClient() as any;

        mockPrisma.company.findUnique = mockFindUnique;
        mockPrisma.company.update = mockUpdate;
        mockPrisma.advancepayment.create = mockCreateAdvancePayment
        service['prisma'] = mockPrisma;
  
        const mockVendor = { 
            id: 1,
            credit: 100
        };

        const mockAdvancePayment = { 
            id: 1,
            referenceNumber: "string",
            paidAt: '2023-10-11T11:51:08.682Z',
            appliedAt: '2023-10-11T11:51:08.682Z',
            amount: 0,
            balance: 0,
            paymentType: "string",
            note: "string",
            company: {
                credit: 100,
                id: 1
            }
        };
      
        mockFindUnique.mockResolvedValue(mockVendor);
        mockUpdate.mockResolvedValue(mockVendor);

        mockCreateAdvancePayment.mockResolvedValueOnce({
            id: 1,
            amount: 0,
            balance: 0,
            appliedAt: '2023-10-11T11:51:08.682Z',
            paidAt: '2023-10-11T11:51:08.682Z',
            company: mockVendor,
            note: "string",
            paymentType: "string",
            referenceNumber: "string",
        })

        const result = await service.createAdvancePayment({
            id: mockVendor.id,
            type: 'vendor',
            amount: 0,
            balance: 0,
            referenceNumber: "string",
            paymentType: "string",
            paidAt: new Date("2023-10-11T11:51:08.682Z"),
            appliedAt: new Date("2023-10-11T11:51:08.682Z"),
            note: "string",
            createdByUser: 0,
            updatedByUser: 0,
            voidedByUser: 0,
            companyLocation: [1],
            workType: [1],
        }, 1, 1); 
        

          expect(result.status).toBe(Status.Success);
          expect(result.message).toBe('Advance Payment successfully created.');
          expect(result.data).toEqual(mockAdvancePayment);
      });

      it('should create advance payment white paidAt and appliedAt null', async () => {
        const mockFindUnique = jest.fn();
        const mockUpdate = jest.fn();
        const mockCreateAdvancePayment = jest.fn();

        const mockPrisma: jest.Mocked<PrismaClient> & {
            advancepayment: {
                create: typeof mockCreateAdvancePayment
            },
            company: {
                findUnique: typeof mockFindUnique,
                update: typeof mockUpdate
            }
        } = new PrismaClient() as any;

        mockPrisma.company.findUnique = mockFindUnique;
        mockPrisma.company.update = mockUpdate;
        mockPrisma.advancepayment.create = mockCreateAdvancePayment
        service['prisma'] = mockPrisma;
  
        const mockVendor = { 
            id: 1,
            credit: 100
        };

        const mockAdvancePayment = { 
            id: 1,
            referenceNumber: "string",
            amount: 0,
            balance: 0,
            paymentType: "string",
            note: "string",
            company: {
                credit: 100,
                id: 1
            }
        };
      
        mockFindUnique.mockResolvedValue(mockVendor);
        mockUpdate.mockResolvedValue(mockVendor);

        mockCreateAdvancePayment.mockResolvedValueOnce({
            id: 1,
            amount: 0,
            balance: 0,
            company: mockVendor,
            note: "string",
            paymentType: "string",
            referenceNumber: "string",
        })

        const result = await service.createAdvancePayment({
            id: mockVendor.id,
            type: 'vendor',
            amount: 0,
            balance: 0,
            referenceNumber: "string",
            paymentType: "string",
            note: "string",
            createdByUser: 0,
            updatedByUser: 0,
            voidedByUser: 0,
            companyLocation: [1],
            workType: [1],
        }, 1, 1); 
        

          expect(result.status).toBe(Status.Success);
          expect(result.message).toBe('Advance Payment successfully created.');
          expect(result.data).toEqual(mockAdvancePayment);
      });

      it('should create advance payment for employee', async () => {
        const mockFindUnique = jest.fn();
        const mockUpdate = jest.fn();
        const mockCreateAdvancePayment = jest.fn();

        const mockPrisma: jest.Mocked<PrismaClient> & {
            advancepayment: {
                create: typeof mockCreateAdvancePayment
            },
            user: {
                findUnique: typeof mockFindUnique,
                update: typeof mockUpdate
            }
        } = new PrismaClient() as any;

        mockPrisma.user.findUnique = mockFindUnique;
        mockPrisma.user.update = mockUpdate;
        mockPrisma.advancepayment.create = mockCreateAdvancePayment
        service['prisma'] = mockPrisma;
        
        const mockEmployee = { 
            id: 1,
            credit: 100
        };

        const mockAdvancePayment = { 
            id: 1,
            referenceNumber: "string",
            paidAt: '2023-10-11T11:51:08.682Z',
            appliedAt: '2023-10-11T11:51:08.682Z',
            amount: 0,
            balance: 0,
            paymentType: "string",
            note: "string",
            company: {
                credit: 100,
                id: 1
            }
        };
        
        mockFindUnique.mockResolvedValue(mockEmployee);
        mockUpdate.mockResolvedValue(mockEmployee);

        mockCreateAdvancePayment.mockResolvedValueOnce({
            id: 1,
            amount: 0,
            balance: 0,
            appliedAt: '2023-10-11T11:51:08.682Z',
            paidAt: '2023-10-11T11:51:08.682Z',
            company: mockEmployee,
            note: "string",
            paymentType: "string",
            referenceNumber: "string",
        })

        const result = await service.createAdvancePayment({
            id: mockEmployee.id,
            type: 'employee',
            amount: 0,
            balance: 0,
            referenceNumber: "string",
            paymentType: "string",
            paidAt: new Date("2023-10-11T11:51:08.682Z"),
            appliedAt: new Date("2023-10-11T11:51:08.682Z"),
            note: "string",
            createdByUser: 1,
            updatedByUser: 1,
            voidedByUser: 1,
            companyLocation: [1],
            workType: [1],
        }, 1, 1); 
        

          expect(result.status).toBe(Status.Success);
          expect(result.message).toBe('Advance Payment successfully created.');
          expect(result.data).toEqual(mockAdvancePayment);
      });    

      it('should return error for unsupported type', async () => {
        const mockEmployee = { 
            id: 1,
            credit: 100
        };
        
      
        const result = await service.createAdvancePayment({
            id: mockEmployee.id,
            type: 'lego',
            amount: 0,
            balance: 0,
            referenceNumber: "string",
            paymentType: "string",
            paidAt: new Date("2023-10-11T11:51:08.682Z"),
            appliedAt: new Date("2023-10-11T11:51:08.682Z"),
            note: "string",
            createdByUser: 1,
            updatedByUser: 1,
            voidedByUser: 1,
            companyLocation: [1],
            workType: [1],
        }, 1, 1); 
  
          expect(result).toEqual({
              status: 0,
              message: 'Type not supported. Available Type to be used: vendor or employee.'
          });
      });
})
  
  describe('Get Advance Payment', () => {
    let service: any;

    beforeEach(() => {
        service = new AdvancePaymentService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });
  
    it('should fetch vendor advance payments', async () => {
        const mockFindMany = jest.fn();
        const mockPrisma: jest.Mocked<PrismaClient> & {
            advancepaymentvendor: {
                findMany: typeof mockFindMany
              },
        } = new PrismaClient() as any;
        service['prisma'] = mockPrisma;

        mockPrisma.advancepaymentvendor.findMany = mockFindMany;
      const paramObj = {
        type: 'vendor',
        id: 1,
        startDate: '2023-10-01',
        endDate: '2023-10-10'
      };
      const query = {};
      const companyId = 123;
  
      mockFindMany.mockResolvedValueOnce([]);
  
      const result = await service.getAdvancePayment(paramObj, query, companyId);
  
      expect(result.status).toBe(Status.Success);
    });
  
    it('should fetch employee advance payments', async () => {
        const mockFindMany = jest.fn();
        const mockPrisma: jest.Mocked<PrismaClient> & {
            advancepaymentvendor: {
                findMany: typeof mockFindMany
              },
              advancepaymentemployee: {
                findMany: typeof mockFindMany
              }
        } = new PrismaClient() as any;
        service['prisma'] = mockPrisma;
        mockPrisma.advancepaymentemployee.findMany = mockFindMany;
      const paramObj = {
        type: 'employee',
        id: 1,
        startDate: '2023-10-01',
        endDate: '2023-10-10'
      };
      const query = {};
      const companyId = 123;
  
      mockFindMany.mockResolvedValueOnce([]);
  
      const result = await service.getAdvancePayment(paramObj, query, companyId);

      expect(result.status).toBe(Status.Success);
    });


    it('should return error for unsupported type', async () => {
        const paramObj = {
            type: 'lego',
            id: 1,
            startDate: '2023-10-01',
            endDate: '2023-10-10'
          };
          const query = {};
          const companyId = 123;
      
          const result = await service.getAdvancePayment(paramObj, query, companyId);
  
          expect(result).toEqual({
              status: 0,
              message: 'Type not supported. Available Type to be used: vendor or employee.'
          });
      });

      it('check is isactive = active', async () => {
        const mockFindMany = jest.fn();
        const mockPrisma: jest.Mocked<PrismaClient> & {
            advancepaymentvendor: {
                findMany: typeof mockFindMany
              },
              advancepaymentemployee: {
                findMany: typeof mockFindMany
              }
        } = new PrismaClient() as any;
        service['prisma'] = mockPrisma;
        mockPrisma.advancepaymentemployee.findMany = mockFindMany;
        const paramObj = {
            type: 'vendor',
            id: 1,
            startDate: '2023-10-01',
            endDate: '2023-10-10',
            isActive: 'active'
          };
          const query = {};
          const companyId = 123;
      
          const result = await service.getAdvancePayment(paramObj, query, companyId);
  
          expect(result.status).toBe(Status.Success);
      });

      it('check is isactive = void', async () => {
        const mockFindMany = jest.fn();
        const mockPrisma: jest.Mocked<PrismaClient> & {
            advancepaymentvendor: {
                findMany: typeof mockFindMany
              },
              advancepaymentemployee: {
                findMany: typeof mockFindMany
              }
        } = new PrismaClient() as any;
        service['prisma'] = mockPrisma;
        mockPrisma.advancepaymentemployee.findMany = mockFindMany;
        
        const paramObj = {
            type: 'vendor',
            id: 1,
            startDate: '2023-10-01',
            endDate: '2023-10-10',
            isActive: 'void'
          };
          const query = {};
          const companyId = 123;
      
          const result = await service.getAdvancePayment(paramObj, query, companyId);
  
          expect(result.status).toBe(Status.Success);
      });
  });


describe('Update Advance Payment', () => {
    let service: any;

    beforeEach(() => {
        service = new AdvancePaymentService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return error if vendor not found', async () => {
        const mockFindUnique = jest.fn();
        const mockPrisma: jest.Mocked<PrismaClient> & {
            company: {
                findUnique: typeof mockFindUnique
              },
        } = new PrismaClient() as any;
        service['prisma'] = mockPrisma;
       
        mockPrisma.company.findUnique = mockFindUnique

    
        const body = {
          type: 'vendor',
          id: 1,
          advancePaymentId: 123,
        };

        mockFindUnique.mockResolvedValue(null);
        const result = await service.updateAdvancePayment(body, 1, 1); 
    
        expect(result).toEqual({ status: Status.Error, message: 'Vendor not found.' });
      });

      it('should return error if employee not found', async () => {
        const mockFindUnique = jest.fn();
        const mockPrisma: jest.Mocked<PrismaClient> & {
            user: {
                findUnique: typeof mockFindUnique
              },
        } = new PrismaClient() as any;
        service['prisma'] = mockPrisma;
       
        mockPrisma.user.findUnique = mockFindUnique

    
        const body = {
          type: 'employee',
          id: 1,
          advancePaymentId: 123,
        };

        mockFindUnique.mockResolvedValue(null);
        const result = await service.updateAdvancePayment(body, 1, 1); 
    
        expect(result).toEqual({ status: Status.Error, message: 'Employee not found.' });
      });

      it('should return error for unsupported type', async () => {
        const body = {
          type: 'lego',
          id: 1,
          advancePaymentId: 123,
        };

        const result = await service.updateAdvancePayment(body, 1, 1); 
    
        expect(result).toEqual({ status: Status.Error, message: 'Type not supported. Available Type to be used: vendor or employee.' });
      });

      it('should return error if advancepaymentemployee not found', async () => {
        const mockFindUnique = jest.fn();
        const mockFindFirst = jest.fn();
        const mockUpdate = jest.fn();
        const mockPrisma: jest.Mocked<PrismaClient> & {
            company: {
                findUnique: typeof mockFindUnique
              },
            advancepaymentvendor: {
                findFirst:  typeof mockFindFirst
            },
            advancepayment: {
                update: typeof mockUpdate
            }
        } = new PrismaClient() as any;
        service['prisma'] = mockPrisma;
       
        mockPrisma.company.findUnique = mockFindUnique
        mockPrisma.advancepaymentvendor.findFirst= mockFindFirst
    
        const body = {
          type: 'vendor',
          id: 1,
          advancePaymentId: 123,
        };

        mockFindUnique.mockResolvedValue({});
        mockFindFirst.mockResolvedValue(null);
        const result = await service.updateAdvancePayment(body, 1, 1); 
    
        expect(result).toEqual({ status: Status.Error, message: 'Advance Payment not found or does not belong to the contractor.' });
      });

      it('should return error if advancepaymentemployee not found', async () => {
        const mockFindUnique = jest.fn();
        const mockFindFirst = jest.fn();
        const mockUpdate = jest.fn();
        const mockPrisma: jest.Mocked<PrismaClient> & {
            user: {
                findUnique: typeof mockFindUnique
              },
            advancepaymentemployee: {
                findFirst:  typeof mockFindFirst
            },
            advancepayment: {
                update: typeof mockUpdate
            }
        } = new PrismaClient() as any;
        service['prisma'] = mockPrisma;
       
        mockPrisma.user.findUnique = mockFindUnique
        mockPrisma.advancepaymentemployee.findFirst= mockFindFirst
    
        const body = {
          type: 'employee',
          id: 1,
          advancePaymentId: 123,
        };

        mockFindUnique.mockResolvedValue({});
        mockFindFirst.mockResolvedValue(null);
        const result = await service.updateAdvancePayment(body, 1, 1); 
    
        expect(result).toEqual({ status: Status.Error, message: 'Advance Payment not found or does not belong to the employee.' });
      });

      it('should return error if advancepayment already void', async () => {
        const mockFindUnique = jest.fn();
        const mockFindFirst = jest.fn();
        const mockUpdate = jest.fn();
        const mockPrisma: jest.Mocked<PrismaClient> & {
            user: {
                findUnique: typeof mockFindUnique
              },
            advancepaymentemployee: {
                findFirst:  typeof mockFindFirst
            },
            advancepayment: {
                update: typeof mockUpdate
            }
        } = new PrismaClient() as any;
        service['prisma'] = mockPrisma;
       
        mockPrisma.user.findUnique = mockFindUnique
        mockPrisma.advancepaymentemployee.findFirst= mockFindFirst
    
        const body = {
          type: 'employee',
          id: 1,
          advancePaymentId: 123,
        };

        mockFindUnique.mockResolvedValue({});
        mockFindFirst.mockResolvedValue({
            advancePayment: {
                isVoid: true,
            }
        });
        const result = await service.updateAdvancePayment(body, 1, 1); 
    
        expect(result).toEqual({ status: Status.Error, message: 'Advance Payment already voided' });
      });


      it('updates the advance payment successfully for a vendor', async () => {
        const mockFindUnique = jest.fn();
        const mockFindFirst = jest.fn();
        const mockUpdate = jest.fn();
        const mockPrisma: jest.Mocked<PrismaClient> & {
            company: {
                findUnique: typeof mockFindUnique
              },
            advancepaymentvendor: {
                findFirst:  typeof mockFindFirst
            },
            advancepayment: {
                update: typeof mockUpdate
            }
        } = new PrismaClient() as any;
        service['prisma'] = mockPrisma;
       
        mockPrisma.company.findUnique = mockFindUnique
        mockPrisma.advancepaymentvendor.findFirst= mockFindFirst
        mockPrisma.advancepayment.update=mockUpdate

        mockFindUnique.mockResolvedValue({});
        mockFindFirst.mockResolvedValue({
            advancePayment: {
                isVoid: false,
                balance: 12,
            }
        });

        mockUpdate.mockResolvedValueOnce({})
    
        const body = {
            advancePaymentId: 1,
            type: 'vendor',
            id: 1,
            referenceNumber: "string",
            paidAt: '2023-10-11T11:51:08.682Z',
            appliedAt: '2023-10-11T11:51:08.682Z',
            amount: 0,
            balance: 12,
            paymentType: "string",
            note: "string",
        };
        const result = await service.updateAdvancePayment(body, 1, 1);
    
        expect(result).toEqual({ status: Status.Success, advancePayment: {} });
      });

      it('updates the advance payment successfully for a vendor', async () => {
        const mockFindUnique = jest.fn();
        const mockFindFirst = jest.fn();
        const mockUpdate = jest.fn();
        const mockPrisma: jest.Mocked<PrismaClient> & {
            user: {
                findUnique: typeof mockFindUnique
              },
            advancepaymentvendor: {
                findFirst:  typeof mockFindFirst
            },
            advancepayment: {
                update: typeof mockUpdate
            }
        } = new PrismaClient() as any;
        service['prisma'] = mockPrisma;
       
        mockPrisma.user.findUnique = mockFindUnique
        mockPrisma.advancepaymentemployee.findFirst= mockFindFirst
        mockPrisma.advancepayment.update=mockUpdate

        mockFindUnique.mockResolvedValue({});
        mockFindFirst.mockResolvedValue({
            advancePayment: {
                isVoid: false,
                balance: 12,
            }
        });

        mockUpdate.mockResolvedValueOnce({})
    
        const body = {
            advancePaymentId: 1,
            type: 'employee',
            id: 1,
            referenceNumber: "string",
            paidAt: '2023-10-11T11:51:08.682Z',
            appliedAt: '2023-10-11T11:51:08.682Z',
            amount: 0,
            balance: 12,
            paymentType: "string",
            note: "string",
        };
        const result = await service.updateAdvancePayment(body, 1, 1);
    
        expect(result).toEqual({ status: Status.Success, advancePayment: {} });
      });
});

describe('Void Advance Payment', () => {
    let service: any;

    beforeEach(() => {
        service = new AdvancePaymentService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return error if vendor not found', async () => {
        const mockfindFirst = jest.fn();
        const mockPrisma: jest.Mocked<PrismaClient> & {
            advancepaymentvendor: {
                findFirst: typeof mockfindFirst
              },
        } = new PrismaClient() as any;
        service['prisma'] = mockPrisma;
       
        mockPrisma.advancepaymentvendor.findFirst = mockfindFirst

    
        const body = {
          type: 'vendor',
          id: 1,
          advancePaymentId: 123,
        };

        mockfindFirst.mockResolvedValue(null);
        const result = await service.voidAdvancePayment(body, 1, 1); 
    
        expect(result).toEqual({ status: Status.Error, message: 'Advance Payment not found or does not belong to the contractor.' });
      });

      it('should return error if employee not found', async () => {
        const mockfindFirst = jest.fn();
        const mockPrisma: jest.Mocked<PrismaClient> & {
            advancepaymentemployee: {
                findFirst: typeof mockfindFirst
              },
        } = new PrismaClient() as any;
        service['prisma'] = mockPrisma;
       
        mockPrisma.advancepaymentemployee.findFirst = mockfindFirst

    
        const body = {
          type: 'employee',
          id: 1,
          advancePaymentId: 123,
        };

        mockfindFirst.mockResolvedValue(null);
        const result = await service.voidAdvancePayment(body, 1, 1); 
    
        expect(result).toEqual({ status: Status.Error, message: 'Advance Payment not found or does not belong to the employee.' });
      });

      it('should return error for unsupported type', async () => {
        const body = {
          type: 'lego',
          id: 1,
          advancePaymentId: 123,
        };

        const result = await service.voidAdvancePayment(body, 1, 1); 
    
        expect(result).toEqual({ status: Status.Error, message: 'Type not supported. Available Type to be used: vendor or employee.' });
      });


      it('should return error if advancepayment already void', async () => {
        const mockFindFirst = jest.fn();
        const mockUpdate = jest.fn();
        const mockPrisma: jest.Mocked<PrismaClient> & {
            advancepaymentemployee: {
                findFirst:  typeof mockFindFirst
            },
            advancepayment: {
                update: typeof mockUpdate
            }
        } = new PrismaClient() as any;
        service['prisma'] = mockPrisma;
       
        mockPrisma.advancepaymentemployee.findFirst= mockFindFirst
    
        const body = {
          type: 'employee',
          id: 1,
          advancePaymentId: 123,
        };

        mockFindFirst.mockResolvedValue({
            advancePayment: {
                isVoid: true,
            }
        });
        const result = await service.voidAdvancePayment(body, 1, 1); 
    
        expect(result).toEqual({ status: Status.Error, message: 'Advance Payment already voided' });
      });

      it('should return error if advancepayment already void', async () => {
        const mockFindFirst = jest.fn();
        const mockUpdate = jest.fn();
        const mockPrisma: jest.Mocked<PrismaClient> & {
            advancepaymentemployee: {
                findFirst:  typeof mockFindFirst
            },
            advancepayment: {
                update: typeof mockUpdate
            }
        } = new PrismaClient() as any;
        service['prisma'] = mockPrisma;
       
        mockPrisma.advancepaymentemployee.findFirst= mockFindFirst
    
        const body = {
          type: 'employee',
          id: 1,
          advancePaymentId: 123,
        };

        mockFindFirst.mockResolvedValue({
            advancePayment: {
                balance:10,
                amount:  20
            }
        });
        const result = await service.voidAdvancePayment(body, 1, 1); 
    
        expect(result).toEqual({ status: Status.Error, message: 'Advance Payment is already used, cannot void it.' });
      });

      it('void the advance payment successfully for a vendor', async () => {
        const mockFindUnique = jest.fn();
        const mockFindFirst = jest.fn();
        const mockUpdate = jest.fn();
        const mockPrisma: jest.Mocked<PrismaClient> & {
            advancepaymentvendor: {
                findFirst:  typeof mockFindFirst
            },
            advancepayment: {
                update: typeof mockUpdate
            }
        } = new PrismaClient() as any;
        service['prisma'] = mockPrisma;
       
        mockPrisma.advancepaymentvendor.findFirst= mockFindFirst
        mockPrisma.advancepayment.update=mockUpdate

        mockFindUnique.mockResolvedValue({});
        mockFindFirst.mockResolvedValue({
            advancePayment: {
                isVoid: false,
                balance: 12,
            }
        });

        mockUpdate.mockResolvedValueOnce({})
    
        const body = {
            advancePaymentId: 1,
            type: 'vendor',
            id: 1,
            referenceNumber: "string",
            paidAt: '2023-10-11T11:51:08.682Z',
            appliedAt: '2023-10-11T11:51:08.682Z',
            amount: 0,
            balance: 12,
            paymentType: "string",
            note: "string",
        };
        const result = await service.voidAdvancePayment(body, 1, 1);
    
        expect(result).toEqual({ status: Status.Success, message: 'Advance Payment voided successfully', advancePayment: {} });
      });

      it('void the advance payment successfully for a employee', async () => {
        const mockFindUnique = jest.fn();
        const mockFindFirst = jest.fn();
        const mockUpdate = jest.fn();
        const mockPrisma: jest.Mocked<PrismaClient> & {
            advancepaymentemployee: {
                findFirst:  typeof mockFindFirst
            },
            advancepayment: {
                update: typeof mockUpdate
            }
        } = new PrismaClient() as any;
        service['prisma'] = mockPrisma;
       
        mockPrisma.advancepaymentemployee.findFirst= mockFindFirst
        mockPrisma.advancepayment.update=mockUpdate

        mockFindUnique.mockResolvedValue({});
        mockFindFirst.mockResolvedValue({
            advancePayment: {
                isVoid: false,
                balance: 12,
            }
        });

        mockUpdate.mockResolvedValueOnce({})
    
        const body = {
            advancePaymentId: 1,
            type: 'employee',
            id: 1,
            referenceNumber: "string",
            paidAt: '2023-10-11T11:51:08.682Z',
            appliedAt: '2023-10-11T11:51:08.682Z',
            amount: 0,
            balance: 12,
            paymentType: "string",
            note: "string",
        };
        const result = await service.voidAdvancePayment(body, 1, 1);
    
        expect(result).toEqual({ status: Status.Success, message: 'Advance Payment voided successfully', advancePayment: {} });
      });
});