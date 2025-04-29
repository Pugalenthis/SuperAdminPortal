import { pool } from '../server/db';
import QRCode from 'qrcode';
import { promisify } from 'util';

// Convert QRCode.toDataURL to a promised-based function
const toDataURL = promisify(QRCode.toDataURL);

async function addQRCodeField() {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    console.log('Adding qr_code_url column to business_cards table...');
    
    // Check if column already exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'business_cards' AND column_name = 'qr_code_url'
    `;
    
    const { rows } = await client.query(checkColumnQuery);
    
    if (rows.length === 0) {
      // Add the qr_code_url column
      await client.query(`
        ALTER TABLE business_cards 
        ADD COLUMN qr_code_url TEXT
      `);
      
      console.log('Column added successfully.');
      
      // Get all business cards
      const { rows: cards } = await client.query(`
        SELECT id, unique_url FROM business_cards
      `);
      
      console.log(`Found ${cards.length} business cards. Generating QR codes...`);
      
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
              dark: '#0066cc',
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
          
          if (successCount % 10 === 0) {
            console.log(`Generated ${successCount} QR codes...`);
          }
        } catch (err) {
          console.error(`Error generating QR code for card ${card.id}:`, err);
        }
      }
      
      console.log(`QR code generation complete. Generated ${successCount} out of ${cards.length} QR codes.`);
    } else {
      console.log('Column qr_code_url already exists, skipping column creation.');
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error performing migration:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Run the migration
addQRCodeField()
  .then(() => {
    console.log('Migration script executed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration script failed:', err);
    process.exit(1);
  });