import mongoose, { Document, Schema } from 'mongoose'

export interface ICompanyCard extends Document {

    ending: String
    expiryMonth: String,
    expiryYear: String,
    cardType: String,
    name: String,
    token: String
    cardStripeId: String
    date: Date
    company: Schema.Types.ObjectId
}

const CompanyCardSchema = new Schema({

    ending: String,
    expiryMonth: String,
    expiryYear: String,
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

})

export const CompanyCard = mongoose.model<ICompanyCard>('CompanyCard', CompanyCardSchema)
