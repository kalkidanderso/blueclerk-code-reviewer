import { ObjectId } from 'mongodb';
import { Customer } from '../../models/Customer';
import { JobLocation } from '../../models/JobLocation';
import { JobSite } from '../../models/JobSite';
import { User } from '../../models/User';
/**
 * Common functions used on the endpoints version 2
 */

/**
 * Split array on arrays with specified length
 * @param array the original array
 * @param size the size to split the original arrar
 * @returns array of arrays
 */
const splitArray = (array: any[], size: number) => {
    let result = [];
    for (let i = 0; i < array.length; i += size) {
        let chunk = array.slice(i, i + size);
        result.push(chunk);
    }
    return result;
}

/**
 * Fill the query common with the params workType and companyLocation sent on the request
 * @param params object with the params
 * @param query array where the queries should be located
 */
const fillQueryCommon = (params: any, query: any[]) => {
    const { workType, companyLocation } = params;

    if (workType) {
        let workTypeIds: any[] = [];
        try {
            let workTypeArr = JSON.parse(workType);
            workTypeIds = workTypeArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id)
            });
        } catch (error) { };
        if (workTypeIds.length > 0) {
            query.push({ workType: { $in: workTypeIds } });
        }

    }

    if (companyLocation) {
        let companyLocationIds: any[] = [];
        try {
            let companyLocationArr = JSON.parse(companyLocation);
            companyLocationIds = companyLocationArr.map((id: string) => {
                if (ObjectId.isValid(id)) return new ObjectId(id)
            });
        } catch (error) { }
        if (companyLocationIds.length > 0) {
            query.push({ companyLocation: { $in: companyLocationIds } });
        }
    }
}


/**
 * Get the customers ids filtered by ids and keyword
 * @param customersIds the customer ids to be filtered
 * @param keywordRegex the keyword to be filtered
 * @returns Promise<ObjectId[]>
 */
const getFilteredCustomerIds = async (customersIds: ObjectId[], keywordRegex?: any): Promise<ObjectId[]> => {
    if (!keywordRegex) {
        return customersIds;
    }
    const query: any = {
        $and: [{
            _id: {
                $in: customersIds,
            },
        },]
    };
    query['$and'].push({ "profile.displayName": keywordRegex })
    const filteredCustomersIds = (await Customer.aggregate(
        [
            {
                $match: query
            },
            {
                $project:
                {
                    _id: 1,
                },
            },
        ]
    )).map((value) => value._id)
    return filteredCustomersIds;
}

/**
 * Get jobs location ids filtered by ids and keyword
 * @param jobLocationIds job locations ids to be filtered
 * @param keywordRegex keyword to be filtered
 * @returns Promise<ObjectId[]>
 */
const getFilteredJobLocationsIds = async (jobLocationsIds: ObjectId[], keywordRegex?: any, fieldsToFilter: string[] = ['name']): Promise<ObjectId[]> => {
    if (!keywordRegex) {
        return jobLocationsIds
    }
    const query: any = {
        $and: [{
            _id: {
                $in: jobLocationsIds,
            },
        },]
    };
    const queryOr: any = { $or: [] };
    fieldsToFilter.forEach((value) => {
        const filter: any = {};
        filter[value] = keywordRegex;
        queryOr['$or'].push(filter);
    })
    query['$and'].push(queryOr);

    const filteredJobLocationsIds = (await JobLocation.aggregate([
        {
            $match: query
        },
        {
            $project:
            {
                _id: 1,
            },
        },
    ])).map((value) => value._id);
    return filteredJobLocationsIds;
}

/**
 * Get technician ids filtered by ids and keyword
 * @param techniciansIds ids to be filtered
 * @param keywordRegex keyword to be filtered
 * @returns Promise<ObjectId[]>
 */
const getFilteredTechniciansIds = async (techniciansIds: ObjectId[], keywordRegex?: any): Promise<ObjectId[]> => {
    //early return
    if (!keywordRegex) {
        return techniciansIds
    }
    const query: any = {
        $and: [{
            _id: {
                $in: techniciansIds,
            },
        },]
    };
    query['$and'].push({ "profile.displayName": keywordRegex });

    const filteredTechniciansIds = (await User.aggregate([
        {
            $match: query
        },
        {
            $project:
            {
                _id: 1,
            },
        },
    ])).map((value) => value._id);
    return filteredTechniciansIds;
}

/**
 * Get job sites ids filtered by ids and keyword
 * @param jobSitesIds job sites ids to be filtered
 * @param keywordRegex keyword to be filtered
 * @returns Promise<ObjectId[]>
 */
const getFilteredJobSitesIds = async (jobSitesIds: ObjectId[], keywordRegex?: any, fieldsToFilter: string[] = ['name']):
    Promise<ObjectId[]> => {

    if (!keywordRegex) {
        return jobSitesIds;
    }
    //and query
    const query: any = {
        $and: [{
            _id: {
                $in: jobSitesIds,
            },
        }]
    };
    const queryOr: any = { $or: [] };
    fieldsToFilter.forEach((value) => {
        const filter: any = {};
        filter[value] = keywordRegex;
        queryOr['$or'].push(filter);
    })
    query['$and'].push(queryOr);
    const filteredJobSitesIds = (await JobSite.aggregate([
        {
            $match: query
        },
        {
            $project:
            {
                _id: 1,
            },
        },
    ])).map((value) => value._id);
    return filteredJobSitesIds;
}

export {
    splitArray,
    fillQueryCommon,
    getFilteredCustomerIds,
    getFilteredJobLocationsIds,
    getFilteredJobSitesIds,
    getFilteredTechniciansIds
}