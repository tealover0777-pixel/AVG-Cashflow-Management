/**
 * Migration Script: Projects → Deals
 *
 * This script migrates all Firestore data from the "projects" collection to "deals":
 * 1. Renames collection: tenants/{tenantId}/projects → tenants/{tenantId}/deals
 * 2. Renames fields: project_name → deal_name, project_id → deal_id
 * 3. Updates related collections (contracts, paymentSchedules) with new field names
 *
 * IMPORTANT: Test on staging environment first!
 *
 * Usage:
 * 1. Place your Firebase service account key as 'serviceAccountKey.json' in this directory
 * 2. Run: node scripts/migrateProjectsToDeals.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Error loading service account key. Please place serviceAccountKey.json in the scripts directory.');
  console.error(error.message);
  process.exit(1);
}

const db = admin.firestore();

async function migrateProjectsToDeals() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🚀 Starting migration: Projects → Deals');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Get all tenants
    const tenantsSnapshot = await db.collection('tenants').get();
    console.log(`📊 Found ${tenantsSnapshot.size} tenant(s)\n`);

    let totalProjectsMigrated = 0;
    let totalContractsUpdated = 0;
    let totalSchedulesUpdated = 0;

    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      console.log(`\n─────────────────────────────────────────────────────`);
      console.log(`📁 Processing tenant: ${tenantId}`);
      console.log(`─────────────────────────────────────────────────────`);

      // ═══ Step 1: Migrate projects collection to deals ═══
      const projectsRef = db.collection(`tenants/${tenantId}/projects`);
      const dealsRef = db.collection(`tenants/${tenantId}/deals`);
      const projectsSnapshot = await projectsRef.get();

      console.log(`\n🔄 Migrating ${projectsSnapshot.size} project(s) to deals...`);

      for (const projectDoc of projectsSnapshot.docs) {
        const data = projectDoc.data();
        const transformedData = {
          ...data,
          // Rename fields
          deal_name: data.project_name || '',
          deal_id: data.project_id || '',
        };

        // Remove old field names
        delete transformedData.project_name;
        delete transformedData.project_id;

        // Write to new deals collection with same document ID
        await dealsRef.doc(projectDoc.id).set(transformedData);
        totalProjectsMigrated++;
      }

      console.log(`✅ Migrated ${projectsSnapshot.size} projects → deals`);

      // ═══ Step 2: Update contracts collection ═══
      const contractsRef = db.collection(`tenants/${tenantId}/contracts`);
      const contractsSnapshot = await contractsRef.get();

      console.log(`\n🔄 Updating ${contractsSnapshot.size} contract(s)...`);

      for (const contractDoc of contractsSnapshot.docs) {
        const data = contractDoc.data();

        // Only update if project fields exist
        if (data.project_id || data.project_name) {
          await contractsRef.doc(contractDoc.id).update({
            deal_id: data.project_id || null,
            deal_name: data.project_name || null,
            project_id: admin.firestore.FieldValue.delete(),
            project_name: admin.firestore.FieldValue.delete(),
          });
          totalContractsUpdated++;
        }
      }

      console.log(`✅ Updated ${totalContractsUpdated} contract(s) (deal_id, deal_name)`);

      // ═══ Step 3: Update payment schedules collection ═══
      const schedulesRef = db.collection(`tenants/${tenantId}/paymentSchedules`);
      const schedulesSnapshot = await schedulesRef.get();

      console.log(`\n🔄 Updating ${schedulesSnapshot.size} payment schedule(s)...`);

      for (const scheduleDoc of schedulesSnapshot.docs) {
        const data = scheduleDoc.data();

        // Only update if project_id exists
        if (data.project_id) {
          await schedulesRef.doc(scheduleDoc.id).update({
            deal_id: data.project_id,
            project_id: admin.firestore.FieldValue.delete(),
          });
          totalSchedulesUpdated++;
        }
      }

      console.log(`✅ Updated ${totalSchedulesUpdated} payment schedule(s) (deal_id)`);
    }

    // ═══ Migration Summary ═══
    console.log('\n\n═══════════════════════════════════════════════════');
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📊 Summary:`);
    console.log(`   • Projects migrated to deals: ${totalProjectsMigrated}`);
    console.log(`   • Contracts updated: ${totalContractsUpdated}`);
    console.log(`   • Payment schedules updated: ${totalSchedulesUpdated}`);
    console.log('\n⚠️  NEXT STEPS:');
    console.log('   1. Verify data integrity in Firebase Console');
    console.log('   2. Test the application with new "deals" collection');
    console.log('   3. Once verified, manually delete old "projects" collections');
    console.log('   4. Deploy updated security rules and frontend code');
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n\n❌ MIGRATION FAILED');
    console.error('═══════════════════════════════════════════════════');
    console.error('Error:', error.message);
    console.error('\nStack trace:', error.stack);
    console.error('═══════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

// Run migration
migrateProjectsToDeals()
  .then(() => {
    console.log('🎉 Process completed. Exiting...\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  });
