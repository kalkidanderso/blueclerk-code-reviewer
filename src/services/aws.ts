import AWS from 'aws-sdk'
import multer from 'multer'
import multerS3 from 'multer-s3'
import {Request, Response} from 'express'
import uuid from 'uuid'

export const sendEmail = function(options: any) {

  const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION} = process.env

  AWS.config.update({
    region: AWS_REGION,
    accessKeyId: AWS_SES_ACCESSKEYID,
    secretAccessKey: AWS_SES_SECRETACCESSKEY,
  })

  const ses = new AWS.SES({ apiVersion: '2012-10-17' })

  return new Promise((resolve, reject) => {
    ses.sendEmail(
      {
        Source: APP_EMAIL_NOREPLY,
        Destination: {
          CcAddresses: [],
          ToAddresses: [options.to],
        },
        Message: {
          Subject: {
            Data: "Email Confirmation from Blueclerk.com",
          },
          Body: {
            Html: {
              Data: "Welcome to Blueclerk.com! Please click on the link to confirm your email https://blueclerk.com",
            },
          },
        },
        ReplyToAddresses: [APP_EMAIL_NOREPLY],
      },
      (err, info) => {
        if (err) {
          reject(err)
        } else {
          resolve(info)
        }
      },
    )
  })
}

export const sendEmployeeEmail = function(options: any) {

  const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION} = process.env

  AWS.config.update({
    region: AWS_REGION,
    accessKeyId: AWS_SES_ACCESSKEYID,
    secretAccessKey: AWS_SES_SECRETACCESSKEY,
  })

  const ses = new AWS.SES({ apiVersion: '2012-10-17' })

  return new Promise((resolve, reject) => {
    ses.sendEmail(
      {
        Source: APP_EMAIL_NOREPLY,
        Destination: {
          CcAddresses: [],
          ToAddresses: [options.to],
        },
        Message: {
          Subject: {
            Data: "Email Confirmation with details from Blueclerk.com",
          },
          Body: {
            Html: {
              Data: "Welcome to Blueclerk.com! Your password for "+ options.to+ " is "+ options.password,
            },
          },
        },
        ReplyToAddresses: [APP_EMAIL_NOREPLY],
      },
      (err, info) => {
        if (err) {
          reject(err)
        } else {
          resolve(info)
        }
      },
    )
  })
}

export const uploadImageInS3 = function(req: Request, res: Response, next: (err: any, imageUrl?: string)=>void) {

  const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, AWS_BUCKET_NAME, AWS_REGION} = process.env

  AWS.config.update({
    region: AWS_REGION,
    accessKeyId: AWS_SES_ACCESSKEYID,
    secretAccessKey: AWS_SES_SECRETACCESSKEY,
  })

  const fileFilter = (req: Request, file: Express.Multer.File, cb: (err: any, success: boolean)=>void) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type, only JPEG and PNG is allowed!'), false);
    }
  }

  const s3 = new AWS.S3()
  const upload = multer({
      fileFilter,
      storage: multerS3({
        s3: s3,
        bucket: AWS_BUCKET_NAME,
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
          cb(null, uuid())
        }
      })
  })

  const uploadSingle = upload.single('image')

  uploadSingle(req, res, (err)=>{

    if (err) return next(err)

    next(null, req.file.location)

  })

}