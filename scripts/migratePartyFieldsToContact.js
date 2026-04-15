/**
 * Migration: Rename party_* field names → contact_* in all Firestore documents.
 *
 * Collections touched (per tenant):
 *   investments, schedules, payments, contacts
 * Global collections:
 *   global_users
 *   tenants/{tenantId}/users
 *
 * Field renames:
 *   party_id    → contact_id
 *   party_name  → contact_name
 *   party_type  → contact_type
 *
 * The old fields are DELETED from the document once the new ones are written.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/migratePartyFieldsToContact.js
 *
 * Set DRY_RUN = false to perform the actual migration.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs";

const serviceAccount = JSON.parse(
  fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccount.json", "utf8")
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const DRY_RUN = false; // ← set to false to apply changes

const FIELD_MAP = {
  party_id: "contact_id",
  party_name: "contact_name",
  party_type: "contact_type",
};

const TENANT_COLLECTIONS = ["investments", "schedules", "payments", "contacts"];

let totalDocs = 0;
let totalUpdated = 0;

async function migrateCollection(collPath) {
  const snap = await db.collection(collPath).get();
  if (snap.empty) return;

  const batch = db.batch();
  let batchCount = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const updates = {};
    const deletes = {};
    let needsUpdate = false;

    for (const [oldField, newField] of Object.entries(FIELD_MAP)) {
      if (data.hasOwnProperty(oldField) && !data.hasOwnProperty(newField)) {
        updates[newField] = data[oldField];
        deletes[oldField] = FieldValue.delete();
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      totalDocs++;
      if (!DRY_RUN) {
        batch.update(docSnap.ref, { ...updates, ...deletes });
        batchCount++;
        if (batchCount >= 400) {
          await batch.commit();
          batchCount = 0;
        }
      } else {
        console.log(`  [DRY RUN] ${docSnap.ref.path}`, updates);
      }
      totalUpdated++;
    }
  }

  if (!DRY_RUN && batchCount > 0) {
    await batch.commit();
  }
}

async function migrate() {
  console.log(`🚀 Starting party_* → contact_* field migration (DRY_RUN=${DRY_RUN})\n`);

  // Tenant sub-collections
  const tenantsSnap = await db.collection("tenants").get();
  console.log(`Found ${tenantsSnap.size} tenant(s).`);

  for (const tenantDoc of tenantsSnap.docs) {
    const tenantId = tenantDoc.id;
    console.log(`\n[${tenantId}]`);

    for (const col of TENANT_COLLECTIONS) {
      const path = `tenants/${tenantId}/${col}`;
      console.log(`  → ${path}`);
      await migrateCollection(path);
    }

    // Also migrate tenant users (party_id → contact_id)
    console.log(`  → tenants/${tenantId}/users`);
    await migrateCollection(`tenants/${tenantId}/users`);
  }

  // Global users
  console.log("\n→ global_users");
  await migrateCollection("global_users");

  console.log(`\n✅ Done. ${totalUpdated} document(s) ${DRY_RUN ? "would be" : "were"} updated.`);
  if (DRY_RUN) {
    console.log("   Set DRY_RUN = false to apply changes.");
  }
}

migrate().catch(console.error);
