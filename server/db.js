import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    // We'll use a local MongoDB for development, but you can replace this with
    // a MongoDB Atlas or other MongoDB connection string in production
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/business-cards';
    
    await mongoose.connect(MONGO_URI, {});
    
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;