"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const multer_1 = __importDefault(require("multer"));
const multer_s3_1 = __importDefault(require("multer-s3"));
const uuid_1 = __importDefault(require("uuid"));
exports.sendEmail = function (options) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;
    aws_sdk_1.default.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });
    const ses = new aws_sdk_1.default.SES({ apiVersion: '2012-10-17' });
    return new Promise((resolve, reject) => {
        ses.sendEmail({
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
        }, (err, info) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(info);
            }
        });
    });
};
exports.sendEmployeeEmail = function (options) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY, AWS_REGION } = process.env;
    aws_sdk_1.default.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });
    const ses = new aws_sdk_1.default.SES({ apiVersion: '2012-10-17' });
    return new Promise((resolve, reject) => {
        ses.sendEmail({
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
                        Data: "Welcome to Blueclerk.com! Your password for " + options.to + " is " + options.password,
                    },
                },
            },
            ReplyToAddresses: [APP_EMAIL_NOREPLY],
        }, (err, info) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(info);
            }
        });
    });
};
exports.uploadImageInS3 = function (req, res, next) {
    const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, AWS_BUCKET_NAME, AWS_REGION } = process.env;
    aws_sdk_1.default.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_SES_ACCESSKEYID,
        secretAccessKey: AWS_SES_SECRETACCESSKEY,
    });
    const fileFilter = (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type, only JPEG and PNG is allowed!'), false);
        }
    };
    const s3 = new aws_sdk_1.default.S3();
    const upload = multer_1.default({
        fileFilter,
        storage: multer_s3_1.default({
            s3: s3,
            bucket: AWS_BUCKET_NAME,
            acl: 'public-read',
            contentType: multer_s3_1.default.AUTO_CONTENT_TYPE,
            key: function (req, file, cb) {
                cb(null, uuid_1.default());
            }
        })
    });
    const uploadSingle = upload.single('image');
    uploadSingle(req, res, (err) => {
        if (err)
            return next(err);
        next(null, req.file.location);
    });
};
//# sourceMappingURL=aws.js.map