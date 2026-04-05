/**
 * Migration Script: Help data Firestore → Firebase Storage
 *
 * Migrates:
 *   - Firestore collection `help_conversations/{docId}` → Storage `help_conversations/{docId}.json`
 *   - Firestore document `system/knowledge_base`        → Storage `system/knowledge_base.txt`
 *
 * Usage:
 *   1. Place serviceAccountKey.json in this directory (scripts/)
 *   2. node scripts/migrateHelpToStorage.js
 *
 * The script is safe to re-run — it will not delete Firestore data.
 * Firestore cleanup can be done separately once the migration is verified.
 */

const admin = require('firebase-admin');
const path = require('path');

// ── Init ───────────────────────────────────────────────────────────────────────
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'avg-cashflow-management.firebasestorage.app',
  });
  console.log('✅ Firebase Admin initialized');
} catch (err) {
  console.error('❌ Could not load serviceAccountKey.json from scripts/ directory.');
  console.error(err.message);
  process.exit(1);
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// ── Helpers ────────────────────────────────────────────────────────────────────
async function uploadJSON(storagePath, data) {
  const file = bucket.file(storagePath);
  await file.save(JSON.stringify(data, null, 2), {
    contentType: 'application/json',
    resumable: false,
  });
}

async function uploadText(storagePath, text) {
  const file = bucket.file(storagePath);
  await file.save(text, {
    contentType: 'text/plain',
    resumable: false,
  });
}

// ── Migrate knowledge_base ─────────────────────────────────────────────────────
async function migrateKnowledgeBase() {
  console.log('\n── Knowledge Base ──────────────────────────────────────────');
  const snap = await db.doc('system/knowledge_base').get();

  if (!snap.exists) {
    console.log('  ⚠️  No system/knowledge_base document found in Firestore — skipping.');
    return;
  }

  const content = snap.data().content;
  if (!content) {
    console.log('  ⚠️  Document exists but has no `content` field — skipping.');
    return;
  }

  await uploadText('system/knowledge_base.txt', content);
  console.log(`  ✅ Uploaded system/knowledge_base.txt (${content.length} chars)`);
}

// ── Migrate help_conversations ─────────────────────────────────────────────────
async function migrateConversations() {
  console.log('\n── help_conversations ──────────────────────────────────────');
  const snap = await db.collection('help_conversations').get();

  if (snap.empty) {
    console.log('  ⚠️  No conversations found in Firestore — skipping.');
    return;
  }

  console.log(`  Found ${snap.docs.length} conversation(s). Uploading...`);

  let success = 0;
  let failed = 0;

  await Promise.all(snap.docs.map(async (docSnap) => {
    const data = docSnap.data();
    const id = docSnap.id;

    // Normalise Firestore Timestamp → ISO string
    const created_at = data.created_at?.toDate
      ? data.created_at.toDate().toISOString()
      : (data.created_at || new Date().toISOString());

    const payload = {
      id,
      user_id: data.user_id || 'unknown',
      user_email: data.user_email || 'unknown',
      question: data.question || '',
      answer: data.answer || '',
      feedback: data.feedback || null,
      status: data.status || 'pending',
      created_at,
    };

    try {
      await uploadJSON(`help_conversations/${id}.json`, payload);
      success++;
      process.stdout.write('.');
    } catch (err) {
      failed++;
      console.error(`\n  ❌ Failed to upload ${id}: ${err.message}`);
    }
  }));

  console.log(`\n  ✅ ${success} uploaded, ${failed} failed`);
}

// ── Main ───────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await migrateKnowledgeBase();
    await migrateConversations();
    console.log('\n🎉 Migration complete. Firestore data has NOT been deleted.');
    console.log('   Verify in Firebase Storage, then manually delete:');
    console.log('   - Firestore collection: help_conversations');
    console.log('   - Firestore document:   system/knowledge_base');
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  }
})();
