import { admins, superAdmins, type Admin, type InsertAdmin, type SuperAdmin, type InsertSuperAdmin } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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

// In-memory storage implementation
export class MemStorage implements IStorage {
  private adminStorage: Map<number, Admin>;
  private superAdminStorage: Map<number, SuperAdmin>;
  sessionStore: session.Store;
  adminCurrentId: number;
  superAdminCurrentId: number;

  constructor() {
    this.adminStorage = new Map();
    this.superAdminStorage = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    this.adminCurrentId = 1;
    this.superAdminCurrentId = 1;
    
    // Initialize with a default super admin
    this.createSuperAdmin({
      email: "admin@example.com",
      password: "$2b$10$2Llj/za9sL9GGK6Z9WwO4OADbhfbecTZreFWKFI5XJHieAwlqrYW." // "password123" hashed
    });
  }

  // Admin methods
  async getAdmin(id: number): Promise<Admin | undefined> {
    return this.adminStorage.get(id);
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    return Array.from(this.adminStorage.values()).find(
      (admin) => admin.email === email
    );
  }

  async getAllAdmins(): Promise<Admin[]> {
    return Array.from(this.adminStorage.values());
  }

  async createAdmin(insertAdmin: InsertAdmin): Promise<Admin> {
    const id = this.adminCurrentId++;
    const now = new Date();
    const admin: Admin = { 
      ...insertAdmin, 
      id,
      status: "active",
      createdAt: now
    };
    this.adminStorage.set(id, admin);
    return admin;
  }

  async deleteAdmin(id: number): Promise<boolean> {
    return this.adminStorage.delete(id);
  }

  // Super Admin methods
  async getSuperAdmin(id: number): Promise<SuperAdmin | undefined> {
    return this.superAdminStorage.get(id);
  }

  async getSuperAdminByEmail(email: string): Promise<SuperAdmin | undefined> {
    return Array.from(this.superAdminStorage.values()).find(
      (superAdmin) => superAdmin.email === email
    );
  }

  async createSuperAdmin(insertSuperAdmin: InsertSuperAdmin): Promise<SuperAdmin> {
    const id = this.superAdminCurrentId++;
    const superAdmin: SuperAdmin = { ...insertSuperAdmin, id };
    this.superAdminStorage.set(id, superAdmin);
    return superAdmin;
  }
}

export const storage = new MemStorage();
