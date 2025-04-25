import { 
  admins, superAdmins, employees, businessCards, cardTemplates, customTemplates,
  type Admin, type InsertAdmin, 
  type SuperAdmin, type InsertSuperAdmin,
  type Employee, type InsertEmployee,
  type BusinessCard, type InsertBusinessCard,
  type CardTemplate, type CustomTemplate, type InsertCustomTemplate
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { pool } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';
import bcrypt from "bcrypt";

const PostgresSessionStore = connectPg(session);

// Storage interface for CRUD operations
export interface IStorage {
  // Admin operations
  getAdmin(id: number): Promise<Admin | undefined>;
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  getAllAdmins(): Promise<Admin[]>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  deleteAdmin(id: number): Promise<boolean>;
  
  // Super Admin operations
  getSuperAdmin(id: number): Promise<SuperAdmin | undefined>;
  getSuperAdminByEmail(email: string): Promise<SuperAdmin | undefined>;
  createSuperAdmin(superAdmin: InsertSuperAdmin): Promise<SuperAdmin>;
  
  // Employee operations
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeesByAdminId(adminId: number): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<boolean>;
  
  // Business Card operations
  getBusinessCard(id: number): Promise<BusinessCard | undefined>;
  getBusinessCardByUrl(uniqueUrl: string): Promise<BusinessCard | undefined>;
  getBusinessCardsByEmployeeId(employeeId: number): Promise<BusinessCard[]>;
  getBusinessCardsByAdminId(adminId: number): Promise<BusinessCard[]>;
  createBusinessCard(card: InsertBusinessCard): Promise<BusinessCard>;
  updateBusinessCard(id: number, card: Partial<InsertBusinessCard>): Promise<BusinessCard | undefined>;
  deleteBusinessCard(id: number): Promise<boolean>;
  
  // Card Template operations
  getAllCardTemplates(): Promise<CardTemplate[]>;
  getCardTemplate(id: number): Promise<CardTemplate | undefined>;
  
  // Custom Template operations
  getCustomTemplate(id: number): Promise<CustomTemplate | undefined>;
  getCustomTemplatesByAdminId(adminId: number): Promise<CustomTemplate[]>;
  createCustomTemplate(template: InsertCustomTemplate): Promise<CustomTemplate>;
  updateCustomTemplate(id: number, template: Partial<InsertCustomTemplate>): Promise<CustomTemplate | undefined>;
  deleteCustomTemplate(id: number): Promise<boolean>;
  
  // Session store
  sessionStore: session.Store;
  
  // Helper methods
  generateUniqueUrl(firstName: string, lastName: string): string;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: 'user_sessions'
    });
    
    // Initialize with a default super admin (only if none exist)
    this.initDefaultSuperAdmin();
  }

  private async initDefaultSuperAdmin() {
    try {
      const existingSuperAdmins = await db.select().from(superAdmins);
      
      if (existingSuperAdmins.length === 0) {
        console.log("Creating default super admin");
        await this.createSuperAdmin({
          email: "admin@example.com",
          password: "$2b$10$2Llj/za9sL9GGK6Z9WwO4OADbhfbecTZreFWKFI5XJHieAwlqrYW." // "password123" hashed
        });
      }
    } catch (error) {
      console.error("Error initializing default super admin:", error);
    }
  }

  // Admin methods
  async getAdmin(id: number): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin;
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.email, email));
    return admin;
  }

  async getAllAdmins(): Promise<Admin[]> {
    return await db.select().from(admins);
  }

  async createAdmin(insertAdmin: InsertAdmin): Promise<Admin> {
    const [admin] = await db.insert(admins).values(insertAdmin).returning();
    return admin;
  }

  async deleteAdmin(id: number): Promise<boolean> {
    const result = await db.delete(admins).where(eq(admins.id, id)).returning({ id: admins.id });
    return result.length > 0;
  }

  // Super Admin methods
  async getSuperAdmin(id: number): Promise<SuperAdmin | undefined> {
    const [superAdmin] = await db.select().from(superAdmins).where(eq(superAdmins.id, id));
    return superAdmin;
  }

  async getSuperAdminByEmail(email: string): Promise<SuperAdmin | undefined> {
    const [superAdmin] = await db.select().from(superAdmins).where(eq(superAdmins.email, email));
    return superAdmin;
  }

  async createSuperAdmin(insertSuperAdmin: InsertSuperAdmin): Promise<SuperAdmin> {
    const [superAdmin] = await db.insert(superAdmins).values(insertSuperAdmin).returning();
    return superAdmin;
  }

  // Employee methods
  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async getEmployeesByAdminId(adminId: number): Promise<Employee[]> {
    return await db.select()
      .from(employees)
      .where(eq(employees.adminId, adminId))
      .orderBy(desc(employees.createdAt));
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db.insert(employees).values(employee).returning();
    return newEmployee;
  }

  async updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    // First perform the update
    const [updatedEmployee] = await db
      .update(employees)
      .set(employee)
      .where(eq(employees.id, id))
      .returning();
    
    // Then fetch the updated employee directly to ensure we have the freshest data
    // This helps avoid any potential caching issues at the database driver level
    if (updatedEmployee) {
      console.log(`Employee ${id} updated. Getting fresh data from database.`);
      const [freshEmployee] = await db
        .select()
        .from(employees)
        .where(eq(employees.id, id));
      
      return freshEmployee;
    }
    
    return updatedEmployee;
  }

  async deleteEmployee(id: number): Promise<boolean> {
    const result = await db
      .delete(employees)
      .where(eq(employees.id, id))
      .returning({ id: employees.id });
    return result.length > 0;
  }

  // Business Card methods
  async getBusinessCard(id: number): Promise<BusinessCard | undefined> {
    const [card] = await db.select().from(businessCards).where(eq(businessCards.id, id));
    return card;
  }

  async getBusinessCardByUrl(uniqueUrl: string): Promise<BusinessCard | undefined> {
    const [card] = await db.select().from(businessCards).where(eq(businessCards.uniqueUrl, uniqueUrl));
    return card;
  }

  async getBusinessCardsByEmployeeId(employeeId: number): Promise<BusinessCard[]> {
    return await db.select()
      .from(businessCards)
      .where(eq(businessCards.employeeId, employeeId))
      .orderBy(desc(businessCards.updatedAt));
  }

  async getBusinessCardsByAdminId(adminId: number): Promise<BusinessCard[]> {
    // This requires a join since we need to find cards for all employees under an admin
    const result = await db.select({
        id: businessCards.id,
        employeeId: businessCards.employeeId,
        templateId: businessCards.templateId,
        customization: businessCards.customization,
        customTemplateId: businessCards.customTemplateId,
        uniqueUrl: businessCards.uniqueUrl,
        status: businessCards.status,
        createdAt: businessCards.createdAt,
        updatedAt: businessCards.updatedAt
      })
      .from(businessCards)
      .innerJoin(employees, eq(businessCards.employeeId, employees.id))
      .where(eq(employees.adminId, adminId))
      .orderBy(desc(businessCards.updatedAt));
      
    return result;
  }

  async createBusinessCard(card: InsertBusinessCard): Promise<BusinessCard> {
    const [newCard] = await db.insert(businessCards).values(card).returning();
    return newCard;
  }

  async updateBusinessCard(id: number, card: Partial<InsertBusinessCard>): Promise<BusinessCard | undefined> {
    // Update the updatedAt field automatically
    const updateData = {
      ...card,
      updatedAt: new Date()
    };
    
    const [updatedCard] = await db
      .update(businessCards)
      .set(updateData)
      .where(eq(businessCards.id, id))
      .returning();
    return updatedCard;
  }

  async deleteBusinessCard(id: number): Promise<boolean> {
    const result = await db
      .delete(businessCards)
      .where(eq(businessCards.id, id))
      .returning({ id: businessCards.id });
    return result.length > 0;
  }

  // Card Template methods
  async getAllCardTemplates(): Promise<CardTemplate[]> {
    return await db.select().from(cardTemplates);
  }

  async getCardTemplate(id: number): Promise<CardTemplate | undefined> {
    const [template] = await db.select().from(cardTemplates).where(eq(cardTemplates.id, id));
    return template;
  }
  
  // Custom Template methods
  async getCustomTemplate(id: number): Promise<CustomTemplate | undefined> {
    const [template] = await db.select().from(customTemplates).where(eq(customTemplates.id, id));
    return template;
  }
  
  async getCustomTemplatesByAdminId(adminId: number): Promise<CustomTemplate[]> {
    return await db.select()
      .from(customTemplates)
      .where(eq(customTemplates.adminId, adminId))
      .orderBy(desc(customTemplates.updatedAt));
  }
  
  async createCustomTemplate(template: InsertCustomTemplate): Promise<CustomTemplate> {
    const [newTemplate] = await db.insert(customTemplates).values(template).returning();
    return newTemplate;
  }
  
  async updateCustomTemplate(id: number, template: Partial<InsertCustomTemplate>): Promise<CustomTemplate | undefined> {
    // Update the updatedAt field automatically
    const updateData = {
      ...template,
      updatedAt: new Date()
    };
    
    const [updatedTemplate] = await db
      .update(customTemplates)
      .set(updateData)
      .where(eq(customTemplates.id, id))
      .returning();
    return updatedTemplate;
  }
  
  async deleteCustomTemplate(id: number): Promise<boolean> {
    const result = await db
      .delete(customTemplates)
      .where(eq(customTemplates.id, id))
      .returning({ id: customTemplates.id });
    return result.length > 0;
  }

  // Helper methods
  generateUniqueUrl(firstName: string, lastName: string): string {
    // Create a URL-friendly slug from the employee name
    const nameSlug = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
    
    // Add a short unique identifier to ensure uniqueness
    const shortId = uuidv4().substring(0, 8);
    
    return `${nameSlug}-${shortId}`;
  }
}

// Export database storage implementation
export const storage = new DatabaseStorage();
