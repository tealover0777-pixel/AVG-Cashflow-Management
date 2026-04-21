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

  const { email, role, tenantId, phone, notes, user_id: providedUserId, contactId, partyId, first_name, last_name } = data;
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
    try {
      const roleDoc = await db.collection('role_types').doc(role).get();
      if (roleDoc.exists && roleDoc.data().IsGlobal === true) {
        isGlobal = true;
      }
    } catch (e) {
      console.warn('Could not check IsGlobal for role:', role, e.message);
    }

    // 3. Set Custom Claims (include isGlobal for Firestore rules)
    await admin.auth().setCustomUserClaims(uid, { role, tenantId, isGlobal });

    // 4. Create/Update Firestore Global Profile
    await db.collection('global_users').doc(uid).set({
      email,
      first_name: first_name || '',
      last_name: last_name || '',
      role,
      tenantId,
      isGlobal,
      status: 'Pending',
      contact_id: contactId || partyId || '',
      last_updated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 4. Determine user_id (Check if already in tenant)
    let user_id = providedUserId;
    if (!user_id && tenantId) {
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
    if (!user_id) user_id = 'U' + Date.now(); // Final fallback

    // Update global_users with user_id and notes
    await db.collection('global_users').doc(uid).update({
      user_id: user_id,
      notes: notes || ''
    });

    // 5. Create Tenant Profile
    if (tenantId) {
      await db.doc(`tenants/${tenantId}/users/${user_id}`).set({
        user_id,
        first_name: first_name || '',
        last_name: last_name || '',
        email,
        role_id: role,
        status: 'Pending',
        phone: phone || userRecord.phoneNumber || '',
        notes: notes || '',
        tenantId,
        auth_uid: uid,
        contact_id: contactId || partyId || '',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // 6. Generate password reset link (better for onboarding than verification)
    const link = await admin.auth().generatePasswordResetLink(email);

    // 7. Attempt to send email using tenant SMTP/API if available
    let emailSent = false;
    if (tenantId) {
      try {
        const tenantSnap = await db.collection('tenants').doc(tenantId).get();
        const tData = tenantSnap.data() || {};
        const common = (tData.emailSetup && tData.emailSetup.common) || {};
        
        const transporter = await getTransporter(tenantId);
        await transporter.sendMail({
          from: `"${common.fromName || tData.tenant_name || "American Vision Group"}" <${common.fromEmail || "no-reply@americanvisiongroup.com"}>`,
          to: email,
          replyTo: common.replyTo || common.fromEmail || "",
          subject: `You've been invited to ${tData.tenant_name || "the Platform"}`,
          html: `<div style="font-family: sans-serif; max-width: 600px; padding: 20px;">
            <h2>Welcome to ${tData.tenant_name || "American Vision Group"}</h2>
            <p>Hello ${first_name || "there"},</p>
            <p>You have been invited to join the platform with the role of <b>${role}</b>.</p>
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
        console.error("Failed to send invite email:", err.message);
      }
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
    const userRecord = await admin.auth().getUserByEmail(email);
    const uid = userRecord.uid;
    const link = await admin.auth().generatePasswordResetLink(email);

    // Attempt to send email if tenant is known
    let emailSent = false;
    const db = admin.firestore();
    const globalSnap = await db.collection('global_users').doc(uid).get();
    const tenantId = globalSnap.exists ? globalSnap.data().tenantId : null;

    if (tenantId) {
      try {
        const tenantSnap = await db.collection('tenants').doc(tenantId).get();
        const tData = tenantSnap.data() || {};
        const common = (tData.emailSetup && tData.emailSetup.common) || {};
        
        const transporter = await getTransporter(tenantId);
        await transporter.sendMail({
          from: `"${common.fromName || tData.tenant_name || "American Vision Group"}" <${common.fromEmail || "no-reply@americanvisiongroup.com"}>`,
          to: email,
          subject: `Reset Your Password - ${tData.tenant_name || "American Vision Group"}`,
          html: `<div style="font-family: sans-serif; max-width: 600px; padding: 20px;">
            <h2>Password Reset Request</h2>
            <p>Access your account for <b>${tData.tenant_name || "American Vision Group"}</b> by clicking the link below:</p>
            <div style="margin: 30px 0;">
              <a href="${link}" style="background: #1c1917; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Sign In / Reset Password</a>
            </div>
            <p style="font-size: 13px; color: #666;">This link will expire in 24 hours.</p>
          </div>`
        });
        emailSent = true;
      } catch (err) {
        console.error("Resend email failed:", err.message);
      }
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

  const { uid, email, newTenantId, oldTenantId, role, user_id, first_name, last_name, phone, notes } = data;
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
      email: email,
      first_name: first_name || '',
      last_name: last_name || '',
      tenantId: newTenantId,
      role: role,
      last_updated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 4. Move Tenant Profile
    if (user_id) {
      // 4a. Read existing profile if not fully provided (though UI should provide it)
      let profileData = { user_id, first_name: first_name || '', last_name: last_name || '', email, role_id: role, phone, notes, auth_uid: uid };

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

/**
 * Helper to get a nodemailer transporter based on tenant settings.
 * Supports specialized translation of Service Provider (API) settings into SMTP transports.
 */
async function getTransporter(tenantId) {
  const db = admin.firestore();
  const tenantSnap = await db.collection('tenants').doc(tenantId).get();
  const setup = tenantSnap.exists ? tenantSnap.data().emailSetup : null;

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
    // For SMTP: 
    // 465 = Implicit SSL (secure: true)
    // 587/25 = STARTTLS (secure: false)
    // We force the correct logic based on port to avoid SSL version mismatches.
    const secure = (port === 465); 

    return nodemailer.createTransport({
      host: setup.smtp.host,
      port,
      secure,
      auth: {
        user: (setup.smtp.user || "").trim(),
        pass: (setup.smtp.pass || "").replace(/\s/g, "")
      },
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false,
        // Ensure minimum TLS version for modern servers
        minVersion: 'TLSv1.2'
      }
    });
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
    }
  });
  html += `</div>`;
  return html;
}

/**
 * cloud function: sendTestEmail
 * Triggers a real email using the tenant's chosen API provider or SMTP.
 * Also respects the 'common' fields (From, From Name, Reply-To).
 */
exports.sendTestEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
  
  const { tenantId, recipientEmail, subject, rows, fromName: overrideFromName, fromEmail: overrideFromEmail, replyTo: overrideReplyTo } = data;
  if (!tenantId || !recipientEmail) throw new functions.https.HttpsError('invalid-argument', 'Missing tenantId or recipientEmail.');

  try {
    const db = admin.firestore();
    const tenantSnap = await db.collection('tenants').doc(tenantId).get();
    const setup = tenantSnap.exists ? tenantSnap.data().emailSetup : null;
    const common = (setup && setup.common) || {};

    // Determine effective sender details
    const finalFromEmail = overrideFromEmail || common.fromEmail || "no-reply@americanvisiongroup.com";
    const finalFromName = overrideFromName || common.fromName || "American Vision Group";
    const finalReplyTo = overrideReplyTo || common.replyTo || finalFromEmail;

    const transporter = await getTransporter(tenantId);
    const htmlBody = renderEmailBody(rows);

    await transporter.sendMail({
      from: `"${finalFromName}" <${finalFromEmail}>`,
      to: recipientEmail,
      replyTo: finalReplyTo,
      subject: subject || "Test Email",
      html: htmlBody
    });

    return { success: true };
  } catch (err) {
    console.error("sendTestEmail Error:", err);
    throw new functions.https.HttpsError('internal', err.message);
  }
});

/**
 * Helper to resolve dynamic tags for a specific recipient.
 * Handles Name, Temporal (Year/Quarter), and Financial (Invested/Distributed/Balance) data.
 */
async function resolveRecipientTags(html, email, tenantId, db) {
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
  };

  // 3. Financial Data Aggregation
  let totalInvested = 0;
  let totalDistributed = 0;
  let capitalBalance = 0;
  let totalPrincipalRepaid = 0;

  if (recipientData.id) {
    // Fetch Investments
    const invSnap = await db.collection(`tenants/${tenantId}/investments`).where('contact_id', '==', recipientData.id).get();
    const invDocs = invSnap.docs.map(doc => doc.data());
    totalInvested = invDocs.reduce((s, d) => s + (parseFloat(String(d.amount).replace(/[^0-9.-]/g, '')) || 0), 0);

    // Fetch Completed Payments/Schedules
    const schSnap = await db.collection(`tenants/${tenantId}/paymentSchedules`).where('contact_id', '==', recipientData.id).where('status', '==', 'Paid').get();
    schSnap.docs.forEach(doc => {
      const d = doc.data();
      const amt = parseFloat(String(d.signed_payment_amount || d.payment_amount || 0).replace(/[^0-9.-]/g, '')) || 0;
      const type = (d.payment_type || "").toUpperCase();
      
      // Interest logic
      if (type.includes("INTEREST")) {
        totalDistributed += Math.abs(amt);
      }
      
      // Principal logic for balance
      const principalPTs = ["INVESTOR_PRINCIPAL_PAYMENT", "BORROWER_PRINCIPAL_RECEIVED", "BORROWER_DISBURSEMENT", "INVESTOR_PRINCIPAL_DEPOSIT", "REPAYMENT", "BORROWER_REPAYMENT"];
      if (principalPTs.includes(type) || type.includes("PRINCIPAL")) {
        // Only count positive repayments to investor as reducing balance
        if (amt > 0) totalPrincipalRepaid += amt;
      }
    });

    capitalBalance = totalInvested - totalPrincipalRepaid;
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
    
    const recipientList = (recipients || "").split(";").map(s => s.trim().toLowerCase()).filter(Boolean);
    const blacklist = (doNotSendTo || "").split(";").map(s => s.trim().toLowerCase()).filter(Boolean);
    const validRecipients = recipientList.filter(email => !blacklist.includes(email));

    const results = [];
    const logBatch = db.batch();

    for (const email of validRecipients) {
      try {
        // Resolve Personalized Tags per Recipient
        const personalizedHtml = await resolveRecipientTags(htmlBase, email, tenantId, db);
        const personalizedSubject = await resolveRecipientTags(subject || "Marketing Communication", email, tenantId, db);

        const info = await transporter.sendMail({
          from: `"${fromName || "American Vision Group"}" <${fromEmail || "no-reply@americanvisiongroup.com"}>`,
          to: email,
          replyTo: replyTo || fromEmail,
          subject: personalizedSubject,
          html: personalizedHtml
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
