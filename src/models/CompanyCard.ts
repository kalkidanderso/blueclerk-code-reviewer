import mongoose, { Document, Schema } from 'mongoose';

export interface ICompanyCard extends Document {

    ending: string
    expirationMonth: string,
    expirationYear: string,
    cardType: string,
    name: string,
    token: string
    cardStripeId: string
    date: Date
    company: Schema.Types.ObjectId
}

const CompanyCardSchema = new Schema({

    ending: String,
    expirationMonth: String,
    expirationYear: String,
    cardType: String,
    name: String,
    token: String,
    cardStripeId: String,
    address: String,
    city: String,
    state: String,
    zipcode: String,
    nickName: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    }

});

//Indexes
CompanyCardSchema.index({ company: 1 });

export const CompanyCard = mongoose.model<ICompanyCard>('CompanyCard', CompanyCardSchema);
