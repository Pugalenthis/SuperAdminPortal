const { promisify } = require('util');
const QRCode = require('qrcode');
const { db, pool } = require('../server/db');
const { businessCards } = require('../shared/schema');
const { eq } = require('drizzle-orm');

// Function to generate a QR code
async function generateQRCode(uniqueUrl) {
  try {
    // Create a full URL
    const host = process.env.HOST || 'https://businesscards.replit.app';
    const fullUrl = `${host}/card/${uniqueUrl}`;
    
    console.log(`Generating QR code for URL: ${fullUrl}`);
    
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
    const qrDataUrl = await promisify(QRCode.toDataURL)(fullUrl, options);
    return qrDataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    return null;
  }
}

async function regenerateMissingQRCodes() {
  try {
    console.log("Starting regeneration of missing QR codes...");
    
    // Find all cards
    const cards = await db.select().from(businessCards);
    console.log(`Found ${cards.length} business cards in the database.`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Process each card
    for (const card of cards) {
      if (!card.qrCodeUrl) {
        console.log(`Card ID ${card.id} for URL ${card.uniqueUrl} is missing a QR code. Generating...`);
        
        // Generate a new QR code
        const qrCodeUrl = await generateQRCode(card.uniqueUrl);
        
        if (qrCodeUrl) {
          // Update the card with the new QR code
          await db.update(businessCards)
            .set({ qrCodeUrl })
            .where(eq(businessCards.id, card.id));
          
          console.log(`Successfully updated card ID ${card.id} with a new QR code.`);
          updatedCount++;
        } else {
          console.error(`Failed to generate QR code for card ID ${card.id}.`);
        }
      } else {
        skippedCount++;
      }
    }
    
    console.log(`Finished regenerating QR codes.`);
    console.log(`Updated ${updatedCount} cards with missing QR codes.`);
    console.log(`Skipped ${skippedCount} cards that already had QR codes.`);
    
  } catch (error) {
    console.error("Error regenerating QR codes:", error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the migration
regenerateMissingQRCodes();