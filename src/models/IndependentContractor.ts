import mongoose, { Schema } from 'mongoose';
import { User, IUser } from './User';

export interface IIndependentContractor extends IUser {

    company: Schema.Types.ObjectId
}

const IndependentContractorSchema = new Schema({

    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    }

});

export const IndependentContractor = User.discriminator<IIndependentContractor>('IndependentContractor', IndependentContractorSchema);
