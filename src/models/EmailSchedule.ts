import mongoose, { Document, Schema } from 'mongoose';
import {IUser} from './User';
import {IJob} from './Job';

export interface IEmailSchedule extends Document {

    user: Schema.Types.ObjectId;
    type: number;
    customer: Schema.Types.ObjectId;
    jobs: [Schema.Types.ObjectId] | any,
    pulled: boolean;
}

// This will be used as a queue for email schedules
const EmailScheduleSchema = new Schema({

    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: Number,
        default: 0
        // 0 => employee/company admin  | 1 => contractor | 2 => customer
    },
    jobs: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Job'
        }
    ],
    pulled: {
        type: Boolean,
        default: false
    }
});

//Indexes
EmailScheduleSchema.index({ user: 1 });
EmailScheduleSchema.index({ jobs: 1 });
EmailScheduleSchema.index({ pulled: 1 });

export const EmailSchedule = mongoose.model<IEmailSchedule>('EmailSchedule', EmailScheduleSchema);
