// scripts/apply-migration.js
require('dotenv').config({ path: '.env.local' }); // Assumes script is run from project root

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function applyMigration() {
  console.log('Starting migration script...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL is not set.');
    console.error('Please ensure it is defined in your .env.local file or as an environment variable.');
    process.exit(1);
  }
  if (!supabaseServiceKey) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY is not set.');
    console.error('This script requires admin privileges. Please ensure it is defined in your .env.local file or as an environment variable.');
    process.exit(1);
  }

  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log('Supabase Service Role Key: Found (not logging the key itself for security)');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false, // Typically not needed for server-side admin tasks
      autoRefreshToken: false,
    }
  });

  const migrationFileName = '002_add_missing_tables_and_functions.sql';
  const migrationFilePath = path.join(__dirname, '../supabase/migrations', migrationFileName);

  try {
    console.log(`Reading migration file: ${migrationFilePath}`);
    if (!fs.existsSync(migrationFilePath)) {
        console.error(`Error: Migration file not found at ${migrationFilePath}`);
        process.exit(1);
    }
    const sqlContent = fs.readFileSync(migrationFilePath, 'utf8');

    if (!sqlContent.trim()) {
      console.error(`Error: Migration file (${migrationFileName}) is empty.`);
      process.exit(1);
    }

    console.log(`Attempting to apply migration (${migrationFileName}) to cloud Supabase instance...`);
    console.warn('Note: Executing complex, multi-statement migration files directly with supabase.sql() can be unreliable. For robust migrations, consider using the Supabase CLI (e.g., `supabase db remote set` and `supabase db push --linked`) or a dedicated PostgreSQL client library.');

    // Execute the entire SQL content as a single block.
    // This relies on Postgres and supabase.sql() correctly handling the multi-statement script.
    const { data, error } = await supabase.sql(sqlContent);

    if (error) {
      console.error('Error applying migration:');
      console.error(`  Message: ${error.message}`);
      if (error.code) console.error(`  Code: ${error.code}`);
      if (error.details) console.error(`  Details: ${error.details}`);
      if (error.hint) console.error(`  Hint: ${error.hint}`);
      // Log the raw error object for more context if needed
      // console.error('  Raw Error Object:', JSON.stringify(error, null, 2));
      process.exit(1);
    }

    console.log('Migration applied successfully!');
    if (data) {
      // For DDL/multi-statement scripts, data might be null or an array of results per statement.
      // Often, for successful DDL, it's null or an empty array.
      console.log('Response data (if any):', data);
    }

  } catch (err) {
    console.error('An unexpected error occurred during the migration process:');
    console.error(err);
    process.exit(1);
  }
}

applyMigration().catch(err => {
  // This catch is for unhandled promise rejections from applyMigration itself, though already handled inside.
  console.error("Unhandled error in applyMigration:", err);
  process.exit(1);
});
