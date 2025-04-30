import mongoose from 'mongoose';

const customTemplateSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  baseTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CardTemplate',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  customization: {
    type: Object,
    required: true,
    default: {}
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

const CustomTemplate = mongoose.model('CustomTemplate', customTemplateSchema);

export default CustomTemplate;