import mongoose, { Document, Schema } from 'mongoose';

export interface ISession extends Document {

    _id: string
    session: string
    expires: Date

}

const SessionSchema = new Schema({

    _id: String,
    session: String,
    expires: Date,

});

//Indexes
SessionSchema.index({ session: 1 });

export const Session = mongoose.model<ISession>('Session', SessionSchema);
