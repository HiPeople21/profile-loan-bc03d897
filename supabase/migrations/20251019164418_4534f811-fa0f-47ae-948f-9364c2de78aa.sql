-- Add is_anonymous column to investments table to allow investors to choose anonymity
ALTER TABLE investments 
ADD COLUMN is_anonymous BOOLEAN DEFAULT false NOT NULL;