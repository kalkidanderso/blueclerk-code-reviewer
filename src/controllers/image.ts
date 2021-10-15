import {Request, Response} from 'express'
import { Job } from '../models/Job'
import { ServiceTicket } from '../models/ServiceTicket'
import { IUser } from '../models/User'
import { Status, Messages } from '../common/constants'

import {uploadImageInS3} from '../services/aws'

export const uploadImage = (req: Request, res: Response) => {

    uploadImageInS3(req, res, (err: any, imageUrl?: string)=>{

        if (err || !imageUrl) {
            return res.json({'status': Status.Error, 'message': Messages.GenericError})
        }

        return res.json({'status': Status.Success, 'imageUrl': imageUrl})

    })

}

export const deleteImage = async (req: Request, res: Response) => {

    const params = req.body;
    const user = <IUser>req.user;

    switch (req.body.type) {
        case 'Job':
            const job = await Job.findOne({ _id: params.id });
            if (job) {
                const deleteImage = await Job.findByIdAndUpdate( params.id,
                    {
                        $push: { track: {
                            user: user.id,
                            action: '|Job image deleted|',
                            date: new Date()
                        }},
                        $pull: {
                            images: { _id: params.imageId }
                        }
                    });

                const images = deleteImage.images.find(image => image._id.toString() === params.imageId);
                if (images) {
                    return res.json({ status: Status.Success, message: 'Image delete successfully' });
                }
                return res.json({ status: Status.Error, messages: 'Image delete failed ' });

            } else {
                return res.json({ status: Status.NotFound, messages: 'Job not found' });
            }

        case 'ServiceTicket':
            const serviceTicket = await ServiceTicket.findOne({_id: params.id});
            if (serviceTicket) {
                const deleteImage = await ServiceTicket.findByIdAndUpdate( params.id,
                    {
                        $push: { track: {
                            user: user.id,
                            action: '|Ticket image deleted|',
                            date: new Date()
                        }},
                        $pull: {
                            images: { _id: params.imageId }
                        }
                    });

                // Find image availability to 
                const images = deleteImage.images.find(image => image._id.toString() === params.imageId);

                if (images) {
                    return res.json({ status: Status.Success, message: 'Image delete successfully' });
                }
                return res.json({ status: Status.Error, Messages: 'Delete image failed' });

            } else {
                return res.json({ status: Status.NotFound, messages: 'Service ticket not found' });
            }
    }
}