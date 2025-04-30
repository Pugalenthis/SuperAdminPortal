import type { Express, Request, Response, NextFunction } from "express";
import type { UploadedFile } from "express-fileupload";
import { createServer, type Server } from "http";
import { mongoStorage } from "./mongoStorage";
import { setupAuth } from "./mongoAuth";
import { z } from "zod";
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import mongoose from 'mongoose';

// Set up __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define zod schemas for MongoDB models
const userSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(['superadmin', 'admin']),
  orgName: z.string().optional(),
  status: z.string().optional()
});

const employeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  title: z.string().min(1, "Job title is required"),
  department: z.string().optional(),
  adminId: z.string().min(1, "Admin ID is required"),
  status: z.string().optional(),
  profileImage: z.string().optional()
});

const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  template: z.any(),
  type: z.string().optional(),
  isDefault: z.boolean().optional(),
  isCustom: z.boolean().optional(),
  adminId: z.string().optional(),
  baseTemplateId: z.string().optional(),
  customization: z.any().optional()
});

const companyCardSchema = z.object({
  adminId: z.string().min(1, "Admin ID is required"),
  imagePath: z.string().min(1, "Image path is required"),
  width: z.number().min(1, "Width is required"),
  height: z.number().min(1, "Height is required"),
  isActive: z.boolean().optional(),
  logoPath: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  websiteUrl: z.string().url("Please enter a valid URL").optional(),
  enquiriesEmail: z.string().email("Please enter a valid email").optional()
});

const businessCardSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  templateId: z.string().min(1, "Template ID is required"),
  customTemplateId: z.string().optional(),
  companyCardId: z.string().optional(),
  customization: z.any().optional(),
  uniqueUrl: z.string().min(1, "Unique URL is required"),
  qrCodeUrl: z.string().optional(),
  status: z.string().optional()
});

// Helper function to get image dimensions
async function getImageDimensions(imageBuffer: Buffer) {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0
    };
  } catch (error) {
    console.error("Error getting image dimensions:", error);
    return null;
  }
}

// Helper function to generate QR code for a business card
async function generateQRCode(uniqueUrl: string, accentColor: string = '#0066cc') {
  try {
    // Get Replit environment variables for URL construction
    const replId = process.env.REPL_ID;
    
    let host;
    if (replId) {
      // If this is a Replit environment, use the Replit domain
      const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
      host = replitDomain ? `https://${replitDomain}` : 'http://localhost:5000';
    } else {
      // Fallback to localhost for development
      host = 'http://localhost:5000';
    }
    
    // Construct the full URL to the card
    const fullUrl = `${host}/card/${uniqueUrl}`;
    
    // Generate QR code
    return await QRCode.toDataURL(fullUrl, {
      color: {
        dark: accentColor,
        light: '#ffffff'
      }
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    return null;
  }
}

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
};

const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated() && req.user.userType === 'admin') {
    return next();
  }
  res.status(403).json({ message: "Admin access required" });
};

const isSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated() && req.user.userType === 'superadmin') {
    return next();
  }
  res.status(403).json({ message: "Super admin access required" });
};

export async function registerMongoRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const server = createServer(app);
  
  // Set up authentication
  setupAuth(app);
  
  // Ensure uploads directory exists
  const uploadPath = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadPath, { recursive: true });
  
  /************************************
   * ADMIN MANAGEMENT ROUTES
   ************************************/
  
  // Get all admins - Super Admin only
  app.get("/api/admins", isSuperAdmin, async (req, res) => {
    try {
      const admins = await mongoStorage.getAllAdmins();
      res.json(admins);
    } catch (error) {
      console.error("Error getting admins:", error);
      res.status(500).json({ message: "Failed to fetch admins" });
    }
  });
  
  // Create a new admin - Super Admin only
  app.post("/api/admins", isSuperAdmin, async (req, res) => {
    try {
      const admin = userSchema.parse({
        ...req.body,
        role: 'admin',
        status: 'active'
      });
      
      const existingAdmin = await mongoStorage.getAdminByEmail(admin.email);
      if (existingAdmin) {
        return res.status(400).json({ message: "Admin with this email already exists" });
      }
      
      const newAdmin = await mongoStorage.createAdmin(admin);
      res.status(201).json(newAdmin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Error creating admin:", error);
      res.status(500).json({ message: "Failed to create admin" });
    }
  });
  
  // Delete an admin - Super Admin only
  app.delete("/api/admins/:id", isSuperAdmin, async (req, res) => {
    try {
      const adminId = req.params.id;
      const deleted = await mongoStorage.deleteAdmin(adminId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Admin not found" });
      }
      
      res.status(200).json({ message: "Admin deleted successfully" });
    } catch (error) {
      console.error("Error deleting admin:", error);
      res.status(500).json({ message: "Failed to delete admin" });
    }
  });
  
  /************************************
   * ADMIN ROUTES - EMPLOYEES
   ************************************/
  
  // Get all employees for the current admin
  app.get("/api/employees", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      const employees = await mongoStorage.getEmployeesByAdminId(adminId);
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });
  
  // Get a specific employee
  app.get("/api/employees/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      const employeeId = req.params.id;
      
      const employee = await mongoStorage.getEmployee(employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // Security check - make sure the employee belongs to this admin
      if (employee.adminId.toString() !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(employee);
    } catch (error) {
      console.error("Error fetching employee:", error);
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });
  
  // Create a new employee
  app.post("/api/employees", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      
      const employeeData = employeeSchema.parse({
        ...req.body,
        adminId: adminId
      });
      
      const newEmployee = await mongoStorage.createEmployee(employeeData);
      res.status(201).json(newEmployee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Error creating employee:", error);
      res.status(500).json({ message: "Failed to create employee" });
    }
  });
  
  // Update an employee
  app.patch("/api/employees/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      const employeeId = req.params.id;
      
      // Check if employee exists and belongs to this admin
      const existingEmployee = await mongoStorage.getEmployee(employeeId);
      
      if (!existingEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      if (existingEmployee.adminId.toString() !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Validate update data
      const updateData = req.body;
      
      const updatedEmployee = await mongoStorage.updateEmployee(employeeId, updateData);
      res.json(updatedEmployee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Error updating employee:", error);
      res.status(500).json({ message: "Failed to update employee" });
    }
  });
  
  // Delete an employee
  app.delete("/api/employees/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      const employeeId = req.params.id;
      
      // Check if employee exists and belongs to this admin
      const existingEmployee = await mongoStorage.getEmployee(employeeId);
      
      if (!existingEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      if (existingEmployee.adminId.toString() !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const deleted = await mongoStorage.deleteEmployee(employeeId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.status(200).json({ message: "Employee deleted successfully" });
    } catch (error) {
      console.error("Error deleting employee:", error);
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });
  
  /************************************
   * ADMIN ROUTES - BUSINESS CARDS
   ************************************/
  
  // Get all business cards for the current admin
  app.get("/api/businesscards", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      const businessCards = await mongoStorage.getBusinessCardsByAdminId(adminId);
      res.json(businessCards);
    } catch (error) {
      console.error("Error fetching business cards:", error);
      res.status(500).json({ message: "Failed to fetch business cards" });
    }
  });
  
  // Get business cards for a specific employee
  app.get("/api/employees/:id/businesscards", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      const employeeId = req.params.id;
      
      // Check if employee belongs to this admin
      const employee = await mongoStorage.getEmployee(employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      if (employee.adminId.toString() !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const businessCards = await mongoStorage.getBusinessCardsByEmployeeId(employeeId);
      res.json(businessCards);
    } catch (error) {
      console.error("Error fetching business cards:", error);
      res.status(500).json({ message: "Failed to fetch business cards" });
    }
  });
  
  // Get a specific business card
  app.get("/api/businesscards/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      const cardId = req.params.id;
      
      const card = await mongoStorage.getBusinessCard(cardId);
      
      if (!card) {
        return res.status(404).json({ message: "Business card not found" });
      }
      
      // Get the employee to check if this card belongs to this admin
      const employee = await mongoStorage.getEmployee(card.employeeId.toString());
      
      if (!employee || employee.adminId.toString() !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(card);
    } catch (error) {
      console.error("Error fetching business card:", error);
      res.status(500).json({ message: "Failed to fetch business card" });
    }
  });
  
  // Create a new business card
  app.post("/api/businesscards", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      
      // Validate the card data
      const cardData = req.body;
      
      // Check if employee belongs to this admin
      const employee = await mongoStorage.getEmployee(cardData.employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      if (employee.adminId.toString() !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Generate a unique URL for the card
      const uniqueUrl = mongoStorage.generateUniqueUrl(
        employee.firstName,
        employee.lastName
      );
      
      // Generate QR code for the card
      const qrCodeUrl = await generateQRCode(uniqueUrl);
      
      // Create the business card
      const newCard = await mongoStorage.createBusinessCard({
        ...cardData,
        uniqueUrl,
        qrCodeUrl,
        status: 'active'
      });
      
      res.status(201).json(newCard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Error creating business card:", error);
      res.status(500).json({ message: "Failed to create business card" });
    }
  });
  
  // Update a business card
  app.patch("/api/businesscards/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      const cardId = req.params.id;
      
      // Check if card exists
      const existingCard = await mongoStorage.getBusinessCard(cardId);
      
      if (!existingCard) {
        return res.status(404).json({ message: "Business card not found" });
      }
      
      // Check if the card belongs to this admin (via employee)
      const employee = await mongoStorage.getEmployee(existingCard.employeeId.toString());
      
      if (!employee || employee.adminId.toString() !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Update the card
      const updatedCard = await mongoStorage.updateBusinessCard(cardId, {
        ...req.body,
        updatedAt: new Date()
      });
      
      res.json(updatedCard);
    } catch (error) {
      console.error("Error updating business card:", error);
      res.status(500).json({ message: "Failed to update business card" });
    }
  });
  
  // Delete a business card
  app.delete("/api/businesscards/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      const cardId = req.params.id;
      
      // Check if card exists
      const existingCard = await mongoStorage.getBusinessCard(cardId);
      
      if (!existingCard) {
        return res.status(404).json({ message: "Business card not found" });
      }
      
      // Check if the card belongs to this admin (via employee)
      const employee = await mongoStorage.getEmployee(existingCard.employeeId.toString());
      
      if (!employee || employee.adminId.toString() !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Delete the card
      const deleted = await mongoStorage.deleteBusinessCard(cardId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Business card not found" });
      }
      
      res.status(200).json({ message: "Business card deleted successfully" });
    } catch (error) {
      console.error("Error deleting business card:", error);
      res.status(500).json({ message: "Failed to delete business card" });
    }
  });
  
  // Get public business card by unique URL
  app.get("/api/card/:uniqueUrl", async (req, res) => {
    try {
      const uniqueUrl = req.params.uniqueUrl;
      
      // Get the business card
      const card = await mongoStorage.getBusinessCardByUrl(uniqueUrl);
      
      if (!card) {
        return res.status(404).json({ message: "Business card not found" });
      }
      
      // Only show active cards
      if (card.status !== 'active') {
        return res.status(404).json({ message: "Business card not found" });
      }
      
      // Get the employee
      const employee = await mongoStorage.getEmployee(card.employeeId.toString());
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // Get the template
      const template = await mongoStorage.getCardTemplate(card.templateId.toString());
      
      // If the card has a custom template, get that instead
      let customTemplate = null;
      if (card.customTemplateId) {
        customTemplate = await mongoStorage.getCustomTemplate(card.customTemplateId.toString());
      }
      
      // Get the company card
      let companyCard = null;
      if (card.companyCardId) {
        companyCard = await mongoStorage.getCompanyCard(card.companyCardId.toString());
      } else {
        // If no specific company card is assigned, get the active company card for this admin
        companyCard = await mongoStorage.getActiveCompanyCardByAdminId(employee.adminId.toString());
      }
      
      // Assemble the response
      const response = {
        card,
        employee,
        template: customTemplate || template,
        companyCard,
      };
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching business card:", error);
      res.status(500).json({ message: "Failed to fetch business card" });
    }
  });
  
  /************************************
   * ADMIN ROUTES - TEMPLATES
   ************************************/
  
  // Get all card templates
  app.get("/api/templates", isAuthenticated, async (req, res) => {
    try {
      const templates = await mongoStorage.getAllCardTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });
  
  // Get a specific template
  app.get("/api/templates/:id", isAuthenticated, async (req, res) => {
    try {
      const templateId = req.params.id;
      const template = await mongoStorage.getCardTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });
  
  // Get all custom templates for the current admin
  app.get("/api/customtemplates", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      const templates = await mongoStorage.getCustomTemplatesByAdminId(adminId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching custom templates:", error);
      res.status(500).json({ message: "Failed to fetch custom templates" });
    }
  });
  
  // Get a specific custom template
  app.get("/api/customtemplates/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      const templateId = req.params.id;
      
      const template = await mongoStorage.getCustomTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Custom template not found" });
      }
      
      // Security check - make sure the template belongs to this admin
      if (template.adminId.toString() !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching custom template:", error);
      res.status(500).json({ message: "Failed to fetch custom template" });
    }
  });
  
  // Create a new custom template
  app.post("/api/customtemplates", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      
      // Validate the template data
      const templateData = templateSchema.parse({
        ...req.body,
        adminId: adminId,
        isCustom: true
      });
      
      // Create the custom template
      const newTemplate = await mongoStorage.createCustomTemplate(templateData);
      res.status(201).json(newTemplate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Error creating custom template:", error);
      res.status(500).json({ message: "Failed to create custom template" });
    }
  });
  
  // Update a custom template
  app.patch("/api/customtemplates/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      const templateId = req.params.id;
      
      // Check if template exists
      const existingTemplate = await mongoStorage.getCustomTemplate(templateId);
      
      if (!existingTemplate) {
        return res.status(404).json({ message: "Custom template not found" });
      }
      
      // Security check - make sure the template belongs to this admin
      if (existingTemplate.adminId.toString() !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Update the template
      const updatedTemplate = await mongoStorage.updateCustomTemplate(templateId, req.body);
      res.json(updatedTemplate);
    } catch (error) {
      console.error("Error updating custom template:", error);
      res.status(500).json({ message: "Failed to update custom template" });
    }
  });
  
  // Delete a custom template
  app.delete("/api/customtemplates/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      const templateId = req.params.id;
      
      // Check if template exists
      const existingTemplate = await mongoStorage.getCustomTemplate(templateId);
      
      if (!existingTemplate) {
        return res.status(404).json({ message: "Custom template not found" });
      }
      
      // Security check - make sure the template belongs to this admin
      if (existingTemplate.adminId.toString() !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Delete the template
      const deleted = await mongoStorage.deleteCustomTemplate(templateId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Custom template not found" });
      }
      
      res.status(200).json({ message: "Custom template deleted successfully" });
    } catch (error) {
      console.error("Error deleting custom template:", error);
      res.status(500).json({ message: "Failed to delete custom template" });
    }
  });
  
  /************************************
   * ADMIN ROUTES - COMPANY CARDS
   ************************************/
  
  // Get all company cards for the current admin
  app.get("/api/companycards", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      const companyCards = await mongoStorage.getCompanyCardsByAdminId(adminId);
      res.json(companyCards);
    } catch (error) {
      console.error("Error fetching company cards:", error);
      res.status(500).json({ message: "Failed to fetch company cards" });
    }
  });
  
  // Get a specific company card
  app.get("/api/companycards/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      const cardId = req.params.id;
      
      const card = await mongoStorage.getCompanyCard(cardId);
      
      if (!card) {
        return res.status(404).json({ message: "Company card not found" });
      }
      
      // Security check - make sure the card belongs to this admin
      if (card.adminId.toString() !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(card);
    } catch (error) {
      console.error("Error fetching company card:", error);
      res.status(500).json({ message: "Failed to fetch company card" });
    }
  });
  
  // Get the active company card for the current admin
  app.get("/api/companycards/active", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      const companyCard = await mongoStorage.getActiveCompanyCardByAdminId(adminId);
      
      if (!companyCard) {
        return res.status(404).json({ message: "No active company card found" });
      }
      
      res.json(companyCard);
    } catch (error) {
      console.error("Error fetching active company card:", error);
      res.status(500).json({ message: "Failed to fetch active company card" });
    }
  });
  
  // Create a new company card with file upload
  app.post("/api/companycards", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      
      // Handle file upload
      if (!req.files || !req.files.image) {
        return res.status(400).json({ message: "Company card image is required" });
      }
      
      const cardImage = req.files.image as UploadedFile;
      const logoImage = req.files.logo as UploadedFile;
      
      // Generate file names
      const cardImageName = `${Date.now()}-${cardImage.name}`;
      const cardImagePath = path.join(uploadPath, cardImageName);
      
      // Save card image
      await cardImage.mv(cardImagePath);
      
      // Get dimensions
      const dimensions = await getImageDimensions(cardImage.data);
      
      if (!dimensions) {
        return res.status(400).json({ message: "Invalid image file" });
      }
      
      // Handle logo if present
      let logoPath = '';
      if (logoImage) {
        const logoName = `${Date.now()}-logo-${logoImage.name}`;
        logoPath = path.join(uploadPath, logoName);
        await logoImage.mv(logoPath);
      }
      
      // Prepare company card data
      const companyCardData = {
        adminId,
        imagePath: `/uploads/${cardImageName}`,
        width: dimensions.width,
        height: dimensions.height,
        isActive: true,
        logoPath: logoImage ? `/uploads/${path.basename(logoPath)}` : '',
        primaryColor: req.body.primaryColor,
        secondaryColor: req.body.secondaryColor,
        websiteUrl: req.body.websiteUrl,
        enquiriesEmail: req.body.enquiriesEmail
      };
      
      // Set all other company cards to inactive
      const existingCards = await mongoStorage.getCompanyCardsByAdminId(adminId);
      
      for (const card of existingCards) {
        if (card.isActive) {
          await mongoStorage.updateCompanyCard(card._id.toString(), { isActive: false });
        }
      }
      
      // Create the new company card
      const newCard = await mongoStorage.createCompanyCard(companyCardData);
      res.status(201).json(newCard);
    } catch (error) {
      console.error("Error creating company card:", error);
      res.status(500).json({ message: "Failed to create company card" });
    }
  });
  
  // Update a company card
  app.patch("/api/companycards/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      const cardId = req.params.id;
      
      // Check if card exists
      const existingCard = await mongoStorage.getCompanyCard(cardId);
      
      if (!existingCard) {
        return res.status(404).json({ message: "Company card not found" });
      }
      
      // Security check - make sure the card belongs to this admin
      if (existingCard.adminId.toString() !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Update the card
      const updatedCard = await mongoStorage.updateCompanyCard(cardId, {
        ...req.body,
        updatedAt: new Date()
      });
      
      res.json(updatedCard);
    } catch (error) {
      console.error("Error updating company card:", error);
      res.status(500).json({ message: "Failed to update company card" });
    }
  });
  
  // Delete a company card
  app.delete("/api/companycards/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user._id.toString();
      const cardId = req.params.id;
      
      // Check if card exists
      const existingCard = await mongoStorage.getCompanyCard(cardId);
      
      if (!existingCard) {
        return res.status(404).json({ message: "Company card not found" });
      }
      
      // Security check - make sure the card belongs to this admin
      if (existingCard.adminId.toString() !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Delete the card
      const deleted = await mongoStorage.deleteCompanyCard(cardId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Company card not found" });
      }
      
      res.status(200).json({ message: "Company card deleted successfully" });
    } catch (error) {
      console.error("Error deleting company card:", error);
      res.status(500).json({ message: "Failed to delete company card" });
    }
  });
  
  /************************************
   * FILE UPLOAD ROUTE
   ************************************/
  
  // Upload an image
  app.post("/api/upload", isAuthenticated, async (req, res) => {
    try {
      if (!req.files || !req.files.image) {
        return res.status(400).json({ message: "No image file provided" });
      }
      
      const image = req.files.image as UploadedFile;
      const imageName = `${Date.now()}-${image.name}`;
      const imagePath = path.join(uploadPath, imageName);
      
      await image.mv(imagePath);
      
      res.status(200).json({ 
        path: `/uploads/${imageName}`,
        url: `/uploads/${imageName}`
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });
  
  return server;
}