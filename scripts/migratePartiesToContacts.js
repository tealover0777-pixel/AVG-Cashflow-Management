import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccount.json", "utf8"));

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

// Set to false to perform the actual migration
const DRY_RUN = false;

async function migrate() {
  console.log(`🚀 Starting migration: parties → contacts (DRY_RUN=${DRY_RUN})`);

  const tenantsSnap = await db.collection("tenants").get();
  console.log(`Found ${tenantsSnap.size} tenant(s).`);

  let totalCopied = 0;
  let totalDeleted = 0;

  for (const tenantDoc of tenantsSnap.docs) {
    const tenantId = tenantDoc.id;
    const partiesRef = db.collection(`tenants/${tenantId}/parties`);
    const contactsRef = db.collection(`tenants/${tenantId}/contacts`);

    const partiesSnap = await partiesRef.get();
    if (partiesSnap.empty) {
      console.log(`  [${tenantId}] No documents in parties — skipping.`);
      continue;
    }

    console.log(`\n  [${tenantId}] Copying ${partiesSnap.size} document(s)...`);

    for (const docSnap of partiesSnap.docs) {
      const data = docSnap.data();
      if (!DRY_RUN) {
        await contactsRef.doc(docSnap.id).set(data);
        await partiesRef.doc(docSnap.id).delete();
        totalDeleted++;
      } else {
        console.log(`    [DRY RUN] Would copy: ${docSnap.id}`);
      }
      totalCopied++;
    }

    console.log(`  [${tenantId}] ✅ Done.`);
  }

  if (DRY_RUN) {
    console.log(`\n✅ Dry run complete. ${totalCopied} document(s) would be migrated.`);
    console.log("   Set DRY_RUN = false to perform the actual migration.");
  } else {
    console.log(`\n✅ Migration complete. Copied and deleted ${totalDeleted} document(s).`);
  }
}

migrate().catch(console.error);
