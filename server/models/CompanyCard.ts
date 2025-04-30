import mongoose, { Document, Schema, Types } from 'mongoose';

// CompanyCard interface
export interface ICompanyCard extends Document {
  adminId: Types.ObjectId;
  imagePath: string;
  width: number;
  height: number;
  isActive: boolean;
  logoPath?: string;
  primaryColor?: string;
  secondaryColor?: string;
  websiteUrl?: string;
  enquiriesEmail?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// CompanyCard schema
const companyCardSchema = new Schema<ICompanyCard>({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  imagePath: { type: String, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  logoPath: String,
  primaryColor: String,
  secondaryColor: String,
  websiteUrl: String,
  enquiriesEmail: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

// Create and export the CompanyCard model
const CompanyCard = mongoose.model<ICompanyCard>('CompanyCard', companyCardSchema);
export default CompanyCard;