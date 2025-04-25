import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../shared/schema.js';

// Required for Neon Serverless
neonConfig.webSocketConstructor = ws;

// SQL statements to create our tables
const createTables = `
-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  title TEXT NOT NULL,
  department TEXT,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  profile_image TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Card Templates table
CREATE TABLE IF NOT EXISTS card_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Business Cards table
CREATE TABLE IF NOT EXISTS business_cards (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  template_id INTEGER NOT NULL REFERENCES card_templates(id),
  customization JSONB,
  unique_url TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

// Insert default card templates
const insertTemplates = `
INSERT INTO card_templates (name, description, template, is_default)
VALUES 
  ('Classic', 'A clean, professional design with a simple layout', 
   '{"background": "#ffffff", "textColor": "#000000", "accent": "#0066cc", "layout": "standard"}', true),
   
  ('Modern', 'A sleek, contemporary design with bold colors', 
   '{"background": "#2d3748", "textColor": "#ffffff", "accent": "#38b2ac", "layout": "modern"}', false),
   
  ('Creative', 'A vibrant, artistic design for creative professionals', 
   '{"background": "#fafafa", "textColor": "#333333", "accent": "#ed8936", "layout": "creative"}', false)
ON CONFLICT (id) DO NOTHING;
`;

async function setupDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  try {
    console.log('Starting database setup...');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Execute raw SQL to create tables
    console.log('Creating tables...');
    await pool.query(createTables);
    
    // Check if templates already exist
    const templateCheck = await pool.query('SELECT COUNT(*) FROM card_templates');
    
    if (parseInt(templateCheck.rows[0].count) === 0) {
      console.log('Inserting default card templates...');
      await pool.query(insertTemplates);
      console.log('Default templates created successfully');
    } else {
      console.log('Templates already exist, skipping...');
    }
    
    console.log('Database setup completed successfully');
    
    await pool.end();
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDb();