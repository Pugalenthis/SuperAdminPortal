import { admins, superAdmins, type Admin, type InsertAdmin, type SuperAdmin, type InsertSuperAdmin } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { pool } from "./db";
import { eq } from "drizzle-orm";
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
  
  // Session store
  sessionStore: session.Store;
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
}

// Export database storage implementation
export const storage = new DatabaseStorage();
