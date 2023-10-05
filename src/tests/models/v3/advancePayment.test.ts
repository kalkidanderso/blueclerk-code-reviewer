import moment from 'moment';
import { AdvancePayment } from '../../../models/v3/advancePayment'
import { PrismaClient } from '@prisma/client';
import { Status } from '../../../common/constants';

// Mock the prisma object
const mockPrisma = {
    create: jest.fn(),
    update: jest.fn(),
};

const advancePaymentEntry = {
    id:1,
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
};

describe('Create Advance Payment', () => {
    let service: AdvancePayment

    beforeEach(() => {
        service = new AdvancePayment(mockPrisma as any);
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    

    it('should create vendor payment', async () => {
        
        const body = {
            type: 'vendor',
        };

        const contractor = { id: 1 };

        mockPrisma.create.mockResolvedValueOnce(
            advancePaymentEntry
        )

        const result = await service.create(body, advancePaymentEntry, contractor);

        expect(mockPrisma.create).toBeCalled();
        expect(result).toBeDefined();
        expect(result).toEqual(advancePaymentEntry);
    });

    it('should create employee payment', async () => {
      const body = {
        type: 'employee',
        };

        mockPrisma.create.mockResolvedValueOnce(
            advancePaymentEntry
        )


        const result = await service.create(body, advancePaymentEntry);

        expect(mockPrisma.create).toBeCalled();
        expect(result).toBeDefined();
        expect(result).toEqual(advancePaymentEntry);
    });

    it('should create vendorpayment with paidAt and appliedAt null', async () => {
        const body = {
          type: 'vendor',
          };
  
          const advancePaymentEntry = {
            id:1,
            amount: 0,
            balance: 0,
            referenceNumber: "string",
            paymentType: "string",
            note: "string",
            company: 0,
            createdByUser: 0,
            updatedByUser: 0,
            voidedByUser: 0,
        };
        const contractor = { id: 1 };
          mockPrisma.create.mockResolvedValueOnce({
            id:1,
            amount: 0,
            balance: 0,
            referenceNumber: "string",
            paymentType: "string",
            note: "string",
            company: 0,
            createdByUser: 0,
            updatedByUser: 0,
            voidedByUser: 0,
            paidAt: new Date(),
            appliedAt: new Date()
          });
  
          const result = await service.create(body, advancePaymentEntry, contractor);
  
          expect(result).toBeDefined();
      });

      it('should create employeepayment with paidAt and appliedAt null', async () => {
        const body = {
          type: 'employee',
          };
  
          const advancePaymentEntry = {
            id:1,
            amount: 0,
            balance: 0,
            referenceNumber: "string",
            paymentType: "string",
            note: "string",
            company: 0,
            createdByUser: 0,
            updatedByUser: 0,
            voidedByUser: 0,
        };
          mockPrisma.create.mockResolvedValueOnce({
            id:1,
            amount: 0,
            balance: 0,
            referenceNumber: "string",
            paymentType: "string",
            note: "string",
            company: 0,
            createdByUser: 0,
            updatedByUser: 0,
            voidedByUser: 0,
            paidAt: new Date(),
            appliedAt: new Date()
          });
  
          const result = await service.create(body, advancePaymentEntry);
  
          expect(result).toBeDefined();
      });

    it('should return error for unsupported type', async () => {
      const body = {
        type: 'lego',
    };

        const employee = { id: 1 };

        const result = await service.create(body, advancePaymentEntry, employee);

        expect(result).toEqual({
            status: 0,
            message: 'Type not supported. Available Type to be used: vendor or employee.'
        });
    });

    it('should handle missing contractor for vendor payment', async () => {
        const body = {
            type: 'vendor',
        };
    
        await expect(service.create(body, advancePaymentEntry)).resolves.toEqual({
            status: Status.Error,
            message: "Cannot read properties of undefined (reading 'id')."
        });
    });

});


describe('Update Advance Payment', () => {
  let service: any;

  beforeEach(() => {
    service = new AdvancePayment(mockPrisma as any);
  });
  
  it('should update the advance payment', async () => {
    const body = {
        advancePaymentId: 1,
        amount: 1000,
        referenceNumber: '12345',
        paymentType: 'typeA',
        paidAt: '2023-10-12',
        appliedAt: new Date(),
        note: 'some note'
    };

    const advancePaymentResult = {
        advancePayment: {
            balance: 700,
            amount: 800
        }
    };

    const userId = 2;

    await service.update(body, advancePaymentResult, userId);

          expect(mockPrisma.update).toHaveBeenCalledWith({
              where: { id: body.advancePaymentId },
              data: {
                  amount: 1000,
                  balance: 700,
                  referenceNumber: '12345',
                  paymentType: 'typeA',
                  paidAt: new Date(moment('2023-10-12').format('YYYY-MM-DD')),
                  appliedAt: body.appliedAt,
                  note: 'some note',
                  updatedById: userId
              }
          });
      });

      it('should handle errors', async () => {
          const body = {
              advancePaymentId: 1,
              // ... other fields
          };

          const advancePaymentResult = {
              advancePayment: {
                  // ... values
              }
          };

          const userId = 2;

          mockPrisma.update.mockRejectedValue(new Error('DB error'));

          await expect(service.update(body, advancePaymentResult, userId)).rejects.toThrow('DB error');
      });

});

describe('Void Advance Payment', () => {
  let service: any;

  beforeEach(() => {
    mockPrisma.update.mockReset();
    service = new AdvancePayment(mockPrisma as any);
  });

      it('should void the advance payment', async () => {
          const input = {
              advancePaymentId: 1
          };
          const userId = 2;

          await service.void(input, userId);

          expect(mockPrisma.update).toHaveBeenCalledWith({
              where: { id: input.advancePaymentId },
              data: {
                  isVoid: true,
                  voidedAt: expect.any(Date),
                  updatedById: userId,
                  voidedById: userId
              }
          });
      });

      it('should handle errors', async () => {
          const input = {
              advancePaymentId: 1
          };
          const userId = 2;
          mockPrisma.update.mockRejectedValue(new Error('DB error'));

          await expect(service.void(input, userId)).rejects.toThrow('DB error');
      });
});