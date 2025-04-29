// Use CommonJS syntax for better compatibility
const { Pool, neonConfig } = require('@neondatabase/serverless');
const QRCode = require('qrcode');
const { promisify } = require('util');
const ws = require('ws');

// Configure database connection
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Configure Neon database to use WebSockets
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Convert QRCode.toDataURL to a promise-based function
const toDataURL = promisify(QRCode.toDataURL);

async function regenerateQRCodes() {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    console.log('Regenerating QR codes with black color...');
    
    // Get all business cards
    const { rows: cards } = await client.query(`
      SELECT id, unique_url FROM business_cards
    `);
    
    console.log(`Found ${cards.length} business cards. Regenerating QR codes...`);
    
    // Generate QR codes for each card
    let successCount = 0;
    
    for (const card of cards) {
      try {
        // Create the full URL
        const fullUrl = `${process.env.HOST || 'https://app.digitalbusinesscards.com'}/card/${card.unique_url}`;
        
        // Generate the QR code
        const qrDataUrl = await toDataURL(fullUrl, {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          quality: 0.92,
          margin: 1,
          color: {
            dark: '#000000', // Use black for better visibility
            light: '#FFFFFF'
          }
        });
        
        // Update the card with the QR code
        await client.query(`
          UPDATE business_cards 
          SET qr_code_url = $1, updated_at = NOW() 
          WHERE id = $2
        `, [qrDataUrl, card.id]);
        
        successCount++;
        console.log(`Regenerated QR code for card ID ${card.id}`);
      } catch (err) {
        console.error(`Error generating QR code for card ${card.id}:`, err);
      }
    }
    
    console.log(`QR code regeneration complete. Generated ${successCount} out of ${cards.length} QR codes.`);
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Regeneration completed successfully.');
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error performing regeneration:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Run the regeneration
regenerateQRCodes()
  .then(() => {
    console.log('Migration script executed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration script failed:', err);
    process.exit(1);
  });