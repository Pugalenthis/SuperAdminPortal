import mongoose, { Document, Schema, Types } from 'mongoose';

// Template interface
export interface ITemplate extends Document {
  name: string;
  description?: string;
  template: any; // JSON structure
  type: string;
  isDefault: boolean;
  createdAt: Date;
  
  // For custom templates
  isCustom: boolean;
  adminId?: Types.ObjectId;
  baseTemplateId?: Types.ObjectId;
  customization?: any; // JSON structure
  updatedAt?: Date;
}

// Template schema
const templateSchema = new Schema<ITemplate>({
  name: { type: String, required: true },
  description: String,
  template: { type: Schema.Types.Mixed, required: true },
  type: { type: String, default: 'standard' },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  
  // For custom templates
  isCustom: { type: Boolean, default: false },
  adminId: { type: Schema.Types.ObjectId, ref: 'User' },
  baseTemplateId: { type: Schema.Types.ObjectId, ref: 'Template' },
  customization: { type: Schema.Types.Mixed, default: {} },
  updatedAt: Date
});

// Create and export the Template model
const Template = mongoose.model<ITemplate>('Template', templateSchema);
export default Template;