
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


exports.createCustomUser = functions.https.onCall(async (data, context) => {
  const { email, password, role } = data;

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, { role });

    return { message: `Successfully created new user with role: ${role}` };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.sendInvite = functions.https.onCall(async (data, context) => {
  const { email, role } = data;

  try {
    const link = await admin.auth().generateSignInWithEmailLink(email, {
      url: 'https://avg-cashflow-management.firebaseapp.com',
      handleCodeInApp: true,
    });

    await admin.firestore().collection('invites').add({
      email,
      role,
      link,
    });

    return { message: 'Invite sent successfully' };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
