const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'avg-cashflow-management'
});

async function run() {
  try {
    const db = admin.firestore();
    const email = 'kyuahn@yahoo.com';
    
    console.log("Fetching user...");
    const userRecord = await admin.auth().getUserByEmail(email);

    console.log("Updating Auth Claims...");
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'L2 Admin' });

    console.log("Updating Firestore user_roles...");
    await db.collection('user_roles').doc(userRecord.uid).set({
      role: 'L2 Admin'
    }, { merge: true });

    console.log("Done.");
    process.exit(0);
  } catch(e) { console.error(e); process.exit(1); }
}
run();
