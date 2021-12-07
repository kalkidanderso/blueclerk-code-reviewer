import { Request, Response } from 'express'
import { Job } from '../models/Job'
import { ServiceTicket } from '../models/ServiceTicket'
import { IUser } from '../models/User'
import { Status, Messages } from '../common/constants'
import { uploadImageInS3 } from '../services/aws'

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
        case 'ServiceTicket':
            const serviceTicket = await ServiceTicket.findOne({ _id: params.id });
            if (!serviceTicket) {
                return res.json({ status: Status.Error, messages: 'Service ticket not found' });
            }

            // Check if the image exist on the Service Ticket
            const serviceTicketImage = serviceTicket.images?.find(image => image._id?.toString() === params.imageId);
            if (!serviceTicketImage) {
                return res.json({ status: Status.Error, message: 'Image not found on the Service Ticket' });
            }

            await ServiceTicket.findByIdAndUpdate(params.id,
                {
                    $push: {
                        track: {
                            user: user.id,
                            action: '|Ticket image deleted|',
                            date: new Date()
                        }
                    },
                    $pull: {
                        images: { _id: params.imageId }
                    }
                }
            );

            return res.json({ status: Status.Success, message: 'Image deleted successfully' });

        case 'Job':
            const job = await Job.findOne({ _id: params.id });
            if (!job) {
                return res.json({ status: Status.Error, messages: 'Job not found' });
            }

            // Check if the image exist on the Job
            const jobImage = job.images?.find(image => image._id?.toString() === params.imageId);
            if (!jobImage) {
                return res.json({ status: Status.Error, message: 'Image not found on the Job' });
            }

            await Job.findByIdAndUpdate(params.id,
                {
                    $push: {
                        track: {
                            user: user.id,
                            action: '|Job image deleted|',
                            date: new Date()
                        }
                    },
                    $pull: {
                        images: { _id: params.imageId }
                    }
                });

            return res.json({ status: Status.Success, message: 'Image deleted successfully' });

        default:
            return res.json({ status: Status.Error, messages: 'Only supported for ServiceTicket & Job for now' });
    }
}