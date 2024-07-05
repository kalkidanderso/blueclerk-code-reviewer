import mongoose, { Document, Schema } from 'mongoose';
import { ICompany } from './Company';
import { ICustomer } from '../models/Customer';
import { IJob } from './Job';
import { IJobLocation } from './JobLocation';
import { IJobSite } from './JobSite';
import { IJobTypes } from './JobType';
import { IUser } from './User';
import { IWindowGlass } from '../models/WindowGlass';
import { IWindowFrameColor } from './WindowFrameColor';
/**
 * - add counter in customer for requestId
 * - new collection for jobRequest
 * */

export interface IJobRequest extends Document {
    requestId: string;
    type: JobRequestTypes;
    status: number;
    dueDate: Date;
    hoPreferredDate: Date;
    hoPreferredDay: number[];
    windows?: IWindows[];
    isWindowServiceNeeded?: boolean;
    jobLocation: Schema.Types.ObjectId | IJobLocation;
    jobSite: Schema.Types.ObjectId | IJobSite;
    customer: Schema.Types.ObjectId | ICustomer;
    customerContact: Schema.Types.ObjectId | any;
    company: Schema.Types.ObjectId | ICompany;
    customerPO?: string;
    note?: string;
    rejectionNote?: string;
    requests: IRequests[];
    jobCreated: boolean;
    job: Schema.Types.ObjectId | IJob;
    track: any[];
    createdBy: Schema.Types.ObjectId;
    createdAt: Date;
    updatedBy: Schema.Types.ObjectId;
    updatedAt: Date;
    workType: string | null;
    companyLocation: string | null;
}

export interface IRequests {
    _id?: string;
    note: string;
    category: string;
    images?: {
        imageUrl?: string;
        uploadedBy?: Schema.Types.ObjectId | IUser;
        createdAt?: Date;
        updatedAt?: Date;
    }[];
}

export interface IWindows {
    _id: string;
    title?: string;
    manufacturer?: WindowManufactures;
    // manufacturer?: Schema.Types.ObjectId | ISupplier
    locationFloor?: string;
    reasonForOrder?: ReasonForOrder;
    images?: {
        imageUrl?: string;
        uploadedBy?: Schema.Types.ObjectId | IUser;
        createdAt?: Date;
        updatedAt?: Date;
    }[];
    glass?: IGlass;
    screen?: IScreen;
}

export interface IGlass {
    quantity: number;
    windowType?: WindowTypes;
    glassSize?: Schema.Types.ObjectId | IWindowGlass;
    glassConfigurations?: {
        position?: PortionNeedingServices;
        glassType?: GlassTypes;
        glassTransparency?: GlassTransparencies;
    }[];
    dimensions?: {
        length?: {
            ft?: number;
            in?: number;
        };
        width?: {
            ft?: number;
            in?: number;
        };
    };
    portionNeedingService?: PortionNeedingServices;
    dividedLite?: boolean;
    dividedLitePattern?: string;
    windowShape?: WindowShapes;
    frameColor?: Schema.Types.ObjectId | IWindowFrameColor;
    note?: string;
}

export interface IScreen {
    isScreenWholeHouse?: boolean;
    required?: boolean;
}

export enum JobRequestTypes {
    REPAIR = 1,
    WINDOWS = 2,
    WARRANTY = 3,
}

export enum WindowManufactures {
    BFS = 'BFS',
    TROPHY = 'Trophy',
}

export enum WindowTypes {
    SINGLE_HUNG = 1,
    PICTURE_WINDOW = 2,
    HORIZONTAL_SLIDER = 3,
}

export enum GlassTypes {
    TEMPERED = 'Tempered',
    ANNEALED = 'Annealed',
}

export enum GlassTransparencies {
    CLEAR = 'Clear',
    OBSCURE = 'Obscure',
    RAIN = 'Rain',
    GRAY = 'Gray',
}

export enum PortionNeedingServices {
    TOP = 'Top',
    BOTTOM = 'Bottom (Sash)',
    TOP_BOTTOM = 'Top & Bottom',
}

export enum WindowShapes {
    BULLSEYE = 'Bullseye',
    ROUNDHEAD = 'Roundhead',
    EYEBROW_LEFT_HAND = '1/4 Eyebrow Left Hand',
    EYEBROW_RIGHT_HAND = '1/4 Eyebrow Right Hand',
    EYEBROW = 'Eyebrow',
    WELDED_ROUNDHEAD = 'Welded Roundhead',
    SQUARE = 'Square',
    SHAPE_NOT_IN_LIST = 'Shape not in list',
}

export enum ReasonForOrder {
    BROKEN_GLASS = 'Broken glass',
    SEAL_FAILURE = 'Seal failure',
    SCRATCHES_PANE = 'Scratches on inside of pane',
    BROKEN_DELIVERY = 'Broken on delivery',
}

export enum WindowServices {
    FRAME = 'Frame',
    REGLAZE = 'Reglaze (Glass Only)',
    FRAMEREGLAZE = 'Frame and Reglaze',
}

const ImageSchema = new Schema({
    imageUrl: String,
    uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    createdAt: Date,
    updatedAt: Date,
});

const WindowsSchema = new Schema({
    title: String,
    manufacturer: {
        type: String,
        enum: Object.values(WindowManufactures),
    },
    // manufacturer: {
    //     type: Schema.Types.ObjectId,
    //     ref: 'Supplier',
    // },
    locationFloor: String,
    reasonForOrder: {
        type: String,
        enum: Object.values(ReasonForOrder),
    },
    images: [ImageSchema],
    glass: {
        quantity: Number,
        windowType: {
            type: Number,
            enum: Object.values(WindowTypes),
        },
        glassSize: {
            type: Schema.Types.ObjectId,
            ref: 'WindowGlass',
        },
        glassConfigurations: [
            {
                position: {
                    type: String,
                    enum: Object.values(PortionNeedingServices),
                },
                glassType: {
                    type: String,
                    enum: Object.values(GlassTypes),
                },
                glassTransparency: {
                    type: String,
                    enum: Object.values(GlassTransparencies),
                },
            },
        ],
        portionNeedingService: {
            type: String,
            enum: Object.values(PortionNeedingServices),
        },
        dividedLite: Boolean,
        dividedLitePattern: String,
        windowShape: {
            type: String,
            enum: Object.values(WindowShapes),
        },
        frameColor: {
            type: Schema.Types.ObjectId,
            ref: 'WindowFrameColor',
        },
        note: String,
    },
    screen: {
        isScreenWholeHouse: Boolean,
        required: Boolean,
    },
});

const JobRequestSchema = new Schema(
    {
        requestId: String,
        status: {
            type: Number,
            default: 0,
        },
        dueDate: {
            type: Date,
            required: false,
        },
        type: {
            type: Number,
        },
        hoPreferredDate: {
            type: Date,
            required: false,
        },
        hoPreferredDay: [
            {
                type: Number,
            },
        ],
        jobLocation: {
            type: Schema.Types.ObjectId,
            ref: 'JobLocation',
        },
        jobSite: {
            type: Schema.Types.ObjectId,
            ref: 'JobSite',
        },
        windows: [WindowsSchema],
        requests: [
            {
                note: String,
                category: String,
                images: [
                    {
                        imageUrl: String,
                        uploadedBy: {
                            type: Schema.Types.ObjectId,
                            ref: 'User',
                        },
                        createdAt: Date,
                    },
                ],
            },
        ],
        customer: {
            type: Schema.Types.ObjectId,
            ref: 'Customer',
            required: false,
        },
        customerContact: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        },
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
        },
        jobCreated: {
            type: Boolean,
            default: false,
        },
        job: {
            type: Schema.Types.ObjectId,
            ref: 'Job',
        },
        track: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: 'User',
                },
                action: String,
                date: Date,
            },
        ],
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        },
        editedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        editedAt: {
            type: Date,
        },
        workType: {
            type: Schema.Types.ObjectId,
            ref: 'WorkType',
        },
        companyLocation: {
            type: Schema.Types.ObjectId,
            ref: 'CompanyLocation',
        },
        ticketCreated: {
            type: Boolean,
            default: false,
        },
        ticket: {
            type: Schema.Types.ObjectId,
            ref: 'Ticket',
        },
    },
    { timestamps: { createdAt: true, updatedAt: true } },
);

//Indexes
JobRequestSchema.index({ company: 1 });
JobRequestSchema.index({ jobLocation: 1 });
JobRequestSchema.index({ jobSite: 1 });
JobRequestSchema.index({ customer: 1 });
JobRequestSchema.index({ customerContact: 1 });
JobRequestSchema.index({ company: 1 });
JobRequestSchema.index({ job: 1 });
JobRequestSchema.index({ createdBy: 1 });
JobRequestSchema.index({ editedBy: 1 });
JobRequestSchema.index({ company: 1, status: 1 });

export const JobRequest = mongoose.model<IJobRequest>('JobRequest', JobRequestSchema);
