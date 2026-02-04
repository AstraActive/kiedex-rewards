-- Configure app settings for cron jobs
-- Run this in Supabase SQL Editor or via CLI

-- Create app schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS app;

-- Create settings table
CREATE TABLE IF NOT EXISTS app.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert configuration
INSERT INTO app.settings (key, value) VALUES
  ('supabase_url', 'https://oxjkyerdjhvxcqkbrlak.supabase.co'),
  ('service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94amt5ZXJkamh2eGNxa2JybGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIwOTI0NiwiZXhwIjoyMDg1Nzg1MjQ2fQ.fIbMkVtZYqJCjGt1f1M01X29ClbFN1lJHp3ufAcZ5kE')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Verify
SELECT * FROM app.settings;
