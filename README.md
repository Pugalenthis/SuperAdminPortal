# Digital Business Card Platform

A dynamic digital business card platform that enables seamless cross-environment URL routing and professional networking with advanced card generation capabilities.

## Technologies

This application supports two database backends:

### PostgreSQL Version (Original)
- React for interactive frontend
- Express.js backend
- PostgreSQL database with Drizzle ORM
- Advanced URL resolution and routing
- Secure authentication system
- Responsive design architecture
- Flexible QR code generation with dynamic environment support
- Enhanced mobile-friendly card view

### MongoDB Version (New)
- React for interactive frontend (unchanged)
- Express.js backend (unchanged)
- MongoDB with Mongoose ODM
- Document-oriented data model
- Maintains same functionality with NoSQL architecture
- Same UI and user experience

## Running the Application

### PostgreSQL Version
```bash
# Development mode
npm run dev

# Build for production
npm run build

# Run in production mode
npm run start
```

### MongoDB Version
```bash
# Set up MongoDB connection
# Add MONGODB_URI to your environment variables

# Development mode
npm run dev:mongo

# Build for production
npm run build:mongo

# Run in production mode
npm run start:mongo
```

## Migrating from PostgreSQL to MongoDB

To migrate your existing data from PostgreSQL to MongoDB:

1. Ensure both databases are properly configured
2. Run the migration script:
```bash
npm run migrate:mongo
```

## Features

- Organization and user management
- Employee management
- Digital business card creation and management
- Custom card templates
- QR code generation
- Company branding
- Mobile-friendly card view
- Secure authentication

## Project Structure

- `client/`: Frontend React application
- `server/`: Backend Express application
  - PostgreSQL: `server/index.ts`, `server/db.ts`, `server/storage.ts`, `server/auth.ts`, `server/routes.ts`
  - MongoDB: `server/mongoIndex.ts`, `server/mongodb.ts`, `server/mongoStorage.ts`, `server/mongoAuth.ts`, `server/mongoRoutes.ts`
- `shared/`: Shared code between frontend and backend
  - `shared/schema.ts`: Data model definitions
- `public/`: Static files
- `scripts/`: Utility scripts
  - `scripts/migrate-to-mongodb.ts`: Data migration script from PostgreSQL to MongoDB