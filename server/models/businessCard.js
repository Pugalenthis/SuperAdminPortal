import mongoose from 'mongoose';

const businessCardSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CardTemplate',
    required: true
  },
  customTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomTemplate'
  },
  companyCardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanyCard'
  },
  customization: {
    type: Object
  },
  uniqueUrl: {
    type: String,
    required: true,
    unique: true
  },
  qrCodeUrl: {
    type: String
  },
  status: {
    type: String,
    default: 'active',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    required: true
  }
});

const BusinessCard = mongoose.model('BusinessCard', businessCardSchema);

export default BusinessCard;