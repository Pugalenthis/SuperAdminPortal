# MongoDB Conversion Guide

This document provides a complete guide to the conversion of the project from PostgreSQL to MongoDB while maintaining all functionality and the same UI design.

## What's Been Implemented

### 1. MongoDB Models
MongoDB models have been created to replace the PostgreSQL tables with document-oriented data structures:

- **User Model** (replaces superAdmins and admins tables)
  - Combined both admin types with a 'role' field to distinguish them
  - Added methods for password handling

- **Employee Model**
  - Maintains references to User (admin) documents

- **Template Model** (combines cardTemplates and customTemplates)
  - Uses 'isCustom' flag to distinguish between standard and custom templates
  - Maintains relationships through MongoDB references

- **CompanyCard Model**
  - Converted with same fields, using ObjectId references

- **BusinessCard Model**
  - Maintains all relationships through MongoDB references

### 2. MongoDB Infrastructure

- **MongoDB Connection** (server/mongodb.ts)
  - Handles connecting to MongoDB database
  - Uses environment variable for configuration

- **MongoDB Storage Service** (server/mongoStorage.ts)
  - Implements all methods from the original storage interface
  - Adapted for MongoDB's document model

- **MongoDB Authentication** (server/mongoAuth.ts)
  - Updated Passport integration for MongoDB
  - Handles session storage in MongoDB

- **MongoDB Routes** (server/mongoRoutes.ts)
  - All API endpoints updated to work with MongoDB models
  - Maintains same functionality and URL structure

- **MongoDB Server Entry Point** (server/mongoIndex.ts)
  - Initializes MongoDB connection
  - Sets up Express server with MongoDB routes

### 3. Data Migration

- **Migration Script** (scripts/migrate-to-mongodb.ts)
  - Transfers all data from PostgreSQL to MongoDB
  - Maintains relationships between documents
  - Maps IDs between systems

### 4. Documentation

- **MongoDB Setup Guide** (MONGODB_SETUP.md)
  - Instructions for setting up MongoDB locally or in the cloud
  - Configuration steps

- **README Updates** (README.md)
  - Information about dual database support
  - Instructions for using both versions

- **Environment Variables** (.env.example)
  - Documentation of required configuration

### 5. Scripts

Updated package.json with new scripts:
```json
{
  "scripts": {
    "dev:mongo": "NODE_ENV=development tsx server/mongoIndex.ts",
    "build:mongo": "vite build && esbuild server/mongoIndex.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start:mongo": "NODE_ENV=production node dist/mongoIndex.js",
    "migrate:mongo": "tsx scripts/migrate-to-mongodb.ts"
  }
}
```

## How to Run the MongoDB Version

1. Set up MongoDB database (see MONGODB_SETUP.md)
2. Add MongoDB connection string to .env file:
   ```
   MONGODB_URI=mongodb://username:password@hostname:port/database
   ```
3. Run the migration script (if you have existing PostgreSQL data):
   ```
   npm run migrate:mongo
   ```
4. Start the MongoDB version:
   ```
   npm run dev:mongo
   ```

## Architecture Changes

### Data Model Transformation

#### Before (PostgreSQL):
- Relational tables with foreign keys
- Normalized data across multiple tables
- SQL queries with JOIN operations

#### After (MongoDB):
- Document-oriented collections
- References between documents
- Embedded documents where appropriate
- MongoDB query operations

### Key Benefits of MongoDB Implementation

1. **Flexible Schema**: Easier to evolve as requirements change
2. **JSON Native**: Better alignment with the JSON data already used
3. **Document Retrieval Performance**: More efficient for retrieving complete business card documents
4. **Development Speed**: Simpler queries for complex document structures
5. **Scaling Options**: Horizontal scaling capabilities

## UI and Functionality

The UI and functionality remain unchanged. All features work exactly the same with MongoDB as they did with PostgreSQL, including:

- Organization and user management
- Employee management
- Digital business card creation and management
- Custom card templates
- QR code generation
- Company branding
- Mobile-friendly card view
- Secure authentication

## Switching Between Versions

You can easily switch between PostgreSQL and MongoDB versions:

- PostgreSQL (original): `npm run dev`, `npm run build`, `npm run start`
- MongoDB (new): `npm run dev:mongo`, `npm run build:mongo`, `npm run start:mongo`