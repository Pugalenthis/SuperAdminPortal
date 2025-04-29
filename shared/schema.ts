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
  type: text("type").default("standard"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Custom Templates table
export const customTemplates = pgTable("custom_templates", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => admins.id, { onDelete: 'cascade' }),
  baseTemplateId: integer("base_template_id").notNull().references(() => cardTemplates.id),
  name: text("name").notNull(),
  description: text("description"),
  customization: json("customization").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Company Cards table
export const companyCards = pgTable("company_cards", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => admins.id, { onDelete: 'cascade' }),
  imagePath: text("image_path").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  logoPath: text("logo_path"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Business Cards table
export const businessCards = pgTable("business_cards", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: 'cascade' }),
  templateId: integer("template_id").notNull().references(() => cardTemplates.id),
  customTemplateId: integer("custom_template_id").references(() => customTemplates.id),
  companyCardId: integer("company_card_id").references(() => companyCards.id),
  customization: json("customization"),
  uniqueUrl: text("unique_url").notNull().unique(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define relations
export const adminsRelations = relations(admins, ({ many }) => ({
  employees: many(employees),
  customTemplates: many(customTemplates),
  companyCards: many(companyCards),
}));

export const companyCardsRelations = relations(companyCards, ({ one }) => ({
  admin: one(admins, {
    fields: [companyCards.adminId],
    references: [admins.id],
  }),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  admin: one(admins, {
    fields: [employees.adminId],
    references: [admins.id],
  }),
  businessCards: many(businessCards),
}));

export const customTemplatesRelations = relations(customTemplates, ({ one }) => ({
  admin: one(admins, {
    fields: [customTemplates.adminId],
    references: [admins.id],
  }),
  baseTemplate: one(cardTemplates, {
    fields: [customTemplates.baseTemplateId],
    references: [cardTemplates.id],
  }),
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
  customTemplate: one(customTemplates, {
    fields: [businessCards.customTemplateId],
    references: [customTemplates.id],
  }),
  companyCard: one(companyCards, {
    fields: [businessCards.companyCardId],
    references: [companyCards.id],
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

// Schema for creating a new custom template
export const insertCustomTemplateSchema = createInsertSchema(customTemplates);
export type InsertCustomTemplate = z.infer<typeof insertCustomTemplateSchema>;
export type CustomTemplate = typeof customTemplates.$inferSelect;

// Schema for creating a new company card
export const insertCompanyCardSchema = createInsertSchema(companyCards);
export type InsertCompanyCard = z.infer<typeof insertCompanyCardSchema>;
export type CompanyCard = typeof companyCards.$inferSelect;

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

// Company Card upload schema for validation
export const companyCardFormSchema = z.object({
  imagePath: z.string().min(1, "Company card image is required"),
  adminId: z.number(),
  width: z.number().default(1066),
  height: z.number().default(445),
  isActive: z.boolean().default(true),
  logoPath: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
});
export type CompanyCardForm = z.infer<typeof companyCardFormSchema>;
