import { Router } from 'express';
import { storage } from './storage.js';
import sharp from 'sharp';
import QRCode from 'qrcode';
import { z } from 'zod';
import { loginSchema, employeeFormSchema, companyCardFormSchema } from '../shared/schema.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to get image dimensions
async function getImageDimensions(imageBuffer) {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
    };
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    throw error;
  }
}

// Generate QR Code
async function generateQRCode(uniqueUrl, accentColor = '#0066cc') {
  try {
    // Add the domain to the URL for the QR code
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const fullUrl = `${baseUrl}/card/${uniqueUrl}`;

    // QR Code options
    const options = {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
      color: {
        dark: accentColor,
        light: "#FFFFFF"
      }
    };
    
    // Generate QR code as data URL
    return await QRCode.toDataURL(fullUrl, options);
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};

// Middleware to check if user is an admin
const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.userType === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Forbidden' });
};

// Middleware to check if user is a super admin
const isSuperAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.userType === 'superadmin') {
    return next();
  }
  res.status(403).json({ message: 'Forbidden' });
};

export function registerRoutes(app) {
  const router = Router();

  // ===== Admin Routes =====
  
  // Get all admins (super admin only)
  router.get('/admins', isSuperAdmin, async (req, res) => {
    try {
      const admins = await storage.getAllAdmins();
      res.json(admins);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create admin (super admin only)
  router.post('/admins', isSuperAdmin, async (req, res) => {
    try {
      const { orgName, email, password } = req.body;
      
      // Validate input
      if (!orgName || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
      }
      
      // Check if admin with this email already exists
      const existingAdmin = await storage.getAdminByEmail(email);
      if (existingAdmin) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      
      const admin = await storage.createAdmin({ orgName, email, password });
      res.status(201).json({
        id: admin._id,
        email: admin.email,
        orgName: admin.orgName
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete admin (super admin only)
  router.delete('/admins/:id', isSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteAdmin(id);
      if (success) {
        res.status(200).json({ message: 'Admin deleted successfully' });
      } else {
        res.status(404).json({ message: 'Admin not found' });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== Employee Routes =====
  
  // Get all employees for current admin
  router.get('/employees', isAdmin, async (req, res) => {
    try {
      const employees = await storage.getEmployeesByAdminId(req.user._id);
      res.json(employees);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create employee
  router.post('/employees', isAdmin, async (req, res) => {
    try {
      // Validate with zod schema
      const validationResult = employeeFormSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation error',
          errors: validationResult.error.errors 
        });
      }
      
      const employee = await storage.createEmployee({
        ...validationResult.data,
        adminId: req.user._id
      });
      
      res.status(201).json(employee);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update employee
  router.put('/employees/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the employee and check ownership
      const employee = await storage.getEmployee(id);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      
      if (employee.adminId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this employee' });
      }
      
      // Validate input
      const validationResult = employeeFormSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation error',
          errors: validationResult.error.errors 
        });
      }
      
      const updatedEmployee = await storage.updateEmployee(id, validationResult.data);
      res.json(updatedEmployee);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete employee
  router.delete('/employees/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the employee and check ownership
      const employee = await storage.getEmployee(id);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      
      if (employee.adminId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this employee' });
      }
      
      const success = await storage.deleteEmployee(id);
      if (success) {
        res.status(200).json({ message: 'Employee deleted successfully' });
      } else {
        res.status(404).json({ message: 'Employee not found' });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== Business Card Routes =====
  
  // Get all business cards for current admin
  router.get('/business-cards', isAdmin, async (req, res) => {
    try {
      const cards = await storage.getBusinessCardsByAdminId(req.user._id);
      res.json(cards);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get business cards by employee
  router.get('/business-cards/employee/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if employee belongs to admin
      const employee = await storage.getEmployee(id);
      if (!employee || employee.adminId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to access this employee' });
      }
      
      const cards = await storage.getBusinessCardsByEmployeeId(id);
      res.json(cards);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create business card
  router.post('/business-cards', isAdmin, async (req, res) => {
    try {
      const { employeeId, templateId, customTemplateId, customization } = req.body;
      
      if (!employeeId || !templateId) {
        return res.status(400).json({ message: 'Employee ID and template ID are required' });
      }
      
      // Check if employee belongs to admin
      const employee = await storage.getEmployee(employeeId);
      if (!employee || employee.adminId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to create a card for this employee' });
      }
      
      // Generate unique URL
      const uniqueUrl = storage.generateUniqueUrl(employee.firstName, employee.lastName);
      
      // Get any active company card
      const companyCard = await storage.getActiveCompanyCardByAdminId(req.user._id);
      
      // Generate QR code
      const qrCodeUrl = await generateQRCode(uniqueUrl);
      
      const businessCard = await storage.createBusinessCard({
        employeeId,
        templateId,
        customTemplateId: customTemplateId || null,
        companyCardId: companyCard ? companyCard._id : null,
        customization: customization || {},
        uniqueUrl,
        qrCodeUrl
      });
      
      res.status(201).json(businessCard);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update business card
  router.put('/business-cards/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { templateId, customTemplateId, customization } = req.body;
      
      // Get business card and check ownership
      const card = await storage.getBusinessCard(id);
      if (!card) {
        return res.status(404).json({ message: 'Business card not found' });
      }
      
      const employee = await storage.getEmployee(card.employeeId);
      if (!employee || employee.adminId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this card' });
      }
      
      // Update card
      const updatedCard = await storage.updateBusinessCard(id, {
        templateId: templateId || card.templateId,
        customTemplateId: customTemplateId,
        customization: customization || card.customization
      });
      
      res.json(updatedCard);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete business card
  router.delete('/business-cards/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get business card and check ownership
      const card = await storage.getBusinessCard(id);
      if (!card) {
        return res.status(404).json({ message: 'Business card not found' });
      }
      
      const employee = await storage.getEmployee(card.employeeId);
      if (!employee || employee.adminId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this card' });
      }
      
      const success = await storage.deleteBusinessCard(id);
      if (success) {
        res.status(200).json({ message: 'Business card deleted successfully' });
      } else {
        res.status(404).json({ message: 'Business card not found' });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== Card Template Routes =====
  
  // Get all card templates
  router.get('/card-templates', isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getAllCardTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== Custom Template Routes =====
  
  // Get all custom templates for current admin
  router.get('/custom-templates', isAdmin, async (req, res) => {
    try {
      const templates = await storage.getCustomTemplatesByAdminId(req.user._id);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create custom template
  router.post('/custom-templates', isAdmin, async (req, res) => {
    try {
      const { name, baseTemplateId, customization, description } = req.body;
      
      if (!name || !baseTemplateId || !customization) {
        return res.status(400).json({ message: 'Name, base template ID, and customization are required' });
      }
      
      const template = await storage.createCustomTemplate({
        adminId: req.user._id,
        name,
        baseTemplateId,
        description: description || '',
        customization
      });
      
      res.status(201).json(template);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update custom template
  router.put('/custom-templates/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, customization, description } = req.body;
      
      // Get template and check ownership
      const template = await storage.getCustomTemplate(id);
      if (!template) {
        return res.status(404).json({ message: 'Custom template not found' });
      }
      
      if (template.adminId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this template' });
      }
      
      // Update template
      const updatedTemplate = await storage.updateCustomTemplate(id, {
        name: name || template.name,
        customization: customization || template.customization,
        description: description !== undefined ? description : template.description
      });
      
      res.json(updatedTemplate);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete custom template
  router.delete('/custom-templates/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get template and check ownership
      const template = await storage.getCustomTemplate(id);
      if (!template) {
        return res.status(404).json({ message: 'Custom template not found' });
      }
      
      if (template.adminId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this template' });
      }
      
      const success = await storage.deleteCustomTemplate(id);
      if (success) {
        res.status(200).json({ message: 'Custom template deleted successfully' });
      } else {
        res.status(404).json({ message: 'Custom template not found' });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== Company Card Routes =====
  
  // Get all company cards for current admin
  router.get('/company-cards', isAdmin, async (req, res) => {
    try {
      const cards = await storage.getCompanyCardsByAdminId(req.user._id);
      res.json(cards);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create company card
  router.post('/company-cards', isAdmin, async (req, res) => {
    try {
      if (!req.files || !req.files.image) {
        return res.status(400).json({ message: 'Company card image is required' });
      }
      
      const imageFile = req.files.image;
      const logoFile = req.files.logo;
      
      // Get image dimensions
      const dimensions = await getImageDimensions(imageFile.data);
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Save image file
      const imageFileName = `${Date.now()}-${imageFile.name}`;
      const imagePath = path.join(uploadsDir, imageFileName);
      await imageFile.mv(imagePath);
      
      // Save logo file if it exists
      let logoFileName = null;
      if (logoFile) {
        logoFileName = `${Date.now()}-${logoFile.name}`;
        const logoPath = path.join(uploadsDir, logoFileName);
        await logoFile.mv(logoPath);
      }
      
      // Get request data
      const { primaryColor, secondaryColor, websiteUrl, enquiriesEmail, isActive } = req.body;
      
      // Create company card
      const companyCard = await storage.createCompanyCard({
        adminId: req.user._id,
        imagePath: `/uploads/${imageFileName}`,
        width: dimensions.width,
        height: dimensions.height,
        logoPath: logoFileName ? `/uploads/${logoFileName}` : null,
        primaryColor,
        secondaryColor,
        websiteUrl,
        enquiriesEmail,
        isActive: isActive === 'true'
      });
      
      res.status(201).json(companyCard);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update company card
  router.put('/company-cards/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get company card and check ownership
      const card = await storage.getCompanyCard(id);
      if (!card) {
        return res.status(404).json({ message: 'Company card not found' });
      }
      
      if (card.adminId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this card' });
      }
      
      // Process new image if uploaded
      let imagePath = card.imagePath;
      let width = card.width;
      let height = card.height;
      
      if (req.files && req.files.image) {
        const imageFile = req.files.image;
        const dimensions = await getImageDimensions(imageFile.data);
        
        const imageFileName = `${Date.now()}-${imageFile.name}`;
        const newImagePath = path.join(__dirname, '..', 'uploads', imageFileName);
        await imageFile.mv(newImagePath);
        
        imagePath = `/uploads/${imageFileName}`;
        width = dimensions.width;
        height = dimensions.height;
        
        // Delete old image
        try {
          const oldImagePath = path.join(__dirname, '..', card.imagePath);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        } catch (err) {
          console.error('Error deleting old image:', err);
        }
      }
      
      // Process new logo if uploaded
      let logoPath = card.logoPath;
      
      if (req.files && req.files.logo) {
        const logoFile = req.files.logo;
        const logoFileName = `${Date.now()}-${logoFile.name}`;
        const newLogoPath = path.join(__dirname, '..', 'uploads', logoFileName);
        await logoFile.mv(newLogoPath);
        
        logoPath = `/uploads/${logoFileName}`;
        
        // Delete old logo
        if (card.logoPath) {
          try {
            const oldLogoPath = path.join(__dirname, '..', card.logoPath);
            if (fs.existsSync(oldLogoPath)) {
              fs.unlinkSync(oldLogoPath);
            }
          } catch (err) {
            console.error('Error deleting old logo:', err);
          }
        }
      }
      
      // Update company card
      const { primaryColor, secondaryColor, websiteUrl, enquiriesEmail, isActive } = req.body;
      
      const updatedCard = await storage.updateCompanyCard(id, {
        imagePath,
        width,
        height,
        logoPath,
        primaryColor: primaryColor || card.primaryColor,
        secondaryColor: secondaryColor || card.secondaryColor,
        websiteUrl: websiteUrl || card.websiteUrl,
        enquiriesEmail: enquiriesEmail || card.enquiriesEmail,
        isActive: isActive === 'true'
      });
      
      res.json(updatedCard);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete company card
  router.delete('/company-cards/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get company card and check ownership
      const card = await storage.getCompanyCard(id);
      if (!card) {
        return res.status(404).json({ message: 'Company card not found' });
      }
      
      if (card.adminId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this card' });
      }
      
      // Delete image and logo files
      try {
        const imagePath = path.join(__dirname, '..', card.imagePath);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
        
        if (card.logoPath) {
          const logoPath = path.join(__dirname, '..', card.logoPath);
          if (fs.existsSync(logoPath)) {
            fs.unlinkSync(logoPath);
          }
        }
      } catch (err) {
        console.error('Error deleting card files:', err);
      }
      
      const success = await storage.deleteCompanyCard(id);
      if (success) {
        res.status(200).json({ message: 'Company card deleted successfully' });
      } else {
        res.status(404).json({ message: 'Company card not found' });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== Public Routes =====
  
  // Get a business card by its unique URL
  router.get('/public/cards/:uniqueUrl', async (req, res) => {
    try {
      const { uniqueUrl } = req.params;
      const card = await storage.getBusinessCardByUrl(uniqueUrl);
      
      if (!card) {
        return res.status(404).json({ message: 'Business card not found' });
      }
      
      // Get related data
      const employee = await storage.getEmployee(card.employeeId);
      const template = await storage.getCardTemplate(card.templateId);
      let customTemplate = null;
      if (card.customTemplateId) {
        customTemplate = await storage.getCustomTemplate(card.customTemplateId);
      }
      let companyCard = null;
      if (card.companyCardId) {
        companyCard = await storage.getCompanyCard(card.companyCardId);
      }
      
      res.json({
        card,
        employee,
        template,
        customTemplate,
        companyCard
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Register all API routes
  app.use('/api', router);

  return app;
}