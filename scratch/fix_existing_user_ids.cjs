const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('../scripts/serviceAccount.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function runMigration() {
  console.log('Starting migration to fix existing contact member user_ids...');
  try {
    const globalUsersRef = db.collection('global_users');
    // Fetch all global users with Member role (R10001)
    const membersSnap = await globalUsersRef.where('role', '==', 'R10001').get();

    console.log(`Found ${membersSnap.size} global users with role R10001.`);

    for (const doc of membersSnap.docs) {
      const uid = doc.id;
      const data = doc.data();
      const email = data.email;
      const tenantId = data.tenantId;

      console.log(`\nProcessing user: ${email} (UID: ${uid}, Tenant: ${tenantId})`);

      if (!tenantId) {
        console.warn(`User ${email} has no tenantId. Skipping.`);
        continue;
      }

      // 1. Find the contact document for this user in their tenant
      let contactDoc = null;
      
      // Search by auth_uid first
      const contactByUidSnap = await db.collection(`tenants/${tenantId}/contacts`)
        .where('auth_uid', '==', uid)
        .limit(1)
        .get();

      if (!contactByUidSnap.empty) {
        contactDoc = contactByUidSnap.docs[0];
        console.log(`Found contact doc by auth_uid: ${contactDoc.id}`);
      } else {
        // Fallback: search by email
        const contactByEmailSnap = await db.collection(`tenants/${tenantId}/contacts`)
          .where('email', '==', email)
          .limit(1)
          .get();
        
        if (!contactByEmailSnap.empty) {
          contactDoc = contactByEmailSnap.docs[0];
          console.log(`Found contact doc by email: ${contactDoc.id}`);
          // Update the contact doc with auth_uid if missing
          if (contactDoc.data().auth_uid !== uid) {
            await contactDoc.ref.update({ auth_uid: uid });
            console.log(`Updated contact doc ${contactDoc.id} with auth_uid: ${uid}`);
          }
        }
      }

      if (!contactDoc) {
        console.warn(`No contact document found for ${email} in tenant ${tenantId}. Skipping.`);
        continue;
      }

      const memberId = contactDoc.id; // e.g. M10002
      console.log(`Correct member ID is: ${memberId}`);

      // 2. Update global_users if user_id is incorrect or missing
      if (data.user_id !== memberId) {
        const oldUserId = data.user_id;
        await globalUsersRef.doc(uid).update({ user_id: memberId });
        console.log(`Updated global_users/${uid} user_id: "${oldUserId}" -> "${memberId}"`);
      } else {
        console.log(`global_users user_id is already correct: ${memberId}`);
      }

      // 3. Delete any incorrect user documents with this auth_uid or email in the tenant users collection
      const usersCol = db.collection(`tenants/${tenantId}/users`);
      
      // Check by UID
      const usersByUidSnap = await usersCol.where('auth_uid', '==', uid).get();
      for (const userDoc of usersByUidSnap.docs) {
        console.log(`Found duplicate tenant user doc to delete (by UID): ${userDoc.id} (${userDoc.data().email})`);
        await userDoc.ref.delete();
      }

      // Check by Email (excluding the correct U... IDs if they aren't contacts)
      const usersByEmailSnap = await usersCol.where('email', '==', email).get();
      for (const userDoc of usersByEmailSnap.docs) {
        console.log(`Found duplicate tenant user doc to delete (by Email): ${userDoc.id} (${userDoc.data().email})`);
        await userDoc.ref.delete();
      }
    }

    console.log('\nMigration complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed with error:', error);
    process.exit(1);
  }
}

runMigration();
