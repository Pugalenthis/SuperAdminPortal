import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertAdminSchema, 
  insertEmployeeSchema, 
  insertBusinessCardSchema,
  employeeFormSchema
} from "@shared/schema";
import bcrypt from "bcrypt";
import { z } from "zod";

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
  
  // Get all business cards for an admin
  app.get("/api/cards", isAdmin, async (req, res) => {
    try {
      const adminId = req.user.id;
      const cards = await storage.getBusinessCardsByAdminId(adminId);
      
      // Enhance cards with employee details and template info
      const enhancedCards = await Promise.all(
        cards.map(async (card) => {
          const [employee, template] = await Promise.all([
            storage.getEmployee(card.employeeId),
            storage.getCardTemplate(card.templateId)
          ]);
          
          return {
            ...card,
            employee,
            template
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
      res.json(cards);
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
      
      res.json(card);
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
      
      // Check if template exists
      const template = await storage.getCardTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      // Generate a unique URL based on employee name
      const uniqueUrl = storage.generateUniqueUrl(employee.firstName, employee.lastName);
      
      // Create the business card
      const card = await storage.createBusinessCard({
        employeeId,
        templateId,
        customization,
        uniqueUrl,
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
      const { templateId, customization, status } = req.body;
      
      // Update the card
      const updatedCard = await storage.updateBusinessCard(cardId, {
        templateId,
        customization,
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
      
      // Combine data and return
      res.json({
        card,
        employee,
        template
      });
    } catch (error) {
      console.error("Error fetching public card:", error);
      res.status(500).json({ message: "Failed to fetch business card" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
