import mongoose, { Document, Schema, Types } from 'mongoose';

// BusinessCard interface
export interface IBusinessCard extends Document {
  employeeId: Types.ObjectId;
  templateId: Types.ObjectId;
  customTemplateId?: Types.ObjectId;
  companyCardId?: Types.ObjectId;
  customization?: any; // JSON structure
  uniqueUrl: string;
  qrCodeUrl?: string;
  status: string;
  createdAt: Date;
  updatedAt?: Date;
}

// BusinessCard schema
const businessCardSchema = new Schema<IBusinessCard>({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  templateId: { type: Schema.Types.ObjectId, ref: 'Template', required: true },
  customTemplateId: { type: Schema.Types.ObjectId, ref: 'Template' },
  companyCardId: { type: Schema.Types.ObjectId, ref: 'CompanyCard' },
  customization: Schema.Types.Mixed,
  uniqueUrl: { type: String, required: true, unique: true },
  qrCodeUrl: String,
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

// Create and export the BusinessCard model
const BusinessCard = mongoose.model<IBusinessCard>('BusinessCard', businessCardSchema);
export default BusinessCard;