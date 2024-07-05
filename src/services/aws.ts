import AWS from 'aws-sdk';
import multer from 'multer';
import multerS3 from 'multer-s3';
import fs from 'fs';
import { Request, Response } from 'express';
import uuid from 'uuid';
import { Messages, Status } from '../common/constants';
import { job } from 'cron';
import { IJob, Job } from '../models/Job';
import { IJobType } from '../models/JobType';
import { IUser } from '../models/User';
import { IJobLocation } from '../models/JobLocation';
import { IServiceTicket } from '../models/ServiceTicket';
import { IContact } from '../common/contact';
import { ICustomer } from '../models/Customer';
import { EmailSchedule } from '../models/EmailSchedule';
import { v4 as uuidv4 } from 'uuid';
import * as Sentry from '@sentry/node';
import { PublishCommandInput } from '@aws-sdk/client-sns';

import moment from 'moment';
import { toTitleCase } from './helper';
import { WindowTypes, IGlass, IRequests, IScreen } from '../models/JobRequest';
import { IWindowGlass } from '../models/WindowGlass';
import { IWindowFrameColor } from '../models/WindowFrameColor';

const http = require('http');

export const translateText = function (sourceLanguageCode: string, targetLanguageCode: string, text: string): any {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;
    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const translate = new AWS.Translate({ region: AWS_REGION });

    const params = {
        SourceLanguageCode: sourceLanguageCode,
        TargetLanguageCode: targetLanguageCode,
        Text: text,
    };

    return new Promise((resolve, reject) => {
        translate.translateText(params, (err, data) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            console.log(data);
            resolve(data);
        });
    });
};

export const sendEmail = function (options: any) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });

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
                        Data: 'Email Confirmation from Blueclerk.com',
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
                  <img src='https://blueclerk.com/wp-content/uploads/2020/07/logo.png' />
                  </div>`,
                        },
                    },
                },
                ReplyToAddresses: [APP_EMAIL_NOREPLY],
            },
            (err, info) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(info);
                }
            },
        );
    });
};
export const sendEmployeeEmail = function (options: any) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });

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
                        Data: 'Email Confirmation with details from Blueclerk.com',
                    },
                    Body: {
                        Html: {
                            Data:
                                '<p>Welcome to BlueClerk! You have been added as a user to the organization ' +
                                options.company +
                                '</p><p>Your Role: ' +
                                options.role +
                                '</p> <p>Below are your login credentials</p> <a href="https://app.blueclerk.com/login/ target="_blank">app.blueclerk.com</a> <p>Login ID: ' +
                                options.to +
                                '</p><p>Temporary Password: ' +
                                options.password +
                                '</p><p>We encourage you to download our app on either <a href="https://play.google.com/store/apps/details?id=com.blueclerk.app" target="_blank">Android</a> or iOS (links) to fully optimize the system</p><p>Please login to your account and add information for your organization.  If you have any questions about the system, we have a variety of helpful tools.</p><p>Please refer to our help desk <a href="www.blueclerk.com/helpdesk" target="_blank">helpdesk</a></p><p>If you require further assistance, please contact us via chat through the website. We can also be reached by phone at 512-846-6035. For up to date information, we encourage you to like us on <a href="www.facebook.com/blueclerk" target="_blank">Facebook</a> </p>',
                        },
                    },
                },
                ReplyToAddresses: [options.replyTo ?? ''],
            },
            (err, info) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(info);
                }
            },
        );
    });
};

export const sendInvitationToContractor = function (options: any) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });

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
                        Data: 'Invitation to join Blueclerk.com from ' + options.company,
                    },
                    Body: {
                        Html: {
                            Data: `<div style="text-align: center;">
                <p>Welcome to BlueClerk! You have been invited to join BlueClerk</p>
                <p>Click the link to get started: <a href="https://app.blueclerk.com/signup/?email=${options.to}&isci=true&cid=${options.companyId}" target="_blank">app.blueclerk.com</a></p>
                <p><img src='https://blueclerk.com/wp-content/uploads/2021/10/Welcome-Email-to-Vendor-Pic.jpg' style="width:85%" /></p>
                <h3>Download BlueClerk Mobile App:</h3>
                <a href='https://play.google.com/store/apps/details?id=com.blueclerk.app&hl=en'><img alt='Get BlueClerk Mobile App on Google Play' src='https://blueclerk.com/wp-content/uploads/2020/07/playstore.png' style="width: 150px; margin-right:2px"/></a>
                &nbsp;
                <a href="https://apps.apple.com/us/app/id1450328521"><img src="https://blueclerk.com/wp-content/uploads/2020/07/appstore.png" alt="Download BlueClerk Mobile App on the App Store" style="width: 150px; margin-left:2px"></a>
                <br />
                <hr>
                <br />
                <img src='https://blueclerk.com/wp-content/uploads/2020/07/logo.png' />
                </div>`,
                        },
                    },
                },
                ReplyToAddresses: [options.replyTo ?? ''],
            },
            (err, info) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(info);
                }
            },
        );
    });
};

export const sendContractStartEmail = function (options: any) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });

    return new Promise((resolve, reject) => {
        ses.sendEmail(
            {
                Source: `"${options.company}" <${APP_EMAIL_NOREPLY}>`,
                Destination: {
                    CcAddresses: [],
                    ToAddresses: [options.to],
                },
                Message: {
                    Subject: {
                        Data: 'Added as vendor by ' + options.company + ' on Blueclerk',
                    },
                    Body: {
                        Html: {
                            Data:
                                '<p>Hi! ' +
                                options.contractor +
                                '</p>\
              <p>' +
                                options.company +
                                ' has added you to become a vendor for their organization. You do not need to do anything at this time. Please login to view details <a href="https://app.blueclerk.com/login/ target="_blank">app.blueclerk.com</a></p>',
                        },
                    },
                },
                ReplyToAddresses: [options.companyEmail ?? ''],
            },
            (err, info) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(info);
                }
            },
        );
    });
};

/**
 * Kris' Remark (Aug 30st, 2021):
 * TODO: To remove, this already been refactored below
 */
// export const sendInvoiceEmailToCustomer = function(options: any) {
//   const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION} = process.env
//   AWS.config.update({
//     region: AWS_REGION,
//     accessKeyId: AWS_SES_ACCESSKEYID,
//     secretAccessKey: AWS_SES_SECRETACCESSKEY,
//   })
//   const ses = new AWS.SES({ apiVersion: '2012-10-17' })
//   return new Promise((resolve, reject) => {
//     ses.sendEmail(
//         {
//           Source: `"${options.companyName}" <${APP_EMAIL_NOREPLY}>`,
//           Destination: {
//             CcAddresses: [],
//             ToAddresses: [options.customerEmail],
//           },
//           Message: {
//             Subject: {
//               Data: `${options.companyName} has sent you an invoice`,
//             },
//             Body: {
//               Html: {
//                 Data: `
//               <div style="text-align: center;">
//               <p>Dear  ${options.customerName}</p>
//               <p>Please see your invoice information below :</p>
//               <br />
//               <hr>
//               <p><strong>Invoice Number:</strong> ${options.invoiceNumber}</p>
//               <p><strong>Invoice Amount:</strong> ${options.invoiceAmount}</p>
//               <br />
//               <img src='https://blueclerk.com/wp-content/uploads/2020/07/logo.png' alt="blueclerk" />
//               </div>
//               `
//               },
//             },
//           },
//           ReplyToAddresses: [options.companyEmail],
//         },
//         (err, info) => {
//           if (err) {
//             reject(err)
//           } else {
//             resolve(info)
//           }
//         },
//     )
//   })
// }

export const sendInvoiceEmailToCustomer = async function (options: any) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    let {
        subject,
        message,
        sender_email,
        company_name,
        company_email,
        company_logo,
        customer_name,
        customer_email,
        recipient_emails,
        invoice_number,
        invoice_amount,
        invoice_due_date,
        invoice_pdf,
        invoice_pdfs,
        invoice_pdf_name,
        term_name,
        term_due_days,
    } = options;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });
    const boundary = `NextPart${Math.random().toString().substr(2)}`;

    // Fill in the small_company_logo placeholder
    message = message.replace(
        /{{small_company_logo}}/gi,
        `<img style=\"width:150px\" src=\"${company_logo}\" alt=\"${company_name}\" />`,
    );
    // Replace \n to <br /> in HTML
    message = message.replace(/\\n/gi, '<br />');

    const SENDER = `"${company_name}" <${APP_EMAIL_NOREPLY ?? sender_email ?? company_email}>`;
    const RECIPIENT = recipient_emails;
    const SUBJECT = eval('`' + subject + '`');
    const BODY_HTML = `<div style=\"font-family:roboto; padding:10px; background-color: #EAECF3; text-align:center;\">
                      <p><img style=\"width:350px\" src=\"${company_logo}\" alt=\"${company_name}\" /></p>
                      <p><strong>${company_name}</strong></p>
                    </div>
                    <div style=\"font-family:roboto; padding:10px; text-align:center\">
                      <h2>${invoice_number ?? 'Invoices'}</h2>
                    </div>
                    <div style=\"font-family:roboto; padding:10px\">
                      ${eval('`' + message + '`')}
                      <br /><br />
                      <p style="padding:0px">Sent with BlueClerk Software</p>
                      <a href="https://app.blueclerk.com"><img src="https://blueclerk.com/wp-content/uploads/2020/07/logo.png" /></a>
                    </div>`;

    const rawMessage = [
        `From: ${SENDER}`,
        `To: ${RECIPIENT}`,
        `Reply-To: ${sender_email}`,
        `Subject: ${SUBJECT}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary=\"${boundary}\"\n`,
        `--${boundary}`,
        'Content-Type: text/html\n',
        `${BODY_HTML}\n`,
        `--${boundary}`,
    ];

    // Attachment PDF if provided
    for (const invoice_pdf of invoice_pdfs) {
        const pdfFile = fs.readFileSync(invoice_pdf.filepath);
        const ATTACHMENT = pdfFile.toString('base64').replace(/([^\0]{76})/g, '$1\n');

        rawMessage.push(`Content-Type: application/octet-stream; name=\"${invoice_pdf.invoice?.invoiceId}.pdf\"`);
        rawMessage.push('Content-Transfer-Encoding: base64');
        rawMessage.push(`Content-Disposition: attachment;filename=\"${invoice_pdf.invoice?.invoiceId}.pdf\"`);
        rawMessage.push(`Content-ID:<${invoice_pdf.invoice?.invoiceId}.pdf>\n`);
        rawMessage.push(`${ATTACHMENT}\n`);

        if (
            invoice_pdfs.findIndex((pdf: any) => pdf.invoice._id === invoice_pdf.invoice._id) ===
            invoice_pdfs.length - 1
        ) {
            rawMessage.push(`--${boundary}--`);
        } else {
            rawMessage.push(`--${boundary}`);
        }
    }

    try {
        await ses
            .sendRawEmail({
                Source: SENDER,
                Destinations: RECIPIENT,
                RawMessage: { Data: rawMessage.join('\n') },
            })
            .promise();
    } catch (error) {
        Sentry.captureException(error);
        console.log('== AWS sendInvoiceEmailToCustomer Error:', error);
        return;
    }

    return;
};

export const sendPORequestEmailToCustomer = async function (options: any) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    let {
        subject,
        message,
        sender_email,
        company_name,
        company_email,
        company_logo,
        recipient_emails,
        po_request_number,
        po_request_pdfs,
    } = options;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });
    const boundary = `NextPart${Math.random().toString().substr(2)}`;

    // Fill in the small_company_logo placeholder
    message = message.replace(
        /{{small_company_logo}}/gi,
        `<img style=\"width:150px\" src=\"${company_logo}\" alt=\"${company_name}\" />`,
    );
    // Replace \n to <br /> in HTML
    message = message.replace(/\\n/gi, '<br />');

    const SENDER = `"${company_name}" <${APP_EMAIL_NOREPLY ?? sender_email ?? company_email}>`;
    const RECIPIENT = recipient_emails;
    const SUBJECT = eval('`' + subject + '`');
    const BODY_HTML = `<div style=\"font-family:roboto; padding:10px; background-color: #EAECF3; text-align:center;\">
                      <p><img style=\"width:350px\" src=\"${company_logo}\" alt=\"${company_name}\" /></p>
                      <p><strong>${company_name}</strong></p>
                    </div>
                    <div style=\"font-family:roboto; padding:10px; text-align:center\">
                      <h2>${po_request_number ?? 'Purchase Order Request'}</h2>
                    </div>
                    <div style=\"font-family:roboto; padding:10px\">
                      ${eval('`' + message + '`')}
                      <br /><br />
                      <p style="padding:0px">Sent with BlueClerk Software</p>
                      <a href="https://app.blueclerk.com"><img src="https://blueclerk.com/wp-content/uploads/2020/07/logo.png" /></a>
                    </div>`;

    const rawMessage = [
        `From: ${SENDER}`,
        `To: ${RECIPIENT}`,
        `Reply-To: ${sender_email}`,
        `Subject: ${SUBJECT}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary=\"${boundary}\"\n`,
        `--${boundary}`,
        'Content-Type: text/html\n',
        `${BODY_HTML}\n`,
        `--${boundary}`,
    ];

    // Attachment PDF if provided
    for (const ticket_pdf of po_request_pdfs) {
        const pdfFile = fs.readFileSync(ticket_pdf.filepath);
        const ATTACHMENT = pdfFile.toString('base64').replace(/([^\0]{76})/g, '$1\n');

        rawMessage.push(`Content-Type: application/octet-stream; name=\"${ticket_pdf.ticket?.ticketId}.pdf\"`);
        rawMessage.push('Content-Transfer-Encoding: base64');
        rawMessage.push(`Content-Disposition: attachment;filename=\"${ticket_pdf.ticket?.ticketId}.pdf\"`);
        rawMessage.push(`Content-ID:<${ticket_pdf.ticket?.ticketId}.pdf>\n`);
        rawMessage.push(`${ATTACHMENT}\n`);

        if (
            po_request_pdfs.findIndex((pdf: any) => pdf.ticket._id === ticket_pdf.ticket._id) ===
            po_request_pdfs.length - 1
        ) {
            rawMessage.push(`--${boundary}--`);
        } else {
            rawMessage.push(`--${boundary}`);
        }
    }

    try {
        await ses
            .sendRawEmail({
                Source: SENDER,
                Destinations: RECIPIENT,
                RawMessage: { Data: rawMessage.join('\n') },
            })
            .promise();
    } catch (error) {
        Sentry.captureException(error);
        console.log('== AWS sendPORequestEmailToCustomer Error:', error);
        return;
    }

    return;
};

export const sendReportPdf = async (options: any) => {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    let {
        subject,
        message,
        sender_email,
        company_name,
        company_email,
        company_logo,
        recipient_emails,
        date_range,
        income_pdf,
        income_pdf_name,
        report_pdf,
        report_pdf_name,
    } = options;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });
    const boundary = `NextPart${Math.random().toString().substr(2)}`;

    message = message?.replace(
        /{{small_company_logo}}/gi,
        `<img style=\"width:150px\" src=\"${company_logo}\" alt=\"${company_name}\" />`,
    );
    // Replace \n to <br /> in HTML
    message = message?.replace(/\\n/gi, '<br />');

    const SENDER = `"${company_name}" <${APP_EMAIL_NOREPLY ?? sender_email ?? company_email}>`;
    const RECIPIENT = recipient_emails;
    const SUBJECT = eval('`' + subject + '`');
    const BODY_HTML = `<div style=\"font-family:roboto; padding:10px; background-color: #EAECF3; text-align:center;\">
                      <p><img style=\"width:350px\" src=\"${company_logo}\" alt=\"${company_name}\" /></p>
                      <p><strong>${company_name}</strong></p>
                    </div>
                    <div style=\"font-family:roboto; padding:10px; text-align:center\">
                      <h2>Hello, </h2>
                    </div>
                    <div style=\"font-family:roboto; padding:10px\">
                      ${eval('`' + message + '`')}
                      <br /><br />
                      <p style="padding:0px">Sent with BlueClerk Software</p>
                      <a href="https://app.blueclerk.com"><img src="https://blueclerk.com/wp-content/uploads/2020/07/logo.png" /></a>
                    </div>`;

    const rawMessage = [
        `From: ${SENDER}`,
        `To: ${RECIPIENT}`,
        `Reply-To: ${company_email ?? ''}`,
        `Subject: ${SUBJECT}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary=\"${boundary}\"\n`,
        `--${boundary}`,
        'Content-Type: text/html\n',
        `${BODY_HTML}\n`,
        `--${boundary}`,
    ];

    // Attachment PDF if provided
    if (report_pdf) {
        const pdfFile = fs.readFileSync(report_pdf);
        const ATTACHMENT = pdfFile.toString('base64').replace(/([^\0]{76})/g, '$1\n');

        rawMessage.push(`Content-Type: application/octet-stream; name=\"${report_pdf_name}\"`);
        rawMessage.push('Content-Transfer-Encoding: base64');
        rawMessage.push('Content-Disposition: attachment\n');
        rawMessage.push(`${ATTACHMENT}\n`);
        rawMessage.push(`--${boundary}--`);
    }

    try {
        await ses
            .sendRawEmail({
                Source: SENDER,
                Destinations: RECIPIENT,
                RawMessage: { Data: rawMessage.join('\n') },
            })
            .promise();
    } catch (error) {
        Sentry.captureException(error);
        console.log('== AWS sendInvoiceEmailToCustomer Error:', error);
        return;
    }

    return;
};

export const sendReportEmailToCustomer = async (options: any) => {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    let {
        subject,
        message,
        customerEmail,
        customerName,
        companyName,
        companyEmail,
        companyLogo,
        recipientEmails,
        jobReportPdf,
        reportNumber,
    } = options;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });
    const boundary = `NextPart${Math.random().toString().substr(2)}`;

    message = message?.replace(
        /{{small_company_logo}}/gi,
        `<img style=\"width:150px\" src=\"${companyLogo}\" alt=\"${companyName}\" />`,
    );
    // Replace \n to <br /> in HTML
    message = message?.replace(/\n/gi, '<br />');

    const SENDER = `"${companyName}" <${APP_EMAIL_NOREPLY ?? customerEmail ?? companyEmail}>`;
    const RECIPIENT = recipientEmails;
    const SUBJECT = eval('`' + subject + '`');
    const BODY_HTML = `<div style=\"font-family:roboto; padding:10px; background-color: #EAECF3; text-align:center;\">
                      <p><img style=\"width:350px\" src=\"${companyLogo}\" alt=\"${companyName}\" /></p>
                      <p><strong>${companyName}</strong></p>
                    </div>
                    <div style=\"font-family:roboto; padding:10px\">
                      ${eval('`' + message + '`')}
                      <br /><br />
                      <p style="padding:0px">Sent with BlueClerk Software</p>
                      <a href="https://app.blueclerk.com"><img src="https://blueclerk.com/wp-content/uploads/2020/07/logo.png" /></a>
                    </div>`;

    const rawMessage = [
        `From: ${SENDER}`,
        `To: ${RECIPIENT}`,
        `Reply-To: ${companyEmail ?? ''}`,
        `Subject: ${SUBJECT}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary=\"${boundary}\"\n`,
        `--${boundary}`,
        'Content-Type: text/html\n',
        `${BODY_HTML}\n`,
        `--${boundary}`,
    ];
    // Attachment PDF if provided
    if (jobReportPdf) {
        const pdfFile = fs.readFileSync(jobReportPdf);
        const ATTACHMENT = pdfFile.toString('base64').replace(/([^\0]{76})/g, '$1\n');
        rawMessage.push(`Content-Type: application/octet-stream; name=\"${reportNumber}.pdf\"`);
        rawMessage.push('Content-Transfer-Encoding: base64');
        rawMessage.push('Content-Disposition: attachment\n');
        rawMessage.push(`${ATTACHMENT}\n`);
        rawMessage.push(`--${boundary}--`);
    }

    try {
        await ses
            .sendRawEmail({
                Source: SENDER,
                Destinations: RECIPIENT,
                RawMessage: { Data: rawMessage.join('\n') },
            })
            .promise();
    } catch (error) {
        Sentry.captureException(error);
        console.log('== AWS sendInvoiceEmailToCustomer Error:', error);
        return;
    }

    return;
};

export const sendContractStartEmailToCompany = function (options: any) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });

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
                        Data: 'Request send to vendor ' + options.contractor + ' on Blueclerk',
                    },
                    Body: {
                        Html: {
                            Data:
                                '<p>Hi! ' +
                                options.company +
                                '</p>\
              <p>You have sent a request to ' +
                                options.contractor +
                                ' to become a vendor for your company. Please login to view details <a href="https://app.blueclerk.com/login/ target="_blank">app.blueclerk.com</a></p>',
                        },
                    },
                },
                ReplyToAddresses: [options.replyTo],
            },
            (err, info) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(info);
                }
            },
        );
    });
};

/**
 * // TODO: To be deprecated
 * @deprecated
 */
export const sendContractStatusChangeEmailToContractor = function (options: any) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });

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
                        Data: 'Alert: Vendor status on BlueClerk has changed',
                    },
                    Body: {
                        Html: {
                            Data:
                                '<p>Hi! ' +
                                options.contractor +
                                '</p>\
              <p>You have ' +
                                options.contractStatus +
                                ' to be a vendor of ' +
                                options.company +
                                '. If you did not accepted this change, please login and change your password immediately  </p>',
                        },
                    },
                },
                ReplyToAddresses: [options.replyTo ?? ''],
            },
            (err, info) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(info);
                }
            },
        );
    });
};

/**
 * // TODO: To be deprecated
 * @deprecated
 */
export const sendContractStatusChangeEmailToCompany = function (options: any) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });

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
                        Data: 'Alert: Vendor status on BlueClerk has changed',
                    },
                    Body: {
                        Html: {
                            Data:
                                '<p>Hi! ' +
                                options.company +
                                '</p>\
              <p>' +
                                options.contractor +
                                ' has ' +
                                options.contractStatus +
                                ' to be a vendor for your organization.  If feel this was in error, please login and change your password immediately.</p>',
                        },
                    },
                },
                ReplyToAddresses: [APP_EMAIL_NOREPLY],
            },
            (err, info) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(info);
                }
            },
        );
    });
};

export const sendPasswordEmail = function (options: any) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });

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
                        Data: 'Forgot password email from Blueclerk.com',
                    },
                    Body: {
                        Html: {
                            Data:
                                '<p>Dear ' +
                                options.name +
                                '</p><p>Your new password is below.  If you wish to change your password from this, please login and go to your profile.</p> <br/> <b>' +
                                options.password +
                                '</b><br/><br/> <p>Sincerely,</p><p>BlueClerk</p>',
                        },
                    },
                },
                ReplyToAddresses: [APP_EMAIL_NOREPLY],
            },
            (err, info) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(info);
                }
            },
        );
    });
};
export const parseFieldsAndUploadImageInS3 = async function (
    req: Request,
    res: Response,
    next: (err: any, data: any) => void,
) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, AWS_BUCKET_NAME, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const s3 = new AWS.S3();
    if (req.body.source != 'blueclerk' && req.body.image) {
        await http.get(req.body.image, async (res: any) => {
            if (res.status == 200) {
                // Uploading files to the bucket
                await s3.upload(
                    {
                        Bucket: AWS_BUCKET_NAME,
                        Body: res,
                        ACL: 'public-read',
                        ContentType: req.body.fileType,
                        Key: uuidv4(),
                    },
                    function (err: any, data: any) {
                        if (err) {
                            return next(err, null);
                        }
                        return next(null, { imageUrl: data.Location, body: req.body });
                    },
                );
            }
            return next(null, { imageUrl: null, body: req.body });
        });
    } else {
        const fileFilter = (req: Request, file: Express.Multer.File, cb: (err: any, success: boolean) => void) => {
            if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
                return cb(null, true);
            } else {
                return cb(new Error('Invalid file type, only JPEG and PNG is allowed!'), false);
            }
        };

        const upload = multer({
            fileFilter,
            storage: multerS3({
                s3: s3,
                bucket: AWS_BUCKET_NAME,
                acl: 'public-read',
                contentType: multerS3.AUTO_CONTENT_TYPE,
                key: function (req, file, cb) {
                    cb(null, uuid());
                },
            }),
        });

        const uploadMultiple = upload.fields([{ name: 'image' }, { name: 'images' }]);

        uploadMultiple(req, res, (err) => {
            if (err) return next(err, null);
            if (req.body.source === 'blueclerk' && !req.body.customerId && !req.body.homeOwnerId) {
                return next({ message: 'Either Customer or Home Owner is required to create a service ticket' }, null);
            }
            const imagesUrl: string[] = [];
            const imageFiles = JSON.parse(JSON.stringify(req.files));
            imageFiles?.image?.forEach((image: any) => imagesUrl.push(image.location));
            imageFiles?.images?.forEach((image: any) => imagesUrl.push(image.location));
            req.body.imageUrl = req.body.imageUrl || imagesUrl;
            const body = req.body;
            return next(null, { imagesUrl, body });
        });
    }
};
export const updateFieldsAndUploadImageInS3 = function (
    req: Request,
    res: Response,
    next: (err: any, data: any) => void,
) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, AWS_BUCKET_NAME, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const fileFilter = (req: Request, file: Express.Multer.File, cb: (err: any, success: boolean) => void) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type, only JPEG and PNG is allowed!'), false);
        }
    };

    const s3 = new AWS.S3();
    const upload = multer({
        fileFilter,
        storage: multerS3({
            s3: s3,
            bucket: AWS_BUCKET_NAME,
            acl: 'public-read',
            contentType: multerS3.AUTO_CONTENT_TYPE,
            key: function (req, file, cb) {
                cb(null, uuid());
            },
        }),
    });

    const uploadMultiple = upload.fields([{ name: 'image' }, { name: 'images' }]);

    uploadMultiple(req, res, (err) => {
        if (err) return next(err, null);

        if ((!req.body.ticketId || !req.body.note) && req.body.type != 'PO Request') {
            return next({ status: Status.Error, message: Messages.MissingParams }, null);
        }
        const imagesUrl: string[] = [];
        const imageFiles = JSON.parse(JSON.stringify(req.files));
        imageFiles?.image?.forEach((image: any) => imagesUrl.push(image.location));
        imageFiles?.images?.forEach((image: any) => imagesUrl.push(image.location));
        const body = req.body;
        next(null, { imagesUrl, body });
    });
};

export const uploadImageInS3 = function (req: Request, res: Response, next: (err: any, imageUrl?: string) => void) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, AWS_BUCKET_NAME, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const fileFilter = (req: Request, file: Express.Multer.File, cb: (err: any, success: boolean) => void) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type, only JPEG and PNG is allowed!'), false);
        }
    };

    const s3 = new AWS.S3();
    const upload = multer({
        fileFilter,
        storage: multerS3({
            s3: s3,
            bucket: AWS_BUCKET_NAME,
            acl: 'public-read',
            contentType: multerS3.AUTO_CONTENT_TYPE,
            key: function (req, file, cb) {
                cb(null, uuid());
            },
        }),
    });

    const uploadSingle = upload.single('image');

    uploadSingle(req, res, (err) => {
        if (err) return next(err);

        next(null, req.file ? req.file.location : null);
    });
};

export const sendJobEmailToAssignee = function (options: any) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });

    return new Promise((resolve, reject) => {
        const jobLocation = options.location;
        const jobSite = options.jobSite;
        let contact;
        if (jobLocation && jobLocation.contacts.length > 0) {
            contact = jobLocation.contacts[0];
        }
        const ticket = options.ticket;
        let coordinates = [];
        let locationName;
        let contactName;
        let contactPhone;
        let contactEmail;
        const imageUrl = ticket.image ? ticket.image : null;
        let optionsNameParameter;
        if (contact) {
            contactName = contact.name ? contact.name : null;
            contactPhone = contact.phone ? contact.phone : null;
            contactEmail = contact.email ? contact.email : null;
        }
        let address: any = {};
        if (jobLocation) {
            coordinates = jobLocation.location.coordinates;
            locationName = jobLocation.name;
            address = jobLocation.address;
        }
        if (jobSite) {
            coordinates = jobSite.coordinates;
            address = jobSite.address;
        }
        if (options.customerName) {
            optionsNameParameter = `<p>Customer : ${options.customerName}</p>`;
        }
        if (options.homeOwnerName) {
            optionsNameParameter = `<p>Home Owner : ${options.homeOwnerName}</p>`;
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
                        Data: 'New Job Assigned via BlueClerk',
                    },
                    Body: {
                        Html: {
                            Data: `<p>Dear ${options.assigneeName}!</p>
                     <p>This email is to inform you that a job has been assigned and scheduled to you by (${options.companyName}).  Job details below:</p>
                     ${optionsNameParameter}
                     <p>Job Types : ${options.jobTitles || '-'}</p>
                     ${coordinates.length > 0 ? '<p>Longitude: ' + coordinates[0] + ' Latitude: ' + coordinates[1] + '</p>' : ''}
                     ${locationName ? '<p>Location Name: ' + locationName + '</p>' : ''}
                     ${address.city ? '<p>City: ' + address.city + '</p>' : ''}
                     ${address.state ? '<p>State: ' + address.state + '</p>' : ''}
                     ${address.street ? '<p>Street: ' + address.street + '</p>' : ''}
                     ${address.zipcode ? '<p>Zipcode: ' + address.zipcode + '</p>' : ''}
                     ${contactName ? '<p>Contact name: ' + contactName + '</p>' : ''}
                     ${contactPhone ? '<p>Contact phone: ' + contactPhone + '</p>' : ''}
                     ${contactEmail ? '<p>Contact email: ' + contactEmail + '</p>' : ''}
                     ${imageUrl ? '<img src=' + imageUrl.toString() + '>' : ''}
                   
                     <p>Notes : ${options.notes ? options.notes : 'N/A'}</p>
                      <p>Date : ${options.dateTime}</p> 
                      <p>If you have any questions, please reach out to the company who has assigned you to this job.  Thank you.</p>
                      <comment>You can change the frequency of these emails at any time by going to your preferences in profile</comment>
                      <br/><br/>
                      <p> <a href="https://blueclerk.com/privacy-policy" target="_blank">Privacy policy</a> </p>`,
                        },
                    },
                },
                ReplyToAddresses: [options.replyTo ?? ''],
            },
            (err, info) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(info);
                }
            },
        );
    });
};
export const sendScheduledJobEmailToAssignee = function (
    jobs: IJob[],
    to: string,
    replyTo: string,
    assigneeName: string,
    emailSchedule: any,
) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });

    return new Promise(async (resolve, reject) => {
        let data = `<p>Dear ${assigneeName}!</p>
                <p>This email is to inform you that a job has been assigned and scheduled to you,  Job details below</p>
                <br />
                <hr>`;
        jobs = await Job.find({ _id: { $in: jobs }, status: { $in: [0, 1] } })
            .populate({
                // TODO: To be deprecated
                path: 'technician',
                select: 'profile.displayName auth.email emailPreferences',
            })
            // TODO: To be deprecated
            .populate({
                path: 'contractor',
                select: 'info.companyName info.companyEmail type',
            })
            .populate({
                path: 'tasks.technician',
                select: 'profile.displayName auth.email emailPreferences',
            })
            .populate({
                path: 'tasks.contractor',
                select: 'info.companyName info.companyEmail type',
            })
            .populate({
                path: 'customer',
                select: 'profile.displayName info.email emailPreferences',
            })
            // TODO: To be deprecated
            .populate({
                path: 'type',
                select: 'title description sku',
            })
            .populate({
                path: 'tasks.jobType',
                select: 'title description sku',
            })
            // TODO: To be deprecated
            .populate({
                path: 'tasks.jobTypes.jobType',
                select: 'title description sku',
            })
            .populate('jobSite')
            .populate('company')
            .populate({
                path: 'jobLocation',
                populate: 'contacts',
            })
            .populate('ticket')
            .exec();

        for (const job of jobs) {
            const jobLocation: IJobLocation = job.jobLocation;
            const jobSite = job.jobSite;
            const ticket: IServiceTicket = job.ticket;
            const contact: IContact = ticket.customerContactId;
            const type: any = job.type && job.type.title;
            // let jobTypes: string[] = job.jobTypes.map(jts => {
            let jobTypes: string[];
            job.tasks.forEach((task) => {
                jobTypes = task.jobTypes.map((jobType) => {
                    const jt = <IJobType>jobType.jobType;
                    return jt.title;
                });
            });
            // let jobTypes: string[] = job.tasks.map(task => {
            //     const jt = <IJobType>task.jobType;
            //     return jt.title
            // });
            const jobTitles = jobTypes.length > 0 ? jobTypes.join(', ') : type;
            let coordinates = [];
            const contactDetails: any = {};
            let locationName;
            const customer: ICustomer = job.customer;
            const image = ticket.images ? ticket.images : [];
            if (contact) {
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
                    <p>Job Types : ${jobTitles || '-'}</p>
                     ${coordinates.length > 0 ? '<p>Longitude: ' + coordinates[0] + ' Latitude: ' + coordinates[1] + '</p>' : ''}
                     ${locationName ? '<p>Location Name: ' + locationName + '</p>' : ''}
                     ${address.city ? '<p>City: ' + address.city + '</p>' : ''}
                     ${address.state ? '<p>State: ' + address.state + '</p>' : ''}
                     ${address.street ? '<p>Street: ' + address.street + '</p>' : ''}
                     ${address.zipcode ? '<p>Zipcode: ' + address.zipcode + '</p>' : ''}
                     ${contactDetails.contactName ? '<p>Contact name: ' + contactDetails.contactName + '</p>' : ''}
                     ${contactDetails.contactPhone ? '<p>Contact phone: ' + contactDetails.contactPhone + '</p>' : ''}
                     ${contactDetails.contactEmail ? '<p>Contact email: ' + contactDetails.contactEmail + '</p>' : ''}
                     ${image ? 'Service ticket image: <img src=' + image.toString() + '>' : ''}
                     <p>Notes : ${job.description ? job.description : 'N/A'}</p>
                      <p>Date of Job : ${job.scheduleDate ? job.scheduleDate.toLocaleDateString('en-US') : 'N/A'}, time:  ${job.scheduledStartTime ? 'Start time: ' + job.scheduledStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} ${job.scheduledEndTime ? 'End time: ' + job.scheduledEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p> 
                      <br />
                      <hr>
                      <br />`;
        }
        data += `<p>If you have any questions, please reach out to the company who has assigned you to this job.  Thank you.</p>
                      <comment>You can change the frequency of these emails at any time by going to your preferences in profile</comment>
                      <br/><br/>
                      <p> <a href="https://blueclerk.com/privacy-policy" target="_blank">Privacy policy</a> </p>`;
        if (jobs.length) {
            ses.sendEmail(
                {
                    Source: APP_EMAIL_NOREPLY,
                    Destination: {
                        CcAddresses: [],
                        ToAddresses: [to],
                    },
                    Message: {
                        Subject: {
                            Data: 'New Assigned Jobs via BlueClerk',
                        },
                        Body: {
                            Html: {
                                Data: data,
                            },
                        },
                    },
                    ReplyToAddresses: [replyTo ?? ''],
                },
                (err, info) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(info);
                    }
                },
            );
        }
        await EmailSchedule.findOneAndUpdate({ _id: emailSchedule._id }, { $set: { pulled: true } }, { new: true });
    });
};

export const sendJobEmailToCustomer = function (options: any) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });

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
                        Data: 'Job Scheduled via BlueClerk',
                    },
                    Body: {
                        Html: {
                            Data:
                                '<p>Dear ' +
                                options.customerName +
                                '!</p><p>This email is to inform you that a job has been scheduled with (' +
                                options.companyName +
                                ').  Job details below:</p><p>Assigned To : ' +
                                options.assigneeName +
                                '</p><p>Job Type : ' +
                                options.jobType +
                                '</p><p>Notes : ' +
                                options.notes +
                                '</p> <p>Date : ' +
                                options.dateTime +
                                '</p> <p>If you have any questions, please reach out to the company who has assigned you to this job.  Thank you.</p><br/><br/> <p> <a href="https://blueclerk.com/privacy-policy" target="_blank">Privacy policy</a> </p>',
                        },
                    },
                },
                ReplyToAddresses: [options.replyTo ?? ''],
            },
            (err, info) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(info);
                }
            },
        );
    });
};

export const sendJobEmailToCompanyAdmin = function (options: any) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });

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
                        Data: 'Job Scheduled via BlueClerk',
                    },
                    Body: {
                        Html: {
                            Data:
                                '<p>Dear ' +
                                options.contactPerson +
                                '!</p><p>This email is to inform you that a job has been scheduled with (' +
                                options.assigneeName +
                                ') by ' +
                                options.vendorName +
                                '.  Job details below:</p><p>Company : ' +
                                options.companyName +
                                '</p><p>Customer : ' +
                                options.customerName +
                                '</p><p>Job Type : ' +
                                options.jobType +
                                '</p><p>Notes : ' +
                                options.notes +
                                '</p> <p>Date : ' +
                                options.dateTime +
                                '</p> <p>If you have any questions, please reach out to the vendor who has created this job.  Thank you.</p><br/><br/> <p> <a href="https://blueclerk.com/privacy-policy" target="_blank">Privacy policy</a> </p>',
                        },
                    },
                },
                ReplyToAddresses: [options.replyTo],
            },
            (err, info) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(info);
                }
            },
        );
    });
};

export const sendAccountDowngradeEmail = function (options: any) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });

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
                        Data: 'BlueClerk Alert: Account status change',
                    },
                    Body: {
                        Html: {
                            Data: '<p>Your account has been downgraded to the free version. You may still use the software free of charge with limited functionality. All of your data will be saved.</p><p>You can upgrade to a full account at any time.</p> <p>To upgrade you may need to add a billing method</p><div><a href="https://app.blueclerk.com/login/" target="_blank"><img src="https://blueclerk.com/wp-content/uploads/2020/07/logo.png" style="width: 20%;" alt=\'BlueClerk\'></a></div>',
                        },
                    },
                },
                ReplyToAddresses: [APP_EMAIL_NOREPLY],
            },
            (err, info) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(info);
                }
            },
        );
    });
};

export const sendDeclinedOrderEmail = function (options: any) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });

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
                        Data: 'BlueClerk Alert: BlueClerk billing method needs attention',
                    },
                    Body: {
                        Html: {
                            Data: '<p>There is a problem with your billing method.</p> <p> Please login and go to Admin>billing>add new card to update your billing method</p><div><a href="https://app.blueclerk.com/login/" target="_blank"><img src="https://blueclerk.com/wp-content/uploads/2020/07/logo.png" style="width: 20%;" alt=\'BlueClerk\'></a></div>',
                        },
                    },
                },
                ReplyToAddresses: [APP_EMAIL_NOREPLY],
            },
            (err, info) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(info);
                }
            },
        );
    });
};

export const sendAccountUpgradeEmail = async (options: any) => {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });

    // Construct email body HTML
    let BODY_HTML = `<p>Congratulations! A payment  Your card has been successfully charged for the amount of $ ${options.amount}.</p>
                    <h4>Summary</h4>
                    <table style="width:80%; border:1px solid; border-collapse: collapse">
                      <tr> <th style="border:1px solid">Type</tr> <th style="border:1px solid">Total</tr> </tr>
                      <tr> <td style="border:1px solid">Tecnicians</td> <td style="border:1px solid">${options.technicians}</td> </tr>
                      <tr> <td style="border:1px solid">Office Admins</td> <td style="border:1px solid">${options.officeAdmins}</td> </tr>
                      <tr> <td style="border:1px solid">Admins</td> <td style="border:1px solid">${options.admins}</td> </tr>
                      <tr> <td style="border:1px solid">Managers</td> <td style="border:1px solid">${options.managers}</td> </tr>
                      <tr> <td style="border:1px solid">Contractors/Vendor</td> <td style="border:1px solid">${options.contractors}</td> </tr>
                    </table>`;

    // CHARGE DETAILS
    if (options.chargeDetails?.length > 0) {
        BODY_HTML += `<h4>Charge Details</h4>
                  <table style="width:80%; border:1px solid; border-collapse: collapse"> <tr> <th style="border:1px solid">Description</tr> <th style="border:1px solid">Amount</tr> </tr>`;

        for (const charge of options.chargeDetails) {
            BODY_HTML += `<tr> <td style="border:1px solid">${charge.description}</td> <td style="border:1px solid">$${charge.amount}</td> </tr>`;
        }

        BODY_HTML += '</table>';
    }

    // INVOICE URLs
    if (options.stripeHostedInvoiceUrl && options.stripeInvoicePdf) {
        BODY_HTML += `<div>
                    <p>You can see the invoice detail <a href="${options.stripeHostedInvoiceUrl}">here</a>.</p>
                    <p>You can download the invoice PDF <a href="${options.stripeInvoicePdf}">here</a></p>
                  </div>`;
    }

    // FOOTER
    BODY_HTML += `<div>
                  <a href="https://app.blueclerk.com/login/" target="_blank">
                    <img src="https://blueclerk.com/wp-content/uploads/2020/07/logo.png" style="width: 20%;" alt='BlueClerk' >
                  </a>
                </div>`;

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
                        Data: 'BlueClerk Alert: Account status change',
                    },
                    Body: {
                        Html: {
                            Data: BODY_HTML,
                        },
                    },
                },
                ReplyToAddresses: [APP_EMAIL_NOREPLY],
            },
            (err, info) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(info);
                }
            },
        );
    });
};

export const sendCustomerContactNewPassword = function (options: any) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });

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
                        Data: 'Welcome to BlueClerk',
                    },
                    Body: {
                        Html: {
                            Data: `<div style="text-align: center;">
                          <b>Dear <i>${options.name ?? options.to}</i></b> <br />
                          <b>Welcome to BlueClerk!  Please login on your mobile app using this credential: </a></b><br />
                          <p>email: ${options.to}<br /> password: ${options.password}</p>
                          <p>If you have any questions, you may reach out for help to:</p>
                          <strong>chris.norton@blueclerk.com</strong><br />
                          <strong>512-846-6035</strong><br />

                          <br />
                          <img src='https://blueclerk.com/wp-content/uploads/2020/07/logo.png' />
                          </div>`,
                        },
                    },
                },
                ReplyToAddresses: [APP_EMAIL_NOREPLY],
            },
            (err, info) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(info);
                }
            },
        );
    });
};

export const sendJobRequestEmail = async (options: any) => {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;
    const { sender, recipient, customer, contact, coordinates, locationName, address, imagesUrl } = options;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });
    const footer = "<img src='https://blueclerk.com/wp-content/uploads/2020/07/logo.png' />";
    const imageArray: string[] = [];
    if (imagesUrl?.length) {
        imagesUrl.forEach((image: any) => {
            imageArray.push(`<img src='${image.imageUrl.toString()}' />`);
        });
    }

    const emailObject: any = {
        Source: `"${sender.name}" <${APP_EMAIL_NOREPLY}>`,
        Destination: {
            CcAddresses: [],
            ToAddresses: [recipient?.email],
        },
        Message: {
            Subject: {
                Data: 'New Job Request on BlueClerk',
            },
            Body: {
                Html: {
                    Data: `<div style="text-align: center;">
                      <b>Dear <i>${recipient?.name}</i></b> <br />
                      <b>Customer ${contact?.name ?? customer?.profile?.displayName ?? ''} submits a new Job Request. Job Request information below:</a></b><br />
                       <br />
                      ${locationName ? '<p>Location Name: ' + locationName + '</p>' : ''}
                      ${address?.street ? '<p>Street: ' + address.street + '</p>' : ''}
                      ${address?.city ? '<p>City: ' + address.city + '</p>' : ''}
                      ${address?.state ? '<p>State: ' + address.state + '</p>' : ''}
                      ${address?.zipcode ? '<p>Zipcode: ' + address.zipcode + '</p>' : ''}
                      ${coordinates?.length > 0 ? '<p>Longitude: ' + coordinates[0] + ' Latitude: ' + coordinates[1] + '</p>' : ''}
                      <hr>
                      ${contact?.name ? '<p>Contact name: ' + contact?.name + '</p>' : ''}
                      ${contact?.phone ? '<p>Contact phone: ' + contact?.phone + '</p>' : ''}
                      ${contact?.email ? '<p>Contact email: ' + contact?.email + '</p>' : ''}
                      ${imageArray?.length > 0 ? [...new Set(imageArray)] : ''}
                      ${footer}
                      </div>`,
                },
            },
        },
        ReplyToAddresses: [sender.email],
    };

    return new Promise((resolve, reject) => {
        ses.sendEmail(emailObject, (err, info) => {
            if (err) {
                reject(err);
            } else {
                resolve(info);
            }
        });
    });
};

/**
 * JOB REQUEST WITH TYPE WINDOWS
 */
export const sendJobRequestWindowsEmail = async (options: any) => {
    const {
        sender,
        recipient,
        customer,
        contact,
        company,
        manufacturer,
        customerPO,
        dueDate,
        isScreenWholeHouse,
        locationName,
        address,
        coordinates,
        windows,
        note,
    } = options;

    // Init AWS instance
    const ses = await _initAwsConfig();

    // Construct the content of the multiple windows
    let windowBody = '';
    for (const window of windows) {
        const glass = <IGlass>window?.glass;
        const glassSize = <IWindowGlass>glass?.glassSize;
        const glassConfigurations = glass?.glassConfigurations;
        const frameColor = <IWindowFrameColor>glass?.frameColor;
        const screen = <IScreen>window?.screen;
        const serviceOrder = <IRequests>window?.serviceOrder;
        const windowImages = await _getImageArray(window?.images);
        const serviceImages = await _getImageArray(window?.serviceOrder?.images);

        let windowGlassConfigurations = '';
        let numberBullet = 0;
        for (const glass of glassConfigurations) {
            const glassPosition = glass.position ? `${glass.position}: ` : '';
            windowGlassConfigurations += `${(numberBullet += 1)}) ${glassPosition}${glass.glassType}, ${glass.glassTransparency}<br />`;
        }

        windowBody += `
          <div style="text-align: center;">
              <hr>
              <h3>${window.title}</h3>
              <b>Manufacturer:</b> ${window.manufacturer}<br />
              <b>Location and Floor:</b> ${window.locationFloor}<br />
              <b>Reason for order:</b> ${window.reasonForOrder}<br />

              <h4>GLASS</h4>
              <b>Quantity:</b> ${glass?.quantity ?? 'NaN'}<br />
              <b>Type:</b> ${toTitleCase(WindowTypes[glass?.windowType])}<br />
              <b>Glass size:</b> ${glassSize?.size}<br />
              <b>Glass configurations:</b><br />
              ${windowGlassConfigurations}
              <b>Portion needing service:</b> ${glass?.portionNeedingService}<br />
              <b>Divided lite:</b> ${glass?.dividedLitePattern || 'No'}<br />
              <b>Divided lite pattern:</b> ${glass?.dividedLitePattern || 'No'}<br />
              <b>Window shape viewed from outside:</b> ${glass?.windowShape}<br />
              <b>Frame color:</b> ${frameColor?.name}<br />
              <b>Additional note:</b> ${glass?.note}<br />

              <h4>SCREEN</h4>
              <b>Whole house:</b> ${isScreenWholeHouse}<br />
              <b>Individual screen:</b> ${screen?.required ?? '-'}<br />
              ${windowImages?.length > 0 ? [...new Set(windowImages)] : ''}<br />
          </div>
      `;
    }

    // Construct the main body content
    let body = `<div style="text-align: center;">
      <p>
          <b>Dear <i>${recipient?.name}</i></b> <br />
          <b>Customer ${contact?.name ?? customer?.profile?.displayName ?? ''} submits a new Windows Job Request. Windows Job Request information below:</a></b>
      </p>
      <p>
          ${locationName ? '<b>Location Name:</b> ' + locationName + '<br />' : ''}
          ${address?.street ? '<b>Street:</b> ' + address.street + '<br />' : ''}
          ${address?.city ? '<b>City:</b> ' + address.city + '<br />' : ''}
          ${address?.state ? '<b>State:</b> ' + address.state + '<br />' : ''}
          ${address?.zipcode ? '<b>Zipcode:</b> ' + address.zipcode + '<br />' : ''}
          ${coordinates?.length > 0 ? '<b>Latitude:</b> ' + coordinates[1] + '<br /><b>Longitude:</b> ' + coordinates[0] + '<br />' : ''}
      </p>
      <p>
          ${contact?.name ? '<b>Contact name:</b> ' + contact.name + '<br />' : ''}
          ${contact?.email ? '<b>Contact email:</b> ' + contact.email + '<br />' : ''}
          ${contact?.phone ? '<b>Contact phone:</b> ' + contact.phone + '<br />' : ''}
      </p>
      <p>
          <h2>WINDOWS</h2>
          <b>Preferred Vendor:</b> ${company?.info?.companyName}<br />
          <b>Warranty or PO Number:</b> ${customerPO}<br />
          <b>Due Date:</b> ${dueDate ? moment(dueDate).format('MM/DD/YYYY') : '-'}<br />
          <b>Note:</b> ${note}<br />
      </p>
  </div>`;

    // Attach the multiple windows body content
    body += windowBody;
    // Attach the BCler logo footer
    body += await _getBcFooter();

    // Construct the email object with sender and recipient data
    const emailObj = await _constructEmailObj({
        senderName: sender.name,
        senderEmail: sender.email,
        recipients: [recipient.email],
        subject: 'New Windows Job Request on BlueClerk',
        body,
    });

    return new Promise((resolve, reject) => {
        // Send the email
        ses.sendEmail(emailObj, (err, info) => {
            if (err) {
                reject(err);
            }

            resolve(info);
        });
    });
};

export const sendJobRequestWarrantyEmail = async (options: any) => {
    const {
        sender,
        recipient,
        customer,
        contact,
        company,
        manufacturer,
        customerPO,
        dueDate,
        isScreenWholeHouse,
        locationName,
        address,
        coordinates,
        windows,
        note,
    } = options;

    // Init AWS instance
    const ses = await _initAwsConfig();

    // Construct the content of the multiple windows
    let windowBody = '';
    for (const window of windows) {
        const glass = <IGlass>window?.glass;
        const glassSize = <IWindowGlass>glass?.glassSize;
        const glassConfigurations = glass?.glassConfigurations;
        const frameColor = <IWindowFrameColor>glass?.frameColor;
        const screen = <IScreen>window?.screen;
        const serviceOrder = <IRequests>window?.serviceOrder;
        const windowImages = await _getImageArray(window?.images);
        const serviceImages = await _getImageArray(window?.serviceOrder?.images);

        let windowGlassConfigurations = '';
        let numberBullet = 0;
        for (const glass of glassConfigurations) {
            const glassPosition = glass.position ? `${glass.position}: ` : '';
            windowGlassConfigurations += `${(numberBullet += 1)}) ${glassPosition}${glass.glassType}, ${glass.glassTransparency}<br />`;
        }

        windowBody += `
          <div style="text-align: center;">
              <hr>
              <h3>Warranty</h3>
              <b>Manufacturer:</b> ${window.manufacturer}<br />
              <b>Location and Floor:</b> ${window.locationFloor}<br />
              <b>Reason for order:</b> ${window.reasonForOrder}<br />

              <h4>GLASS</h4>
              <b>Quantity:</b> ${glass?.quantity ?? 'NaN'}<br />
              <b>Type:</b> ${toTitleCase(WindowTypes[glass?.windowType])}<br />
              <b>Glass size:</b> ${glassSize?.size}<br />
              <b>Glass configurations:</b><br />
              ${windowGlassConfigurations}
              <b>Portion needing service:</b> ${glass?.portionNeedingService}<br />
              <b>Divided lite:</b> ${glass?.dividedLitePattern || 'No'}<br />
              <b>Divided lite pattern:</b> ${glass?.dividedLitePattern || 'No'}<br />
              <b>Window shape viewed from outside:</b> ${glass?.windowShape}<br />
              <b>Frame color:</b> ${frameColor?.name}<br />
              <b>Additional note:</b> ${glass?.note}<br />

              <h4>SCREEN</h4>
              <b>Whole house:</b> ${isScreenWholeHouse}<br />
              <b>Individual screen:</b> ${screen?.required ?? '-'}<br />
              ${windowImages?.length > 0 ? [...new Set(windowImages)] : ''}<br />
          </div>
      `;
    }

    // Construct the main body content
    let body = `<div style="text-align: justify;">
      <p>
          <b>Dear <i>${recipient?.name}</i></b> <br />
          <b>Customer ${contact?.name ?? customer?.profile?.displayName ?? ''} has submitted a warranty request</b>
      </p>
      
      <p>
          ${locationName ? '<b>Subdivision:</b>' + locationName + '<br />' : ''}
          ${address?.street ? '<b>Address:</b> <u>' + address.street + ' ' : ''}
          ${address?.city ? address.city + ' ' : ''}
          ${address?.state ? address.state + ' ' : ''}
          ${address?.zipcode ? address.zipcode + ' ' : ''}
          ${coordinates?.length > 0 ? '</u><br /><b>Latitude:</b> ' + coordinates[1] + '<br /><b>Longitude:</b> ' + coordinates[0] + '<br />' : ''}
          ${contact?.name ? '<b>Name:</b> ' + contact.name + '<br />' : ''}
          ${contact?.email ? '<b>Email:</b> ' + contact.email + '<br />' : ''}
          ${contact?.phone ? '<b>Phone:</b> ' + contact.phone + '<br />' : ''}
      </p>
  </div>`;

    // Attach the multiple windows body content
    // body += windowBody;
    // Attach the BCler logo footer
    body += await _getBcFooter();

    // Construct the email object with sender and recipient data
    const emailObj = await _constructEmailObj({
        senderName: sender.name,
        senderEmail: sender.email,
        recipients: [recipient.email],
        subject: 'New Warranty Request on BlueClerk',
        body,
    });

    return new Promise((resolve, reject) => {
        // Send the email
        ses.sendEmail(emailObj, (err, info) => {
            if (err) {
                reject(err);
            }

            resolve(info);
        });
    });
};

// Generic partial method to get the BClerk logo footer
const _getBcFooter = async (): Promise<string> => {
    return "<div style=\"text-align: justify;\"><br /><br />Sent By, <br /><a href='https://blueclerk.com'><img src='https://blueclerk.com/wp-content/uploads/2020/07/logo.png' ></a></div>";
};

// Generic partial method to construct the whole AWS email format
const _constructEmailObj = async ({
    senderName,
    senderEmail,
    recipients,
    subject,
    body,
}: {
    senderName: string;
    senderEmail: string;
    recipients: string[];
    subject: string;
    body: string;
}) => {
    const { APP_EMAIL_NOREPLY } = process.env;

    const emailObj: any = {
        Source: `"${senderName}" <${APP_EMAIL_NOREPLY}>`,
        Destination: {
            ToAddresses: [...recipients],
            CcAddresses: [],
        },
        Message: {
            Subject: {
                Data: subject,
            },
            Body: {
                Html: {
                    Data: body,
                },
            },
        },
        ReplyToAddresses: [senderEmail],
    };

    return emailObj;
};

/**
 * To upload file to aws
 * fileType for pdf use 'pdf'
 */
export const uploadFileInS3 = async (filePath: string, fileType: string) => {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, AWS_BUCKET_NAME, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const s3 = new AWS.S3();

    return new Promise((resolve, reject) => {
        s3.upload(
            {
                Bucket: AWS_BUCKET_NAME,
                Body: fs.createReadStream(filePath),
                ACL: 'public-read',
                ContentType: `application/${fileType}`,
                Key: uuidv4(),
            },
            (err: any, data: any) => {
                if (err) {
                    reject(err);
                }

                resolve(data.Location);
            },
        );
    });
};

/**
 * Sends SMS to a given phone number
 * @param phoneNumber
 * @param message
 */
export const sendSMS = async (phoneNumber: string, message: string) => {
    // If has opted out, message is not sent
    if (await hasOptedOut(phoneNumber)) return;

    // Set the parameters
    const params: PublishCommandInput = {
        PhoneNumber: phoneNumber,
        Message: message,
    };

    const snsClient = new AWS.SNS();
    return new Promise((resolve, reject) => {
        snsClient.publish(params, function (err, data) {
            if (err) {
                console.log('== sendSMSError ' + err, err.stack);
                reject(err);
            }
            resolve(data);
        });
    });
};

export const sendCustomerNewPassword = function (options: any) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });

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
                        Data: 'Welcome to BlueClerk',
                    },
                    Body: {
                        Html: {
                            Data: `<div style="text-align: center;">
                          <b>Dear <i>${options.customer}</i></b> <br />
                          <b>Welcome to BlueClerk!  Please login on your mobile app using this credential: </a></b><br />
                          <p>email: ${options.to}<br /> password: ${options.password}</p>
                          <p>If you have any questions, you may reach out for help to:</p>
                          <strong>chris.norton@blueclerk.com</strong><br />
                          <strong>512-846-6035</strong><br />

                          <br />
                          <img src='https://blueclerk.com/wp-content/uploads/2020/07/logo.png' />
                          </div>`,
                        },
                    },
                },
                ReplyToAddresses: [APP_EMAIL_NOREPLY],
            },
            (err, info) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(info);
                }
            },
        );
    });
};

/**
 * Checks if a phone number has opted out of receiving SMS messages from AWS SNS
 * @param phoneNumber phone number in the E.164 phone number structure
 * @returns boolean
 */
export const hasOptedOut = async (phoneNumber: string): Promise<boolean> => {
    const params = { phoneNumber: phoneNumber };
    const snsClient = new AWS.SNS();

    return new Promise((resolve, reject) => {
        snsClient.checkIfPhoneNumberIsOptedOut(params, function (err, data) {
            if (err) {
                console.log('== checkHasOptedOutError ' + err, err.stack);
                reject(err);
            }
            resolve(data?.isOptedOut);
        });
    });
};

// Generic partial method to initialize AWS instance
const _initAwsConfig = async (): Promise<AWS.SES> => {
    const { AWS_REGION, AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY } = process.env;

    AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });

    const ses = new AWS.SES({ apiVersion: '2012-10-17' });

    return ses;
};

// Generic partial method to get images array
const _getImageArray = async (images: any[]): Promise<string[]> => {
    if (!images?.length) {
        return [];
    }

    const imageArray: string[] = [];
    for (const image of images) {
        imageArray.push(`<img src='${image.imageUrl?.toString()}' style='height: 150px;' />`);
    }

    return imageArray;
};
