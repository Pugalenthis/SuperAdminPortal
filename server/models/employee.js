import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String
  },
  title: {
    type: String,
    required: true
  },
  department: {
    type: String
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  status: {
    type: String,
    default: 'active',
    required: true
  },
  profileImage: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  }
});

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;