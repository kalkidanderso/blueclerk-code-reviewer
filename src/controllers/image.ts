import {Request, Response} from 'express'
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
