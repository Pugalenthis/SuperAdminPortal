import { 
  User, Employee, Template, CompanyCard, BusinessCard,
  IUser, IEmployee, ITemplate, ICompanyCard, IBusinessCard
} from './models';
import session from 'express-session';
import ConnectMongo from 'connect-mongo';
import mongoose, { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

// Import the MongoDB connection
import './mongodb';

// MongoDB session store
const MongoStore = ConnectMongo;

export interface IStorage {
  // Admin operations
  getAdmin(id: string): Promise<IUser | null>;
  getAdminByEmail(email: string): Promise<IUser | null>;
  getAllAdmins(): Promise<IUser[]>;
  createAdmin(admin: any): Promise<IUser>;
  deleteAdmin(id: string): Promise<boolean>;
  
  // Super Admin operations
  getSuperAdmin(id: string): Promise<IUser | null>;
  getSuperAdminByEmail(email: string): Promise<IUser | null>;
  createSuperAdmin(superAdmin: any): Promise<IUser>;
  
  // Employee operations
  getEmployee(id: string): Promise<IEmployee | null>;
  getEmployeesByAdminId(adminId: string): Promise<IEmployee[]>;
  createEmployee(employee: any): Promise<IEmployee>;
  updateEmployee(id: string, employee: Partial<any>): Promise<IEmployee | null>;
  deleteEmployee(id: string): Promise<boolean>;
  
  // Business Card operations
  getBusinessCard(id: string): Promise<IBusinessCard | null>;
  getBusinessCardByUrl(uniqueUrl: string): Promise<IBusinessCard | null>;
  getBusinessCardsByEmployeeId(employeeId: string): Promise<IBusinessCard[]>;
  getBusinessCardsByAdminId(adminId: string): Promise<IBusinessCard[]>;
  createBusinessCard(card: any): Promise<IBusinessCard>;
  updateBusinessCard(id: string, card: Partial<any>): Promise<IBusinessCard | null>;
  deleteBusinessCard(id: string): Promise<boolean>;
  
  // Card Template operations
  getAllCardTemplates(): Promise<ITemplate[]>;
  getCardTemplate(id: string): Promise<ITemplate | null>;
  
  // Custom Template operations
  getCustomTemplate(id: string): Promise<ITemplate | null>;
  getCustomTemplatesByAdminId(adminId: string): Promise<ITemplate[]>;
  createCustomTemplate(template: any): Promise<ITemplate>;
  updateCustomTemplate(id: string, template: Partial<any>): Promise<ITemplate | null>;
  deleteCustomTemplate(id: string): Promise<boolean>;
  
  // Company Card operations
  getCompanyCard(id: string): Promise<ICompanyCard | null>;
  getCompanyCardsByAdminId(adminId: string): Promise<ICompanyCard[]>;
  getActiveCompanyCardByAdminId(adminId: string): Promise<ICompanyCard | null>;
  createCompanyCard(card: any): Promise<ICompanyCard>;
  updateCompanyCard(id: string, card: Partial<any>): Promise<ICompanyCard | null>;
  deleteCompanyCard(id: string): Promise<boolean>;
  
  // Session store
  sessionStore: session.Store;
  
  // Helper methods
  generateUniqueUrl(firstName: string, lastName: string): string;
}

export class MongoDBStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    // Initialize session store
    this.sessionStore = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/businesscards',
      ttl: 14 * 24 * 60 * 60, // 14 days
      autoRemove: 'native'
    });
    
    // Initialize default super admin if needed
    this.initDefaultSuperAdmin();
  }
  
  private async initDefaultSuperAdmin() {
    try {
      const existingSuperAdmin = await this.getSuperAdminByEmail('admin@example.com');
      
      if (!existingSuperAdmin) {
        console.log('Creating default super admin...');
        await this.createSuperAdmin({
          email: 'admin@example.com',
          password: 'admin123'
        });
        console.log('Default super admin created successfully');
      }
    } catch (error) {
      console.error('Error initializing default super admin:', error);
    }
  }
  
  // Admin operations
  async getAdmin(id: string): Promise<IUser | null> {
    try {
      return await User.findOne({ _id: id, role: 'admin' });
    } catch (error) {
      console.error('Error getting admin:', error);
      return null;
    }
  }
  
  async getAdminByEmail(email: string): Promise<IUser | null> {
    try {
      return await User.findOne({ email, role: 'admin' });
    } catch (error) {
      console.error('Error getting admin by email:', error);
      return null;
    }
  }
  
  async getAllAdmins(): Promise<IUser[]> {
    try {
      return await User.find({ role: 'admin' });
    } catch (error) {
      console.error('Error getting all admins:', error);
      return [];
    }
  }
  
  async createAdmin(admin: any): Promise<IUser> {
    try {
      const newAdmin = new User({
        ...admin,
        role: 'admin'
      });
      return await newAdmin.save();
    } catch (error) {
      console.error('Error creating admin:', error);
      throw error;
    }
  }
  
  async deleteAdmin(id: string): Promise<boolean> {
    try {
      const result = await User.deleteOne({ _id: id, role: 'admin' });
      return result.deletedCount === 1;
    } catch (error) {
      console.error('Error deleting admin:', error);
      return false;
    }
  }
  
  // Super Admin operations
  async getSuperAdmin(id: string): Promise<IUser | null> {
    try {
      return await User.findOne({ _id: id, role: 'superadmin' });
    } catch (error) {
      console.error('Error getting super admin:', error);
      return null;
    }
  }
  
  async getSuperAdminByEmail(email: string): Promise<IUser | null> {
    try {
      return await User.findOne({ email, role: 'superadmin' });
    } catch (error) {
      console.error('Error getting super admin by email:', error);
      return null;
    }
  }
  
  async createSuperAdmin(superAdmin: any): Promise<IUser> {
    try {
      const newSuperAdmin = new User({
        ...superAdmin,
        role: 'superadmin'
      });
      return await newSuperAdmin.save();
    } catch (error) {
      console.error('Error creating super admin:', error);
      throw error;
    }
  }
  
  // Employee operations
  async getEmployee(id: string): Promise<IEmployee | null> {
    try {
      return await Employee.findById(id);
    } catch (error) {
      console.error('Error getting employee:', error);
      return null;
    }
  }
  
  async getEmployeesByAdminId(adminId: string): Promise<IEmployee[]> {
    try {
      return await Employee.find({ adminId });
    } catch (error) {
      console.error('Error getting employees by admin ID:', error);
      return [];
    }
  }
  
  async createEmployee(employee: any): Promise<IEmployee> {
    try {
      const newEmployee = new Employee(employee);
      return await newEmployee.save();
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  }
  
  async updateEmployee(id: string, employee: Partial<any>): Promise<IEmployee | null> {
    try {
      return await Employee.findByIdAndUpdate(id, employee, { new: true });
    } catch (error) {
      console.error('Error updating employee:', error);
      return null;
    }
  }
  
  async deleteEmployee(id: string): Promise<boolean> {
    try {
      const result = await Employee.deleteOne({ _id: id });
      return result.deletedCount === 1;
    } catch (error) {
      console.error('Error deleting employee:', error);
      return false;
    }
  }
  
  // Business Card operations
  async getBusinessCard(id: string): Promise<IBusinessCard | null> {
    try {
      return await BusinessCard.findById(id);
    } catch (error) {
      console.error('Error getting business card:', error);
      return null;
    }
  }
  
  async getBusinessCardByUrl(uniqueUrl: string): Promise<IBusinessCard | null> {
    try {
      return await BusinessCard.findOne({ uniqueUrl });
    } catch (error) {
      console.error('Error getting business card by URL:', error);
      return null;
    }
  }
  
  async getBusinessCardsByEmployeeId(employeeId: string): Promise<IBusinessCard[]> {
    try {
      return await BusinessCard.find({ employeeId });
    } catch (error) {
      console.error('Error getting business cards by employee ID:', error);
      return [];
    }
  }
  
  async getBusinessCardsByAdminId(adminId: string): Promise<IBusinessCard[]> {
    try {
      // First, get all employees for this admin
      const employees = await Employee.find({ adminId });
      const employeeIds = employees.map(emp => emp._id);
      
      // Then, get all business cards for these employees
      return await BusinessCard.find({ employeeId: { $in: employeeIds } });
    } catch (error) {
      console.error('Error getting business cards by admin ID:', error);
      return [];
    }
  }
  
  async createBusinessCard(card: any): Promise<IBusinessCard> {
    try {
      const newBusinessCard = new BusinessCard(card);
      return await newBusinessCard.save();
    } catch (error) {
      console.error('Error creating business card:', error);
      throw error;
    }
  }
  
  async updateBusinessCard(id: string, card: Partial<any>): Promise<IBusinessCard | null> {
    try {
      return await BusinessCard.findByIdAndUpdate(id, card, { new: true });
    } catch (error) {
      console.error('Error updating business card:', error);
      return null;
    }
  }
  
  async deleteBusinessCard(id: string): Promise<boolean> {
    try {
      const result = await BusinessCard.deleteOne({ _id: id });
      return result.deletedCount === 1;
    } catch (error) {
      console.error('Error deleting business card:', error);
      return false;
    }
  }
  
  // Card Template operations
  async getAllCardTemplates(): Promise<ITemplate[]> {
    try {
      return await Template.find({ isCustom: { $ne: true } });
    } catch (error) {
      console.error('Error getting all card templates:', error);
      return [];
    }
  }
  
  async getCardTemplate(id: string): Promise<ITemplate | null> {
    try {
      return await Template.findOne({ _id: id, isCustom: { $ne: true } });
    } catch (error) {
      console.error('Error getting card template:', error);
      return null;
    }
  }
  
  // Custom Template operations
  async getCustomTemplate(id: string): Promise<ITemplate | null> {
    try {
      return await Template.findOne({ _id: id, isCustom: true });
    } catch (error) {
      console.error('Error getting custom template:', error);
      return null;
    }
  }
  
  async getCustomTemplatesByAdminId(adminId: string): Promise<ITemplate[]> {
    try {
      return await Template.find({ adminId, isCustom: true });
    } catch (error) {
      console.error('Error getting custom templates by admin ID:', error);
      return [];
    }
  }
  
  async createCustomTemplate(template: any): Promise<ITemplate> {
    try {
      const newTemplate = new Template({
        ...template,
        isCustom: true,
        updatedAt: new Date()
      });
      return await newTemplate.save();
    } catch (error) {
      console.error('Error creating custom template:', error);
      throw error;
    }
  }
  
  async updateCustomTemplate(id: string, template: Partial<any>): Promise<ITemplate | null> {
    try {
      return await Template.findByIdAndUpdate(
        id,
        {
          ...template,
          updatedAt: new Date()
        },
        { new: true }
      );
    } catch (error) {
      console.error('Error updating custom template:', error);
      return null;
    }
  }
  
  async deleteCustomTemplate(id: string): Promise<boolean> {
    try {
      const result = await Template.deleteOne({ _id: id, isCustom: true });
      return result.deletedCount === 1;
    } catch (error) {
      console.error('Error deleting custom template:', error);
      return false;
    }
  }
  
  // Company Card operations
  async getCompanyCard(id: string): Promise<ICompanyCard | null> {
    try {
      return await CompanyCard.findById(id);
    } catch (error) {
      console.error('Error getting company card:', error);
      return null;
    }
  }
  
  async getCompanyCardsByAdminId(adminId: string): Promise<ICompanyCard[]> {
    try {
      return await CompanyCard.find({ adminId });
    } catch (error) {
      console.error('Error getting company cards by admin ID:', error);
      return [];
    }
  }
  
  async getActiveCompanyCardByAdminId(adminId: string): Promise<ICompanyCard | null> {
    try {
      return await CompanyCard.findOne({ adminId, isActive: true });
    } catch (error) {
      console.error('Error getting active company card by admin ID:', error);
      return null;
    }
  }
  
  async createCompanyCard(card: any): Promise<ICompanyCard> {
    try {
      const newCompanyCard = new CompanyCard({
        ...card,
        updatedAt: new Date()
      });
      return await newCompanyCard.save();
    } catch (error) {
      console.error('Error creating company card:', error);
      throw error;
    }
  }
  
  async updateCompanyCard(id: string, card: Partial<any>): Promise<ICompanyCard | null> {
    try {
      return await CompanyCard.findByIdAndUpdate(
        id,
        {
          ...card,
          updatedAt: new Date()
        },
        { new: true }
      );
    } catch (error) {
      console.error('Error updating company card:', error);
      return null;
    }
  }
  
  async deleteCompanyCard(id: string): Promise<boolean> {
    try {
      const result = await CompanyCard.deleteOne({ _id: id });
      return result.deletedCount === 1;
    } catch (error) {
      console.error('Error deleting company card:', error);
      return false;
    }
  }
  
  // Helper methods
  generateUniqueUrl(firstName: string, lastName: string): string {
    const base = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
    const random = uuidv4().substring(0, 8);
    return `${base}-${random}`;
  }
}

export const mongoStorage = new MongoDBStorage();