import { Prisma, PrismaClient } from "@prisma/client";
import { JobSites } from "../../models/v3/jobSites";
import { ICreateJobSiteInput, IJobSite, IUpdateJobSiteInput } from "../../types/v3/jobSites";
import { Messages } from "../../common/constants";
import { IJobLocation } from "../../types/v3/jobLocation";
import { JobLocationService } from "./jobLocation";

const prisma = new PrismaClient();

export class JobSiteService {

    private jobSites = new JobSites(prisma.jobsite);

    async getJobSite({
        id,
        customerId,
        locationId,
        homeOwnerId,
        isActive
    } : {
        id?: number | null,
        customerId?: number | null,
        locationId?: number | null,
        homeOwnerId?: number | null,
        isActive?: boolean | string,
    }) : Promise<any []> {
        let query: Prisma.JobsiteWhereInput;
        if (id) {
            query = { id: id }
        } else if (customerId && locationId) {
            query = { customerId, locationId }
        } else if (homeOwnerId && locationId) {
            query = {homeOwnerId, locationId}
        } else if (customerId && !homeOwnerId) {
            query = { customerId }
        } else if (customerId && homeOwnerId) {
            query = {OR: [{ customerId }, { homeOwnerId: homeOwnerId }] }
        } else if (homeOwnerId && !customerId) {
            query = { homeOwnerId: homeOwnerId }
        } else if (locationId) {
            query = { locationId }
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
                // Retrieve all job sites
                query;
        }
        return await this.jobSites.find(query);
    }
    async createJobSite({
        alternativeId,
        name,
        location,
        address,
        locationId,
        homeOwnerId
    } : ICreateJobSiteInput) : Promise<IJobSite> {
        const missingParams = []
        if (!locationId) missingParams.push('locationId')
        const isMissingParams = missingParams.length > 0;
        const jobLocations = new JobLocationService();
        if (isMissingParams) {
            const message = `${Messages.MissingParams}: ${missingParams.join(', ')}`;
            throw new Error(message);
        }
        let jobLocation: IJobLocation = undefined
        jobLocation = await jobLocations.getLocationById(locationId);
        
        if (!jobLocation) {
            throw new Error('Subdivision not found.');
        }
        const { customerId = undefined } = jobLocation || {};
        const locationJson: Prisma.JsonValue = JSON.stringify({
            coordinates: [location.long ?? '', location.lat ?? '']
        });
        const addresJosn: Prisma.JsonValue = JSON.stringify(address);
        const jobSite = await this.jobSites.create({
            alternativeId,
            name,
            location: locationJson,
            address: addresJosn,
            isActive:true,
            jobLocationId: locationId,
            customerId,
            homeOwnerId,
        })
        return jobSite;
    }
    async updateJobSite({
        id,
        alternativeId,
        name,
        location,
        address,
        locationId,
        isActive,
        homeOwnerId
    } : IUpdateJobSiteInput) : Promise<string> {
        const missingParams = []
        if (!id) missingParams.push('id')
        if (!locationId) missingParams.push('locationId')
        const isMissingParams = missingParams.length > 0
        const jobLocations = new JobLocationService();
        if (isMissingParams) {
            const message = `${Messages.MissingParams}: ${missingParams.join(', ')}`;
            throw new Error(message);
        }
        const jobSite = await this.jobSites.findById(id);
        if (!jobSite) {
            throw new Error("JobSite not found");
        }
        let jobLocation: IJobLocation = null
        jobLocation = await jobLocations.getLocationById(locationId);
        if (!jobLocation) {
            throw new Error('Subdivision not found.');
        }
        
        const { customerId = null } = jobLocation || {}
        const isJobSiteActive = isActive === undefined || isActive === null
            ? jobSite.isActive
            : isActive === false
                ? false
                : !!isActive;
        
        const locationJson: Prisma.JsonValue = JSON.stringify({
            coordinates: [location.long ?? '', location.lat ?? '']
        });
        const addresJosn: Prisma.JsonValue = JSON.stringify(address);
        await this.jobSites.update({
            id,
            alternativeId,
            name,
            address: addresJosn,
            isActive: isJobSiteActive,
            location: locationJson,
            jobLocationId: locationId,
            customerId,
            homeOwnerId,
        });
        return 'Job Address has been updated successfully.';
    }
    async deleteJobSite(id:number): Promise<any> {
        return await this.jobSites.deleteById(id);
    }
}