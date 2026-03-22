/**
 * Migration Script: Convert Payment Amount Strings to Numbers
 *
 * This script converts formatted currency strings (e.g., "$8,000.00") to numeric values
 * in the paymentSchedules collection for all tenants.
 *
 * Usage:
 *   node scripts/migrate-amounts-to-numbers.js           # Dry run (preview changes)
 *   node scripts/migrate-amounts-to-numbers.js --apply   # Apply changes to database
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Parse currency string to number
function parseCurrency(value) {
  if (value === undefined || value === null || value === "") return null;
  // If it's already a number, return it
  if (typeof value === 'number') return value;
  // If it's a string, remove $, commas, and spaces, then parse
  const cleaned = String(value).replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

// Check if value is a formatted string that needs conversion
function needsConversion(value) {
  if (typeof value !== 'string') return false;
  // Check if it contains $ or comma (indicators of formatting)
  return /[$,]/.test(value);
}

async function migrateAmountsToNumbers(dryRun = true) {
  console.log('='.repeat(80));
  console.log(`Migration: Convert Payment Amounts to Numbers`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'APPLYING CHANGES'}`);
  console.log('='.repeat(80));
  console.log('');

  let totalDocs = 0;
  let docsNeedingUpdate = 0;
  let docsUpdated = 0;
  let errors = 0;

  try {
    // Get all tenants
    const tenantsSnapshot = await db.collection('tenants').get();
    console.log(`Found ${tenantsSnapshot.size} tenants\n`);

    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      console.log(`\nProcessing Tenant: ${tenantData.name || tenantId} (${tenantId})`);
      console.log('-'.repeat(80));

      // Get all payment schedules for this tenant
      const schedulesPath = `tenants/${tenantId}/paymentSchedules`;
      const schedulesSnapshot = await db.collection(schedulesPath).get();

      console.log(`  Found ${schedulesSnapshot.size} payment schedules`);
      totalDocs += schedulesSnapshot.size;

      let tenantUpdates = 0;

      for (const scheduleDoc of schedulesSnapshot.docs) {
        const data = scheduleDoc.data();
        const updates = {};
        let needsUpdate = false;

        // Check and convert signed_payment_amount
        if (needsConversion(data.signed_payment_amount)) {
          const newValue = parseCurrency(data.signed_payment_amount);
          updates.signed_payment_amount = newValue;
          needsUpdate = true;
          console.log(`    ${scheduleDoc.id}: signed_payment_amount "${data.signed_payment_amount}" → ${newValue}`);
        }

        // Check and convert payment_amount
        if (needsConversion(data.payment_amount)) {
          const newValue = parseCurrency(data.payment_amount);
          updates.payment_amount = newValue;
          needsUpdate = true;
          console.log(`    ${scheduleDoc.id}: payment_amount "${data.payment_amount}" → ${newValue}`);
        }

        // Check and convert original_payment_amount
        if (needsConversion(data.original_payment_amount)) {
          const newValue = parseCurrency(data.original_payment_amount);
          updates.original_payment_amount = newValue;
          needsUpdate = true;
          console.log(`    ${scheduleDoc.id}: original_payment_amount "${data.original_payment_amount}" → ${newValue}`);
        }

        // Check and convert principal_amount
        if (needsConversion(data.principal_amount)) {
          const newValue = parseCurrency(data.principal_amount);
          updates.principal_amount = newValue;
          needsUpdate = true;
          console.log(`    ${scheduleDoc.id}: principal_amount "${data.principal_amount}" → ${newValue}`);
        }

        // Check and convert basePayment
        if (needsConversion(data.basePayment)) {
          const newValue = parseCurrency(data.basePayment);
          updates.basePayment = newValue;
          needsUpdate = true;
          console.log(`    ${scheduleDoc.id}: basePayment "${data.basePayment}" → ${newValue}`);
        }

        if (needsUpdate) {
          docsNeedingUpdate++;
          tenantUpdates++;

          if (!dryRun) {
            try {
              await scheduleDoc.ref.update(updates);
              docsUpdated++;
            } catch (error) {
              console.error(`    ERROR updating ${scheduleDoc.id}:`, error.message);
              errors++;
            }
          }
        }
      }

      console.log(`  Tenant summary: ${tenantUpdates} documents need updating`);
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total documents scanned: ${totalDocs}`);
    console.log(`Documents needing update: ${docsNeedingUpdate}`);

    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN - no changes were made to the database.');
      console.log('To apply these changes, run: node scripts/migrate-amounts-to-numbers.js --apply');
    } else {
      console.log(`Documents successfully updated: ${docsUpdated}`);
      console.log(`Errors: ${errors}`);
      console.log('\n✅ Migration completed!');
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
const isDryRun = !process.argv.includes('--apply');

migrateAmountsToNumbers(isDryRun)
  .then(() => {
    console.log('\nExiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nFatal error:', error);
    process.exit(1);
  });
