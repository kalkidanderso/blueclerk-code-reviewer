import moment from 'moment';
import { ObjectId } from 'mongodb';
import * as helper from '../services/helper';

export const getDatesFilterQuery = async (paramsStartDate: string, paramsEndDate: string): Promise<{ $gte: Date, $lte: Date}> => {
    const startDate = moment(paramsStartDate).format('YYYY-MM-DD');
    const endDate = moment(paramsEndDate).format('YYYY-MM-DD');

    return { $gte: new Date(startDate), $lte: new Date(endDate) };
};

export const getPaginationQuery = async (hashedCursor: any, direction: string, sort: any): Promise<any> => {
    const cursor = JSON.parse(helper.fromCursorHash(hashedCursor));
    const cursorId = ObjectId.isValid(cursor._id) ? new ObjectId(cursor._id) : null;
    let paginationQuery;

    const op = await getSortPaginationMongo(direction, sort);

    if (!sort) {
        paginationQuery = {
            $or: [
                { createdAt: { [op]: new Date(cursor.createdAt) } },
                { createdAt: new Date(cursor.createdAt), _id: { [op]: cursorId } }
            ]
        };
    } else {

    }

    return paginationQuery;
};

// export const getCursor = async (hashedCursor: string): Promise<{cursor: any, cursorId: ObjectId}> => {
export const getCursor = async (hashedCursor: string): Promise<{cursor: any, cursorId: ObjectId}> => {
    const cursor = JSON.parse(helper.fromCursorHash(hashedCursor));
    const cursorId = ObjectId.isValid(cursor._id) ? new ObjectId(cursor._id) : null;

    return { cursor, cursorId };
};

export const getSortPaginationMongo = async (direction: string, sort: any): Promise<string> => {
    let operator;

    switch (direction) {
    case 'next':
        operator = sort.order === 'ASC' ? '$gt' : '$lt';
        break;

    case 'previous':
        operator = sort.order === 'ASC' ? '$lt' : '$gt';
        break;

    default:
        operator = '$lt';
        break;
    }

    return operator;
};