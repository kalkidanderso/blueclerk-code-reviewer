import mongoose, { Document, Schema } from 'mongoose'

export interface ICompanyCard extends Document {

    ending: String
    token: String
    cardStripeId: String
    date: Date
    company: Schema.Types.ObjectId
}

const CompanyCardSchema = new Schema({

    ending: String,
    token: String,
    cardStripeId: String,
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