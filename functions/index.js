
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Temporary function to generate a password reset link.
// Remove this function after the password is set.
exports.createFirstAdmin = functions.https.onRequest(async (req, res) => {
  try {
    const email = 'tealover0777@gmail.com';
    const link = await admin.auth().generatePasswordResetLink(email);
    res.status(200).send(`<html><body><h1>Password Reset</h1><p>Click the link below to reset your password:</p><a href="${link}">${link}</a></body></html>`);
  } catch (error) {
    res.status(500).send({ message: 'Error generating password reset link.', error: error.message });
  }
});

exports.fixL2Admin = functions.https.onRequest(async (req, res) => {
  try {
    const db = admin.firestore();
    const userToUpdate = 'kyuahn@yahoo.com';
    const oldSecretAdmin = 'tealover0777@gmail.com';

    let msgs = [];

    const userRecord = await admin.auth().getUserByEmail(userToUpdate);
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'L2 Admin' });
    msgs.push(`Updated ${userToUpdate} auth claim to L2 Admin`);

    await db.collection('user_roles').doc(userRecord.uid).set({
      email: userToUpdate, role: 'L2 Admin', tenantId: ''
    }, { merge: true });
    msgs.push(`Updated ${userToUpdate} in user_roles to L2 Admin`);

    try {
      const oldAdminRecord = await admin.auth().getUserByEmail(oldSecretAdmin);
      await admin.auth().setCustomUserClaims(oldAdminRecord.uid, { role: 'Tenant Manager' });
      msgs.push(`Updated ${oldSecretAdmin} auth claim to Tenant Manager`);

      await db.collection('user_roles').doc(oldAdminRecord.uid).set({
        email: oldSecretAdmin, role: 'Tenant Manager'
      }, { merge: true });
      msgs.push(`Updated ${oldSecretAdmin} in user_roles to Tenant Manager`);
    } catch (e) {
      msgs.push(`Could not fully update old admin: ${e.message}`);
    }
    res.status(200).send({ success: true, msgs });
  } catch (err) {
    res.status(500).send({ success: false, error: err.message });
  }
});

/**
 * Invites a new user to a tenant.
 * 1. Creates Firebase Auth user (if not exists).
 * 2. Sets Custom Claims (role, tenantId).
 * 3. Creates Firestore profiles (Global + Tenant).
 * 4. Generates a Password Reset Link for onboarding.
 */
exports.inviteUser = functions.https.onCall(async (data, context) => {
  // Ensure the requester is authenticated (RBAC should be handled by caller or here)
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { email, role, tenantId } = data;
  const db = admin.firestore();

  try {
    let userRecord;
    let isNewUser = false;

    // 1. Check if user exists or create them
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        userRecord = await admin.auth().createUser({
          email: email,
          emailVerified: false,
          disabled: false
        });
        isNewUser = true;
      } else {
        throw e;
      }
    }

    const uid = userRecord.uid;

    // 2. Set Custom Claims (Critical for Rules)
    // Note: This overwrites existing claims. Be careful if user belongs to multiple tenants (requires array logic).
    // For this app's logic (single tenant per user context), this is fine.
    await admin.auth().setCustomUserClaims(uid, { role, tenantId });

    // 3. Create/Update Firestore Global Profile
    await db.collection('user_roles').doc(uid).set({
      email,
      role,
      tenantId,
      status: 'Pending', // Mark as Pending until they login
      last_updated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 4. Create/Update Tenant User Profile
    if (tenantId) {
      await db.doc(`tenants/${tenantId}/users/${uid}`).set({
        user_id: uid,
        user_name: userRecord.displayName || email.split('@')[0],
        email,
        role_id: role,
        status: 'Pending',
        phone: userRecord.phoneNumber || '',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // 5. Generate Link
    // We use generatePasswordResetLink because it allows setting a password, which is perfect for new users.
    const link = await admin.auth().generatePasswordResetLink(email);

    return { 
      success: true, 
      link, 
      isNewUser,
      message: `User ${isNewUser ? 'created' : 'updated'} and invited.` 
    };

  } catch (error) {
    console.error("Invite Error:", error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Triggered when a new user is created in Firebase Auth.
 * Automatically creates a document in the global 'user_roles' collection if it doesn't exist.
 */
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  const db = admin.firestore();
  try {
    // Use merge: true to avoid overwriting if inviteUser already created it
    await db.collection('user_roles').doc(user.uid).set({
      email: user.email,
      // We only set defaults if they are missing. 
      // Firestore set with merge doesn't support "set if missing" for individual fields easily.
      // But we can assume if this runs, and doc exists, we might just update metadata.
      // If doc doesn't exist, these values are used.
      created_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    // If the doc didn't exist, we need to ensure at least a role exists.
    // We can do a read-check-write or just rely on manual syncing for edge cases.
    // Ideally, we set a default 'Viewer' role if one isn't set.
    // But we can't do that blindly with merge without overwriting 'Admin'.
    
    const docRef = db.collection('user_roles').doc(user.uid);
    const docSnap = await docRef.get();
    if (!docSnap.exists || !docSnap.data().role) {
       await docRef.set({
         email: user.email,
         role: 'Viewer',
         tenantId: '',
         status: 'Pending'
       }, { merge: true });
    }

    console.log(`Synced user_roles for ${user.email}`);
  } catch (error) {
    console.error('Error in onUserCreate:', error);
  }
});

/**
 * HTTP function to manually sync all Firebase Auth users to Firestore.
 * Usage: URL?tenantId=your-tenant-id
 */
exports.syncAuthUsers = functions.https.onRequest(async (req, res) => {
  const tenantId = req.query.tenantId;

  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    const db = admin.firestore();
    const batch = db.batch();
    let count = 0;

    for (const user of listUsersResult.users) {
      const globalRef = db.collection('user_roles').doc(user.uid);
      batch.set(globalRef, { email: user.email }, { merge: true });

      if (tenantId) {
        const tenantUserRef = db.doc(`tenants/${tenantId}/users/${user.uid}`);
        batch.set(tenantUserRef, {
          user_id: user.uid,
          user_name: user.displayName || user.email.split('@')[0],
          email: user.email,
          phone: user.phoneNumber || '',
        }, { merge: true });
      }
      count++;
    }

    await batch.commit();
    res.status(200).json({ success: true, count, message: `Synced ${count} users.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
