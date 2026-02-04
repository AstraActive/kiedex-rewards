#!/usr/bin/env node

/**
 * Run all Supabase migrations in order
 * Usage: node run-migrations.js
 * 
 * Make sure to add SUPABASE_SERVICE_ROLE_KEY to your .env file
 * Get it from: Supabase Dashboard > Project Settings > API > service_role key
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Check for required environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('Please set:');
  console.error('  - SUPABASE_URL or VITE_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nExample:');
  console.error('  $env:SUPABASE_URL="https://xxx.supabase.co"');
  console.error('  $env:SUPABASE_SERVICE_ROLE_KEY="your-service-key"');
  console.error('  node run-migrations.js');
  process.exit(1);
}

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');

// Get all SQL files sorted by filename (timestamp)
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

console.log(`\n🚀 Found ${migrationFiles.length} migration files\n`);

// Function to execute SQL via Supabase REST API
async function executeSql(sql, filename) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return response.json();
}

// Alternative: Use the query endpoint directly
async function executeViaPgRest(sql, filename) {
  // Split into individual statements if needed
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: statement })
    });

    if (!response.ok && response.status !== 404) {
      console.warn(`⚠️  Warning for statement in ${filename}: ${response.statusText}`);
    }
  }
}

// Run migrations sequentially
async function runMigrations() {
  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`📄 Running: ${file}`);

    try {
      // Note: This requires a custom RPC function in your database
      // For now, we'll output instructions instead
      console.log(`   ℹ️  SQL content ready (${sql.length} chars)`);
      console.log(`   ⚠️  Please run this via Supabase Dashboard SQL Editor`);
      console.log('');
    } catch (error) {
      console.error(`❌ Failed: ${file}`);
      console.error(`   Error: ${error.message}`);
      process.exit(1);
    }
  }

  console.log('\n✅ Migration files processed!\n');
  console.log('⚠️  IMPORTANT: Since direct SQL execution via API requires special setup,');
  console.log('please use one of these methods:\n');
  console.log('1. Supabase CLI: supabase db push');
  console.log('2. Dashboard: Copy SQL to SQL Editor at https://supabase.com/dashboard');
  console.log('3. Install Supabase CLI following the instructions above\n');
}

runMigrations().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
