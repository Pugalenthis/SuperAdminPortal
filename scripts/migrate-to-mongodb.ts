import dotenv from 'dotenv';
import { db as drizzleDb, pool } from '../server/db';
import mongoose from 'mongoose';
import { 
  superAdmins, admins, employees, 
  businessCards, cardTemplates, 
  customTemplates, companyCards 
} from '../shared/schema';
import { User, Employee, Template, CompanyCard, BusinessCard } from '../server/models';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

dotenv.config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/businesscards';

// Maps to keep track of old IDs to new MongoDB ObjectIDs
const adminIdMap = new Map<number, mongoose.Types.ObjectId>();
const employeeIdMap = new Map<number, mongoose.Types.ObjectId>();
const templateIdMap = new Map<number, mongoose.Types.ObjectId>();
const customTemplateIdMap = new Map<number, mongoose.Types.ObjectId>();
const companyCardIdMap = new Map<number, mongoose.Types.ObjectId>();

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');
    return true;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    return false;
  }
}

// Main migration function
async function migrateTables() {
  console.log('Starting migration from PostgreSQL to MongoDB...');
  
  try {
    // 1. Migrate SuperAdmins
    console.log('Migrating super admins...');
    const pgSuperAdmins = await drizzleDb.select().from(superAdmins);
    
    for (const pgSuperAdmin of pgSuperAdmins) {
      const newUser = new User({
        email: pgSuperAdmin.email,
        password: pgSuperAdmin.password, // Already hashed
        role: 'superadmin',
        createdAt: new Date()
      });
      
      await newUser.save();
      console.log(`Migrated super admin: ${pgSuperAdmin.email}`);
    }
    
    // 2. Migrate Admins
    console.log('Migrating admins...');
    const pgAdmins = await drizzleDb.select().from(admins);
    
    for (const pgAdmin of pgAdmins) {
      const newUser = new User({
        email: pgAdmin.email,
        password: pgAdmin.password, // Already hashed
        role: 'admin',
        orgName: pgAdmin.orgName,
        status: pgAdmin.status,
        createdAt: pgAdmin.createdAt
      });
      
      const savedUser = await newUser.save();
      adminIdMap.set(pgAdmin.id, savedUser._id);
      console.log(`Migrated admin: ${pgAdmin.email}`);
    }
    
    // 3. Migrate Employees
    console.log('Migrating employees...');
    const pgEmployees = await drizzleDb.select().from(employees);
    
    for (const pgEmployee of pgEmployees) {
      const adminId = adminIdMap.get(pgEmployee.adminId);
      
      if (!adminId) {
        console.warn(`Skipping employee ${pgEmployee.firstName} ${pgEmployee.lastName}: admin ID ${pgEmployee.adminId} not found in map`);
        continue;
      }
      
      const newEmployee = new Employee({
        firstName: pgEmployee.firstName,
        lastName: pgEmployee.lastName,
        email: pgEmployee.email,
        phone: pgEmployee.phone,
        title: pgEmployee.title,
        department: pgEmployee.department,
        adminId: adminId,
        status: pgEmployee.status,
        profileImage: pgEmployee.profileImage,
        createdAt: pgEmployee.createdAt
      });
      
      const savedEmployee = await newEmployee.save();
      employeeIdMap.set(pgEmployee.id, savedEmployee._id);
      console.log(`Migrated employee: ${pgEmployee.firstName} ${pgEmployee.lastName}`);
    }
    
    // 4. Migrate Card Templates
    console.log('Migrating card templates...');
    const pgCardTemplates = await drizzleDb.select().from(cardTemplates);
    
    for (const pgTemplate of pgCardTemplates) {
      const newTemplate = new Template({
        name: pgTemplate.name,
        description: pgTemplate.description,
        template: pgTemplate.template,
        type: pgTemplate.type,
        isDefault: pgTemplate.isDefault,
        isCustom: false,
        createdAt: pgTemplate.createdAt
      });
      
      const savedTemplate = await newTemplate.save();
      templateIdMap.set(pgTemplate.id, savedTemplate._id);
      console.log(`Migrated card template: ${pgTemplate.name}`);
    }
    
    // 5. Migrate Custom Templates
    console.log('Migrating custom templates...');
    const pgCustomTemplates = await drizzleDb.select().from(customTemplates);
    
    for (const pgCustomTemplate of pgCustomTemplates) {
      const adminId = adminIdMap.get(pgCustomTemplate.adminId);
      const baseTemplateId = templateIdMap.get(pgCustomTemplate.baseTemplateId);
      
      if (!adminId || !baseTemplateId) {
        console.warn(`Skipping custom template ${pgCustomTemplate.name}: references not found`);
        continue;
      }
      
      const newTemplate = new Template({
        name: pgCustomTemplate.name,
        description: pgCustomTemplate.description,
        // Need to get the base template's template data
        template: await getBaseTemplateData(pgCustomTemplate.baseTemplateId),
        type: 'custom',
        isDefault: false,
        isCustom: true,
        adminId: adminId,
        baseTemplateId: baseTemplateId,
        customization: pgCustomTemplate.customization,
        createdAt: pgCustomTemplate.createdAt,
        updatedAt: pgCustomTemplate.updatedAt
      });
      
      const savedTemplate = await newTemplate.save();
      customTemplateIdMap.set(pgCustomTemplate.id, savedTemplate._id);
      console.log(`Migrated custom template: ${pgCustomTemplate.name}`);
    }
    
    // 6. Migrate Company Cards
    console.log('Migrating company cards...');
    const pgCompanyCards = await drizzleDb.select().from(companyCards);
    
    for (const pgCompanyCard of pgCompanyCards) {
      const adminId = adminIdMap.get(pgCompanyCard.adminId);
      
      if (!adminId) {
        console.warn(`Skipping company card: admin ID ${pgCompanyCard.adminId} not found in map`);
        continue;
      }
      
      const newCompanyCard = new CompanyCard({
        adminId: adminId,
        imagePath: pgCompanyCard.imagePath,
        width: pgCompanyCard.width,
        height: pgCompanyCard.height,
        isActive: pgCompanyCard.isActive,
        logoPath: pgCompanyCard.logoPath,
        primaryColor: pgCompanyCard.primaryColor,
        secondaryColor: pgCompanyCard.secondaryColor,
        websiteUrl: pgCompanyCard.websiteUrl,
        enquiriesEmail: pgCompanyCard.enquiriesEmail,
        createdAt: pgCompanyCard.createdAt,
        updatedAt: pgCompanyCard.updatedAt
      });
      
      const savedCompanyCard = await newCompanyCard.save();
      companyCardIdMap.set(pgCompanyCard.id, savedCompanyCard._id);
      console.log(`Migrated company card for admin ID: ${pgCompanyCard.adminId}`);
    }
    
    // 7. Migrate Business Cards
    console.log('Migrating business cards...');
    const pgBusinessCards = await drizzleDb.select().from(businessCards);
    
    for (const pgBusinessCard of pgBusinessCards) {
      const employeeId = employeeIdMap.get(pgBusinessCard.employeeId);
      const templateId = templateIdMap.get(pgBusinessCard.templateId);
      const customTemplateId = pgBusinessCard.customTemplateId ? customTemplateIdMap.get(pgBusinessCard.customTemplateId) : undefined;
      const companyCardId = pgBusinessCard.companyCardId ? companyCardIdMap.get(pgBusinessCard.companyCardId) : undefined;
      
      if (!employeeId || !templateId) {
        console.warn(`Skipping business card: references not found`);
        continue;
      }
      
      const newBusinessCard = new BusinessCard({
        employeeId: employeeId,
        templateId: templateId,
        customTemplateId: customTemplateId,
        companyCardId: companyCardId,
        customization: pgBusinessCard.customization,
        uniqueUrl: pgBusinessCard.uniqueUrl,
        qrCodeUrl: pgBusinessCard.qrCodeUrl,
        status: pgBusinessCard.status,
        createdAt: pgBusinessCard.createdAt,
        updatedAt: pgBusinessCard.updatedAt
      });
      
      await newBusinessCard.save();
      console.log(`Migrated business card: ${pgBusinessCard.uniqueUrl}`);
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Helper function to get base template data
async function getBaseTemplateData(baseTemplateId: number) {
  const baseTemplate = await drizzleDb.select()
    .from(cardTemplates)
    .where(eq(cardTemplates.id, baseTemplateId))
    .limit(1);
  
  if (baseTemplate.length === 0) {
    return {};
  }
  
  return baseTemplate[0].template;
}

// Run the migration
async function run() {
  try {
    const connected = await connectToMongoDB();
    if (!connected) {
      console.error('Could not connect to MongoDB. Migration aborted.');
      process.exit(1);
    }
    
    await migrateTables();
    
    // Close connections
    await mongoose.connection.close();
    await pool.end();
    
    console.log('All connections closed. Migration process complete.');
    process.exit(0);
  } catch (error) {
    console.error('An error occurred during migration:', error);
    process.exit(1);
  }
}

run();