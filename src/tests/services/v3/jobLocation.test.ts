import { JobLocationService } from '../../../services/v3/jobLocation'
import { JobLocations } from '../../../models/v3/jobLocations';
import { Status } from '../../../common/constants';

let JobLocationServices: JobLocationService
let mockPrisma = {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
};

let mockJobLocationModel: jest.Mocked<JobLocations> & {
    create: any,
    updateResetQb: any,
    updateById: any,
    findById: any,
    find: any,
    deleteById: any,
} = new JobLocations(mockPrisma as any) as any;

const input = {
    alternativeId: "jobLocationServiceCreate",
    name: "jobLocationServiceCreate",
    contacts: {
        email: "ts@gmail.com",
        phone: "9999990",
        name: "asd"
    },
    location: {
        "long": "3434.343",
        "lat": "222.22"
    },
    address: {
        "zipCode": "123",
        "state": "asd",
        "city": "asd",
        "unit": "asd",
        "street": "asd"
    },
    jobSites: [
        9999990
    ],
    isActive: true,
    customerId: 9999990,
    companyId: 9999990,
    inactiveAt: new Date(),
    inactiveById: 9999990,
    quickbookId: "9999990",
};

beforeEach(async() => {
    JobLocationServices = new JobLocationService();
    JobLocationServices["jobLocation"] = mockJobLocationModel;    
});

afterAll(async() => {
    jest.clearAllMocks();
});

describe(' Create JobLocations', () => {
    it('Should create job location', async () => {
        mockJobLocationModel.create = jest.fn(() => input);
        const createJobLocation = await JobLocationServices.createJobLocation(input);
        expect(mockJobLocationModel.create).toHaveBeenCalled()
        expect(createJobLocation.data.alternativeId).toEqual(input.alternativeId);
        expect(createJobLocation.data.name).toEqual(input.name);
        expect(createJobLocation.data.isActive).toEqual(input.isActive);
        expect(createJobLocation.status).toEqual(Status.Success);
    })

    it('Should error missing lat create job location', async () => {
        try {
            await JobLocationServices.createJobLocation({
                ...input,
                location: {lat: "23", long: ''},
                address: {
                    "zipCode": "",
                    "state": "asd",
                    "city": "",
                    "unit": "",
                    "street": ""
                },
            });
            fail();
        } catch (error) {
            expect(mockJobLocationModel.create).toHaveBeenCalledTimes(0);
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe("Either location or address is required.")
        }
    })

    it('Should error missing long create job location', async () => {
        try {
            await JobLocationServices.createJobLocation({
                ...input,
                location: {lat: '', long: '23'},
                address: {
                    "zipCode": "",
                    "state": "asd",
                    "city": "",
                    "unit": "",
                    "street": ""
                },
            });
            fail();
        } catch (error) {
            expect(mockJobLocationModel.create).toHaveBeenCalledTimes(0);
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe("Either location or address is required.")
        }
    })

    it('Should error missing CustomerId create job location', async () => {
        try {
            await JobLocationServices.createJobLocation({
                ...input,
                customerId: undefined
            });
            fail();
        } catch (error) {
            expect(mockJobLocationModel.create).toHaveBeenCalledTimes(0);
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe("CustomerId must be provided.")
        }
    })

    it('Should error on error when create job location', async () => {
        try {
            mockJobLocationModel.create = jest.fn(() => {throw new Error("error")});
            await JobLocationServices.createJobLocation({
                ...input,
            });
            fail();
        } catch (error) {
            expect(mockJobLocationModel.create).toHaveBeenCalled();
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe("error")
        }
    })
})

describe('Update Qb JobLocations', () => {

    it('Should update qb job location', async () => {
        mockJobLocationModel.updateResetQb = jest.fn(() => {return {}});
        const updateQbJobLocation = await JobLocationServices.updateQbJobLocation(99);
        expect(updateQbJobLocation.status).toEqual(Status.Success);
        expect(mockJobLocationModel.updateResetQb).toHaveBeenCalled();
    })

    it('Should update qb job location', async () => {
        try {
            mockJobLocationModel.updateResetQb = jest.fn(() => {throw new Error("error")});
            await JobLocationServices.updateQbJobLocation(99);
            fail();
        }
        catch(error) {
            expect(mockJobLocationModel.updateResetQb).toHaveBeenCalled();
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe("error")
        }        
    })
})

describe('Update JobLocations', () => {
    it('Should create job location', async () => {
        mockJobLocationModel.updateById = jest.fn(() => input);
        const createJobLocation = await JobLocationServices.updateJobLocation(1, input);
        expect(mockJobLocationModel.updateById).toHaveBeenCalled()
        expect(createJobLocation.data.alternativeId).toEqual(input.alternativeId);
        expect(createJobLocation.data.name).toEqual(input.name);
        expect(createJobLocation.data.isActive).toEqual(input.isActive);
        expect(createJobLocation.status).toEqual(Status.Success);
    })

    it('Should error missing lat update job location', async () => {
        try {
            await JobLocationServices.updateJobLocation(1, {
                ...input,
                location: {lat: "23", long: ''},
                address: {
                    "zipCode": "",
                    "state": "asd",
                    "city": "",
                    "unit": "",
                    "street": ""
                },
            });
            fail();
        } catch (error) {
            expect(mockJobLocationModel.updateById).toHaveBeenCalledTimes(0);
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe("Either location or address is required.")
        }
    })

    it('Should error missing long update job location', async () => {
        try {
            await JobLocationServices.updateJobLocation(1, {
                ...input,
                location: {lat: '', long: '23'},
                address: {
                    "zipCode": "",
                    "state": "asd",
                    "city": "",
                    "unit": "",
                    "street": ""
                },
            });
            fail();
        } catch (error) {
            expect(mockJobLocationModel.updateById).toHaveBeenCalledTimes(0);
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe("Either location or address is required.")
        }
    })

    it('Should error missing CustomerId update job location', async () => {
        try {
            await JobLocationServices.updateJobLocation(1, {
                ...input,
                customerId: undefined
            });
            fail();
        } catch (error) {
            expect(mockJobLocationModel.updateById).toHaveBeenCalledTimes(0);
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe("CustomerId must be provided.")
        }
    })

    it('Should error on error when update job location', async () => {
        try {
            mockJobLocationModel.updateById = jest.fn(() => {throw new Error("error")});
            await JobLocationServices.updateJobLocation(1, {
                ...input,
            });
            fail();
        } catch (error) {
            expect(mockJobLocationModel.updateById).toHaveBeenCalled();
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe("error")
        }
    })
})

describe('getLocationById', () => {

    it('Should get job location by id', async () => {
        mockJobLocationModel.findById = jest.fn(() => input);
        const getJobLocation = await JobLocationServices.getLocationById(9999990);
        expect(getJobLocation.data).toBeDefined();
        expect(getJobLocation.status).toBeDefined();
        expect(mockJobLocationModel.findById).toHaveBeenCalled();
    })

    it('Should get job location by id', async () => {
        try {
            mockJobLocationModel.findById = jest.fn(() => {throw new Error("hello")});
            await JobLocationServices.getLocationById(9999990);
            fail();
        }
        catch(error) {
            expect(mockJobLocationModel.findById).toHaveBeenCalled();
            expect(error).toBeDefined();
            expect(error).toBeInstanceOf(Error);
        }
    })
})

describe('GetJobLocationFilter', () => {

    it('Should get job location input id', async () => {
        mockJobLocationModel.find = jest.fn(() => [input]);
        const getJobLocation = await JobLocationServices.GetJobLocationFilter({
            id:9999990,
            customerId: 9999990,
            companyId: 9999990,
            isActive : true
        });
        getJobLocation.forEach((jobLocation:any) => {
            expect(jobLocation.alternativeId).toBeDefined();
            expect(jobLocation.name).toBeDefined();
            expect(jobLocation.location).toBeDefined();
            expect(jobLocation.isActive).toBeDefined();
        })
    })

    it('Should get job location input customerId & companyId', async () => {
        mockJobLocationModel.find = jest.fn(() => [input]);
        const getJobLocation = await JobLocationServices.GetJobLocationFilter({
            id:null,
            customerId: 9999990,
            companyId: 9999990,
            isActive : true
        });
        getJobLocation.forEach((jobLocation:any) => {
            expect(jobLocation.alternativeId).toBeDefined();
            expect(jobLocation.name).toBeDefined();
            expect(jobLocation.location).toBeDefined();
            expect(jobLocation.isActive).toBeDefined();
        })
    })

    it('Should get job location input companyId', async () => {
        mockJobLocationModel.find = jest.fn(() => [input]);
        const getJobLocation = await JobLocationServices.GetJobLocationFilter({
            id:null,
            customerId: null,
            companyId: 9999990,
            isActive : true
        });
        getJobLocation.forEach((jobLocation:any) => {
            expect(jobLocation.alternativeId).toBeDefined();
            expect(jobLocation.name).toBeDefined();
            expect(jobLocation.location).toBeDefined();
            expect(jobLocation.isActive).toBeDefined();
        })
    })

    it('Should get job location input customerId', async () => {
        mockJobLocationModel.find = jest.fn(() => [input]);
        const getJobLocation = await JobLocationServices.GetJobLocationFilter({
            id:null,
            customerId: 9999990,
            companyId: null,
            isActive : undefined
        });
        getJobLocation.forEach((jobLocation:any) => {
            expect(jobLocation.alternativeId).toBeDefined();
            expect(jobLocation.name).toBeDefined();
            expect(jobLocation.location).toBeDefined();
            expect(jobLocation.isActive).toBeDefined();
        })
    })

    it('Should get job location input customerId & homeOwnerId', async () => {
        mockJobLocationModel.find = jest.fn(() => [input]);
        const getJobLocation = await JobLocationServices.GetJobLocationFilter({
            id:null,
            customerId: 9999990,
            companyId: null,
            isActive : false
        });
        getJobLocation.forEach((jobLocation:any) => {
            expect(jobLocation.alternativeId).toBeDefined();
            expect(jobLocation.name).toBeDefined();
            expect(jobLocation.location).toBeDefined();
            expect(jobLocation.isActive).toBeDefined();
        })
    })

    it('Should get job location input homeOwnerId', async () => {
        mockJobLocationModel.find = jest.fn(() => [input]);
        const getJobLocation = await JobLocationServices.GetJobLocationFilter({
            id:null,
            customerId: null,
            companyId: null,
            isActive : false
        });
        getJobLocation.forEach((jobLocation:any) => {
            expect(jobLocation.alternativeId).toBeDefined();
            expect(jobLocation.name).toBeDefined();
            expect(jobLocation.location).toBeDefined();
            expect(jobLocation.isActive).toBeDefined();
        })
    })

    it('Should get job location input companyId', async () => {
        mockJobLocationModel.find = jest.fn(() => [input]);
        const getJobLocation = await JobLocationServices.GetJobLocationFilter({
            id:null,
            customerId: null,
            companyId: 9999990,
            isActive : true
        });
        getJobLocation.forEach((jobLocation:any) => {
            expect(jobLocation.alternativeId).toBeDefined();
            expect(jobLocation.name).toBeDefined();
            expect(jobLocation.location).toBeDefined();
            expect(jobLocation.isActive).toBeDefined();
        })
    })

    it('Should delete job location by id', async () => {
        mockJobLocationModel.deleteById = jest.fn(() => input);
        const result = await JobLocationServices.deleteJobLocationById(9999990);
        expect(mockJobLocationModel.deleteById).toHaveBeenCalled();
        expect(result.status).toBe(Status.Success);
        expect(result.data).toBeDefined();
    })
    it('Should error when delete job location id not found', async () => {
        try {
            mockJobLocationModel.deleteById = jest.fn(() => {throw new Error("hello")});
            await JobLocationServices.deleteJobLocationById(9999990);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('hello');
        }
    })
});