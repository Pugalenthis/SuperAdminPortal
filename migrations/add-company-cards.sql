-- Create company_cards table
CREATE TABLE IF NOT EXISTS "company_cards" (
  "id" SERIAL PRIMARY KEY,
  "admin_id" INTEGER NOT NULL REFERENCES "admins"("id") ON DELETE CASCADE,
  "image_path" TEXT NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

-- Add company_card_id to business_cards table
ALTER TABLE "business_cards" ADD COLUMN IF NOT EXISTS "company_card_id" INTEGER REFERENCES "company_cards"("id");