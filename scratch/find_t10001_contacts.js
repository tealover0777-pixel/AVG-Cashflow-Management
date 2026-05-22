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
  const targetEmails = ['soulmate0220@gmail.com', 'tenants@americanvisioncap.com', 'avc@yahoo.com'];
  
  console.log('Searching in T10001 contacts for:', targetEmails);
  const contactsColl = db.collection('tenants').doc('T10001').collection('contacts');
  
  for (const email of targetEmails) {
    const snap = await contactsColl.where('email', '==', email).get();
    if (snap.empty) {
      console.log(`Email ${email}: No contact found!`);
    } else {
      snap.forEach(doc => {
        console.log(`Email ${email}: Found contact ${doc.id} | Name: ${doc.data().contact_name || doc.data().name} | auth_uid: ${doc.data().auth_uid}`);
      });
    }
  }
  process.exit(0);
}

run().catch(console.error);
