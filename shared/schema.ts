import { pgTable, text, serial, integer, boolean, timestamp, uuid, json, uniqueIndex, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Super Admin table
export const superAdmins = pgTable("super_admins", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
});

// Admin Organizations table
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  orgName: text("org_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Employees table
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  title: text("title").notNull(),
  department: text("department"),
  adminId: integer("admin_id").notNull().references(() => admins.id, { onDelete: 'cascade' }),
  status: text("status").notNull().default("active"),
  profileImage: text("profile_image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Business Card Templates table
export const cardTemplates = pgTable("card_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  template: json("template").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Business Cards table
export const businessCards = pgTable("business_cards", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: 'cascade' }),
  templateId: integer("template_id").notNull().references(() => cardTemplates.id),
  customization: json("customization"),
  uniqueUrl: text("unique_url").notNull().unique(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define relations
export const adminsRelations = relations(admins, ({ many }) => ({
  employees: many(employees),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  admin: one(admins, {
    fields: [employees.adminId],
    references: [admins.id],
  }),
  businessCards: many(businessCards),
}));

export const businessCardsRelations = relations(businessCards, ({ one }) => ({
  employee: one(employees, {
    fields: [businessCards.employeeId],
    references: [employees.id],
  }),
  template: one(cardTemplates, {
    fields: [businessCards.templateId],
    references: [cardTemplates.id],
  }),
}));

// Schema for creating a new super admin
export const insertSuperAdminSchema = createInsertSchema(superAdmins);
export type InsertSuperAdmin = z.infer<typeof insertSuperAdminSchema>;
export type SuperAdmin = typeof superAdmins.$inferSelect;

// Schema for creating a new admin
export const insertAdminSchema = createInsertSchema(admins);
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof admins.$inferSelect;

// Schema for creating a new employee
export const insertEmployeeSchema = createInsertSchema(employees);
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

// Schema for creating a new business card template
export const insertCardTemplateSchema = createInsertSchema(cardTemplates);
export type InsertCardTemplate = z.infer<typeof insertCardTemplateSchema>;
export type CardTemplate = typeof cardTemplates.$inferSelect;

// Schema for creating a new business card
export const insertBusinessCardSchema = createInsertSchema(businessCards);
export type InsertBusinessCard = z.infer<typeof insertBusinessCardSchema>;
export type BusinessCard = typeof businessCards.$inferSelect;

// Login schema for validation
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type LoginCredentials = z.infer<typeof loginSchema>;

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
export type EmployeeForm = z.infer<typeof employeeFormSchema>;
