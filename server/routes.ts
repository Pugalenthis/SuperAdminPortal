import type { Express, Request, Response, NextFunction } from "express";
import type { UploadedFile } from "express-fileupload";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertAdminSchema, 
  insertEmployeeSchema, 
  insertBusinessCardSchema,
  insertCustomTemplateSchema,
  insertCompanyCardSchema,
  employeeFormSchema,
  companyCardFormSchema,
  InsertCompanyCard
} from "@shared/schema";
import bcrypt from "bcrypt";
import { z } from "zod";
import path from 'path';
import fs from 'fs/promises';
import { promisify } from 'util';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';

// Set up __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    // Create a full URL from the unique URL - using localhost for development
    const isDev = process.env.NODE_ENV === 'development';
    // Use localhost or whatever the replit.app domain is for the deployed version
    const host = isDev ? 'http://localhost:5000' : process.env.HOST || 'https://businesscards.replit.app';
    const fullUrl = `${host}/card/${uniqueUrl}`;
    
    console.log("Generating QR code for URL:", fullUrl);
    
    // Options for QR code generation
    const options = {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000', // Always use black for better visibility
        light: '#FFFFFF'
      }
    };
    
    // Generate QR code as data URL
    const qrDataUrl = await promisify(QRCode.toDataURL)(fullUrl, options);
    console.log("QR code generation successful, data URL length:", qrDataUrl ? qrDataUrl.length : 0);
    return qrDataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    return null;
  }
}

// Helper function to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Helper to check if the user is an admin
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Check if the user is an admin (admins have different properties than superAdmins)
  if (!req.user?.orgName) {
    return res.status(403).json({ message: "Forbidden: Requires admin privileges" });
  }
  
  next();
};

// Helper to check if the user is a super admin
const isSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Check if the user is a super admin
  if (req.user?.orgName) {
    return res.status(403).json({ message: "Forbidden: Requires super admin privileges" });
  }
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  /************************************
   * SUPER ADMIN ROUTES
   ************************************/
  
  // Get all admins
  app.get("/api/admins", isSuperAdmin, async (req, res) => {
    try {
      const admins = await storage.getAllAdmins();
      // Remove sensitive information
      const safeAdmins = admins.map(admin => ({
        id: admin.id,
        orgName: admin.orgName,
        email: admin.email,
        status: admin.status,
        createdAt: admin.createdAt
      }));
      res.json(safeAdmins);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admins" });
    }
  });

  // Create a new admin
  app.post("/api/admins", isSuperAdmin, async (req, res) => {
    try {
      // Validate request body
      const validatedData = insertAdminSchema.parse(req.body);

      // Check if admin with this email already exists
      const existingAdmin = await storage.getAdminByEmail(validatedData.email);
      if (existingAdmin) {
        return res.status(400).json({ message: "An admin with this email already exists" });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Create new admin
      const newAdmin = await storage.createAdmin({
        ...validatedData,
        password: hashedPassword
      });

      // Return the new admin without password
      res.status(201).json({
        id: newAdmin.id,
        orgName: newAdmin.orgName,
        email: newAdmin.email,
        status: newAdmin.status,
        createdAt: newAdmin.createdAt
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create admin" });
    }
  });

  // Delete an admin
  app.delete("/api/admins/:id", isSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid admin ID" });
      }

      // Check if admin exists
      const admin = await storage.getAdmin(id);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      // Delete the admin
      const success = await storage.deleteAdmin(id);
      if (success) {
        res.status(200).json({ message: "Admin deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete admin" });
      }
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  /************************************
   * ADMIN ROUTES - EMPLOYEES
   ************************************/
  
  // Get all employees for the current admin
  app.get("/api/employees", isAdmin, async (req, res) => {
    try {
      const adminId = req.user.id;
      const employees = await storage.getEmployeesByAdminId(adminId);
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });
  
  // Get a specific employee
  app.get("/api/employees/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user.id;
      const employeeId = parseInt(req.params.id);
      
      if (isNaN(employeeId)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      
      const employee = await storage.getEmployee(employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // Security check - make sure the employee belongs to this admin
      if (employee.adminId !== adminId) {
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
      const adminId = req.user.id;
      
      // Validate request body
      const validatedData = employeeFormSchema.parse(req.body);
      
      // Create the employee
      const employee = await storage.createEmployee({
        ...validatedData,
        adminId
      });
      
      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating employee:", error);
      res.status(500).json({ message: "Failed to create employee" });
    }
  });
  
  // Update an employee (PUT)
  app.put("/api/employees/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user.id;
      const employeeId = parseInt(req.params.id);
      
      if (isNaN(employeeId)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      
      // Validate request body
      const validatedData = employeeFormSchema.parse(req.body);
      
      // Check if employee exists and belongs to this admin
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      if (employee.adminId !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Update the employee
      const updatedEmployee = await storage.updateEmployee(employeeId, validatedData);
      
      res.json(updatedEmployee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error updating employee:", error);
      res.status(500).json({ message: "Failed to update employee" });
    }
  });
  
  // Update an employee (PATCH)
  app.patch("/api/employees/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user.id;
      const employeeId = parseInt(req.params.id);
      
      if (isNaN(employeeId)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      
      // Process the request body before validation
      let processedData = { ...req.body };
      
      // Clean profile image URL if it exists (handling potentially problematic characters)
      if (processedData.profileImage) {
        try {
          // Decode if it's already encoded
          processedData.profileImage = decodeURIComponent(processedData.profileImage);
        } catch (e) {
          // If there's an error decoding, just use the original
          console.log("URL decoding error, using original:", e);
        }
      }
      
      // Get current employee data
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      if (employee.adminId !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Merge with existing data for validation
      const mergedData = {
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone || "",
        title: employee.title,
        department: employee.department || "",
        profileImage: employee.profileImage || "",
        ...processedData
      };
      
      // Validate data
      const validatedData = employeeFormSchema.parse(mergedData);
      
      // Update the employee
      const updatedEmployee = await storage.updateEmployee(employeeId, validatedData);
      
      res.json(updatedEmployee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return res.status(400).json({ 
          message: "Invalid JSON in request body. The profile image URL may contain characters that need to be encoded." 
        });
      }
      
      console.error("Error updating employee:", error);
      res.status(500).json({ message: "Failed to update employee" });
    }
  });
  
  // Delete an employee
  app.delete("/api/employees/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user.id;
      const employeeId = parseInt(req.params.id);
      
      if (isNaN(employeeId)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      
      // Check if employee exists and belongs to this admin
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      if (employee.adminId !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Delete the employee
      const success = await storage.deleteEmployee(employeeId);
      
      if (success) {
        res.status(200).json({ message: "Employee deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete employee" });
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });
  
  /************************************
   * ADMIN ROUTES - COMPANY CARDS
   ************************************/
  
  // Get all company cards for the current admin
  app.get("/api/company-cards", isAdmin, async (req, res) => {
    try {
      const adminId = req.user.id;
      const companyCards = await storage.getCompanyCardsByAdminId(adminId);
      res.json(companyCards);
    } catch (error) {
      console.error("Error fetching company cards:", error);
      res.status(500).json({ message: "Failed to fetch company cards" });
    }
  });
  
  // Get active company card for the current admin
  app.get("/api/company-cards/active", isAdmin, async (req, res) => {
    try {
      const adminId = req.user.id;
      const companyCard = await storage.getActiveCompanyCardByAdminId(adminId);
      
      if (!companyCard) {
        return res.status(404).json({ message: "No active company card found" });
      }
      
      res.json(companyCard);
    } catch (error) {
      console.error("Error fetching active company card:", error);
      res.status(500).json({ message: "Failed to fetch active company card" });
    }
  });
  
  // Get a specific company card
  app.get("/api/company-cards/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user.id;
      const companyCardId = parseInt(req.params.id);
      
      if (isNaN(companyCardId)) {
        return res.status(400).json({ message: "Invalid company card ID" });
      }
      
      const companyCard = await storage.getCompanyCard(companyCardId);
      
      if (!companyCard) {
        return res.status(404).json({ message: "Company card not found" });
      }
      
      // Security check - make sure the company card belongs to this admin
      if (companyCard.adminId !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(companyCard);
    } catch (error) {
      console.error("Error fetching company card:", error);
      res.status(500).json({ message: "Failed to fetch company card" });
    }
  });
  
  // Create a new company card
  app.post("/api/company-cards", isAdmin, async (req, res) => {
    try {
      const adminId = req.user.id;
      
      // Validate request body
      const validatedData = companyCardFormSchema.parse({
        ...req.body,
        adminId
      });
      
      // Create the company card
      const companyCard = await storage.createCompanyCard(validatedData);
      
      res.status(201).json(companyCard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating company card:", error);
      res.status(500).json({ message: "Failed to create company card" });
    }
  });
  
  // Update a company card
  app.patch("/api/company-cards/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user.id;
      const companyCardId = parseInt(req.params.id);
      
      if (isNaN(companyCardId)) {
        return res.status(400).json({ message: "Invalid company card ID" });
      }
      
      // Check if company card exists and belongs to this admin
      const companyCard = await storage.getCompanyCard(companyCardId);
      if (!companyCard) {
        return res.status(404).json({ message: "Company card not found" });
      }
      
      if (companyCard.adminId !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Update the company card
      const updatedCompanyCard = await storage.updateCompanyCard(companyCardId, req.body);
      
      res.json(updatedCompanyCard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error updating company card:", error);
      res.status(500).json({ message: "Failed to update company card" });
    }
  });
  
  // Delete a company card
  app.delete("/api/company-cards/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user.id;
      const companyCardId = parseInt(req.params.id);
      
      if (isNaN(companyCardId)) {
        return res.status(400).json({ message: "Invalid company card ID" });
      }
      
      // Check if company card exists and belongs to this admin
      const companyCard = await storage.getCompanyCard(companyCardId);
      if (!companyCard) {
        return res.status(404).json({ message: "Company card not found" });
      }
      
      if (companyCard.adminId !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Delete the company card
      const success = await storage.deleteCompanyCard(companyCardId);
      
      if (success) {
        res.status(200).json({ message: "Company card deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete company card" });
      }
    } catch (error) {
      console.error("Error deleting company card:", error);
      res.status(500).json({ message: "Failed to delete company card" });
    }
  });

  /************************************
   * ADMIN ROUTES - BUSINESS CARDS
   ************************************/
  
  // Get all card templates
  app.get("/api/templates", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getAllCardTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });
  
  // Get all card templates (alternative endpoint)
  app.get("/api/card-templates", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getAllCardTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });
  
  // Get a specific card template
  app.get("/api/card-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      
      if (isNaN(templateId)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      
      const template = await storage.getCardTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });
  
  // Get all business cards for an admin
  app.get("/api/cards", isAdmin, async (req, res) => {
    try {
      const adminId = req.user.id;
      const cards = await storage.getBusinessCardsByAdminId(adminId);
      
      // Enhance cards with employee details, template info, and custom template info if applicable
      const enhancedCards = await Promise.all(
        cards.map(async (card) => {
          // Get employee and standard template 
          const [employee, template] = await Promise.all([
            storage.getEmployee(card.employeeId),
            storage.getCardTemplate(card.templateId)
          ]);
          
          // If this card uses a custom template, include that information too
          let customTemplate = null;
          if (card.customTemplateId) {
            customTemplate = await storage.getCustomTemplate(card.customTemplateId);
          }
          
          // If this card has an associated company card, include that information too
          let companyCard = null;
          if (card.companyCardId) {
            companyCard = await storage.getCompanyCard(card.companyCardId);
          }
          
          return {
            ...card,
            employee,
            template,
            customTemplate,
            companyCard
          };
        })
      );
      
      // Set headers to prevent caching issues
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json(enhancedCards);
    } catch (error) {
      console.error("Error fetching cards:", error);
      res.status(500).json({ message: "Failed to fetch business cards" });
    }
  });
  
  // Get business cards for a specific employee
  app.get("/api/employees/:employeeId/cards", isAdmin, async (req, res) => {
    try {
      const adminId = req.user.id;
      const employeeId = parseInt(req.params.employeeId);
      
      if (isNaN(employeeId)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      
      // Security check - make sure the employee belongs to this admin
      const employee = await storage.getEmployee(employeeId);
      if (!employee || employee.adminId !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const cards = await storage.getBusinessCardsByEmployeeId(employeeId);
      
      // Enhance cards with custom template and company card information
      const enhancedCards = await Promise.all(
        cards.map(async (card) => {
          // If the card uses a custom template, fetch it
          let customTemplate = null;
          if (card.customTemplateId) {
            customTemplate = await storage.getCustomTemplate(card.customTemplateId);
          }
          
          // If the card has a company card, fetch it
          let companyCard = null;
          if (card.companyCardId) {
            companyCard = await storage.getCompanyCard(card.companyCardId);
          }
          
          return {
            ...card,
            customTemplate,
            companyCard
          };
        })
      );
      
      res.json(enhancedCards);
    } catch (error) {
      console.error("Error fetching cards:", error);
      res.status(500).json({ message: "Failed to fetch business cards" });
    }
  });
  
  // Get a specific business card
  app.get("/api/cards/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user.id;
      const cardId = parseInt(req.params.id);
      
      if (isNaN(cardId)) {
        return res.status(400).json({ message: "Invalid card ID" });
      }
      
      const card = await storage.getBusinessCard(cardId);
      
      if (!card) {
        return res.status(404).json({ message: "Business card not found" });
      }
      
      // Get the employee to check ownership
      const employee = await storage.getEmployee(card.employeeId);
      
      if (!employee || employee.adminId !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get the template
      const template = await storage.getCardTemplate(card.templateId);
      
      // If this card uses a custom template, include that information
      let customTemplate = null;
      if (card.customTemplateId) {
        customTemplate = await storage.getCustomTemplate(card.customTemplateId);
      }
      
      // If this card has an associated company card, include that information
      let companyCard = null;
      if (card.companyCardId) {
        companyCard = await storage.getCompanyCard(card.companyCardId);
      }
      
      // Return the enhanced card
      res.json({
        ...card,
        employee,
        template,
        customTemplate,
        companyCard
      });
    } catch (error) {
      console.error("Error fetching card:", error);
      res.status(500).json({ message: "Failed to fetch business card" });
    }
  });
  
  // Create a new business card
  app.post("/api/cards", isAdmin, async (req, res) => {
    try {
      const adminId = req.user.id;
      
      // Basic validation of required fields
      const { employeeId, templateId, customization } = req.body;
      
      if (!employeeId || !templateId) {
        return res.status(400).json({ 
          message: "Missing required fields", 
          errors: ["employeeId and templateId are required"] 
        });
      }
      
      // Check if employee exists and belongs to this admin
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      if (employee.adminId !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Check if template exists - it could be a standard template or a custom template
      let template = await storage.getCardTemplate(templateId);
      let customTemplate;
      let finalTemplateId = templateId;
      
      // If not a standard template, check if it's a custom template
      if (!template) {
        customTemplate = await storage.getCustomTemplate(templateId);
        if (!customTemplate) {
          return res.status(404).json({ message: "Template not found" });
        }
        // If it's a custom template, use its base template ID
        finalTemplateId = customTemplate.baseTemplateId;
      }
      
      // Generate a unique URL based on employee name
      const uniqueUrl = storage.generateUniqueUrl(employee.firstName, employee.lastName);
      
      // Generate a QR code for the business card URL
      let qrCodeUrl = null;
      try {
        console.log("Generating QR code for new card with URL:", uniqueUrl);
        // QR codes are always generated in black for better visibility, regardless of brand color
        // Generate the QR code (accent color parameter is ignored in the function)
        qrCodeUrl = await generateQRCode(uniqueUrl, '#000000');
        console.log("QR code generation successful:", qrCodeUrl ? "QR code generated" : "Failed to generate QR code");
      } catch (qrError) {
        console.error("Error generating QR code:", qrError);
        // Continue even if QR code generation fails
      }
      
      // Create the business card
      const card = await storage.createBusinessCard({
        employeeId,
        templateId: finalTemplateId, // Use the base template ID if it's a custom template
        customTemplateId: customTemplate ? templateId : null, // Store the custom template ID if applicable
        customization,
        uniqueUrl,
        qrCodeUrl, // Add the QR code URL
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      res.status(201).json(card);
    } catch (error) {
      console.error("Error creating business card:", error);
      res.status(500).json({ message: "Failed to create business card" });
    }
  });
  
  // Update a business card
  app.put("/api/cards/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user.id;
      const cardId = parseInt(req.params.id);
      
      if (isNaN(cardId)) {
        return res.status(400).json({ message: "Invalid card ID" });
      }
      
      // Get the current card
      const card = await storage.getBusinessCard(cardId);
      if (!card) {
        return res.status(404).json({ message: "Business card not found" });
      }
      
      // Check if the card belongs to an employee of this admin
      const employee = await storage.getEmployee(card.employeeId);
      if (!employee || employee.adminId !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Extract fields that can be updated
      const { templateId, customTemplateId, customization, status, companyCardId } = req.body;
      
      // If company card ID is provided, verify it exists and belongs to this admin
      if (companyCardId) {
        const companyCard = await storage.getCompanyCard(companyCardId);
        if (!companyCard) {
          return res.status(400).json({ message: "Invalid company card ID" });
        }
        
        if (companyCard.adminId !== adminId) {
          return res.status(403).json({ message: "Access denied to this company card" });
        }
      }
      
      // Log the update data for debugging
      console.log("Updating business card with data:", { 
        cardId, templateId, customTemplateId, companyCardId, status 
      });
      
      // Check if we need to regenerate QR code (if company card changed, we might need new accent color)
      let qrCodeUrl = card.qrCodeUrl; // Keep existing QR code by default
      
      if (!qrCodeUrl || companyCardId !== card.companyCardId) {
        try {
          // QR codes are always generated in black for better visibility
          // Generate or regenerate QR code (accent color parameter is ignored in the function)
          qrCodeUrl = await generateQRCode(card.uniqueUrl, '#000000');
        } catch (qrError) {
          console.error("Error regenerating QR code during update:", qrError);
          // Continue with existing QR code if generation fails
        }
      }
      
      // Update the card
      const updatedCard = await storage.updateBusinessCard(cardId, {
        templateId,
        customTemplateId,
        customization,
        companyCardId,
        qrCodeUrl, // Include regenerated QR code if applicable
        status
      });
      
      res.json(updatedCard);
    } catch (error) {
      console.error("Error updating business card:", error);
      res.status(500).json({ message: "Failed to update business card" });
    }
  });
  
  // Delete a business card
  app.delete("/api/cards/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user.id;
      const cardId = parseInt(req.params.id);
      
      if (isNaN(cardId)) {
        return res.status(400).json({ message: "Invalid card ID" });
      }
      
      // Get the current card
      const card = await storage.getBusinessCard(cardId);
      if (!card) {
        return res.status(404).json({ message: "Business card not found" });
      }
      
      // Check if the card belongs to an employee of this admin
      const employee = await storage.getEmployee(card.employeeId);
      if (!employee || employee.adminId !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Delete the card
      const success = await storage.deleteBusinessCard(cardId);
      
      if (success) {
        res.status(200).json({ message: "Business card deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete business card" });
      }
    } catch (error) {
      console.error("Error deleting business card:", error);
      res.status(500).json({ message: "Failed to delete business card" });
    }
  });
  
  /************************************
   * PUBLIC ROUTES
   ************************************/
  
  // Get public business card by URL
  app.get("/api/public/cards/:uniqueUrl", async (req, res) => {
    try {
      const uniqueUrl = req.params.uniqueUrl;
      
      // Get the card
      const card = await storage.getBusinessCardByUrl(uniqueUrl);
      
      if (!card || card.status !== 'active') {
        return res.status(404).json({ message: "Business card not found" });
      }
      
      // Get the employee info
      const employee = await storage.getEmployee(card.employeeId);
      
      if (!employee || employee.status !== 'active') {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // Get the template
      const template = await storage.getCardTemplate(card.templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      // If this card uses a custom template, include that information
      let customTemplate = null;
      if (card.customTemplateId) {
        customTemplate = await storage.getCustomTemplate(card.customTemplateId);
      }
      
      // If this card has an associated company card, include that information
      let companyCard = null;
      if (card.companyCardId) {
        companyCard = await storage.getCompanyCard(card.companyCardId);
      } else {
        // If no company card is specifically assigned to this business card, 
        // use the admin's active company card instead
        const admin = await storage.getAdmin(employee.adminId);
        if (admin) {
          const activeCompanyCard = await storage.getActiveCompanyCardByAdminId(admin.id);
          if (activeCompanyCard) {
            companyCard = activeCompanyCard;
          }
        }
      }
      
      // Combine data and return
      res.json({
        card,
        employee,
        template,
        customTemplate,
        companyCard
      });
    } catch (error) {
      console.error("Error fetching public card:", error);
      res.status(500).json({ message: "Failed to fetch business card" });
    }
  });

  /************************************
   * ADMIN ROUTES - CUSTOM TEMPLATES
   ************************************/
  
  // Get all custom templates for the current admin
  app.get("/api/custom-templates", isAdmin, async (req, res) => {
    try {
      const adminId = req.user!.id;
      const customTemplates = await storage.getCustomTemplatesByAdminId(adminId);
      
      // Enhance templates with base template info
      const enhancedTemplates = await Promise.all(
        customTemplates.map(async (template) => {
          const baseTemplate = await storage.getCardTemplate(template.baseTemplateId);
          return {
            ...template,
            baseTemplate
          };
        })
      );
      
      res.json(enhancedTemplates);
    } catch (error) {
      console.error("Error fetching custom templates:", error);
      res.status(500).json({ message: "Failed to fetch custom templates" });
    }
  });
  
  // Get a specific custom template
  app.get("/api/custom-templates/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user!.id;
      const templateId = parseInt(req.params.id);
      
      if (isNaN(templateId)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      
      const template = await storage.getCustomTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      // Security check - make sure the template belongs to this admin
      if (template.adminId !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get the base template
      const baseTemplate = await storage.getCardTemplate(template.baseTemplateId);
      
      res.json({
        ...template,
        baseTemplate
      });
    } catch (error) {
      console.error("Error fetching custom template:", error);
      res.status(500).json({ message: "Failed to fetch custom template" });
    }
  });
  
  // Create a new custom template
  app.post("/api/custom-templates", isAdmin, async (req, res) => {
    try {
      const adminId = req.user!.id;
      
      // Log what we received for debugging
      console.log("Creating custom template with data:", {
        ...req.body,
        adminId
      });
      
      // Make sure baseTemplateId is a number
      const dataToValidate = {
        ...req.body,
        adminId,
        baseTemplateId: req.body.baseTemplateId ? Number(req.body.baseTemplateId) : undefined
      };
      
      // Validate request body
      const validatedData = insertCustomTemplateSchema.parse(dataToValidate);
      
      // Check if base template exists
      const baseTemplate = await storage.getCardTemplate(validatedData.baseTemplateId);
      if (!baseTemplate) {
        return res.status(404).json({ message: "Base template not found" });
      }
      
      // Create the custom template
      const customTemplate = await storage.createCustomTemplate(validatedData);
      
      res.status(201).json({
        ...customTemplate,
        baseTemplate
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error details:", error.errors);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating custom template:", error);
      res.status(500).json({ message: "Failed to create custom template" });
    }
  });
  
  // Update a custom template
  app.put("/api/custom-templates/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user!.id;
      const templateId = parseInt(req.params.id);
      
      if (isNaN(templateId)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      
      // Check if template exists and belongs to this admin
      const template = await storage.getCustomTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      if (template.adminId !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Update the template (only allowing name, description, and customization to be updated)
      const { name, description, customization } = req.body;
      const updateData: any = {};
      
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (customization) updateData.customization = customization;
      
      const updatedTemplate = await storage.updateCustomTemplate(templateId, updateData);
      
      // Get the base template
      const baseTemplate = await storage.getCardTemplate(updatedTemplate!.baseTemplateId);
      
      res.json({
        ...updatedTemplate,
        baseTemplate
      });
    } catch (error) {
      console.error("Error updating custom template:", error);
      res.status(500).json({ message: "Failed to update custom template" });
    }
  });
  
  // Delete a custom template
  app.delete("/api/custom-templates/:id", isAdmin, async (req, res) => {
    try {
      const adminId = req.user!.id;
      const templateId = parseInt(req.params.id);
      
      if (isNaN(templateId)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      
      // Check if template exists and belongs to this admin
      const template = await storage.getCustomTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      if (template.adminId !== adminId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Delete the template
      const success = await storage.deleteCustomTemplate(templateId);
      
      if (success) {
        res.status(200).json({ message: "Template deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete template" });
      }
    } catch (error) {
      console.error("Error deleting custom template:", error);
      res.status(500).json({ message: "Failed to delete custom template" });
    }
  });

  /************************************
   * ADMIN ROUTES - ORGANIZATION COMPANY CARD
   ************************************/
  
  // Get active company card for the admin
  app.get("/api/company-card", isAdmin, async (req, res) => {
    try {
      const adminId = req.user!.id;
      const companyCards = await storage.getCompanyCardsByAdminId(adminId);
      res.json(companyCards);
    } catch (error) {
      console.error("Error fetching company card:", error);
      res.status(500).json({ message: "Failed to fetch company card" });
    }
  });

  // Upload new company card image
  app.post("/api/company-card", isAdmin, async (req, res) => {
    try {
      const adminId = req.user!.id;
      
      // Check if we have a file in the request
      if (!req.files || !req.files.image) {
        return res.status(400).json({ message: "No image file uploaded" });
      }
      
      const imageFile = req.files.image;
      
      // Validate file type
      if (!imageFile.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: "Uploaded file is not an image" });
      }
      
      // Get image dimensions
      const dimensions = await getImageDimensions(imageFile.data);
      if (!dimensions) {
        return res.status(400).json({ message: "Could not determine image dimensions" });
      }
      
      // Create a unique filename
      const timestamp = Date.now();
      const filename = `company_card_${adminId}_${timestamp}${path.extname(imageFile.name)}`;
      const uploadPath = path.join(__dirname, '../public/uploads', filename);
      const publicPath = `/uploads/${filename}`;
      
      // Ensure the uploads directory exists
      await fs.mkdir(path.join(__dirname, '../public/uploads'), { recursive: true });
      
      // Save the file
      await new Promise<void>((resolve, reject) => {
        imageFile.mv(uploadPath, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // Create entry in database
      const companyCard = await storage.createCompanyCard({
        adminId,
        imagePath: publicPath,
        width: dimensions.width,
        height: dimensions.height,
        isActive: true
      });
      
      res.status(201).json(companyCard);
    } catch (error) {
      console.error("Error uploading company card:", error);
      res.status(500).json({ message: "Failed to upload company card" });
    }
  });
  
  // Update company branding (logo and colors)
  app.post("/api/company-branding", isAdmin, async (req, res) => {
    try {
      const adminId = req.user!.id;
      
      // Get active company card or create a new one if none exists
      let companyCard = await storage.getActiveCompanyCardByAdminId(adminId);
      const updateData: Partial<InsertCompanyCard> = {};
      
      // Handle logo upload if present
      if (req.files && req.files.logo) {
        const logoFile = req.files.logo;
        
        // Validate file type
        if (!logoFile.mimetype.startsWith('image/')) {
          return res.status(400).json({ message: "Uploaded logo is not an image" });
        }
        
        // Create a unique filename for the logo
        const timestamp = Date.now();
        const filename = `company_logo_${adminId}_${timestamp}${path.extname(logoFile.name)}`;
        const uploadPath = path.join(__dirname, '../public/uploads', filename);
        const publicPath = `/uploads/${filename}`;
        
        // Ensure the uploads directory exists
        await fs.mkdir(path.join(__dirname, '../public/uploads'), { recursive: true });
        
        // Save the file
        await new Promise<void>((resolve, reject) => {
          logoFile.mv(uploadPath, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        // Add logo path to update data
        updateData.logoPath = publicPath;
      }
      
      // Handle color updates if present
      if (req.body.primaryColor) {
        updateData.primaryColor = req.body.primaryColor;
      }
      
      if (req.body.secondaryColor) {
        updateData.secondaryColor = req.body.secondaryColor;
      }
      
      // Handle website URL and enquiries email if present
      if (req.body.websiteUrl) {
        updateData.websiteUrl = req.body.websiteUrl;
      }
      
      if (req.body.enquiriesEmail) {
        updateData.enquiriesEmail = req.body.enquiriesEmail;
      }
      
      // Update or create company card
      if (companyCard) {
        companyCard = await storage.updateCompanyCard(companyCard.id, updateData);
      } else {
        // If no company card exists yet, we need at least a placeholder image path
        updateData.adminId = adminId;
        updateData.imagePath = '/uploads/placeholder-company-card.svg'; // Using the SVG placeholder
        updateData.width = 1066;
        updateData.height = 442;
        updateData.isActive = true;
        companyCard = await storage.createCompanyCard(updateData as InsertCompanyCard);
      }
      
      res.status(200).json(companyCard);
    } catch (error) {
      console.error("Error updating company branding:", error);
      res.status(500).json({ message: "Failed to update company branding" });
    }
  });

  // Delete company card
  app.delete("/api/company-card", isAdmin, async (req, res) => {
    try {
      const adminId = req.user!.id;
      
      // Get all company cards for this admin
      const companyCards = await storage.getCompanyCardsByAdminId(adminId);
      
      if (!companyCards || companyCards.length === 0) {
        return res.status(404).json({ message: "No company cards found" });
      }
      
      // Delete all company cards (typically there should be only one active card)
      let success = true;
      for (const card of companyCards) {
        // Delete the file from the filesystem if it exists
        try {
          if (card.imagePath) {
            const filePath = path.join(__dirname, '../public', card.imagePath);
            await fs.unlink(filePath);
          }
        } catch (fileError) {
          console.error("Error deleting company card file:", fileError);
          // Continue even if file deletion fails
        }
        
        // Delete from database
        const deleteResult = await storage.deleteCompanyCard(card.id);
        if (!deleteResult) {
          success = false;
        }
      }
      
      if (success) {
        res.status(200).json({ message: "Company card deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete company card" });
      }
    } catch (error) {
      console.error("Error deleting company card:", error);
      res.status(500).json({ message: "Failed to delete company card" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
