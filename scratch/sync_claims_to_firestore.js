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
    console.log(`Starting sync: Found ${globalUsersSnap.size} global_users docs in Firestore.\n`);

    let updatedCount = 0;

    for (const doc of globalUsersSnap.docs) {
      const data = doc.data();
      const uid = doc.id;
      const email = data.email;

      try {
        const authUser = await auth.getUser(uid);
        const currentClaims = authUser.customClaims || {};

        // Expected claims based on Firestore global_users doc
        const expectedClaims = {
          role: data.role || '',
          tenantId: data.tenantId || '',
          isGlobal: data.isGlobal || false
        };

        // Check if there is any mismatch
        const hasMismatch = 
          currentClaims.role !== expectedClaims.role ||
          currentClaims.tenantId !== expectedClaims.tenantId ||
          currentClaims.isGlobal !== expectedClaims.isGlobal;

        if (hasMismatch) {
          console.log(`Mismatch found for ${email} (${uid}):`);
          console.log(`  Current Claims:  `, JSON.stringify(currentClaims));
          console.log(`  Expected Claims: `, JSON.stringify(expectedClaims));
          
          await auth.setCustomUserClaims(uid, expectedClaims);
          console.log(`  => Successfully updated custom claims in Firebase Auth.`);
          updatedCount++;
        }
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          console.log(`User ${email} (${uid}) exists in Firestore global_users but NOT in Firebase Auth. Skipping.`);
        } else {
          console.error(`Error processing ${email} (${uid}):`, err.message);
        }
      }
    }

    console.log(`\nSync complete. Updated custom claims for ${updatedCount} users.`);
    process.exit(0);
  } catch (error) {
    console.error('Error running sync script:', error);
    process.exit(1);
  }
}

run();
