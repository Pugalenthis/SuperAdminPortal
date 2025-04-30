import mongoose from 'mongoose';

const companyCardSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  imagePath: {
    type: String,
    required: true
  },
  width: {
    type: Number,
    required: true
  },
  height: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    required: true
  },
  logoPath: {
    type: String
  },
  primaryColor: {
    type: String
  },
  secondaryColor: {
    type: String
  },
  websiteUrl: {
    type: String
  },
  enquiriesEmail: {
    type: String
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

const CompanyCard = mongoose.model('CompanyCard', companyCardSchema);

export default CompanyCard;