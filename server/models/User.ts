import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

// User interface
export interface IUser extends Document {
  email: string;
  password: string;
  role: 'superadmin' | 'admin';
  orgName?: string;
  status?: string;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// User schema
const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['superadmin', 'admin'], required: true },
  orgName: { type: String, required: function(this: IUser) { return this.role === 'admin'; } },
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Create and export the User model
const User = mongoose.model<IUser>('User', userSchema);
export default User;