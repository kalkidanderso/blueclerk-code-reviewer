"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const aws_sdk_1 = __importDefault(require("aws-sdk"));
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
//# sourceMappingURL=aws.js.map