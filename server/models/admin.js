import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  orgName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
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
  }
});

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;