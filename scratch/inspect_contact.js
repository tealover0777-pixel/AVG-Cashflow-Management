import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync('/Users/kyuahn/Documents/AVG/AVG Cashflow Management/scripts/serviceAccount.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run() {
  try {
    const db = admin.firestore();
    const snap = await db.collection('tenants').doc('T10002').collection('contacts').doc('M10002').get();
    if (snap.exists) {
      console.log('M10002 Data:', JSON.stringify(snap.data(), null, 2));
    } else {
      console.log('M10002 does not exist.');
    }
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

run();
