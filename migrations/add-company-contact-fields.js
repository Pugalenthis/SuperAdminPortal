// Migration to add website URL and enquiries email to company cards table
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import url from 'url';
import path from 'path';

// Set up __dirname equivalent for ESM
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function addCompanyContactFields() {
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Please provide a database connection string.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Begin transaction
    await pool.query('BEGIN');

    // Add website_url column if it doesn't exist
    const websiteUrlResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'company_cards' AND column_name = 'website_url'
    `);

    if (websiteUrlResult.rows.length === 0) {
      console.log('Adding website_url column to company_cards table...');
      await pool.query(`
        ALTER TABLE company_cards
        ADD COLUMN website_url TEXT
      `);
    } else {
      console.log('website_url column already exists in company_cards table');
    }

    // Add enquiries_email column if it doesn't exist
    const enquiriesEmailResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'company_cards' AND column_name = 'enquiries_email'
    `);

    if (enquiriesEmailResult.rows.length === 0) {
      console.log('Adding enquiries_email column to company_cards table...');
      await pool.query(`
        ALTER TABLE company_cards
        ADD COLUMN enquiries_email TEXT
      `);
    } else {
      console.log('enquiries_email column already exists in company_cards table');
    }

    // Commit transaction
    await pool.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (error) {
    // Rollback on error
    await pool.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await pool.end();
  }
}

// Execute the migration
addCompanyContactFields();