import mongoose from 'mongoose';

const cardTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  template: {
    type: Object,
    required: true
  },
  type: {
    type: String,
    default: 'standard'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  }
});

const CardTemplate = mongoose.model('CardTemplate', cardTemplateSchema);

export default CardTemplate;