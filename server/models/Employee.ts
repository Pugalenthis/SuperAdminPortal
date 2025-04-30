import mongoose, { Document, Schema, Types } from 'mongoose';

// Employee interface
export interface IEmployee extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title: string;
  department?: string;
  adminId: Types.ObjectId;
  status: string;
  profileImage?: string;
  createdAt: Date;
}

// Employee schema
const employeeSchema = new Schema<IEmployee>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  title: { type: String, required: true },
  department: String,
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, default: 'active' },
  profileImage: String,
  createdAt: { type: Date, default: Date.now }
});

// Create and export the Employee model
const Employee = mongoose.model<IEmployee>('Employee', employeeSchema);
export default Employee;