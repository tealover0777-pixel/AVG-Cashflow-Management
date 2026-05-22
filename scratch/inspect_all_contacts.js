import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

const serviceAccountPath = join(process.cwd(), 'scripts', 'serviceAccount.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'avg-cashflow-management'
  });
}

async function run() {
  try {
    const db = admin.firestore();
    const tenantsSnap = await db.collection('tenants').get();
    
    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;
      const contactsSnap = await db.collection('tenants').doc(tenantId).collection('contacts').get();
      console.log(`\nTenant: ${tenantId} - ${contactsSnap.size} contacts:`);
      contactsSnap.forEach(doc => {
        const data = doc.data();
        console.log(`  Contact: ${doc.id} | Name: ${data.contact_name || data.name} | Email: ${data.email} | auth_uid: ${data.auth_uid}`);
      });
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
