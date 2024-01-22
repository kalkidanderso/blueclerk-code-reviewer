import mongoose, { Document, Schema } from 'mongoose';

export interface IScan extends Document {

    job: Schema.Types.ObjectId
    equipment: Schema.Types.ObjectId
    user: Schema.Types.ObjectId
    comment: string
    timeOfScan: Date    
}

const ScanSchema = new Schema({

    job:{
        type: Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    }, 
    equipment:{
        type: Schema.Types.ObjectId,
        ref: 'CustomerEquipment',
        required: false
    },
    tag:{
        type: Schema.Types.ObjectId,
        ref: 'Tag',
        required: false
    },
    user:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    comment:{ 
        type: String,
        default: null
    },
    timeOfScan: {
        type: Date
    }

});

//Indexes
ScanSchema.index({ job: 1 });
ScanSchema.index({ equipment: 1 });
ScanSchema.index({ tag: 1 });
ScanSchema.index({ user: 1 });

export const Scan = mongoose.model<IScan>('Scan', ScanSchema);