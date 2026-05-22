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

const db = admin.firestore();

async function run() {
  const roles = ['R10001', 'R10002', 'R10003', 'R10004'];
  for (const r of roles) {
    const doc = await db.collection('role_types').doc(r).get();
    console.log(`Role ID: ${doc.id}`);
    if (doc.exists) {
      console.log(`Permissions:`, doc.data().permissions || doc.data().Permissions);
    } else {
      console.log(`Does not exist`);
    }
    console.log('-----------------------------------');
  }
}
run().catch(console.error);
