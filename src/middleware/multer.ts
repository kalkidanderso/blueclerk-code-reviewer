import dotenv from 'dotenv';
import AWS from 'aws-sdk';
import multer from 'multer';
import multerS3 from 'multer-s3';
import uuid from 'uuid';

// Initialize dotenv to be able to use environment variables here
dotenv.config();

// Initialize AWS S3 for multer storage usage
AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_SES_ACCESSKEYID,
    secretAccessKey: process.env.AWS_SES_SECRETACCESSKEY,
});
const s3 = new AWS.S3();

/**
 * Upload invoice to local folder,
 * to send the invoice as Job Report/Invoice email attachment
 */
export const uploadInvoices = multer({ dest: 'tmp/invoices' });

/**
 * To handle form-data form,
 * and upload image to AWS S3
 */
export const uploadImageInS3 = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
            cb(null, uuid());
        }
    })
});