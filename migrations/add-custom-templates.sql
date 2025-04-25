-- Create custom_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS custom_templates (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  base_template_id INTEGER NOT NULL REFERENCES card_templates(id),
  name TEXT NOT NULL,
  description TEXT,
  customization JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add custom_template_id column to business_cards table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'business_cards' AND column_name = 'custom_template_id'
  ) THEN
    ALTER TABLE business_cards 
    ADD COLUMN custom_template_id INTEGER REFERENCES custom_templates(id);
  END IF;
END $$;