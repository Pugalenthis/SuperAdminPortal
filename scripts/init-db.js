import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from '../shared/schema.js';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import fs from 'fs';

// Required for Neon Serverless
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

async function initDb() {
  try {
    console.log('Starting database initialization...');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle({ client: pool, schema });

    // Create default card templates
    const defaultTemplates = [
      {
        name: "Classic",
        description: "A clean, professional design with a simple layout",
        template: JSON.stringify({
          background: "#ffffff",
          textColor: "#000000",
          accent: "#0066cc",
          layout: "standard"
        }),
        isDefault: true
      },
      {
        name: "Modern",
        description: "A sleek, contemporary design with bold colors",
        template: JSON.stringify({
          background: "#2d3748",
          textColor: "#ffffff",
          accent: "#38b2ac",
          layout: "modern"
        }),
        isDefault: false
      },
      {
        name: "Creative",
        description: "A vibrant, artistic design for creative professionals",
        template: JSON.stringify({
          background: "#fafafa",
          textColor: "#333333",
          accent: "#ed8936",
          layout: "creative"
        }),
        isDefault: false
      }
    ];

    // Check if templates already exist
    const existingTemplates = await db.select().from(schema.cardTemplates);
    
    if (existingTemplates.length === 0) {
      console.log('Creating default card templates...');
      for (const template of defaultTemplates) {
        await db.insert(schema.cardTemplates).values({
          name: template.name,
          description: template.description,
          template: template.template,
          isDefault: template.isDefault
        });
      }
      console.log('Default card templates created successfully');
    } else {
      console.log('Templates already exist, skipping creation');
    }

    console.log('Database initialization completed successfully');
    await pool.end();
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDb();