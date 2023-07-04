import mongoose, { Document, Schema } from 'mongoose';

export interface IBouncedEmail extends Document {
  email: string
}

const BouncedEmailSchema = new Schema(
  {
      email: String,
  },
  { timestamps: true }
)


//Indexes
BouncedEmailSchema.index({ email: 1 });

export const BouncedEmail = mongoose.model<IBouncedEmail>('BouncedEmail', BouncedEmailSchema);
