import { Prisma, PrismaClient } from "@prisma/client";
import { JobSites } from "../../models/v3/jobSites";
import { ICreateJobSiteInput, IJobSite, IUpdateJobSiteInput, IGetJobSiteFilter } from "../../types/v3/jobSites";
import { Messages } from "../../common/constants";
import { JobLocations } from "../../models/v3/jobLocations";

const prisma = new PrismaClient();

export class JobSiteService {

    private jobSites = new JobSites(prisma.jobsite);
    private jobLocations = new JobLocations(prisma.joblocation);

    async getJobSite({
        id,
        customerId,
        locationId,
        homeOwnerId,
        isActive
    } : IGetJobSiteFilter) : Promise<any []> {
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
        if (!locationId) {
            throw new Error(`${Messages.MissingParams}: locationId`);
        }
        const jobLocation = await this.jobLocations.findById({id: locationId});
        if (!jobLocation) {
            throw new Error('Subdivision not found.');
        }
        const { customerId = undefined } = jobLocation || {};
        const locationJson: Prisma.JsonValue = JSON.stringify({
            coordinates: [location.long ?? '', location.lat ?? '']
        });
        const addresJosn: Prisma.JsonValue = JSON.stringify(address);
        return await this.jobSites.create({
            alternativeId,
            name,
            location: locationJson,
            address: addresJosn,
            isActive:true,
            jobLocationId: locationId,
            customerId,
            homeOwnerId,
        })
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
    } : IUpdateJobSiteInput) : Promise<IJobSite> {
        if (!locationId) {
            throw new Error(`${Messages.MissingParams}: locationId`);
        }
        const jobSite = await this.jobSites.findById(id);
        if (!jobSite) {
            throw new Error("JobSite not found.");
        }
        const jobLocation = await this.jobLocations.findById({id: locationId})
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
        return await this.jobSites.update({
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
    }

    async deleteJobSite(id:number): Promise<IJobSite> {
        return await this.jobSites.deleteById(id);
    }
}