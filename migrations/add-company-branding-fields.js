// Migration script to add company branding fields
const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { sql } = require('drizzle-orm');

async function migrateCompanyBranding() {
  console.log('Starting migration: Adding company branding fields...');
  
  // Setup database connection
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });
  
  try {
    // Add logo_path column
    await db.execute(sql`
      ALTER TABLE company_cards
      ADD COLUMN IF NOT EXISTS logo_path TEXT
    `);
    
    // Add primary_color column
    await db.execute(sql`
      ALTER TABLE company_cards
      ADD COLUMN IF NOT EXISTS primary_color TEXT
    `);
    
    // Add secondary_color column
    await db.execute(sql`
      ALTER TABLE company_cards
      ADD COLUMN IF NOT EXISTS secondary_color TEXT
    `);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Run the migration
migrateCompanyBranding()
  .then(() => {
    console.log('Company branding fields migration completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration error:', error);
    process.exit(1);
  });