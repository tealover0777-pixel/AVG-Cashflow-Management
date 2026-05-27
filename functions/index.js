const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
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

  const { email, role, tenantId, phone, notes, user_id: providedUserId, contactId, partyId, first_name: initialFirstName, last_name: initialLastName, street1, street2, city, state, zip } = data;
  const db = admin.firestore();

  let first_name = initialFirstName;
  let last_name = initialLastName;

  try {
    let userRecord;
    let isNewUser = false;

    // 0. If names are missing, try to fetch from Contact record if contactId exists
    const cid = contactId || partyId;
    if ((!first_name || !last_name) && cid && tenantId) {
      try {
        const contactSnap = await db.doc(`tenants/${tenantId}/contacts/${cid}`).get();
        if (contactSnap.exists) {
          const cData = contactSnap.data();
          if (!first_name) first_name = cData.first_name || "";
          if (!last_name) last_name = cData.last_name || "";
        }
      } catch (e) {
        console.warn("Could not fetch contact for naming:", cid, e.message);
      }
    }

    // 1. Check if user exists or create them
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        userRecord = await admin.auth().createUser({
          email: email,
          displayName: [first_name, last_name].filter(Boolean).join(' ') || '',
          emailVerified: false,
          disabled: false
        });
        isNewUser = true;
      } else {
        throw e;
      }
    }

    const uid = userRecord.uid;

    // 2. Look up if role is global from role_types
    let isGlobal = false;
    let roleName = role; // Default to role ID
    try {
      const roleDoc = await db.collection('role_types').doc(role).get();
      if (roleDoc.exists) {
        const roleData = roleDoc.data();
        if (roleData.IsGlobal === true) {
          isGlobal = true;
        }
        if (roleData.role_name) {
          roleName = roleData.role_name;
        }
      }
    } catch (e) {
      console.warn('Could not check role_types for role:', role, e.message);
    }

    // 3. Set Custom Claims (include isGlobal for Firestore rules)
    await admin.auth().setCustomUserClaims(uid, { role, tenantId, isGlobal });

    // 4. Determine user_id (Check if already in tenant)
    let user_id = providedUserId;
    if (!user_id && tenantId) {
      if (role === 'R10001') {
        // Resolve contact/member ID (M...)
        let effectiveContactId = contactId || partyId;
        if (!effectiveContactId) {
          const emailSnap = await db.collection(`tenants/${tenantId}/contacts`).where('email', '==', email).limit(1).get();
          if (!emailSnap.empty) {
            effectiveContactId = emailSnap.docs[0].id;
          } else {
            const uidSnap = await db.collection(`tenants/${tenantId}/contacts`).where('auth_uid', '==', uid).limit(1).get();
            if (!uidSnap.empty) {
              effectiveContactId = uidSnap.docs[0].id;
            }
          }
        }
        if (!effectiveContactId) {
          const contactsSnap = await db.collection(`tenants/${tenantId}/contacts`).get();
          let maxNum = 10000;
          contactsSnap.forEach(d => {
            const m = (d.id || '').match(/^M(\d+)$/);
            if (m) {
              const num = parseInt(m[1]);
              if (num > maxNum) maxNum = num;
            }
          });
          effectiveContactId = 'M' + (maxNum + 1);
        }
        user_id = effectiveContactId;
      } else {
        const existingUserSnap = await db.collection(`tenants/${tenantId}/users`).where('auth_uid', '==', uid).get();
        if (!existingUserSnap.empty) {
          user_id = existingUserSnap.docs[0].id;
        } else {
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
      }
    }
    if (!user_id) user_id = 'U' + Date.now(); // Final fallback

    // 4. Create/Update Firestore Global Profile
    const globalData = {
      email,
      role,
      tenantId,
      isGlobal,
      status: 'Pending',
      user_id, // Always write user_id to global_users
      last_updated: admin.firestore.FieldValue.serverTimestamp()
    };

    if (isGlobal) {
      globalData.first_name = first_name || '';
      globalData.last_name = last_name || '';
      globalData.contact_id = contactId || partyId || '';
      globalData.street1 = street1 || '';
      globalData.street2 = street2 || '';
      globalData.city = city || '';
      globalData.state = state || '';
      globalData.zip = zip || '';
    } else {
      // Symmetrical Structure: Strip detailed profile fields for tenant users
      globalData.first_name = admin.firestore.FieldValue.delete();
      globalData.last_name = admin.firestore.FieldValue.delete();
      globalData.contact_id = admin.firestore.FieldValue.delete();
      globalData.street1 = admin.firestore.FieldValue.delete();
      globalData.street2 = admin.firestore.FieldValue.delete();
      globalData.city = admin.firestore.FieldValue.delete();
      globalData.state = admin.firestore.FieldValue.delete();
      globalData.zip = admin.firestore.FieldValue.delete();
      globalData.notes = admin.firestore.FieldValue.delete();
    }

    await db.collection('global_users').doc(uid).set(globalData, { merge: true });

    if (isGlobal) {
      // Update global_users with notes if global
      await db.collection('global_users').doc(uid).update({
        notes: notes || ''
      });
    }

    // 5. Create Tenant Profile (users or contacts) based on role boundaries
    if (role === 'R10001') {
      if (tenantId) {
        // Write/update contact record
        let effectiveContactId = user_id;
        if (!effectiveContactId) {
          const emailSnap = await db.collection(`tenants/${tenantId}/contacts`).where('email', '==', email).limit(1).get();
          if (!emailSnap.empty) {
            effectiveContactId = emailSnap.docs[0].id;
          } else {
            const uidSnap = await db.collection(`tenants/${tenantId}/contacts`).where('auth_uid', '==', uid).limit(1).get();
            if (!uidSnap.empty) {
              effectiveContactId = uidSnap.docs[0].id;
            }
          }
        }
        if (!effectiveContactId) {
          const contactsSnap = await db.collection(`tenants/${tenantId}/contacts`).get();
          let maxNum = 10000;
          contactsSnap.forEach(d => {
            const m = (d.id || '').match(/^M(\d+)$/);
            if (m) {
              const num = parseInt(m[1]);
              if (num > maxNum) maxNum = num;
            }
          });
          effectiveContactId = 'M' + (maxNum + 1);
        }

        const contactDocRef = db.doc(`tenants/${tenantId}/contacts/${effectiveContactId}`);
        const contactSnap = await contactDocRef.get();
        const existingData = contactSnap.exists ? contactSnap.data() : {};

        await contactDocRef.set({
          id: effectiveContactId,
          auth_uid: uid,
          role_id: role,
          status: 'Pending',
          first_name: first_name || existingData.first_name || '',
          last_name: last_name || existingData.last_name || '',
          email: email || existingData.email || '',
          phone: phone || existingData.phone || userRecord.phoneNumber || '',
          notes: notes || existingData.notes || '',
          tenantId: tenantId,
          street1: street1 || existingData.street1 || '',
          street2: street2 || existingData.street2 || '',
          city: city || existingData.city || '',
          state: state || existingData.state || '',
          zip: zip || existingData.zip || '',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Delete any user documents with this email or UID in the same tenant
        const usersCol = db.collection(`tenants/${tenantId}/users`);
        const usersByEmail = await usersCol.where('email', '==', email).get();
        for (const d of usersByEmail.docs) {
          await d.ref.delete();
        }
        const usersByUid = await usersCol.where('auth_uid', '==', uid).get();
        for (const d of usersByUid.docs) {
          await d.ref.delete();
        }
      }
    } else if (role >= 'R10002' && role <= 'R10005') {
      if (tenantId) {
        // Write/update user record
        const userDocRef = db.doc(`tenants/${tenantId}/users/${user_id}`);
        const userSnap = await userDocRef.get();
        const existingData = userSnap.exists ? userSnap.data() : {};

        await userDocRef.set({
          user_id,
          first_name: first_name || existingData.first_name || '',
          last_name: last_name || existingData.last_name || '',
          email: email || existingData.email || '',
          role_id: role,
          status: 'Pending',
          phone: phone || existingData.phone || userRecord.phoneNumber || '',
          notes: notes || existingData.notes || '',
          tenantId,
          auth_uid: uid,
          street1: street1 || existingData.street1 || '',
          street2: street2 || existingData.street2 || '',
          city: city || existingData.city || '',
          state: state || existingData.state || '',
          zip: zip || existingData.zip || '',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Delete any contact documents with this email or UID in the same tenant
        const contactsCol = db.collection(`tenants/${tenantId}/contacts`);
        const contactsByEmail = await contactsCol.where('email', '==', email).get();
        for (const d of contactsByEmail.docs) {
          await d.ref.delete();
        }
        const contactsByUid = await contactsCol.where('auth_uid', '==', uid).get();
        for (const d of contactsByUid.docs) {
          await d.ref.delete();
        }
      }
    } else if (role >= 'R10006' && role <= 'R10010') {
      // Platform user - delete contact/user documents in ALL tenants
      const tenantsSnap = await db.collection('tenants').get();
      for (const tenantDoc of tenantsSnap.docs) {
        const tId = tenantDoc.id;
        const uEmail = await db.collection(`tenants/${tId}/users`).where('email', '==', email).get();
        for (const doc of uEmail.docs) {
          await doc.ref.delete();
        }
        const uUid = await db.collection(`tenants/${tId}/users`).where('auth_uid', '==', uid).get();
        for (const doc of uUid.docs) {
          await doc.ref.delete();
        }

        const cEmail = await db.collection(`tenants/${tId}/contacts`).where('email', '==', email).get();
        for (const doc of cEmail.docs) {
          await doc.ref.delete();
        }
        const cUid = await db.collection(`tenants/${tId}/contacts`).where('auth_uid', '==', uid).get();
        for (const doc of cUid.docs) {
          await doc.ref.delete();
        }
      }
    }

    // 6. Generate password reset link (better for onboarding than verification)
    const link = await admin.auth().generatePasswordResetLink(email);

    // 7. Send invitation email (uses platform email as fallback if tenant has no config)
    let emailSent = false;
    try {
      const setup = await getActiveEmailSetup(tenantId, db);
      const common = (setup && setup.common) || {};
      let tenantName = "American Vision Group";
      if (tenantId && tenantId !== "PLATFORM") {
        const tenantSnap = await db.collection('tenants').doc(tenantId).get();
        if (tenantSnap.exists) tenantName = tenantSnap.data().tenant_name || tenantSnap.data().name || tenantName;
      }
      const transporter = await getTransporter(tenantId);
      await transporter.sendMail({
        from: `"${common.fromName || tenantName}" <${common.fromEmail || "no-reply@americanvisiongroup.com"}>`,
        to: email,
        replyTo: common.replyTo || common.fromEmail || "",
        subject: `You've been invited to ${tenantName}`,
        html: `<div style="font-family: sans-serif; max-width: 600px; padding: 20px;">
          <h2>Welcome to ${tenantName}</h2>
          <p>Hello ${first_name || "there"},</p>
          <p>You have been invited to join the platform with the role of <b>${roleName}</b>.</p>
          <p>Please click the button below to set your password and access your account:</p>
          <div style="margin: 30px 0;">
            <a href="${link}" style="background: #1c1917; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Accept Invitation</a>
          </div>
          <p style="font-size: 13px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="font-size: 13px; color: #666; word-break: break-all;">${link}</p>
        </div>`
      });
      emailSent = true;
    } catch (err) {
      console.warn("Invite email not sent:", err.message);
    }

    return {
      success: true,
      link,
      emailSent,
      isNewUser,
      user_id,
      message: emailSent 
        ? `Invitation sent to ${email}.`
        : `User created. Share the link below so they can set their password and log in.`
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
    const db = admin.firestore();

    // Resolve or create the Firebase Auth user
    let userRecord;
    let isNewAuthUser = false;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (e) {
      if (e.code !== 'auth/user-not-found') throw e;
      // User exists in Firestore but not Auth — create the Auth account now
      userRecord = await admin.auth().createUser({ email, emailVerified: false, disabled: false });
      isNewAuthUser = true;
      console.log(`resendVerification: created missing Auth user for ${email}`);
    }

    const uid = userRecord.uid;

    // If we just created the Auth user, sync custom claims from global_users
    if (isNewAuthUser) {
      const gSnap = await db.collection('global_users').doc(uid).get();
      if (!gSnap.exists) {
        // Try matching by email
        const matches = await db.collection('global_users').where('email', '==', email).limit(1).get();
        if (!matches.empty) {
          const gData = matches.docs[0].data();
          await admin.auth().setCustomUserClaims(uid, { role: gData.role || '', tenantId: gData.tenantId || '', isGlobal: gData.isGlobal || false });
          await db.collection('global_users').doc(uid).update({ auth_uid: uid });
        }
      } else {
        const gData = gSnap.data();
        await admin.auth().setCustomUserClaims(uid, { role: gData.role || '', tenantId: gData.tenantId || '', isGlobal: gData.isGlobal || false });
      }
    }

    const link = await admin.auth().generatePasswordResetLink(email);

    // Send password reset email (uses platform email as fallback if tenant has no config)
    let emailSent = false;
    const globalSnap = await db.collection('global_users').doc(uid).get();
    const tenantId = globalSnap.exists ? globalSnap.data().tenantId
      : (await db.collection('global_users').where('email', '==', email).limit(1).get().then(s => s.empty ? null : s.docs[0].data().tenantId));

    try {
      const setup = await getActiveEmailSetup(tenantId, db);
      const common = (setup && setup.common) || {};
      let tenantName = "American Vision Group";
      if (tenantId && tenantId !== "PLATFORM") {
        const tenantSnap = await db.collection('tenants').doc(tenantId).get();
        if (tenantSnap.exists) tenantName = tenantSnap.data().tenant_name || tenantSnap.data().name || tenantName;
      }
      const transporter = await getTransporter(tenantId);
      await transporter.sendMail({
        from: `"${common.fromName || tenantName}" <${common.fromEmail || "no-reply@americanvisiongroup.com"}>`,
        to: email,
        subject: `Reset Your Password - ${tenantName}`,
        html: `<div style="font-family: sans-serif; max-width: 600px; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>Access your account for <b>${tenantName}</b> by clicking the link below:</p>
          <div style="margin: 30px 0;">
            <a href="${link}" style="background: #1c1917; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Sign In / Reset Password</a>
          </div>
          <p style="font-size: 13px; color: #666;">This link will expire in 24 hours.</p>
        </div>`
      });
      emailSent = true;
    } catch (err) {
      console.warn("Resend email not sent:", err.message);
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

  const { uid, email, newTenantId, oldTenantId, role, user_id: providedUserId, first_name, last_name, phone, notes, street1, street2, city, state, zip } = data;
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

    // Look up if role is global from role_types
    let isGlobal = false;
    try {
      const roleDoc = await db.collection('role_types').doc(role).get();
      if (roleDoc.exists && roleDoc.data().IsGlobal === true) {
        isGlobal = true;
      }
    } catch (e) {
      console.warn('Could not check role_types:', e.message);
    }

    // 2.5 Determine resolved user_id based on role type
    let resolvedUserId = providedUserId;
    if (role === 'R10001') {
      let effectiveContactId = null;
      const newContactSnap = await db.collection(`tenants/${newTenantId}/contacts`).where('auth_uid', '==', uid).limit(1).get();
      if (!newContactSnap.empty) {
        effectiveContactId = newContactSnap.docs[0].id;
      } else {
        const emailSnap = await db.collection(`tenants/${newTenantId}/contacts`).where('email', '==', email).limit(1).get();
        if (!emailSnap.empty) {
          effectiveContactId = emailSnap.docs[0].id;
        }
      }

      if (!effectiveContactId && oldTenantId) {
        const oldContactSnap = await db.collection(`tenants/${oldTenantId}/contacts`).where('auth_uid', '==', uid).limit(1).get();
        if (!oldContactSnap.empty) {
          effectiveContactId = oldContactSnap.docs[0].id;
        }
      }

      if (!effectiveContactId && newTenantId) {
        const contactsSnap = await db.collection(`tenants/${newTenantId}/contacts`).get();
        let maxNum = 10000;
        contactsSnap.forEach(d => {
          const m = (d.id || '').match(/^M(\d+)$/);
          if (m) {
            const num = parseInt(m[1]);
            if (num > maxNum) maxNum = num;
          }
        });
        effectiveContactId = 'M' + (maxNum + 1);
      }
      resolvedUserId = effectiveContactId;
    } else if (role >= 'R10002' && role <= 'R10005') {
      let effectiveUserId = resolvedUserId;
      if (!effectiveUserId) {
        const newTenantUserSnap = await db.collection(`tenants/${newTenantId}/users`).where('auth_uid', '==', uid).get();
        if (!newTenantUserSnap.empty) {
          effectiveUserId = newTenantUserSnap.docs[0].id;
        } else if (oldTenantId) {
          const oldTenantUserSnap = await db.collection(`tenants/${oldTenantId}/users`).where('auth_uid', '==', uid).get();
          if (!oldTenantUserSnap.empty) {
            effectiveUserId = oldTenantUserSnap.docs[0].id;
          }
        }
      }

      if (!effectiveUserId && newTenantId) {
        const usersSnap = await db.collection(`tenants/${newTenantId}/users`).get();
        let maxNum = 10000;
        usersSnap.forEach(d => {
          const m = (d.id || '').match(/^U(\d+)$/);
          if (m) {
            const num = parseInt(m[1]);
            if (num > maxNum) maxNum = num;
          }
        });
        effectiveUserId = 'U' + (maxNum + 1);
      }
      resolvedUserId = effectiveUserId;
    }

    const globalPayload = {
      email: email,
      tenantId: newTenantId,
      role: role,
      isGlobal: isGlobal,
      user_id: resolvedUserId || '', // Always keep user_id in global_users
      last_updated: admin.firestore.FieldValue.serverTimestamp()
    };

    if (isGlobal) {
      globalPayload.first_name = first_name || '';
      globalPayload.last_name = last_name || '';
      globalPayload.street1 = street1 || '';
      globalPayload.street2 = street2 || '';
      globalPayload.city = city || '';
      globalPayload.state = state || '';
      globalPayload.zip = zip || '';
      globalPayload.phone = phone || '';
      globalPayload.notes = notes || '';
    } else {
      // Symmetrical Structure: Strip detailed profile fields for tenant users
      globalPayload.first_name = admin.firestore.FieldValue.delete();
      globalPayload.last_name = admin.firestore.FieldValue.delete();
      globalPayload.street1 = admin.firestore.FieldValue.delete();
      globalPayload.street2 = admin.firestore.FieldValue.delete();
      globalPayload.city = admin.firestore.FieldValue.delete();
      globalPayload.state = admin.firestore.FieldValue.delete();
      globalPayload.zip = admin.firestore.FieldValue.delete();
      globalPayload.phone = admin.firestore.FieldValue.delete();
      globalPayload.notes = admin.firestore.FieldValue.delete();
      globalPayload.contact_id = admin.firestore.FieldValue.delete();
    }

    // 3. Update Global Profile (global_users)
    await db.collection('global_users').doc(uid).set(globalPayload, { merge: true });

    // 4. Move/Update Tenant Profile based on role boundaries
    if (role === 'R10001') {
      let effectiveContactId = resolvedUserId;

      if (effectiveContactId) {
        let contactData = {
          id: effectiveContactId,
          first_name: first_name || '',
          last_name: last_name || '',
          email: email,
          role_id: role,
          phone: phone || '',
          notes: notes || '',
          street1: street1 || '',
          street2: street2 || '',
          city: city || '',
          state: state || '',
          zip: zip || '',
          auth_uid: uid,
          tenantId: newTenantId
        };

        if (oldTenantId && oldTenantId !== newTenantId) {
          // Read from old tenant's contacts if it exists, then delete it
          const oldDocSnap = await db.collection(`tenants/${oldTenantId}/contacts`).where('auth_uid', '==', uid).limit(1).get();
          if (!oldDocSnap.empty) {
            contactData = { ...oldDocSnap.docs[0].data(), ...contactData, tenantId: newTenantId };
            await oldDocSnap.docs[0].ref.delete();
          } else {
            // Check by ID if not found by auth_uid
            const oldDocById = await db.doc(`tenants/${oldTenantId}/contacts/${effectiveContactId}`).get();
            if (oldDocById.exists) {
              contactData = { ...oldDocById.data(), ...contactData, tenantId: newTenantId };
              await oldDocById.ref.delete();
            }
          }
        }

        // Write to new tenant's contacts
        await db.doc(`tenants/${newTenantId}/contacts/${effectiveContactId}`).set({
          ...contactData,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      // Delete user documents with matching email/uid in new and old tenants
      const cleanTenants = [newTenantId];
      if (oldTenantId && oldTenantId !== newTenantId) cleanTenants.push(oldTenantId);
      for (const tId of cleanTenants) {
        const uEmail = await db.collection(`tenants/${tId}/users`).where('email', '==', email).get();
        for (const doc of uEmail.docs) await doc.ref.delete();
        const uUid = await db.collection(`tenants/${tId}/users`).where('auth_uid', '==', uid).get();
        for (const doc of uUid.docs) await doc.ref.delete();
      }

    } else if (role >= 'R10002' && role <= 'R10005') {
      let effectiveUserId = resolvedUserId;
      if (!effectiveUserId) {
        // Search in new tenant first
        const newTenantUserSnap = await db.collection(`tenants/${newTenantId}/users`).where('auth_uid', '==', uid).get();
        if (!newTenantUserSnap.empty) {
          effectiveUserId = newTenantUserSnap.docs[0].id;
        } else if (oldTenantId) {
          // Search in old tenant
          const oldTenantUserSnap = await db.collection(`tenants/${oldTenantId}/users`).where('auth_uid', '==', uid).get();
          if (!oldTenantUserSnap.empty) {
            effectiveUserId = oldTenantUserSnap.docs[0].id;
          }
        }
      }

      if (!effectiveUserId && newTenantId) {
        const usersSnap = await db.collection(`tenants/${newTenantId}/users`).get();
        let maxNum = 10000;
        usersSnap.forEach(d => {
          const m = (d.id || '').match(/^U(\d+)$/);
          if (m) {
            const num = parseInt(m[1]);
            if (num > maxNum) maxNum = num;
          }
        });
        effectiveUserId = 'U' + (maxNum + 1);
      }

      if (effectiveUserId) {
        let profileData = {
          user_id: effectiveUserId,
          first_name: first_name || '',
          last_name: last_name || '',
          email: email,
          role_id: role,
          phone: phone || '',
          notes: notes || '',
          street1: street1 || '',
          street2: street2 || '',
          city: city || '',
          state: state || '',
          zip: zip || '',
          auth_uid: uid,
          tenantId: newTenantId
        };

        if (oldTenantId && oldTenantId !== newTenantId) {
          // Read from old location and delete
          const oldDoc = await db.doc(`tenants/${oldTenantId}/users/${effectiveUserId}`).get();
          if (oldDoc.exists) {
            profileData = { ...oldDoc.data(), ...profileData, tenantId: newTenantId };
            await oldDoc.ref.delete();
          }
        }

        // Write to new location
        await db.doc(`tenants/${newTenantId}/users/${effectiveUserId}`).set({
          ...profileData,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      // Delete contact documents with matching email/uid in new and old tenants
      const cleanTenants = [newTenantId];
      if (oldTenantId && oldTenantId !== newTenantId) cleanTenants.push(oldTenantId);
      for (const tId of cleanTenants) {
        const cEmail = await db.collection(`tenants/${tId}/contacts`).where('email', '==', email).get();
        for (const doc of cEmail.docs) await doc.ref.delete();
        const cUid = await db.collection(`tenants/${tId}/contacts`).where('auth_uid', '==', uid).get();
        for (const doc of cUid.docs) await doc.ref.delete();
      }

    } else if (role >= 'R10006' && role <= 'R10010') {
      // Platform user - delete contact/user documents in ALL tenants
      const tenantsSnap = await db.collection('tenants').get();
      for (const tenantDoc of tenantsSnap.docs) {
        const tId = tenantDoc.id;
        const uEmail = await db.collection(`tenants/${tId}/users`).where('email', '==', email).get();
        for (const doc of uEmail.docs) await doc.ref.delete();
        const uUid = await db.collection(`tenants/${tId}/users`).where('auth_uid', '==', uid).get();
        for (const doc of uUid.docs) await doc.ref.delete();

        const cEmail = await db.collection(`tenants/${tId}/contacts`).where('email', '==', email).get();
        for (const doc of cEmail.docs) await doc.ref.delete();
        const cUid = await db.collection(`tenants/${tId}/contacts`).where('auth_uid', '==', uid).get();
        for (const doc of cUid.docs) await doc.ref.delete();
      }
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

/**
 * Helper to get the active email configuration for a tenant.
 * Handles inheritance from platform_config if usePlatformEmail is enabled.
 */
async function getActiveEmailSetup(tenantId, db, forcePlatform = false) {
  // Resolve tenant setup (skip for PLATFORM pseudo-tenant)
  let tenantSetup = null;
  if (tenantId && tenantId !== "PLATFORM") {
    const tenantSnap = await db.collection('tenants').doc(tenantId).get();
    tenantSetup = tenantSnap.exists ? tenantSnap.data().emailSetup : null;
  }

  // Use platform email when:
  //   - explicitly forced (sendTestEmail with toggle on)
  //   - tenant has usePlatformEmail enabled
  //   - tenant has no email config at all (auto-fallback)
  const preferPlatform = forcePlatform || (tenantSetup && tenantSetup.usePlatformEmail) || !tenantSetup;

  if (preferPlatform) {
    const platformSnap = await db.collection('platform_config').doc('company').get();
    const platformSetup = platformSnap.exists ? platformSnap.data().emailSetup : null;
    if (platformSetup) return platformSetup;

    // Platform explicitly requested but not configured → fail with a helpful message
    if (forcePlatform || (tenantSetup && tenantSetup.usePlatformEmail)) {
      throw new Error("Platform email service is not configured. Go to Platform Company → Email tab and save your SMTP or ESP settings first.");
    }
    // Auto-fallback: platform also not configured, nothing we can do
    return null;
  }

  return tenantSetup;
}

/**
 * Helper to get a nodemailer transporter based on tenant settings.
 * Supports specialized translation of Service Provider (API) settings into SMTP transports.
 */
async function getTransporter(tenantId, forcePlatform = false) {
  const db = admin.firestore();
  const setup = await getActiveEmailSetup(tenantId, db, forcePlatform);

  if (!setup) {
    // Fallback to system default
    const systemSnap = await db.collection('system').doc('integrations').get();
    const config = systemSnap.exists ? systemSnap.data().default_smtp : null;
    if (!config) throw new Error("No email configuration found for this tenant.");
    return nodemailer.createTransport(config);
  }

  const method = setup.method || (setup.provider === 'SMTP' ? 'SMTP' : 'ESP');

  if (method === 'SMTP' && setup.smtp && setup.smtp.host) {
    const port = parseInt(setup.smtp.port) || 587;
    const secure = (port === 465);
    const smtpUser = (setup.smtp.user || "").trim();
    const smtpPass = (setup.smtp.pass || "").replace(/\s/g, "");
    console.log(`[getTransporter] SMTP host=${setup.smtp.host} port=${port} secure=${secure} user=${smtpUser} passLen=${smtpPass.length}`);

    const transportOptions = {
      host: setup.smtp.host,
      port,
      secure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      }
    };

    return nodemailer.createTransport(transportOptions);
  }

  if (method === 'ESP' && setup.api) {
    const { provider, apiKey, domain, region } = setup.api;
    
    if (provider === 'SendGrid') {
      return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: { user: 'apikey', pass: apiKey }
      });
    }

    if (provider === 'Mailgun') {
      return nodemailer.createTransport({
        host: 'smtp.mailgun.org',
        port: 587,
        auth: { user: `postmaster@${domain}`, pass: apiKey }
      });
    }

    if (provider === 'Amazon SES') {
      // For SES SMTP, usually requires separate SMTP credentials, 
      // but if user provides Region, we point to that endpoint.
      // Note: Full SES API usage would require AWS SDK, but SMTP is a good fallback.
      return nodemailer.createTransport({
        host: `email-smtp.${region || 'us-east-1'}.amazonaws.com`,
        port: 587,
        secure: false, // SES usually uses STARTTLS
        auth: { user: setup.api.smtpUser || apiKey, pass: setup.api.smtpPass || apiKey } // Usually requires specific SMTP credentials
      });
    }
  }

  // Final fallback
  const systemSnap = await db.collection('system').doc('integrations').get();
  const config = systemSnap.exists ? systemSnap.data().default_smtp : null;
  if (!config) throw new Error("No valid mailer configuration found.");
  return nodemailer.createTransport(config);
}

/**
 * Basic HTML renderer for campaign rows.
 */
function renderEmailBody(rows) {
  let html = `<div style="max-width: 600px; margin: 0 auto; font-family: 'Inter', Helvetica, Arial, sans-serif; background: #ffffff; color: #1F2937;">`;
  (rows || []).forEach(row => {
    switch(row.type) {
      case 'paragraph':
        html += `<div style="padding: 16px 32px; line-height: 1.6; font-size: 14px;">${row.content.html || ''}</div>`;
        break;
      case 'image':
        if (row.content.banner) {
          html += `<div style="background: ${row.content.bg || '#1c170f'}; padding: 45px 25px; text-align: right; color: #ffffff; font-weight: 800; font-size: 14px; letter-spacing: 1px;">${(row.content.bannerText || '').toUpperCase()}</div>`;
        } else if (row.content.imageUrl) {
          html += `<div style="padding: 12px; text-align: ${row.content.align || 'center'};"><img src="${row.content.imageUrl}" style="max-width: 100%; border-radius: 4px; height: auto;" /></div>`;
        }
        break;
      case 'footer':
        html += `<div style="background: ${row.content.bg || '#1c170f'}; padding: 30px; color: #ffffff; display: table; width: 100%; box-sizing: border-box;">
          <div style="display: table-cell; vertical-align: middle; font-size: 13px; opacity: 0.9;">${(row.content.leftText || '').replace(/\n/g, '<br/>')}</div>
          <div style="display: table-cell; vertical-align: middle; text-align: right; font-size: 12px;">${(row.content.rightText || '').replace(/\n/g, '<br/>')}</div>
        </div>`;
        break;
      case 'columns':
        html += `<table width="100%" cellpadding="0" cellspacing="0"><tr>`;
        (row.content.columns || []).forEach(col => {
          html += `<td style="vertical-align: top; padding: 10px;">${renderEmailBody(col.blocks)}</td>`;
        });
        html += `</tr></table>`;
        break;
      case 'attachment':
        const files = row.content.files || [];
        if (files.length > 0) {
          html += `<div style="padding: 16px 32px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin: 16px 32px;">`;
          html += `<div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #374151;">📎 Attached Documents:</div>`;
          html += `<ul style="list-style-type: none; padding: 0; margin: 0;">`;
          files.forEach(file => {
            html += `<li style="margin-bottom: 6px;"><a href="${file.url}" target="_blank" style="color: #2563eb; font-size: 13px; text-decoration: underline; font-weight: 500;">${file.name}</a></li>`;
          });
          html += `</ul></div>`;
        }
        break;
    }
  });
  html += `</div>`;
  return html;
}

/**
 * Helper to extract attachments from rows (handling columns recursively)
 */
function extractAttachments(rows) {
  const attachments = [];
  const scan = (items) => {
    (items || []).forEach(row => {
      if (row.type === 'attachment') {
        const files = row.content && row.content.files || [];
        files.forEach(file => {
          if (file.name && file.url) {
            attachments.push({
              filename: file.name,
              path: file.url
            });
          }
        });
      } else if (row.type === 'columns') {
        const cols = row.content && row.content.columns || [];
        cols.forEach(col => {
          scan(col.blocks);
        });
      }
    });
  };
  scan(rows);
  return attachments;
}

/**
 * cloud function: sendTestEmail
 * Triggers a real email using the tenant's chosen API provider or SMTP.
 * Also respects the 'common' fields (From, From Name, Reply-To).
 */
exports.sendTestEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
  
  const { tenantId, recipientEmail, subject, rows, fromName: overrideFromName, fromEmail: overrideFromEmail, replyTo: overrideReplyTo, usePlatformEmail } = data;
  if (!tenantId || !recipientEmail) throw new functions.https.HttpsError('invalid-argument', 'Missing tenantId or recipientEmail.');

  try {
    const db = admin.firestore();
    const setup = await getActiveEmailSetup(tenantId, db, !!usePlatformEmail);
    const common = (setup && setup.common) || {};

    // Determine effective sender details
    const finalFromEmail = overrideFromEmail || common.fromEmail || "no-reply@americanvisiongroup.com";
    const finalFromName = overrideFromName || common.fromName || "American Vision Group";
    const finalReplyTo = overrideReplyTo || common.replyTo || finalFromEmail;

    const transporter = await getTransporter(tenantId, !!usePlatformEmail);
    const htmlBody = renderEmailBody(rows);
    const personalizedSubject = await resolveRecipientTags(subject || "Test Email", recipientEmail, tenantId, db, finalFromName);
    const personalizedHtml = await resolveRecipientTags(htmlBody, recipientEmail, tenantId, db, finalFromName);

    const attachments = extractAttachments(rows);

    await transporter.sendMail({
      from: `"${finalFromName}" <${finalFromEmail}>`,
      to: recipientEmail,
      replyTo: finalReplyTo,
      subject: personalizedSubject,
      html: personalizedHtml,
      attachments: attachments.length > 0 ? attachments : undefined
    });

    return { success: true };
  } catch (err) {
    console.error("sendTestEmail Error Details:", {
      message: err.message,
      code: err.code,
      command: err.command,
      response: err.response,
      stack: err.stack
    });
    
    // Provide a more descriptive error message to the frontend
    let friendlyMessage = err.message;
    if (err.code === 'EAUTH') {
      friendlyMessage = "Authentication failed. Please verify your SMTP username and password (or App Password if using 2FA).";
    } else if (err.code === 'ESOCKET') {
      friendlyMessage = "Network error: Could not connect to the mail server. Check host and port settings.";
    } else if (err.response) {
      friendlyMessage = `Mail Server Error: ${err.response}`;
    }

    throw new functions.https.HttpsError('internal', friendlyMessage);
  }
});

/**
 * Helper to resolve dynamic tags for a specific recipient.
 * Handles Name, Temporal (Year/Quarter), and Financial (Invested/Distributed/Balance) data.
 */
async function resolveRecipientTags(html, email, tenantId, db, fromName) {
  let resolvedHtml = html;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  const quarter = Math.floor(month / 3) + 1;
  
  // Last quarter logic
  let lastQ = quarter - 1;
  if (lastQ === 0) lastQ = 4;

  // 1. Fetch Recipient Identity (Contact or User)
  let recipientData = { first_name: '', last_name: '', id: null };
  const contactSnap = await db.collection(`tenants/${tenantId}/contacts`).where('email', '==', email).limit(1).get();
  if (!contactSnap.empty) {
    const d = contactSnap.docs[0].data();
    recipientData = { 
      first_name: d.first_name || d.full_name || d.name || '', 
      last_name: d.last_name || '', 
      id: contactSnap.docs[0].id 
    };
  } else {
    const userSnap = await db.collection(`tenants/${tenantId}/users`).where('email', '==', email).limit(1).get();
    if (!userSnap.empty) {
      const d = userSnap.docs[0].data();
      recipientData = { 
        first_name: d.first_name || '', 
        last_name: d.last_name || '', 
        id: userSnap.docs[0].id 
      };
    }
  }

  // 2. Resolve Temporal Tags
  const temporal = {
    '{{Current year}}': String(year),
    '{{Current quarter}}': `Q${quarter}`,
    '{{Last quarter}}': `Q${lastQ}`,
    '{{First name}}': recipientData.first_name,
    '{{Last name}}': recipientData.last_name,
    '{{Full name}}': `${recipientData.first_name} ${recipientData.last_name}`.trim(),
    '{{From name}}': fromName || '',
    '{{sponsor portal link}}': 'https://avg-cashflow-management.web.app',
  };

  // 3. Financial Data Aggregation
  let totalInvested = 0;
  let totalDistributed = 0;
  let capitalBalance = 0;
  let totalPrincipalRepaid = 0;

  if (recipientData.id) {
    const schSnap = await db.collection(`tenants/${tenantId}/paymentSchedules`).where('contact_id', '==', recipientData.id).get();
    const allSchedules = schSnap.docs.map(doc => doc.data());

    // 1. Contributions (from Capital Transactions tab logic)
    const contributions = allSchedules.filter(s => (s.payment_type || s.type) === "INVESTOR_PRINCIPAL_DEPOSIT" || (s.type === 'deposit'));
    totalInvested = contributions.reduce((sum, s) => sum + (parseFloat(String(s.signed_payment_amount || s.payment_amount || s.amount || 0).replace(/[^0-9.-]/g, '')) || 0), 0);

    // 2. Withdrawals
    const withdrawals = allSchedules.filter(s => {
      const ty = (s.payment_type || s.type || "");
      const st = (s.PaymentStatus || s.status || "").toLowerCase();
      return ty === "INVESTOR_PRINCIPAL_PAYMENT" && (st === "withdrawals" || st === "withdrawal" || st === "withdrawl");
    });
    const totalWithdrawals = withdrawals.reduce((sum, s) => sum + (parseFloat(String(s.signed_payment_amount || s.payment_amount || s.amount || 0).replace(/[^0-9.-]/g, '')) || 0), 0);

    // 3. Distributions (Interest)
    const distSchedules = allSchedules.filter(s => {
      const ty = (s.payment_type || s.type || "").toLowerCase();
      // Filter for status "Paid" for actual distributed amount
      const st = (s.status || s.PaymentStatus || "").toLowerCase();
      return (ty.includes("interest") || ty.includes("distribution")) && st === "paid";
    });
    totalDistributed = distSchedules.reduce((sum, s) => sum + (parseFloat(String(s.signed_payment_amount || s.payment_amount || s.amount || 0).replace(/[^0-9.-]/g, '')) || 0), 0);

    capitalBalance = totalInvested - Math.abs(totalWithdrawals);
  }

  const financials = {
    '{{Total distributed}}': new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalDistributed),
    '{{Total Invested}}': new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalInvested),
    '{{Capital balance}}': new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(capitalBalance),
  };

  // 4. Final Replacement Synthesis
  const allTags = { ...temporal, ...financials };
  Object.keys(allTags).forEach(tag => {
    const regex = new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    resolvedHtml = resolvedHtml.replace(regex, allTags[tag] || '');
  });

  return resolvedHtml;
}

/**
 * cloud function: sendMarketingEmail
 * Dispatches a live campaign to all chosen recipients.
 * Creates an activity log entry for each recipient in a 'comms_log' subcollection.
 */
exports.sendMarketingEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
  
  const { tenantId, campaignId, subject, rows, recipients, doNotSendTo, fromName, fromEmail, replyTo } = data;
  if (!tenantId || !campaignId) throw new functions.https.HttpsError('invalid-argument', 'Missing metadata.');

  const db = admin.firestore();
  
  try {
    const transporter = await getTransporter(tenantId);
    const htmlBase = renderEmailBody(rows);
    
    const setup = await getActiveEmailSetup(tenantId, db);
    const common = (setup && setup.common) || {};

    const recipientList = (recipients || "").split(";").map(s => s.trim().toLowerCase()).filter(Boolean);
    const blacklist = (doNotSendTo || "").split(";").map(s => s.trim().toLowerCase()).filter(Boolean);
    const validRecipients = recipientList.filter(email => !blacklist.includes(email));

    const results = [];
    const logBatch = db.batch();

    for (const email of validRecipients) {
      try {
        // Resolve Personalized Tags per Recipient
        // Determine effective sender details for this campaign
        const finalFromEmail = fromEmail || common.fromEmail || "no-reply@americanvisiongroup.com";
        const finalFromName = fromName || common.fromName || "American Vision Group";
        const finalReplyTo = replyTo || common.replyTo || finalFromEmail;

        const personalizedHtml = await resolveRecipientTags(htmlBase, email, tenantId, db, finalFromName);
        const personalizedSubject = await resolveRecipientTags(subject || "Marketing Communication", email, tenantId, db, finalFromName);

        const attachments = extractAttachments(rows);

        const info = await transporter.sendMail({
          from: `"${finalFromName}" <${finalFromEmail}>`,
          to: email,
          replyTo: finalReplyTo,
          subject: personalizedSubject,
          html: personalizedHtml,
          attachments: attachments.length > 0 ? attachments : undefined
        });

        // Log success
        const logRef = db.collection(`tenants/${tenantId}/comms_log`).doc();
        logBatch.set(logRef, {
          campaignId,
          type: "Marketing",
          recipient: email,
          subject: personalizedSubject,
          status: "Delivered",
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          provider: "Nodemailer",
          providerResponse: info.response,
          messageId: info.messageId
        });
        results.push({ email, status: "Success", messageId: info.messageId });
      } catch (err) {
        console.error(`Failed to send to ${email}:`, err.message);
        results.push({ email, status: "Error", error: err.message });
      }
    }

    if (results.length > 0) await logBatch.batchSize > 500 ? console.warn("Log batch exceeds 500, implement chunked commit") : await logBatch.commit();

    // Update campaign status only if campaignId is a valid Firestore ID (no slashes)
    if (campaignId && !campaignId.includes('/')) {
      await db.doc(`tenants/${tenantId}/marketingEmails/${campaignId}`).update({
        status: "Sent",
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        recipientCount: validRecipients.length,
        successCount: results.filter(r => r.status === "Success").length
      }).catch(err => console.error("Failed to update campaign status:", err.message));
    }

    return { success: true, results };
  } catch (err) {
    console.error("sendMarketingEmail Error:", err);
    throw new functions.https.HttpsError('internal', err.message);
  }
});

/**
 * Atomic function to assign a new owner to a tenant.
 * 1. Demotes all current owners in the tenant to Admin (R10004).
 * 2. Promotes the new owner to Owner (R10005).
 * 3. Updates the 'tenants' document with the new owner details.
 * 4. Syncs global_users and custom claims for both old and new owners.
 */
exports.assignTenantOwner = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const { tenantId, newOwnerUid, newOwnerEmail } = data;
  if (!tenantId || !newOwnerUid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing tenantId or newOwnerUid.');
  }

  const db = admin.firestore();

  try {
    // 1. Verify permissions (Caller must be Super Admin or current Owner of this tenant)
    const callerClaims = context.auth.token;
    const isSuperAdmin = callerClaims.email === "kyuahn@yahoo.com" || callerClaims.role === "Super Admin" || callerClaims.role === "L2 Admin";
    
    // Check if caller is the current owner of the tenant
    let isCurrentOwner = false;
    if (!isSuperAdmin) {
      const tenantSnap = await db.doc(`tenants/${tenantId}`).get();
      if (tenantSnap.exists && (tenantSnap.data().owner_id === context.auth.uid || tenantSnap.data().owner === context.auth.uid)) {
        isCurrentOwner = true;
      }
    }

    if (!isSuperAdmin && !isCurrentOwner) {
      throw new functions.https.HttpsError('permission-denied', 'Only Super Admins or the current Tenant Owner can assign a new owner.');
    }

    const batch = db.batch();
    const updates = [];

    // 2. Find and demote current owners in this tenant
    const usersRef = db.collection(`tenants/${tenantId}/users`);
    const currentOwnersSnap = await usersRef.where('role_id', '==', 'R10005').get();
    
    for (const docSnap of currentOwnersSnap.docs) {
      const oldOwnerUid = docSnap.data().auth_uid || docSnap.id;
      if (oldOwnerUid === newOwnerUid) continue; // Skip if it's already the new owner (shouldn't happen but safe)

      // Demote in tenant users
      batch.update(docSnap.ref, { role_id: 'R10004', updated_at: admin.firestore.FieldValue.serverTimestamp() });
      
      // Demote in global_users
      const globalRef = db.collection('global_users').doc(oldOwnerUid);
      batch.update(globalRef, { role: 'R10004', last_updated: admin.firestore.FieldValue.serverTimestamp() });

      // Update Custom Claims for old owner
      updates.push(admin.auth().setCustomUserClaims(oldOwnerUid, { role: 'R10004', tenantId }));
    }

    // 3. Promote new owner
    // Find new owner in tenant users
    const newOwnerSnap = await usersRef.where('auth_uid', '==', newOwnerUid).get();
    let nData = { auth_uid: newOwnerUid, email: newOwnerEmail || "" };

    if (!newOwnerSnap.empty) {
      const newOwnerDoc = newOwnerSnap.docs[0];
      nData = { ...newOwnerDoc.data(), ...nData };
      batch.update(newOwnerDoc.ref, { role_id: 'R10005', updated_at: admin.firestore.FieldValue.serverTimestamp() });
    } else {
      // If user not in tenant users yet, fetch from global_users to create the record
      const globalSnap = await db.collection('global_users').doc(newOwnerUid).get();
      if (globalSnap.exists()) {
        const gData = globalSnap.data();
        nData = {
          ...gData,
          auth_uid: newOwnerUid,
          role_id: 'R10005',
          status: 'Active',
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        };
        // Use user_id if available, else uid
        const docId = gData.user_id || newOwnerUid;
        batch.set(usersRef.doc(docId), nData);
      } else {
        // Fallback if no global user record (should be rare)
        nData = {
          ...nData,
          role_id: 'R10005',
          status: 'Active',
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        };
        batch.set(usersRef.doc(newOwnerUid), nData);
      }
    }

    // Update tenant document
    const tenantRef = db.doc(`tenants/${tenantId}`);
    batch.update(tenantRef, {
      owner: newOwnerUid,
      owner_id: newOwnerUid,
      tenant_email: nData.email || newOwnerEmail || "",
      owner_first_name: nData.first_name || "",
      owner_last_name: nData.last_name || "",
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // Promote in global_users
    const newGlobalRef = db.collection('global_users').doc(newOwnerUid);
    batch.update(newGlobalRef, { role: 'R10005', tenantId, last_updated: admin.firestore.FieldValue.serverTimestamp() });

    // Update Custom Claims for new owner
    updates.push(admin.auth().setCustomUserClaims(newOwnerUid, { role: 'R10005', tenantId }));

    await batch.commit();
    await Promise.all(updates);

    return { success: true, message: `Successfully assigned ${newOwnerUid} as owner of tenant ${tenantId}.` };
  } catch (error) {
    console.error("Assign Tenant Owner Error:", error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Helper to fetch general tenant data for AI analysis in parallel and prune fields.
 */
async function fetchTenantData(db, tenantId) {
  const [dealsSnap, invSnap, ledgerSnap, scheduleSnap, contactsSnap] = await Promise.all([
    db.collection(`tenants/${tenantId}/deals`).limit(100).get(),
    db.collection(`tenants/${tenantId}/investments`).limit(200).get(),
    db.collection(`tenants/${tenantId}/ledger`).limit(500).get(),
    db.collection(`tenants/${tenantId}/paymentSchedules`).limit(500).get(),
    db.collection(`tenants/${tenantId}/contacts`).limit(300).get()
  ]);

  return {
    deals: dealsSnap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        deal_name: d.deal_name || "",
        deal_type: d.deal_type || "",
        status: d.status || "",
        valuation_amount: d.valuation_amount || 0,
        start_date: d.start_date || "",
        end_date: d.end_date || ""
      };
    }),
    investments: invSnap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        investment_id: d.investment_id || "",
        deal_id: d.deal_id || "",
        contact_id: d.contact_id || d.party_id || "",
        amount: d.amount || 0,
        interest_rate: d.interest_rate || 0,
        payment_frequency: d.payment_frequency || "",
        status: d.status || ""
      };
    }),
    ledger: ledgerSnap.docs
      .map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          entity_type: d.entity_type || "",
          amount: d.amount || 0,
          notes: d.notes || d.note || "",
          date: d.date || ""
        };
      })
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    paymentSchedules: scheduleSnap.docs
      .map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          investment_id: d.investment_id || "",
          payment_type: d.payment_type || d.type || "",
          payment_amount: d.payment_amount || 0,
          status: d.status || "",
          direction: d.direction_from_company || "",
          due_date: d.due_date || "",
          payment_date: d.payment_date || ""
        };
      })
      .sort((a, b) => new Date(b.payment_date || 0) - new Date(a.payment_date || 0)),
    contacts: contactsSnap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        first_name: d.first_name || "",
        last_name: d.last_name || "",
        contact_name: d.contact_name || d.party_name || ""
      };
    })
  };
}

/**
 * Helper to resolve auth UID to contact ID for a member.
 */
async function resolveContactId(db, tenantId, authUid) {
  const contactSnap = await db.collection(`tenants/${tenantId}/contacts`).where('auth_uid', '==', authUid).limit(1).get();
  if (!contactSnap.empty) {
    return contactSnap.docs[0].id;
  }
  return null;
}

/**
 * Helper to fetch member-specific data for AI analysis in parallel and prune fields.
 */
async function fetchMemberData(db, tenantId, contactId) {
  const [invSnap, ledgerSnap, scheduleSnap] = await Promise.all([
    db.collection(`tenants/${tenantId}/investments`).where('contact_id', '==', contactId).limit(100).get(),
    db.collection(`tenants/${tenantId}/ledger`).where('contact_id', '==', contactId).limit(200).get(),
    db.collection(`tenants/${tenantId}/paymentSchedules`).where('contact_id', '==', contactId).limit(200).get()
  ]);

  return {
    investments: invSnap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        investment_id: d.investment_id || "",
        deal_id: d.deal_id || "",
        amount: d.amount || 0,
        interest_rate: d.interest_rate || 0,
        payment_frequency: d.payment_frequency || "",
        status: d.status || ""
      };
    }),
    ledger: ledgerSnap.docs
      .map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          amount: d.amount || 0,
          notes: d.notes || d.note || "",
          date: d.date || ""
        };
      })
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    paymentSchedules: scheduleSnap.docs
      .map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          payment_type: d.payment_type || d.type || "",
          payment_amount: d.payment_amount || 0,
          status: d.status || "",
          direction: d.direction_from_company || "",
          due_date: d.due_date || "",
          payment_date: d.payment_date || ""
        };
      })
      .sort((a, b) => new Date(b.payment_date || 0) - new Date(a.payment_date || 0))
  };
}

/**
 * Cloud Function to securely run query analysis with Gemini.
 */
exports.askAI = functions.runWith({
  secrets: ['GEMINI_API_KEY'],
  minInstances: 1

}).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const { query, selectedTenantId } = data;
  if (!query) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing query.');
  }

  const uid = context.auth.uid;
  const callerClaims = context.auth.token || {};
  const callerRole = callerClaims.role || 'R10001';
  const callerTenantId = callerClaims.tenantId || '';

  const db = admin.firestore();
  let analysisData = {};
  let warningMessage = null;

  try {
    const isGlobal = callerClaims.isGlobal === true || callerClaims.email === "kyuahn@yahoo.com" || callerRole === "Super Admin" || callerRole === "L2 Admin" || (callerRole >= 'R10006' && callerRole <= 'R10010');
    const isTenantUser = !isGlobal && (callerRole >= 'R10002' && callerRole <= 'R10005');
    const isMember = !isGlobal && !isTenantUser && callerRole === 'R10001';

    console.log(`[askAI] Request from user=${uid}, role=${callerRole}, tenant=${callerTenantId}, isGlobal=${isGlobal}, isTenantUser=${isTenantUser}, isMember=${isMember}`);

    if (isGlobal) {
      if (!selectedTenantId || selectedTenantId === 'CONSOLIDATED' || selectedTenantId === 'ALL') {
        warningMessage = "Consolidated view contains data from all tenants. Cross-tenant consolidated analysis is not supported for data privacy. Please select a specific tenant to perform AI analysis.";
      } else {
        console.log(`[askAI] Global user fetching tenant=${selectedTenantId}`);
        analysisData = await fetchTenantData(db, selectedTenantId);
      }
    } else if (isTenantUser) {
      if (!callerTenantId) {
        throw new functions.https.HttpsError('permission-denied', 'No tenant ID associated with caller profile.');
      }
      console.log(`[askAI] Tenant user fetching tenant=${callerTenantId}`);
      analysisData = await fetchTenantData(db, callerTenantId);
    } else if (isMember) {
      if (!callerTenantId) {
        throw new functions.https.HttpsError('permission-denied', 'No tenant ID associated with caller profile.');
      }
      const contactId = await resolveContactId(db, callerTenantId, uid);
      if (!contactId) {
        throw new functions.https.HttpsError('permission-denied', 'Could not locate contact profile for member.');
      }
      console.log(`[askAI] Member user fetching tenant=${callerTenantId}, contactId=${contactId}`);
      analysisData = await fetchMemberData(db, callerTenantId, contactId);
    } else {
      throw new functions.https.HttpsError('permission-denied', 'Unauthorized role.');
    }

    if (warningMessage) {
      console.log(`[askAI] Aborting with warning: ${warningMessage}`);
      return { success: false, warning: warningMessage };
    }

    console.log(`[askAI] Database fetch complete.
      Deals: ${analysisData.deals?.length || 0}
      Investments: ${analysisData.investments?.length || 0}
      Ledger: ${analysisData.ledger?.length || 0}
      Schedules: ${analysisData.paymentSchedules?.length || 0}
      Contacts: ${analysisData.contacts?.length || 0}`);

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    console.log(`[askAI] Initializing GoogleGenerativeAI...`);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    console.log(`[askAI] Calling Gemini model generateContent...`);
    const result = await model.generateContent(`You are an expert financial analysis assistant for AVG Cashflow Management.
Your task is to analyze the provided cashflow management data and answer the user's query.

Guidelines:
- Base your analysis strictly on the provided JSON data.
- If data is missing or incomplete, mention this clearly.
- Provide clean, professional answers. Use markdown tables where appropriate.
- Do not mention user IDs or internal document paths unless relevant to query.
- Use a friendly, professional financial advisor tone.

User Query: "${query}"

Here is the data in JSON format:
${JSON.stringify(analysisData, null, 2)}`);

    console.log(`[askAI] Gemini generation successful!`);
    const response = await result.response;
    const aiText = response.text() || "No response generated by the AI.";
    return { success: true, answer: aiText };

  } catch (error) {
    console.error("Ask AI Error:", error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});


const cors = require('cors')({ origin: true });

exports.askAIStream = functions.runWith({ secrets: ['GEMINI_API_KEY'] }).https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send('Unauthorized');
      }
      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Extract parameters
      const bodyData = req.body.data || req.body;
      const { query, selectedTenantId } = bodyData;
      
      if (!query) {
        return res.status(400).send('Missing query');
      }

      // Role Logic
      const uid = decodedToken.uid;
      const callerRole = decodedToken.role || 'R10001';
      const callerTenantId = decodedToken.tenantId || '';
      const isGlobal = decodedToken.isGlobal === true || decodedToken.email === "kyuahn@yahoo.com" || callerRole === "Super Admin" || callerRole === "L2 Admin" || (callerRole >= 'R10006' && callerRole <= 'R10010');
      const isTenantUser = !isGlobal && (callerRole >= 'R10002' && callerRole <= 'R10005');
      const isMember = !isGlobal && !isTenantUser && callerRole === 'R10001';

      let resolvedTenantId = null;
      if (isGlobal) {
        if (!selectedTenantId || selectedTenantId === 'CONSOLIDATED' || selectedTenantId === 'ALL') {
          return res.status(400).send("Consolidated view not supported for AI analysis.");
        }
        resolvedTenantId = selectedTenantId;
      } else {
        if (!callerTenantId) return res.status(403).send("No tenant ID");
        resolvedTenantId = callerTenantId;
      }

      const db = admin.firestore();
      let contactId = null;
      if (isMember) {
        contactId = await resolveContactId(db, resolvedTenantId, uid);
        if (!contactId) return res.status(403).send("No contact profile");
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      
      // Tool to let Gemini request specific data
      const tools = [{
        functionDeclarations: [{
          name: "fetch_data",
          description: "Fetch required financial records for the tenant",
          parameters: {
            type: "OBJECT",
            properties: {
              categories: {
                type: "ARRAY",
                description: "Array of categories to fetch. Allowed: deals, investments, ledger, paymentSchedules, contacts",
                items: { type: "STRING" }
              }
            },
            required: ["categories"]
          }
        }]
      }];

      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
        tools,
        systemInstruction: `You are an expert financial analysis assistant for AVG Cashflow Management. \nYour task is to analyze the user's query and if you need data, call fetch_data with the exact categories needed.\nOnly fetch what is necessary. Once you have the data, answer the user professionally.\nDo not mention user IDs or internal document paths.`
      });
      const chat = model.startChat();

      const result = await chat.sendMessageStream(query);
      
      let functionCall = null;
      for await (const chunk of result.stream) {
        if (chunk.functionCalls && chunk.functionCalls().length > 0) {
          functionCall = chunk.functionCalls()[0];
        }
        try {
          const t = chunk.text();
          if (t) res.write(`data: ${JSON.stringify({ text: t })}\n\n`);
        } catch(e) {}
      }

      if (functionCall) {
        const categories = functionCall.args.categories || ["deals", "investments", "ledger", "paymentSchedules", "contacts"];
        let analysisData = {};
        
        // Optimize fetching based on categories
        const tasks = [];
        if (isMember) {
           // For member, just fetch all member data
           analysisData = await fetchMemberData(db, resolvedTenantId, contactId);
        } else {
           if (categories.includes("deals")) tasks.push(db.collection(`tenants/${resolvedTenantId}/deals`).limit(100).get().then(s => analysisData.deals = s.docs.map(d=>d.data())));
           if (categories.includes("investments")) tasks.push(db.collection(`tenants/${resolvedTenantId}/investments`).limit(200).get().then(s => analysisData.investments = s.docs.map(d=>d.data())));
           if (categories.includes("ledger")) tasks.push(db.collection(`tenants/${resolvedTenantId}/ledger`).limit(500).get().then(s => analysisData.ledger = s.docs.map(d=>d.data())));
           if (categories.includes("paymentSchedules")) tasks.push(db.collection(`tenants/${resolvedTenantId}/paymentSchedules`).limit(500).get().then(s => analysisData.paymentSchedules = s.docs.map(d=>d.data())));
           if (categories.includes("contacts")) tasks.push(db.collection(`tenants/${resolvedTenantId}/contacts`).limit(300).get().then(s => analysisData.contacts = s.docs.map(d=>d.data())));
           await Promise.all(tasks);
        }

        const followUp = await chat.sendMessageStream([{
          functionResponse: {
            name: functionCall.name,
            response: analysisData
          }
        }]);

        for await (const chunk of followUp.stream) {
          try {
            const t = chunk.text();
            if (t) res.write(`data: ${JSON.stringify({ text: t })}\n\n`);
          } catch(e) {}
        }
      }

      res.end();
    } catch (error) {
      console.error("askAIStream Error:", error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  });
});
