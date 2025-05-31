// scripts/test-connection.js
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


async function testCloudSupabase() {
  console.log('🚀 Starting Supabase cloud connection test...\n');

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

  const findings = {
    tablesFound: [], // Renamed from tables
    matchOffersFunctionExists: false,
    matchOffersFunctionError: null,
    generalConnectionError: null, // For overall connection issues
    missingCoreTables: [],
  };

  const coreTables = ['lenders', 'products', 'borrowers', 'borrower_drafts', 'product_rules', 'offers'];

  try {
    // 1. Test basic connection and check for core tables by attempting a light query on each
    console.log('📋 Checking for core tables by attempting to query each...');
    for (const tableName of coreTables) {
      // Attempt to select a single row's id, or just count. head:true makes it efficient.
      // { count: 'exact', head: true } is efficient as it only gets the count.
      const { error: tableError, count } = await supabase
        .from(tableName)
        .select('id', { count: 'exact', head: true }); // Check for 'id' column, common in Supabase tables

      if (tableError) {
        if (tableError.message.includes('relation') && tableError.message.includes('does not exist')) {
          console.log(`   ❌ Table '${tableName}' does not exist.`);
          findings.missingCoreTables.push(tableName);
        } else {
          // This could be RLS preventing access, or another issue.
          console.warn(`   ⚠️ Error querying table '${tableName}': ${tableError.message}. (May be RLS or other permission issue for anon key)`);
          // We can't confirm it's missing, but we also can't confirm it's found and accessible.
          // For this test, if it's not a "does not exist" error, we'll assume it might exist but is inaccessible.
          // Let's not add it to tablesFound unless the query is successful.
        }
      } else {
        // If no error, the table exists and is queryable (at least for a count/head request)
        console.log(`   ✅ Table '${tableName}' exists and is accessible.`);
        findings.tablesFound.push(tableName);
      }
    }
    console.log('---');
    if (findings.tablesFound.length === 0 && findings.missingCoreTables.length === coreTables.length) {
        console.warn('   ⚠️ No core tables were found or accessible. This might indicate a fresh database or significant RLS restrictions for the anon key.');
    }


    // 2. Test if the match_offers function exists by calling it
    const testBorrowerId = '11111111-1111-1111-1111-111111111111'; // From your test page
    console.log(`📞 Testing 'match_offers' edge function with borrower_id: ${testBorrowerId}...`);
    
    if (!findings.tablesFound.includes('borrowers')) { // Check against tablesFound now
        console.warn("   ⚠️ Skipping 'match_offers' test: 'borrowers' table was not found or is not accessible.");
        findings.matchOffersFunctionError = "'borrowers' table not found/accessible, function call skipped.";
    } else {
        const { data: functionData, error: functionError } = await supabase.functions.invoke('match_offers', {
          body: { borrower_id: testBorrowerId }
        });

        if (functionError) {
          console.error(`❌ Error calling 'match_offers' function: ${functionError.message}`);
          findings.matchOffersFunctionError = functionError.message;
          if (functionError.message.toLowerCase().includes('function not found') || (functionError.context && functionError.context.status === 404)) {
            console.warn("   ❓ 'match_offers' function does not seem to exist or is not deployed correctly.");
            findings.matchOffersFunctionExists = false;
          } else {
            console.warn("   ⚠️ 'match_offers' function exists but returned an error. This could be due to missing data, RLS, or internal logic issues.");
            findings.matchOffersFunctionExists = true; 
          }
        } else {
          console.log("   ✅ 'match_offers' function called successfully.");
          findings.matchOffersFunctionExists = true;
          if (functionData && functionData.offers && Array.isArray(functionData.offers)) {
            console.log(`      Offers received: ${functionData.offers.length}`);
          } else {
            console.log('      Response structure might be different than expected or no offers found.');
            // console.log('      Raw response:', JSON.stringify(functionData, null, 2));
          }
        }
    }

  } catch (err) {
    console.error('❌ An unexpected script error occurred during Supabase interaction:');
    console.error(err);
    findings.generalConnectionError = `Unexpected script error: ${err.message}`;
  }

  console.log('\n---');
  console.log('📝 Test Summary:');
  if (findings.generalConnectionError) {
    console.log(`  🔴 Overall script error: ${findings.generalConnectionError}`);
  }
  
  console.log(`  Tables Found & Accessible: ${findings.tablesFound.length > 0 ? findings.tablesFound.join(', ') : 'None'}`);
  
  if (findings.missingCoreTables.length > 0) {
    console.log(`  ❗️ Missing Core Tables (or inaccessible): ${findings.missingCoreTables.join(', ')}`);
  } else if (findings.tablesFound.length === coreTables.length) {
    console.log('  ✅ All expected core tables are present and accessible.');
  } else if (findings.tablesFound.length > 0) {
      console.log('  🟡 Some core tables might be missing or were inaccessible.');
  }


  if (findings.matchOffersFunctionExists) {
    console.log("  ✅ Edge function 'match_offers' appears to exist.");
    if (findings.matchOffersFunctionError && !findings.matchOffersFunctionError.includes("'borrowers' table not found/accessible")) {
      console.log(`     ⚠️ However, it returned an error during test call: ${findings.matchOffersFunctionError}`);
    }
  } else {
    console.log("  ❌ Edge function 'match_offers' does NOT seem to exist or is not callable.");
    if (findings.matchOffersFunctionError && !findings.matchOffersFunctionError.includes("'borrowers' table not found/accessible")) {
       console.log(`     Error details: ${findings.matchOffersFunctionError}`);
    }
  }
  console.log('\n🏁 Test finished.');
}

testCloudSupabase().catch(err => {
  console.error("Unhandled error in testCloudSupabase:", err);
  process.exit(1);
});
