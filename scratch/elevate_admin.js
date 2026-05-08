import admin from 'firebase-admin';

// Initialize the app. 
// Note: This expects you to be authenticated via Firebase CLI or have GOOGLE_APPLICATION_CREDENTIALS set.
admin.initializeApp({
  projectId: 'avg-cashflow-management'
});

const db = admin.firestore();
const auth = admin.auth();
const email = 'kyuahn@yahoo.com';

async function elevateUser() {
  try {
    console.log(`Elevating user: ${email}`);
    
    // 1. Find user in Auth
    const userRecord = await auth.getUserByEmail(email);
    const uid = userRecord.uid;
    console.log(`Found UID: ${uid}`);

    // 2. Update Firestore global_users
    await db.collection('global_users').doc(uid).set({
      role: 'R10010',
      isGlobal: true,
      isGlobalRole: true,
      status: 'Active',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('Updated global_users document.');

    // 3. Update Custom Claims
    await auth.setCustomUserClaims(uid, {
      role: 'R10010',
      isGlobal: true,
      tenantId: 'GLOBAL'
    });
    console.log('Updated custom claims. User must log out and log back in to see changes.');

    console.log('SUCCESS: User has been elevated to Platform Super Admin (R10010).');
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

elevateUser();
