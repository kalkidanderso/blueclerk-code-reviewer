import mongoose, { Document, Schema } from "mongoose";
import { ICompany } from "../models/Company";

export enum ReportTypes {
    INCOME = 1
}

export enum ReportData {
    STANDARD = 1,
    CUSTOM = 2
}

export enum ReportSources {
    INVOICE = 1,
    JOB = 2
}

export enum PeriodOptions {
    RECENT = 'recent',
    LAST_WEEK = 'lastWeek',
    LAST_WEEK_TO_DATE = 'lastWeekToDate',
    LAST_MONTH = 'lastMonth',
    LAST_MONTH_TO_DATE = 'lastMonthToDate',
    THIS_QUARTER = 'thisQuarter',
    THIS_QUARTER_TO_DATE = 'thisQuarterToDate',
    LAST_YEAR = 'lastYear',
    LAST_YEAR_TO_DATE = 'lastYearToDate',
    THIS_YEAR = 'thisYear',
    THIS_YEAR_TO_DATE = 'thisYearToDate'
}

export interface IMemorizedReport extends Document {

    company: Schema.Types.ObjectId | ICompany
    reportType: ReportTypes
    name: string
    periodOption: PeriodOptions
    startDate?: string
    endDate?: string

}

const MemorizedReportSchema = new Schema(
    {
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true
        },
        reportType: {
            type: Number,
            enum: Object.values(ReportTypes),
            required: true
        },
        name: String,
        periodOption: {
            type: String,
            enum: Object.values(PeriodOptions),
        },
        startDate: String,
        endDate: String
    },
    { timestamps: true }
)

export const MemorizedReport = mongoose.model<IMemorizedReport>('MemorizedReport', MemorizedReportSchema);

// INCOME REPORT DISCRIMINATOR

export interface IIncomeReport extends IMemorizedReport {

    reportData: ReportData
    reportSource: ReportSources
    customerIds?: string[]

}

const IncomeReportSchema = new Schema({

    reportData: {
        type: Number,
        enum: Object.values(ReportData),
        default: ReportData.STANDARD
    },
    reportSource: {
        type: Number,
        enum: Object.values(ReportSources),
        default: ReportSources.INVOICE
    },
    customerIds: [String],

})

export const IncomeReport = MemorizedReport.discriminator<IIncomeReport>('IncomeReport', IncomeReportSchema);


export type IAllReport = IMemorizedReport | IIncomeReport;
