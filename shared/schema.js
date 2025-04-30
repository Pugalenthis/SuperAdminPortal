import { z } from 'zod';

// Login schema for validation
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Employee schema for validation
export const employeeFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  title: z.string().min(1, "Job title is required"),
  department: z.string().optional(),
  profileImage: z.string().optional(),
});

// Company Card upload schema for validation
export const companyCardFormSchema = z.object({
  imagePath: z.string().min(1, "Company card image is required"),
  adminId: z.string(), // Changed from number to string for MongoDB ObjectId
  width: z.number().default(1066),
  height: z.number().default(445),
  isActive: z.boolean().default(true),
  logoPath: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  websiteUrl: z.string().url("Please enter a valid URL").optional(),
  enquiriesEmail: z.string().email("Please enter a valid email").optional(),
});