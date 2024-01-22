import { Request, Response } from 'express';
import { WorkType } from '../models/WorkType';
import { Status } from '../common/constants';
import { ObjectId } from 'mongodb';
import * as Sentry from '@sentry/node';


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
        Sentry.captureException(error);
        return res.json({ status: Status.Error, message: error.message});
    }
};

export const getWorkTypeById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const workType = await WorkType.findById(id);

        return res.json({ status: Status.Success, workType });
    } catch (error) {
        Sentry.captureException(error);
        return res.json({ status: Status.Error, message: error.message});
    }
};

export const deleteWorkType = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await WorkType.deleteOne({_id: new ObjectId(id)});
        return res.json({ 'status': Status.Success, 'message': 'Work Type Has Been Deleted Successfully!' });
    } catch (error) {
        return res.json({ status: Status.Error, message: error.message});
    }
};

export const updateWorkType = async (req: Request, res: Response) => {
    try {
        const params = req.body;
        
        const workType = await WorkType.findById({_id: params.workTypeId});
        if (!workType) {
            return res.json({ status: Status.Error, message: 'Work Type is not found' });
        }
        workType.title = params.title;
        await workType.save();
        return res.json({ 'status': Status.Success, 'message': 'Work Type updated successfully!' });
    } catch (error) {
        return res.json({ status: Status.Error, message: error.message});
    }
};

export const createWorkType = async (req: Request, res: Response) => {
    try {
        const params = req.body;
        
        const workType = new WorkType({
            title: params.title
        });
        await workType.save();
        return res.json({ 'status': Status.Success, 'message': 'Work Type created successfully!' });
    } catch (error) {
        return res.json({ status: Status.Error, message: error.message});
    }
};
