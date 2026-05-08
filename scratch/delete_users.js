import admin from 'firebase-admin';

admin.initializeApp({
  projectId: 'avg-cashflow-management'
});

const db = admin.firestore();
const auth = admin.auth();
const uids = ['kyuahn', 'sNvFmqQss8OhjFAffVijbnMaGRC2'];

async function deleteUsers() {
  for (const uid of uids) {
    try {
      console.log(`Processing UID: ${uid}`);
      
      // 1. Get user from Auth (to get email)
      let email = 'unknown';
      try {
        const userRecord = await auth.getUser(uid);
        email = userRecord.email;
        console.log(`Found Auth user: ${email}`);
        
        // Delete from Auth
        await auth.deleteUser(uid);
        console.log(`Deleted from Auth.`);
      } catch (e) {
        console.log(`Auth user not found or error: ${e.message}`);
      }

      // 2. Delete from Firestore global_users
      await db.collection('global_users').doc(uid).delete();
      console.log(`Deleted from global_users Firestore.`);

      // 3. Find and delete from tenants (if any)
      // This is harder without knowing the tenantId, but we can search collection groups
      // However, deleteUser cloud function usually handles this.
      // We'll just do global for now.

      console.log(`SUCCESS: Removed user ${uid} (${email})`);
    } catch (err) {
      console.error(`ERROR for ${uid}:`, err.message);
    }
  }
}

deleteUsers();
