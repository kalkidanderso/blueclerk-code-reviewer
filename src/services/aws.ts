import AWS from 'aws-sdk'
import multer from 'multer'
import multerS3 from 'multer-s3'
import {Request, Response} from 'express'
import uuid from 'uuid'
import {Messages, Status} from '../common/constants';
import {job} from 'cron';
import {IJob, Job} from '../models/Job';
import {IUser} from '../models/User';
import {IJobLocation} from '../models/JobLocation';
import {IServiceTicket} from '../models/ServiceTicket';
import {IContact} from '../common/contact';
import {ICustomer} from '../models/Customer';
import {EmailSchedule} from '../models/EmailSchedule';

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
                Data: `<div style="text-align: center;">
                  <b>Dear <i>${options.to}</i></b> <br />
                  <b>Welcome to BlueClerk!  Please login to your account at <a href="https://app.blueclerk.com/">app.blueclerk.com</a></b><br />
                  <p>We encourage you to look at our support articles to better understand our software</p>
                  <p>If you have any questions, you may reach out for help to:</p>
                  <strong>chris.norton@blueclerk.com</strong><br />
                  <strong>512-846-6035</strong><br />
                  
                   <br />
                  <img src='http://blueclerk.com/wp-content/uploads/2020/07/logo-120x42.png' />
                  </div>`,
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
              Data: "<p>Welcome to BlueClerk! You have been added as a user to the organization "+ options.company+ "</p><p>Your Role: "+ options.role +"</p> <p>Below are your login credentials</p> <a href=\"https://app.blueclerk.com/login/\ target=\"_blank\">app.blueclerk.com</a> <p>Login ID: "+ options.to+"</p><p>Temporary Password: "+options.password + "</p><p>We encourage you to download our app on either <a href=\"https://play.google.com/store/apps/details?id=com.blueclerk.app\" target=\"_blank\">Android</a> or iOS (links) to fully optimize the system</p><p>Please login to your account and add information for your organization.  If you have any questions about the system, we have a variety of helpful tools.</p><p>Please refer to our help desk <a href=\"www.blueclerk.com/helpdesk\" target=\"_blank\">helpdesk</a></p><p>If you require further assistance, please contact us via chat through the website. We can also be reached by phone at 512-846-6035. For up to date information, we encourage you to like us on <a href=\"www.facebook.com/blueclerk\" target=\"_blank\">Facebook</a> </p>",
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
            Data: "Added as vendor by "+options.company+" on Blueclerk",
          },
          Body: {
            Html: {
              Data: "<p>Hi! "+ options.contractor+"</p>\
              <p>"+options.company+" has sent you an invitation to become a vendor for their organization. Please login to view details <a href=\"https://app.blueclerk.com/login/\ target=\"_blank\">app.blueclerk.com</a></p>",
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

export const sendContractStartEmailToCompany = function(options: any) {

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
            Data: "Request send to vendor "+options.contractor+" on Blueclerk",
          },
          Body: {
            Html: {
              Data: "<p>Hi! "+ options.company+"</p>\
              <p>You have sent a request to "+options.contractor+" to become a vendor for your company. Please login to view details <a href=\"https://app.blueclerk.com/login/\ target=\"_blank\">app.blueclerk.com</a></p>",
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
            Data: "Alert: Vendor status on BlueClerk has changed",
          },
          Body: {
            Html: {
              Data: "<p>Hi! "+ options.contractor+"</p>\
              <p>You have "+ options.contractStatus+" to be a vendor of "+options.company+". If you did not accepted this change, please login and change your password immediately  </p>",
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
            Data: "Alert: Vendor status on BlueClerk has changed",
          },
          Body: {
            Html: {
              Data: "<p>Hi! "+ options.company+"</p>\
              <p>"+options.contractor+" has "+ options.contractStatus+" to be a vendor for your organization.  If feel this was in error, please login and change your password immediately.</p>",
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
export const parseFieldsAndUploadImageInS3 = function(req: Request, res: Response, next: (err: any, data: any)=>void) {

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

    if (err) return next(err, null)
    if(!req.body.customerId)
    {
      return next({'status': Status.Error, 'message': Messages.MissingParams}, null);
    }
    const imageUrl = req.file ? req.file.location : null;
    const body = req.body;
    next(null, {imageUrl, body})
  })

}
export const updateFieldsAndUploadImageInS3 = function(req: Request, res: Response, next: (err: any, data: any)=>void) {

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

    if (err) return next(err, null)
    if(!req.body.ticketId || ! req.body.note)
    {
      return next({'status': Status.Error, 'message': Messages.MissingParams}, null);
    }
    const imageUrl = req.file ? req.file.location : null;
    const body = req.body;
    next(null, {imageUrl, body})
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

    next(null, req.file ? req.file.location : null)

  })

}

export const sendJobEmailToAssignee = function(options: any) {

  const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION} = process.env

  AWS.config.update({
    region: AWS_REGION,
    accessKeyId: AWS_SES_ACCESSKEYID,
    secretAccessKey: AWS_SES_SECRETACCESSKEY,
  })

  const ses = new AWS.SES({ apiVersion: '2012-10-17' })

  return new Promise((resolve, reject) => {
    let jobLocation = options.location;
    let jobSite = options.jobSite;
    let contact;
    if (jobLocation && jobLocation.contacts.length >0) {
      contact = jobLocation.contacts[0];
    }
    let ticket = options.ticket;
    let coordinates = [];
    let locationName;
    let contactName;
    let contactPhone;
    let contactEmail;
    let imageUrl = ticket.image ? ticket.image: null;
    if(contact) {
      contactName = contact.name ? contact.name : null;
      contactPhone = contact.phone ? contact.phone : null;
      contactEmail = contact.email ? contact.email : null;
    }
    let address: any = {};
    if (jobLocation) {
      coordinates = jobLocation.location.coordinates;
      locationName = jobLocation.name;
      address= jobLocation.address;
    }
    if (jobSite) {
      coordinates = jobSite.coordinates;
      address = jobSite.address;
    }
    ses.sendEmail(
      {
        Source: APP_EMAIL_NOREPLY,
        Destination: {
          CcAddresses: [],
          ToAddresses: [options.to],
        },
        Message: {
          Subject: {
            Data: "New Job Assigned via BlueClerk",
          },
          Body: {
            Html: {
              Data: `<p>Dear ${options.assigneeName}!</p>
                     <p>This email is to inform you that a job has been assigned and scheduled to you by (${options.companyName}).  Job details below:</p>
                     <p>Customer : ${options.customerName}</p>
                     <p>Job Type : ${options.jobType}</p>
                     ${coordinates.length > 0 ? '<p>Longitude: '+ coordinates[0] + ' Latitude: '+ coordinates[1] + '</p>' : ''}
                     ${locationName ? '<p>Location Name: '+ locationName + '</p>' : ''}
                     ${address.city ? '<p>City: '+ address.city + '</p>' : ''}
                     ${address.state ? '<p>State: '+ address.state + '</p>' : ''}
                     ${address.street ? '<p>Street: '+ address.street + '</p>' : ''}
                     ${address.zipcode ? '<p>Zipcode: '+ address.zipcode + '</p>' : ''}
                     ${contactName ? '<p>Contact name: '+ contactName + '</p>' : ''}
                     ${contactPhone ? '<p>Contact phone: '+ contactPhone + '</p>' : ''}
                     ${contactEmail ? '<p>Contact email: '+ contactEmail + '</p>' : ''}
                     ${imageUrl ? '<img src='+imageUrl.toString()+'>' : ''}
                   
                     <p>Notes : ${options.notes ? options.notes : 'N/A'}</p>
                      <p>Date : ${options.dateTime}</p> 
                      <p>If you have any questions, please reach out to the company who has assigned you to this job.  Thank you.</p>
                      <comment>You can change the frequency of these emails at any time by going to your preferences in profile</comment>
                      <br/><br/>
                      <p> <a href="https://blueclerk.com/privacy-policy" target="_blank">Privacy policy</a> </p>`,
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
export const sendScheduledJobEmailToAssignee = function(jobs: any[], to: string, assigneeName: string, emailSchedule: any ) {

  const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION} = process.env

  AWS.config.update({
    region: AWS_REGION,
    accessKeyId: AWS_SES_ACCESSKEYID,
    secretAccessKey: AWS_SES_SECRETACCESSKEY,
  })

  const ses = new AWS.SES({ apiVersion: '2012-10-17' })

  return new Promise(async (resolve, reject) => {
    let data = `<p>Dear ${assigneeName}!</p>
                <p>This email is to inform you that a job has been assigned and scheduled to you,  Job details below</p>
                <br />
                <hr>`;
        jobs = await Job.find({_id: {$in: jobs}, status: {$in : [0,1]}})
        .populate({
          path:'technician',
          select:'profile.displayName auth.email emailPreferences'
        })
        .populate({
          path: 'contractor',
          select: 'info.companyName info.companyEmail type'
        })
        .populate({
          path:'customer',
          select:'profile.displayName info.email emailPreferences'
        })
        .populate({
          path:'type',
          select:'title'
        })
        .populate('jobSite')
        .populate('company')
        .populate({
          path: 'jobLocation',
          populate: 'contacts'
        })
        .populate('ticket').exec();

    for(let job of jobs) {
      let jobLocation: IJobLocation = job.jobLocation;
      let jobSite = job.jobSite;
      let ticket: IServiceTicket = job.ticket;
      let contact: IContact = ticket.customerContactId;
      let coordinates = [];
      let contactDetails: any = {};
      let locationName;
      let customer: ICustomer = job.customer;
      let image = ticket.image ? ticket.image: null;
      if(contact) {
        contactDetails.contactName = contact.name ? contact.name : null;
        contactDetails.contactPhone = contact.phone ? contact.phone : null;
        contactDetails.contactEmail = contact.email ? contact.email : null;
      }
      let address: any = {};
      if (jobLocation) {
        locationName = jobLocation.name;
      }
      if (jobSite) {
        coordinates = jobSite.coordinates;
        address = jobSite.address;
      }
      if (!jobSite && jobLocation) {
        coordinates = jobLocation.location.coordinates;
        address = jobLocation.address;
      }
           data += `<p>Company: <b>${job.company.info.companyName}</b></p>
                    <p>Customer : ${customer.profile.displayName}</p>
                    <p>Job Type : ${job.type.title}</p>
                     ${coordinates.length > 0 ? '<p>Longitude: '+ coordinates[0] + ' Latitude: '+ coordinates[1] + '</p>' : ''}
                     ${locationName ? '<p>Location Name: '+ locationName + '</p>' : ''}
                     ${address.city ? '<p>City: '+ address.city + '</p>' : ''}
                     ${address.state ? '<p>State: '+ address.state + '</p>' : ''}
                     ${address.street ? '<p>Street: '+ address.street + '</p>' : ''}
                     ${address.zipcode ? '<p>Zipcode: '+ address.zipcode + '</p>' : ''}
                     ${contactDetails.contactName ? '<p>Contact name: '+ contactDetails.contactName + '</p>' : ''}
                     ${contactDetails.contactPhone ? '<p>Contact phone: '+ contactDetails.contactPhone + '</p>' : ''}
                     ${contactDetails.contactEmail ? '<p>Contact email: '+ contactDetails.contactEmail + '</p>' : ''}
                     ${image ? 'Service ticket image: <img src='+image.toString()+'>' : ''}
                     <p>Notes : ${job.description ? job.description : 'N/A'}</p>
                      <p>Date of Job : ${job.scheduleDate ? job.scheduleDate.toLocaleDateString("en-US") : 'N/A'}, time:  ${job.scheduledStartTime ? 'Start time: ' + job.scheduledStartTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''} ${job.scheduledEndTime ? 'End time: ' + job.scheduledEndTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</p> 
                      <br />
                      <hr>
                      <br />`
    }
    data += `<p>If you have any questions, please reach out to the company who has assigned you to this job.  Thank you.</p>
                      <comment>You can change the frequency of these emails at any time by going to your preferences in profile</comment>
                      <br/><br/>
                      <p> <a href="https://blueclerk.com/privacy-policy" target="_blank">Privacy policy</a> </p>`;
    if(jobs.length) {
      ses.sendEmail(
          {
            Source: APP_EMAIL_NOREPLY,
            Destination: {
              CcAddresses: [],
              ToAddresses: [to],
            },
            Message: {
              Subject: {
                Data: "New Assigned Jobs via BlueClerk",
              },
              Body: {
                Html: {
                  Data: data,
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
    }
    await EmailSchedule.findOneAndUpdate({_id: emailSchedule._id}, {$set:{pulled:true}}, {new: true});
  })
}

export const sendJobEmailToCustomer = function(options: any) {

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
            Data: "Job Scheduled via BlueClerk",
          },
          Body: {
            Html: {
              Data: "<p>Dear "+options.customerName+"!</p><p>This email is to inform you that a job has been scheduled with ("+options.companyName+").  Job details below:</p><p>Assigned To : "+ options.assigneeName+ "</p><p>Job Type : "+ options.jobType +"</p><p>Notes : "+ options.notes +"</p> <p>Date : "+ options.dateTime +"</p> <p>If you have any questions, please reach out to the company who has assigned you to this job.  Thank you.</p><br/><br/> <p> <a href=\"https:\/\/blueclerk.com/privacy-policy\" target=\"_blank\">Privacy policy</a> </p>",
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

export const sendJobEmailToCompanyAdmin = function(options: any) {

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
            Data: "Job Scheduled via BlueClerk",
          },
          Body: {
            Html: {
              Data: "<p>Dear "+options.contactPerson+"!</p><p>This email is to inform you that a job has been scheduled with ("+options.assigneeName+") by "+options.vendorName+".  Job details below:</p><p>Company : "+ options.companyName+ "</p><p>Customer : "+ options.customerName+ "</p><p>Job Type : "+ options.jobType +"</p><p>Notes : "+ options.notes +"</p> <p>Date : "+ options.dateTime +"</p> <p>If you have any questions, please reach out to the vendor who has created this job.  Thank you.</p><br/><br/> <p> <a href=\"https:\/\/blueclerk.com/privacy-policy\" target=\"_blank\">Privacy policy</a> </p>",
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

export const sendAccountDowngradeEmail = function(options: any) {

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
            Data: "BlueClerk Alert: Account status change",
          },
          Body: {
            Html: {
              Data: "<p>Your account has been downgraded to the free version. You may still use the software free of charge with limited functionality. All of your data will be saved.</p><p>You can upgrade to a full account at any time.</p><div><a href=\"https://app.blueclerk.com/login/\" target=\"_blank\"><img src=\"https://app.blueclerk.com/assets/img/logo.jpg\" style=\"width: 20%;\" alt='BlueClerk'></a></div>",
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
