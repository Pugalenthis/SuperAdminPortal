// Migration script to regenerate all QR codes with the updated Replit URL format
import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import QRCode from 'qrcode';
import { promisify } from 'util';

neonConfig.webSocketConstructor = ws;

// Initialize the database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// In Replit, we should use the REPL_SLUG and REPL_OWNER to construct the correct URL
async function generateQRCode(uniqueUrl) {
  try {
    // Get the Replit environment variables
    const replSlug = process.env.REPL_SLUG;
    const replOwner = process.env.REPL_OWNER;
    
    let host;
    if (replSlug && replOwner) {
      // We're in Replit environment, use the Replit dev URL
      host = `https://${replSlug}.${replOwner}.repl.co`;
    } else {
      // Fallback to localhost or the HOST env var
      host = process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : (process.env.HOST || 'https://businesscards.replit.app');
    }
    
    const fullUrl = `${host}/card/${uniqueUrl}`;
    
    console.log("Regenerating QR code for URL:", fullUrl);
    
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
    return await promisify(QRCode.toDataURL)(fullUrl, options);
  } catch (error) {
    console.error("Error generating QR code:", error);
    return null;
  }
}

async function regenerateAllQRCodes() {
  try {
    // Get all business cards from the database
    const result = await db.execute(
      'SELECT id, "unique_url" as "uniqueUrl" FROM business_cards'
    );
    
    console.log("Database query result:", result);
    
    // The result from neon db might be structured differently
    const businessCards = Array.isArray(result.rows) ? result.rows : 
                          Array.isArray(result) ? result : [];
    
    console.log(`Found ${businessCards.length} business cards to update`);
    
    // Loop through each business card and regenerate the QR code
    for (const card of businessCards) {
      try {
        // Generate new QR code
        const newQRCode = await generateQRCode(card.uniqueUrl);
        
        // Update the business card in the database
        if (newQRCode) {
          await db.execute(
            'UPDATE business_cards SET "qr_code_url" = $1 WHERE id = $2',
            [newQRCode, card.id]
          );
          console.log(`Successfully updated QR code for card ID ${card.id}`);
        } else {
          console.error(`Failed to generate QR code for card ID ${card.id}`);
        }
      } catch (cardError) {
        console.error(`Error updating QR code for card ID ${card.id}:`, cardError);
      }
    }
    
    console.log('QR code regeneration completed');
  } catch (error) {
    console.error('Error in regenerateAllQRCodes:', error);
  } finally {
    await pool.end();
  }
}

// Run the migration
regenerateAllQRCodes()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });