/**
 * Migration Script: Fix missing previous_version_id in versioned payment schedules
 *
 * This script finds all payment schedule documents with version_num > 1 that have
 * undefined/null previous_version_id and sets the correct value.
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixPreviousVersionIds(dryRun = true) {
  console.log('\n========================================');
  console.log('Fix Previous Version ID Migration');
  console.log('========================================\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'APPLY CHANGES'}\n`);

  try {
    // Get all tenants
    const tenantsSnapshot = await db.collection('tenants').get();
    console.log(`Found ${tenantsSnapshot.size} tenant(s)\n`);

    let totalFixed = 0;
    let totalErrors = 0;

    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      console.log(`\n--- Processing Tenant: ${tenantId} ---`);

      const schedulesRef = db.collection(`tenants/${tenantId}/paymentSchedules`);
      const allSchedules = await schedulesRef.get();

      console.log(`  Total schedules: ${allSchedules.size}`);

      // Build a map of all schedules for lookup
      const scheduleMap = new Map();
      allSchedules.docs.forEach(doc => {
        const data = doc.data();
        const key = `${data.schedule_id}-V${data.version_num || 1}`;
        scheduleMap.set(key, {
          docId: doc.id,
          data: data,
          ref: doc.ref
        });
      });

      // Find all V2+ documents with missing previous_version_id
      const brokenDocs = [];
      allSchedules.docs.forEach(doc => {
        const data = doc.data();
        const versionNum = Number(data.version_num || 1);

        if (versionNum > 1 && !data.previous_version_id) {
          brokenDocs.push({
            docId: doc.id,
            ref: doc.ref,
            data: data,
            versionNum: versionNum
          });
        }
      });

      console.log(`  Broken documents (missing previous_version_id): ${brokenDocs.length}`);

      if (brokenDocs.length === 0) {
        console.log(`  ✓ No broken documents found`);
        continue;
      }

      // Fix each broken document
      for (const broken of brokenDocs) {
        const scheduleId = broken.data.schedule_id;
        const currentVersion = broken.versionNum;
        const previousVersion = currentVersion - 1;

        console.log(`\n  Processing: ${scheduleId} V${currentVersion} (docId: ${broken.docId})`);

        // Try to find the previous version
        const previousKey = `${scheduleId}-V${previousVersion}`;
        const previous = scheduleMap.get(previousKey);

        let previousVersionId = null;

        if (previous) {
          // Prefer the version_id field, fallback to docId
          previousVersionId = previous.data.version_id || previous.docId;
          console.log(`    Found V${previousVersion}: ${previousVersionId}`);
        } else {
          // If previous version not found by version_id, try to find by schedule_id and version_num
          const prevDoc = allSchedules.docs.find(doc => {
            const d = doc.data();
            return d.schedule_id === scheduleId && Number(d.version_num || 1) === previousVersion;
          });

          if (prevDoc) {
            const prevData = prevDoc.data();
            previousVersionId = prevData.version_id || prevDoc.id;
            console.log(`    Found V${previousVersion} (by search): ${previousVersionId}`);
          } else {
            console.log(`    ⚠️  WARNING: Could not find V${previousVersion} for ${scheduleId}`);
            console.log(`    Constructing version_id as fallback: ${scheduleId}-V${previousVersion}`);
            previousVersionId = `${scheduleId}-V${previousVersion}`;
          }
        }

        if (previousVersionId) {
          if (dryRun) {
            console.log(`    [DRY RUN] Would set previous_version_id = "${previousVersionId}"`);
            totalFixed++;
          } else {
            try {
              await broken.ref.update({
                previous_version_id: previousVersionId,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
              });
              console.log(`    ✓ Set previous_version_id = "${previousVersionId}"`);
              totalFixed++;
            } catch (err) {
              console.error(`    ✗ Error updating document:`, err.message);
              totalErrors++;
            }
          }
        } else {
          console.log(`    ✗ Could not determine previous_version_id`);
          totalErrors++;
        }
      }
    }

    console.log('\n========================================');
    console.log('Migration Summary');
    console.log('========================================');
    console.log(`Documents fixed: ${totalFixed}`);
    console.log(`Errors: ${totalErrors}`);
    console.log('========================================\n');

    if (dryRun) {
      console.log('This was a DRY RUN. No changes were made.');
      console.log('To apply changes, run: node scripts/fix-previous-version-id.cjs --apply\n');
    } else {
      console.log('Migration completed!\n');
    }

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Check command line arguments
const dryRun = !process.argv.includes('--apply');

fixPreviousVersionIds(dryRun)
  .then(() => {
    console.log('Script finished successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });
