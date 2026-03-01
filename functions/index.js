
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

    await db.collection('global_users').doc(userRecord.uid).set({
      email: userToUpdate, role: 'L2 Admin', tenantId: ''
    }, { merge: true });
    msgs.push(`Updated ${userToUpdate} in global_users to L2 Admin`);

    try {
      const oldAdminRecord = await admin.auth().getUserByEmail(oldSecretAdmin);
      await admin.auth().setCustomUserClaims(oldAdminRecord.uid, { role: 'Tenant Manager' });
      msgs.push(`Updated ${oldSecretAdmin} auth claim to Tenant Manager`);

      await db.collection('global_users').doc(oldAdminRecord.uid).set({
        email: oldSecretAdmin, role: 'Tenant Manager'
      }, { merge: true });
      msgs.push(`Updated ${oldSecretAdmin} in global_users to Tenant Manager`);
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
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { email, role, tenantId, user_name, phone, notes, user_id: providedUserId } = data;
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
          displayName: user_name || '',
          emailVerified: false,
          disabled: false
        });
        isNewUser = true;
      } else {
        throw e;
      }
    }

    const uid = userRecord.uid;

    // 2. Set Custom Claims
    await admin.auth().setCustomUserClaims(uid, { role, tenantId });

    // 3. Create/Update Firestore Global Profile
    await db.collection('global_users').doc(uid).set({
      email,
      role,
      tenantId,
      status: 'Pending',
      last_updated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 4. Determine user_id (prefer provided, fallback to auto-gen)
    let user_id = providedUserId;
    if (!user_id && tenantId) {
      const usersSnap = await db.collection(`tenants/${tenantId}/users`).get();
      if (!usersSnap.empty) {
        const maxNum = Math.max(...usersSnap.docs.map(d => {
          const m = (d.data().user_id || '').match(/^U(\d+)$/);
          return m ? Number(m[1]) : 0;
        }));
        user_id = 'U' + String(maxNum + 1).padStart(5, '0');
      } else {
        user_id = 'U10001';
      }
    }
    if (!user_id) user_id = 'U' + Date.now(); // Final fallback

    // 5. Create Tenant Profile
    if (tenantId) {
      await db.doc(`tenants/${tenantId}/users/${user_id}`).set({
        user_id,
        user_name: user_name || userRecord.displayName || email.split('@')[0],
        email,
        role_id: role,
        status: 'Pending',
        phone: phone || userRecord.phoneNumber || '',
        notes: notes || '',
        tenantId,
        auth_uid: uid,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // 6. Generate email verification link and attempt to send email
    // 6. Generate password reset link (better for onboarding than verification)
    const link = await admin.auth().generatePasswordResetLink(email);

    return {
      success: true,
      link,
      emailSent: false, // We'll rely on the link display for now since API is rate-limited
      isNewUser,
      user_id,
      message: `User created. Share the link below so they can set their password and log in.`
    };

  } catch (error) {
    console.error("Invite Error:", error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Re-sends verification email to an existing user.
 * Only sends the email — does NOT create or modify any user data.
 */
exports.resendVerification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const { email } = data;
  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required.');
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    const uid = userRecord.uid;
    const link = await admin.auth().generatePasswordResetLink(email);
    return { success: true, link, emailSent: false };
  } catch (error) {
    console.error("Resend Verification Error:", error);
    const msg = error.code === 'auth/user-not-found'
      ? `User with email ${email} not found in Firebase Auth.`
      : error.message;
    throw new functions.https.HttpsError('internal', msg);
  }
});

/**
 * Deletes a user from both Firebase Authentication and Firestore.
 * Accepts { email, docId, tenantId } — looks up the Auth user by email.
 */
exports.deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const { email, docId, tenantId } = data;
  const db = admin.firestore();

  try {
    // 1. Find user in Firebase Auth by email and delete
    if (email) {
      try {
        const userRecord = await admin.auth().getUserByEmail(email);
        const uid = userRecord.uid;
        await admin.auth().deleteUser(uid);
        // Also remove global global_users entry
        await db.collection('global_users').doc(uid).delete();
      } catch (e) {
        if (e.code !== 'auth/user-not-found') {
          console.warn('Auth delete failed (non-critical):', e.message);
        }
        // If not found in Auth, continue to delete Firestore doc anyway
      }
    }

    // 2. Delete tenant Firestore profile (by document ID — which is the auth UID)
    if (tenantId && docId) {
      await db.doc(`tenants/${tenantId}/users/${docId}`).delete();
    }

    return { success: true };
  } catch (error) {
    console.error("Delete User Error:", error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});


/**
 * Triggered when a new user is created in Firebase Auth.
 * Automatically creates a document in the global 'global_users' collection if it doesn't exist.
 */
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  const db = admin.firestore();
  try {
    const docRef = db.collection('global_users').doc(user.uid);
    const docSnap = await docRef.get();
    if (!docSnap.exists || !docSnap.data().role) {
      await docRef.set({
        email: user.email,
        role: 'Viewer',
        tenantId: '',
        status: 'Pending',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } else {
      // Just update created_at if doc already exists (from inviteUser)
      await docRef.set({ created_at: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
    console.log(`Synced global_users for ${user.email}`);
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
      const globalRef = db.collection('global_users').doc(user.uid);
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


/**
 * One-time cleanup: Sets all 'Pending' users to 'Active' 
 * (except kyuahn@yahoo.com).
 */
exports.fixAllStatuses = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const db = admin.firestore();
  console.log(`Starting fixAllStatuses cleanup called by ${context.auth.token.email}...`);
  try {
    const batch = db.batch();
    let count = 0;

    // 1. Update global global_users
    const rolesSnap = await db.collection('global_users').get();
    console.log(`DEBUG: Found ${rolesSnap.size} global user roles.`);
    for (const docSnap of rolesSnap.docs) {
      const d = docSnap.data();
      const email = (d.email || "").toLowerCase();
      const status = d.status || "MISSING";
      console.log(`DEBUG GLOBAL: id=${docSnap.id}, email=${email}, status=${status}`);
      // No more exclusions — fix everything that isn't Active
      if (status !== 'Active') {
        console.log(`DEBUG: MATCHED global user ${email}! Updating to Active.`);
        batch.update(docSnap.ref, { status: 'Active', updated_at: admin.firestore.FieldValue.serverTimestamp() });
        count++;
      }
    }

    // 2. Update tenant-specific users
    const tenantsSnap = await db.collection('tenants').get();
    console.log(`DEBUG: Found ${tenantsSnap.size} tenants.`);
    for (const tenantDoc of tenantsSnap.docs) {
      const usersSnap = await db.collection(`tenants/${tenantDoc.id}/users`).get();
      console.log(`DEBUG: Tenant ${tenantDoc.id} has ${usersSnap.size} users.`);
      for (const userDoc of usersSnap.docs) {
        const d = userDoc.data();
        const email = (d.email || "").toLowerCase();
        const status = d.status || "MISSING";
        console.log(`DEBUG TENANT ${tenantDoc.id}: id=${userDoc.id}, email=${email}, status=${status}`);
        if (status !== 'Active') {
          console.log(`DEBUG: MATCHED tenant user ${email}! Updating to Active.`);
          batch.update(userDoc.ref, { status: 'Active', updated_at: admin.firestore.FieldValue.serverTimestamp() });
          count++;
        }
      }
    }

    if (count > 0) {
      await batch.commit();
      console.log(`Successfully updated ${count} total records to Active.`);
    } else {
      console.log("No pending users found to update.");
    }

    return { success: true, count, message: `Updated ${count} user records to Active status.` };
  } catch (error) {
    console.error("Cleanup Error:", error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Updates a user's tenant ID.
 * 1. Checks if the caller is a Super Admin.
 * 2. Updates Custom Claims in Firebase Auth.
 * 3. Updates Global Profile (global_users).
 * 4. Moves the Tenant Profile to the new tenant's users collection.
 */
exports.updateUserTenant = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const { uid, email, newTenantId, oldTenantId, role, user_id, user_name, phone, notes } = data;
  if (!uid || !email || !newTenantId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: uid, email, newTenantId.');
  }

  const db = admin.firestore();

  try {
    // 1. Verify Super Admin status (caller)
    const callerClaims = context.auth.token;
    const isSuperAdmin = callerClaims.email === "kyuahn@yahoo.com" || callerClaims.role === "Super Admin" || callerClaims.role === "L2 Admin";
    if (!isSuperAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Only Super Admins can change user tenants.');
    }

    // 2. Set Custom Claims in Firebase Auth
    await admin.auth().setCustomUserClaims(uid, { role, tenantId: newTenantId });

    // 3. Update Global Profile (global_users)
    await db.collection('global_users').doc(uid).set({
      tenantId: newTenantId,
      role: role,
      last_updated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 4. Move Tenant Profile
    if (user_id) {
      // 4a. Read existing profile if not fully provided (though UI should provide it)
      let profileData = { user_id, user_name, email, role_id: role, phone, notes, auth_uid: uid };

      if (oldTenantId && oldTenantId !== newTenantId) {
        // Optionally read from old location if data is missing
        const oldDoc = await db.doc(`tenants/${oldTenantId}/users/${user_id}`).get();
        if (oldDoc.exists()) {
          profileData = { ...oldDoc.data(), ...profileData, tenantId: newTenantId };
          // Delete from old location
          await db.doc(`tenants/${oldTenantId}/users/${user_id}`).delete();
        }
      }

      // 4b. Write to new location
      await db.doc(`tenants/${newTenantId}/users/${user_id}`).set({
        ...profileData,
        tenantId: newTenantId,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    return { success: true, message: `Successfully moved user ${email} to tenant ${newTenantId}.` };
  } catch (error) {
    console.error("Update User Tenant Error:", error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Auto-activates a user on first login.
 * Called from the client when status is Pending.
 * Uses Admin SDK so no Firestore security rules are needed.
 */
exports.activateUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
  }

  const uid = context.auth.uid;
  const db = admin.firestore();
  const now = admin.firestore.FieldValue.serverTimestamp();

  try {
    // 1. Update global_users
    const globalRef = db.collection('global_users').doc(uid);
    const globalSnap = await globalRef.get();
    if (globalSnap.exists) {
      const d = globalSnap.data();
      if (!d.status || d.status === 'Pending') {
        await globalRef.update({ status: 'Active', last_login: now });
      }
    }

    // 2. Update tenant profile
    const tenantId = (globalSnap.exists && globalSnap.data().tenantId) || context.auth.token.tenantId || '';
    if (tenantId) {
      const usersRef = db.collection(`tenants/${tenantId}/users`);
      const q = usersRef.where('auth_uid', '==', uid);
      const snap = await q.get();
      if (!snap.empty) {
        for (const docSnap of snap.docs) {
          if (!docSnap.data().status || docSnap.data().status === 'Pending') {
            await docSnap.ref.update({ status: 'Active', last_login: now });
          }
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('activateUser error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
