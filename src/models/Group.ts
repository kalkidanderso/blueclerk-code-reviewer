import mongoose, { Document, Schema } from 'mongoose';

export interface IGroup extends Document {

    title: string
    company: Schema.Types.ObjectId
    manager: Schema.Types.ObjectId
    members: [Schema.Types.ObjectId]
    
}

const GroupSchema = new Schema({
    
    title: String,
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    manager: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
    },
    members: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],

});

//Indexes
GroupSchema.index({ company: 1 });
GroupSchema.index({ manager: 1 });
GroupSchema.index({ members: 1 });

export const Group = mongoose.model<IGroup>('Group', GroupSchema);