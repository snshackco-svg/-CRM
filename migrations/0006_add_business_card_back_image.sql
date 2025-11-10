-- Add back image URL field to business_card_scans table
-- Migration: 0021_add_business_card_back_image

ALTER TABLE business_card_scans ADD COLUMN image_url_back TEXT;
