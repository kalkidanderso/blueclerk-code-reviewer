import { timestamp } from "aws-sdk/clients/cloudfront";

// here is the interface for default email
export interface IEmailDefault {
    alternativeId: string;
    subject: string;
    message?: string;
    companyId: number;
    updatedBy: number;
    emailType: string;
    createdAt: timestamp;
    updatedAt: timestamp;
}