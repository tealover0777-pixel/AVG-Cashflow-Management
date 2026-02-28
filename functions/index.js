
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
    await db.collection('user_roles').doc(uid).set({
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
    const API_KEY = 'AIzaSyAD8G1WvI0SniOw5qvt_RrYIy5PkhF01Js';

    // Always generate the link (reliable fallback)
    const link = await admin.auth().generateEmailVerificationLink(email);

    // Attempt to send verification email via REST API
    let emailSent = false;
    try {
      console.log(`Generating custom token for ${uid}...`);
      const customToken = await admin.auth().createCustomToken(uid);

      console.log(`Exchanging custom token for ID token...`);
      const signInRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: customToken, returnSecureToken: true })
        }
      );
      const signInData = await signInRes.json();

      if (signInData.idToken) {
        console.log(`Sending verification email for ${email}...`);
        const sendRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken: signInData.idToken })
          }
        );
        const sendData = await sendRes.json();
        emailSent = !sendData.error;
        if (sendData.error) {
          console.error('sendOobCode REST error:', JSON.stringify(sendData.error));
        } else {
          console.log(`Verification email sent successfully to ${email}`);
        }
      } else {
        console.error('Custom token exchange failed REST response:', JSON.stringify(signInData));
      }
    } catch (emailErr) {
      console.error('Email send attempt failed with exception:', emailErr);
    }

    return {
      success: true,
      link,
      emailSent,
      isNewUser,
      user_id,
      message: emailSent
        ? `Verification email sent to ${email}.`
        : `User created. Email could not be sent automatically — share the link manually.`
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
    const API_KEY = 'AIzaSyAD8G1WvI0SniOw5qvt_RrYIy5PkhF01Js';

    const link = await admin.auth().generateEmailVerificationLink(email);

    let emailSent = false;
    try {
      console.log(`Generating custom token for ${uid}...`);
      const customToken = await admin.auth().createCustomToken(uid);

      console.log(`Exchanging custom token for ID token...`);
      const signInRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: customToken, returnSecureToken: true })
        }
      );
      const signInData = await signInRes.json();

      if (signInData.idToken) {
        console.log(`Sending verification email for ${email}...`);
        const sendRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken: signInData.idToken })
          }
        );
        const sendData = await sendRes.json();
        emailSent = !sendData.error;
        if (sendData.error) {
          console.error('sendOobCode REST error:', JSON.stringify(sendData.error));
        } else {
          console.log(`Verification email sent successfully to ${email}`);
        }
      } else {
        console.error('Custom token exchange failed REST response:', JSON.stringify(signInData));
      }
    } catch (emailErr) {
      console.error('Email send attempt failed with exception:', emailErr);
    }

    return { success: true, link, emailSent };
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
        // Also remove global user_roles entry
        await db.collection('user_roles').doc(uid).delete();
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
 * Automatically creates a document in the global 'user_roles' collection if it doesn't exist.
 */
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  const db = admin.firestore();
  try {
    const docRef = db.collection('user_roles').doc(user.uid);
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
