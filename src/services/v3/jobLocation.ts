import { PrismaClient } from "@prisma/client";
import { JobLocations } from "../../models/v3/jobLocations";
import { Status } from '../../common/constants';
import { ICreatedJobLocation, IUpdateJobLocation } from "../../types/v3/jobLocation";

const prisma = new PrismaClient();

export class JobLocationService {
    private jobLocation = new JobLocations(prisma.joblocation);

    async createJobLocation({
        alternativeId,
        name,
        contacts,
        location,
        address,
        jobSites: inputJobSite,
        isActive,
        customerId: inputCustomerId,
        companyId,
        inactiveAt,
        inactiveById,
        quickbookId,
    } : ICreatedJobLocation) : Promise<any> {
        if (!(location.lat && location.long) && !(address.street && address.city && address.state && address.zipCode)) {
            throw new Error("Either location or address is required.");
        }

        if (!inputCustomerId) {
            throw new Error("CustomerId must be provided.");
        }
        
        const newJobLocation =  await this.jobLocation.create({
            alternativeId,
            name,
            contacts,
            location,
            address,
            jobSites: inputJobSite,
            isActive,
            customerId: inputCustomerId,
            companyId,
            inactiveAt,
            inactiveById,
            quickbookId,
        });

        return {
            status: Status.Success,
            data: newJobLocation
        } 
    }

    async updateQbJobLocation(companyId :number) : Promise<any> {
        const data = await this.jobLocation.updateResetQb(companyId);
        return { status: Status.Success, data: data } 
    }

    async updateJobLocation(id:number, {
        alternativeId,
        name,
        contacts,
        location,
        address,
        jobSites: inputJobSite,
        isActive,
        customerId: inputCustomerId,
        companyId,
        inactiveAt,
        inactiveById,
        quickbookId,
    } : IUpdateJobLocation) : Promise<any> {
        if (!(location?.lat && location.long) && !(address?.street && address?.city && address?.state && address?.zipCode)) {
            throw new Error("Either location or address is required.");
        }

        if (!inputCustomerId) {
            throw new Error("CustomerId must be provided.");
        }
        
        const newJobLocation =  await this.jobLocation.updateById({
            id,
            alternativeId,
            name,
            contacts,
            location,
            address,
            jobSites: inputJobSite,
            isActive,
            customerId: inputCustomerId,
            companyId,
            inactiveAt,
            inactiveById,
            quickbookId,
        });

        return {
            status: Status.Success,
            data: newJobLocation
        } 
    }
    
    async getLocationById(id:number): Promise<any> {
        const foundJobLocation = await this.jobLocation.findById({
            id: id,
            select: {id: true, customer: true}
        });

        return {
            status: Status.Success,
            data: foundJobLocation
        };
    }

    async GetJobLocationFilter({
        id,
        customerId,
        companyId,
        isActive
    } : {
        id?: number | null,
        customerId?: number | null,
        companyId?: number | null,
        isActive?: boolean | string,
    }) : Promise<any []> {
        let query: {};

        if (id) {
            query = { id: id }
        } else if (customerId && companyId) {
            query = { customerId, companyId }
        } else if (customerId) {
            query = { customerId }
        } else if (companyId) {
            query = { companyId }
        }

        switch (isActive) {
            case 'true':
            case true:
                query = {...query, isActive: true }
                break;

            case 'false':
            case false:
                query = {...query, isActive: false}
                break;

            default:
                query;
        }

        const data = await this.jobLocation.find(query);
        return data;
    }

    async deleteJobLocationById(id:number) : Promise<any> {
        const data = await this.jobLocation.deleteById(id);
        return {
            status: Status.Success,
            data: data
        } 
    }
}