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

async function searchInCollection(email, collRef, path) {
  const snap = await collRef.where('email', '==', email).get();
  if (!snap.empty) {
    snap.forEach(doc => {
      console.log(`Found email ${email} in ${path}/${doc.id}:`, doc.data());
    });
    return true;
  }
  return false;
}

async function run() {
  const emails = ['soulmate0220@gmail.com', 'tenants@americanvisioncap.com', 'avc@yahoo.com'];
  
  for (const email of emails) {
    console.log(`\nSearching for ${email}...`);
    
    // Check global_users
    await searchInCollection(email, db.collection('global_users'), 'global_users');
    
    // Check all tenants
    const tenantsSnap = await db.collection('tenants').get();
    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;
      
      // Check tenants/{tenantId}/contacts
      await searchInCollection(email, db.collection('tenants').doc(tenantId).collection('contacts'), `tenants/${tenantId}/contacts`);
      
      // Check tenants/{tenantId}/users
      await searchInCollection(email, db.collection('tenants').doc(tenantId).collection('users'), `tenants/${tenantId}/users`);
    }
  }
  process.exit(0);
}

run().catch(console.error);
