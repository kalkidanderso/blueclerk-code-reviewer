import { Request, Response } from 'express'
import { Status, Messages } from '../common/constants'
import { IUser } from '../models/User'
import { Tag, ITag } from '../models/Tag'
import { Scan, IScan } from '../models/Scan'


export const codeLocationTag = (req: Request, res: Response) => {

    const params = req.body
    const user = <IUser>req.user

    Tag.findOne({'info.nfcTag': params.nfcTag}, (err: any, oldTag: ITag) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }

        if(oldTag != undefined || oldTag != null) {
            return res.json({'status': Status.Success, 'message': "Tag is already code."})
        }
        
        var tag = new Tag({
            'info.nfcTag' : params.nfcTag,
            latitude : params.latitude,
            longitude : params.longitude,
            note: params.note,
            company: req.companyId,
            createdBy: user._id,
            createdAt: Date.now()
        })

        tag.save((err: any, tag: ITag) => {
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            return res.json({'status': Status.Success, 'message': "Tag coded successfully."})
        })
    });
}

export const updateLocationTag = (req: Request, res: Response) => {

    const params = req.body

    Tag.findOne({'info.nfcTag': params.nfcTag, 'company': req.companyId}, (err: any, tag: ITag) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }

        if(tag == undefined || tag == null) {
            return res.json({'status': Status.Success, 'message': "Invalid tag id."})
        }

        tag.updateOne({ latitude : params.latitude, longitude : params.longitude, note: params.note },
        (err: any, raw: any) => {
            if (err) {
                return res.json({'status': Status.Error, 'message': Messages.GenericError})
            }

            return res.json({'status': Status.Success, 'message': "Tag updated successfully."})
        })
    });
}

export const getLocationTags = (req: Request, res: Response) => {

    Tag.find({'company': req.companyId}, (err: any, tags: ITag[]) => {
        if (err) {
            return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
        }

        return res.json({'status': Status.Success, 'tags': tags})
    });
}


export const getLocationTagJobs = (req: Request, res: Response) => {

    const params = req.body
    Tag.findOne({ 'info.nfcTag': params.nfcTag })
        .exec((err: any, tag: ITag) => {

            if (err) {
                return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
            }

            if (tag == undefined || tag == null) {
                return res.json({ 'status': Status.Error, 'message': 'No tag found. Please try again'})
            }

            Scan.find({tag: tag._id}, '_id')
            .populate({
                path: 'job',
                populate: [{ path: 'customer', select: 'profile.displayName' },{ path: 'type', select: 'title' }],
            })
            .exec((err:any, scans: IScan[])=>{

                if (err) {
                    return res.json({ 'status': Status.Error, 'message': Messages.GenericError })
                }

                return res.json({ 'status': Status.Success, 'jobs': scans })
            })

        })
}
