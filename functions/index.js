
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
