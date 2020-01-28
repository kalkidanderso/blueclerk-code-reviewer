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
              Data: "Welcome to Blueclerk.com! Please click on the link to confirm your email https://app.blueclerk.com",
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
              Data: "<p>Welcome to BlueClerk!  You have been added as a user to the organization "+ options.company+ "</p><p>Your Role: "+ options.role +"</p> <p>Below are your login credentials</p> <a href=\"https://app.blueclerk.com/login/\ target=\"_blank\">app.blueclerk.com</a> <p>Login ID: "+ options.to+"</p><p>Temporary Password: "+options.password + "</p><p>We encourage you to download our app on either Android or iOS (links) to fully optimize the system</p><p>Please login to your account and add information for your organization.  If you have any questions about the system, we have a variety of helpful tools.</p><p>Please refer to our help desk <a href=\"dasolgroup.zendesk.com\" target=\"_blank\">dasolgroup.zendesk.com</a></p><p>If you require further assistance, please contact us via Zendesk through the website.  We can also be reached by phone at 512-846-6035</p> <p>For up to date information, we encourage you to like us on <a href=\"www.facebook.com/blueclerk\" target=\"_blank\">Facebook</a> </p>",
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

export const sendInvitationToContractor = function(options: any) {

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
            Data: "Invitation to join Blueclerk.com from "+options.company,
          },
          Body: {
            Html: {
              Data: "<p>Welcome to BlueClerk!  You have been invited to join blueclerk</p>\
              <p>Click the link to get started:<a href=\"https://app.blueclerk.com/login/\ target=\"_blank\">app.blueclerk.com</a></p>",
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

export const sendContractStartEmail = function(options: any) {

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
            Data: "Offer contract from "+options.company+" on Blueclerk",
          },
          Body: {
            Html: {
              Data: "<p>Hi! "+ options.contractor+"</p>\
              <p>"+options.company+" has sent you a contract offer you can view the details by login in. Click the link to login:<a href=\"https://app.blueclerk.com/login/\ target=\"_blank\">app.blueclerk.com</a></p>",
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

export const sendContractStatusChangeEmailToContractor = function(options: any) {

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
            Data: "Contract updated by "+options.company+" on Blueclerk",
          },
          Body: {
            Html: {
              Data: "<p>Hi! "+ options.contractor+"</p>\
              <p>"+options.company+" has changed the contract status to "+ options.contractStatus+"</p>",
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

export const sendContractStatusChangeEmailToCompany = function(options: any) {

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
            Data: "Contract updated by "+options.contractor+" on Blueclerk",
          },
          Body: {
            Html: {
              Data: "<p>Hi! "+ options.company+"</p>\
              <p>"+options.contractor+" has changed the contract status to "+ options.contractStatus+"</p>",
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


export const sendPasswordEmail = function(options: any) {

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
            Data: "Forgot password email from Blueclerk.com",
          },
          Body: {
            Html: {
              Data: "<p>Dear "+options.name + "</p><p>Your new password is below.  If you wish to change your password from this, please login and go to your profile.</p> <br/> <b>"+ options.password +"</b><br/><br/> <p>Sincerely,</p><p>BlueClerk</p>",
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