#!/usr/bin/env node

/**
 * Database Schema Synchronization Script
 * 
 * This script helps ensure your Supabase database schema is in sync
 * with your migration files by applying all pending migrations.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Starting database schema synchronization...\n');

// Check if we're in the right directory
const projectRoot = process.cwd();
const supabaseDir = path.join(projectRoot, 'supabase');

if (!fs.existsSync(supabaseDir)) {
  console.error('❌ Error: supabase directory not found. Make sure you\'re running this from the project root.');
  process.exit(1);
}

// Check if supabase CLI is available
try {
  execSync('supabase --version', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ Error: Supabase CLI not found. Please install it first:');
  console.error('   npm install -g supabase');
  console.error('   or visit: https://supabase.com/docs/guides/cli');
  process.exit(1);
}

try {
  console.log('📋 Checking migration files...');
  
  const migrationsDir = path.join(supabaseDir, 'migrations');
  if (fs.existsSync(migrationsDir)) {
    const migrations = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql'));
    console.log(`   Found ${migrations.length} migration files:`);
    migrations.forEach(file => console.log(`   - ${file}`));
  }
  
  console.log('\n🚀 Applying database migrations...');
  console.log('   This will sync your database schema with migration files.\n');
  
  // Apply all migrations to the database
  execSync('supabase db push', { 
    stdio: 'inherit',
    cwd: projectRoot 
  });
  
  console.log('\n✅ Database schema synchronization completed successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. Restart your development server (npm run dev)');
  console.log('   2. Test the OTP verification flow again');
  console.log('   3. The "full_name" column should now be available in the borrowers table');
  
} catch (error) {
  console.error('\n❌ Error during database synchronization:');
  console.error(error.message);
  console.error('\n🔧 Troubleshooting tips:');
  console.error('   1. Make sure you\'re connected to the internet');
  console.error('   2. Verify your Supabase project is accessible');
  console.error('   3. Check your .env.local file has correct SUPABASE_* variables');
  console.error('   4. Try running: supabase login (if not already logged in)');
  process.exit(1);
}