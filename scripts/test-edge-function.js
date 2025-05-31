// scripts/test-edge-function.js
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

async function testEdgeFunction() {
  console.log('🚀 Starting Edge Function test: match_offers...\n');

  const envConfig = loadEnvVariables();
  const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.');
    console.error('   Please ensure they are defined in your .env.local file or as system environment variables.');
    process.exit(1);
  }

  console.log(`🔗 Connecting to Supabase URL: ${supabaseUrl}`);
  console.log('🔑 Using Anon Key for connection.\n');

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  const testBorrowerId = '11111111-1111-1111-1111-111111111111'; // Hardcoded test ID

  try {
    console.log(`📞 Invoking 'match_offers' edge function with borrower_id: ${testBorrowerId}...`);
    const { data: functionData, error: functionError } = await supabase.functions.invoke('match_offers', {
      body: { borrower_id: testBorrowerId }
    });

    if (functionError) {
      console.error('❌ Error calling "match_offers" function:');
      console.error(`  Message: ${functionError.message}`);
      if (functionError.context) {
        console.error('  Context:', JSON.stringify(functionError.context, null, 2));
      } else {
        // Log the raw error if context is not available
        console.error('  Raw Error:', JSON.stringify(functionError, null, 2));
      }
    } else {
      console.log("✅ 'match_offers' function called successfully.");
      console.log('📄 Response data:');
      console.log(JSON.stringify(functionData, null, 2));
      if (functionData && functionData.offers && Array.isArray(functionData.offers)) {
        console.log(`\n📊 Offers received: ${functionData.offers.length}`);
      }
    }

  } catch (err) {
    console.error('❌ An unexpected script error occurred during the function invocation:');
    console.error(err);
  }

  console.log('\n🏁 Edge function test finished.');
}

testEdgeFunction().catch(err => {
  console.error("Unhandled error in testEdgeFunction:", err);
  process.exit(1);
});
