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
const auth = admin.auth();

async function run() {
  try {
    const globalUsersSnap = await db.collection('global_users').get();
    console.log(`Found ${globalUsersSnap.size} global_users docs in Firestore.\n`);

    for (const doc of globalUsersSnap.docs) {
      const data = doc.data();
      const uid = doc.id;
      
      // Let's get the auth user if they exist
      let email = data.email || '';
      let authClaims = null;
      try {
        const authUser = await auth.getUser(uid);
        authClaims = authUser.customClaims;
        email = authUser.email;
      } catch (err) {
        // user might not exist in Auth
      }

      console.log(`UID: ${uid}`);
      console.log(`  Email (Firestore): ${data.email} | Email (Auth): ${email}`);
      console.log(`  Firestore Role: ${data.role} | Auth Claim Role: ${authClaims ? authClaims.role : 'N/A'}`);
      console.log(`  Firestore Tenant: ${data.tenantId} | Auth Claim Tenant: ${authClaims ? authClaims.tenantId : 'N/A'}`);
      console.log(`  Firestore Status: ${data.status} | isGlobal: ${data.isGlobal}`);
      console.log('----------------------------------------------------');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
