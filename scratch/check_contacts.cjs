const admin = require('firebase-admin');
const { readFileSync } = require('fs');
const { join } = require('path');

const serviceAccountPath = join(__dirname, '..', 'scripts', 'serviceAccount.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'avg-cashflow-management'
  });
}

const db = admin.firestore();

async function run() {
  try {
    const snap = await db.collection('tenants/T10001/contacts').get();
    console.log(`Found ${snap.size} contacts under tenants/T10001/contacts:`);
    snap.forEach(doc => {
      const data = doc.data();
      if (data.email) {
        console.log(`Contact: ${data.contact_name || data.name} (${data.email})`);
        console.log(`  DocID: ${doc.id}`);
        console.log(`  auth_uid: ${data.auth_uid}`);
        console.log(`  role: ${data.role || data.role_id || data.role_type}`);
      }
    });
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

run();
