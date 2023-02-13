import { Request, Response } from 'express';
import { WorkType } from '../models/WorkType';
import { Status } from '../common/constants';


export const getWorkTypes = async (req: Request, res: Response) => {
    try {
        const params = req.query;

        const query: any = {};
        if (params.title) {
            query.title = { $regex: params.title, $options: 'i' };
        }

        const workTypes = await WorkType.find(query);

        return res.json({ status: Status.Success, workTypes });
    } catch (error) {
        return res.json({ status: Status.Error, message: error.message});
    }
}

export const getWorkTypeById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const workType = await WorkType.findById(id);

        return res.json({ status: Status.Success, workType });
    } catch (error) {
        return res.json({ status: Status.Error, message: error.message});
    }
}
