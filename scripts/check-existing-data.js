// scripts/check-existing-data.js
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnvVariables() {
  const envFilePath = path.join(__dirname, '../.env.local');
  const envVars = {};

  try {
    if (!fs.existsSync(envFilePath)) {
      console.warn(`⚠️ .env.local file not found at ${envFilePath}. Relying on system environment variables.`);
      return {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      };
    }

    const fileContent = fs.readFileSync(envFilePath, { encoding: 'utf8' });
    fileContent.split('\n').forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const match = trimmedLine.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
            value = value.substring(1, value.length - 1);
          }
          envVars[key] = value;
        }
      }
    });
  } catch (error) {
    console.error(`❌ Error reading or parsing .env.local file at ${envFilePath}:`, error.message);
  }
  return {
    NEXT_PUBLIC_SUPABASE_URL: envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

async function getTableInfo(supabase, tableName) {
  console.log(`\n🔎 Checking table: ${tableName}`);

  // Get row count
  const { count, error: countError } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error(`   ❌ Error fetching row count for ${tableName}: ${countError.message}`);
  } else {
    console.log(`   📊 Row count: ${count}`);
  }

  // Get sample records (if count > 0)
  if (count > 0) {
    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(3);

    if (sampleError) {
      console.error(`   ❌ Error fetching sample records for ${tableName}: ${sampleError.message}`);
    } else if (sampleData && sampleData.length > 0) {
      console.log(`   📄 Sample records (up to 3):`);
      sampleData.forEach((row, index) => {
        console.log(`      Record ${index + 1}:`, JSON.stringify(row, null, 2).substring(0, 300) + (JSON.stringify(row).length > 300 ? '...' : ''));
      });
    } else {
      console.log(`   📄 No sample records found (or table is empty).`);
    }
  }

  // Get table structure
  // Note: Supabase JS client's .sql() method would require service_role key for information_schema typically.
  // If this fails with anon key, it means RLS is strict or anon key doesn't have permissions.
  // For a more robust schema check, a direct DB connection or Supabase CLI introspection is better.
  // However, we'll try with a generic select to infer columns from sample data if available,
  // or just note that direct schema introspection might need higher privileges.
  console.log(`   🏗️  Attempting to infer structure (column names from first sample record if available):`);
   const { data: structureSample, error: structureError } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  if (structureError) {
     console.warn(`      ⚠️ Could not fetch a sample record to infer structure for ${tableName}: ${structureError.message}`);
     console.warn(`         Direct schema query (e.g., information_schema.columns) usually requires higher privileges than anon key.`);
  } else if (structureSample && structureSample.length > 0) {
    const columns = Object.keys(structureSample[0]);
    console.log(`      Columns found: ${columns.join(', ')}`);
    // For a more detailed structure, you'd query information_schema.columns
    // This would require a service_role key and using supabase.rpc or a direct DB connection.
    // Example: const { data, error } = await supabase.rpc('get_table_columns', { p_table_name: tableName });
    // Where 'get_table_columns' is a pg function you create that queries information_schema.
  } else {
    console.log(`      Could not infer structure (no records or error).`);
  }
}


async function checkExistingData() {
  console.log('🚀 Starting script to check existing data in Supabase cloud...\n');

  const envConfig = loadEnvVariables();
  const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.');
    console.error('   Please ensure they are defined in your .env.local file or as system environment variables.');
    process.exit(1);
  }

  console.log(`🔗 Connecting to Supabase URL: ${supabaseUrl}`);
  console.log('🔑 Using Anon Key for connection.');

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  try {
    // Check 'products' table
    // Based on previous test, this table should be accessible
    await getTableInfo(supabase, 'products');

    // Check 'borrower_drafts' table
    // Based on previous test, this table should be accessible
    await getTableInfo(supabase, 'borrower_drafts');

  } catch (err) {
    console.error('\n❌ An unexpected script error occurred:');
    console.error(err);
  }

  console.log('\n🏁 Data check finished.');
}

checkExistingData().catch(err => {
  console.error("Unhandled error in checkExistingData:", err);
  process.exit(1);
});
