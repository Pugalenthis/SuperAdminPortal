import session from 'express-session';
import MongoDBStore from 'connect-mongodb-session';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import {
  SuperAdmin,
  Admin,
  Employee,
  CardTemplate,
  CustomTemplate,
  CompanyCard,
  BusinessCard
} from './models/index.js';

// Create the MongoDB session store
const MongoStore = MongoDBStore(session);

export class DatabaseStorage {
  sessionStore;

  constructor() {
    // Initialize the session store
    this.sessionStore = new MongoStore({
      uri: process.env.MONGO_URI || 'mongodb://localhost:27017/business-cards',
      collection: 'sessions',
      expires: 1000 * 60 * 60 * 24 * 7, // 1 week
    });

    // Initialize default super admin
    this.initDefaultSuperAdmin();
  }

  // Helper method to initialize a default super admin
  async initDefaultSuperAdmin() {
    try {
      const existingSuperAdmin = await SuperAdmin.findOne({ email: 'super@example.com' });
      if (!existingSuperAdmin) {
        const hashedPassword = await bcrypt.hash('password123', 10);
        await SuperAdmin.create({
          email: 'super@example.com',
          password: hashedPassword
        });
        console.log('Default super admin created');
      }
    } catch (error) {
      console.error('Error initializing default super admin:', error);
    }
  }

  // Admin operations
  async getAdmin(id) {
    return await Admin.findById(id);
  }

  async getAdminByEmail(email) {
    return await Admin.findOne({ email });
  }

  async getAllAdmins() {
    return await Admin.find();
  }

  async createAdmin(admin) {
    const hashedPassword = await bcrypt.hash(admin.password, 10);
    const newAdmin = new Admin({
      ...admin,
      password: hashedPassword
    });
    await newAdmin.save();
    return newAdmin;
  }

  async deleteAdmin(id) {
    const result = await Admin.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  // Super Admin operations
  async getSuperAdmin(id) {
    return await SuperAdmin.findById(id);
  }

  async getSuperAdminByEmail(email) {
    return await SuperAdmin.findOne({ email });
  }

  async createSuperAdmin(superAdmin) {
    const hashedPassword = await bcrypt.hash(superAdmin.password, 10);
    const newSuperAdmin = new SuperAdmin({
      ...superAdmin,
      password: hashedPassword
    });
    await newSuperAdmin.save();
    return newSuperAdmin;
  }

  // Employee operations
  async getEmployee(id) {
    return await Employee.findById(id);
  }

  async getEmployeesByAdminId(adminId) {
    return await Employee.find({ adminId });
  }

  async createEmployee(employee) {
    const newEmployee = new Employee(employee);
    await newEmployee.save();
    return newEmployee;
  }

  async updateEmployee(id, employee) {
    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      { ...employee, updatedAt: new Date() },
      { new: true }
    );
    return updatedEmployee;
  }

  async deleteEmployee(id) {
    const result = await Employee.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  // Business Card operations
  async getBusinessCard(id) {
    return await BusinessCard.findById(id);
  }

  async getBusinessCardByUrl(uniqueUrl) {
    return await BusinessCard.findOne({ uniqueUrl });
  }

  async getBusinessCardsByEmployeeId(employeeId) {
    return await BusinessCard.find({ employeeId });
  }

  async getBusinessCardsByAdminId(adminId) {
    const employees = await Employee.find({ adminId });
    const employeeIds = employees.map(emp => emp._id);
    return await BusinessCard.find({ employeeId: { $in: employeeIds } });
  }

  async createBusinessCard(card) {
    const newBusinessCard = new BusinessCard(card);
    await newBusinessCard.save();
    return newBusinessCard;
  }

  async updateBusinessCard(id, card) {
    const updatedBusinessCard = await BusinessCard.findByIdAndUpdate(
      id,
      { ...card, updatedAt: new Date() },
      { new: true }
    );
    return updatedBusinessCard;
  }

  async deleteBusinessCard(id) {
    const result = await BusinessCard.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  // Card Template operations
  async getAllCardTemplates() {
    return await CardTemplate.find();
  }

  async getCardTemplate(id) {
    return await CardTemplate.findById(id);
  }

  // Custom Template operations
  async getCustomTemplate(id) {
    return await CustomTemplate.findById(id);
  }

  async getCustomTemplatesByAdminId(adminId) {
    return await CustomTemplate.find({ adminId });
  }

  async createCustomTemplate(template) {
    const newCustomTemplate = new CustomTemplate({
      ...template,
      updatedAt: new Date()
    });
    await newCustomTemplate.save();
    return newCustomTemplate;
  }

  async updateCustomTemplate(id, template) {
    const updatedCustomTemplate = await CustomTemplate.findByIdAndUpdate(
      id,
      { ...template, updatedAt: new Date() },
      { new: true }
    );
    return updatedCustomTemplate;
  }

  async deleteCustomTemplate(id) {
    const result = await CustomTemplate.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  // Company Card operations
  async getCompanyCard(id) {
    return await CompanyCard.findById(id);
  }

  async getCompanyCardsByAdminId(adminId) {
    return await CompanyCard.find({ adminId });
  }

  async getActiveCompanyCardByAdminId(adminId) {
    return await CompanyCard.findOne({ adminId, isActive: true });
  }

  async createCompanyCard(card) {
    const newCompanyCard = new CompanyCard({
      ...card,
      updatedAt: new Date()
    });
    await newCompanyCard.save();
    return newCompanyCard;
  }

  async updateCompanyCard(id, card) {
    const updatedCompanyCard = await CompanyCard.findByIdAndUpdate(
      id,
      { ...card, updatedAt: new Date() },
      { new: true }
    );
    return updatedCompanyCard;
  }

  async deleteCompanyCard(id) {
    const result = await CompanyCard.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  // Helper method for generating unique URLs
  generateUniqueUrl(firstName, lastName) {
    const base = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
    const randomId = randomBytes(4).toString('hex');
    return `${base}-${randomId}`;
  }
}

export const storage = new DatabaseStorage();