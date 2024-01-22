import { Request, Response } from 'express';
import {Status, Messages, JobStatus} from '../common/constants';
import { IUser } from '../models/User';
import { Tag, ITag } from '../models/Tag';
import { Scan, IScan } from '../models/Scan';
import {JobLocation} from '../models/JobLocation';
import {JobSite} from '../models/JobSite';
import {Schema} from 'mongoose';
import { ObjectId } from 'mongodb';
import {Customer} from '../models/Customer';


export const codeLocationTag = (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;
    Tag.findOne({'info.nfcTag': params.nfcTag}, async (err: any, oldTag: ITag) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': err.message });
        }

        if (oldTag != undefined || oldTag != null) {
            return res.json({'status': Status.Success, 'message': 'Tag is already coded.'});
        }
        if (!params.jobLocationId && !params.jobSiteId) {
            return res.json({ 'status': Status.Error, 'message': 'Either jobLocation or jobSite is required' });
        }
        const customer = params.customerId;
        if (!customer) {
            return res.json({ 'status': Status.Error, 'message': 'CustomerId is required' });
        }
        const cust = await Customer.findOne({_id: new ObjectId(customer)});
        if (!cust) {
            return res.json({ 'status': Status.Error, 'message': 'Customer was not found' });
        }
        let jobLocation;
        if (params.jobLocationId) {
            jobLocation = params.jobLocationId;
        } else {
            const fullJobSite = await JobSite.findOne({_id: new ObjectId(params.jobSiteId)});
            if (fullJobSite) {
                jobLocation = fullJobSite.locationId;
            } else {
                return res.json({ 'status': Status.Error, 'message': 'Could not find the job site' });
            }
        }

        const newTag: Partial<ITag> = {
            info: {
                nfcTag: params.nfcTag,
                imageUrl: params.imageUrl
            },
            images: [],
            jobLocation: jobLocation,
            note: params.note,
            customer: customer,
            address: params.address,
            company: req.companyId,
            createdBy: user._id,
            createdAt: Date.now()
        };

        if (params.images && params.images.length) {
            const urls = params.images.split(',').map(String);
            urls.map((url: any)=>{
                newTag.images.push(url);
            });
        }

        if (params.jobSiteId) {
            newTag['jobSite'] = params.jobSiteId;
        }
        const tag = new Tag(newTag);

        tag.save((err: any, tag: ITag) => {
            if (err) {
                return res.json({'status': Status.Error, 'message': err.message});
            }

            return res.json({'status': Status.Success, 'message': 'Tag coded successfully.'});
        });
    });
};

// To get detail of location tag
export const getLocationTagInfo = (req: Request, res: Response) => {

    const params = req.body;

    Tag.findOne({ 'info.nfcTag': params.nfcTag })
        .populate({
            path: 'customer',
            select: 'profile.displayName address.street address.city address.state address.zipCode contactName'
        })
        .populate('jobLocation')
        .populate('jobSite')
        .exec((err: any, tag: ITag) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            return res.json({ 'status': Status.Success, 'tag': tag });
        });
};

export const updateLocationTag = (req: Request, res: Response) => {

    const params = req.body;

    Tag.findOne({'info.nfcTag': params.nfcTag, 'company': req.companyId}, (err: any, tag: ITag) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
        }

        if(tag == undefined || tag == null) {
            return res.json({'status': Status.Success, 'message': 'Invalid tag id.'});
        }

        tag.updateOne({ latitude : params.latitude, longitude : params.longitude, note: params.note, address: params.address },
            (err: any, raw: any) => {
                if (err) {
                    return res.json({'status': Status.Error, 'message': Messages.GenericError});
                }

                return res.json({'status': Status.Success, 'message': 'Tag updated successfully.'});
            });
    });
};

export const getLocationTags = (req: Request, res: Response) => {
    Tag.find({'company': req.companyId})
        .populate({
            path: 'customer',
            select: 'info.email auth.email profile.displayName address.street address.city address.state address.zipCode contact.phone contactName'
        })
        .populate({
            path: 'jobLocation',
            select: 'name location'
        })
        .populate({
            path: 'jobSite',
            select: 'name location'
        })
        .exec((err: any, tags: ITag[]) => {
            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            return res.json({'status': Status.Success, 'tags': tags});
        });
};


export const getLocationTagJobs = (req: Request, res: Response) => {

    const params = req.body;
    Tag.findOne({ 'info.nfcTag': params.nfcTag })
        .exec((err: any, tag: ITag) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
            }

            if (tag == undefined || tag == null) {
                return res.json({ 'status': Status.Error, 'message': 'No tag found. Please try again'});
            }

            Scan.find({tag: tag._id}, '_id')
                .populate({
                    path: 'job',
                    populate: [{ path: 'customer', select: 'profile.displayName' },{ path: 'type', select: 'title' }],
                })
                .exec((err:any, scans: IScan[])=>{

                    if (err) {
                        return res.json({ 'status': Status.Error, 'message': Messages.GenericError });
                    }

                    return res.json({ 'status': Status.Success, 'jobs': scans });
                });

        });
};
