const admin = require('firebase-admin');
const serviceAccount = require('/Users/kyuahn/Documents/AVG/AVG Cashflow Management/scripts/serviceAccount.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  const docRef = db.collection('role_types').doc('R10004');
  const docSnap = await docRef.get();
  if (docSnap.exists) {
    console.log("ROLE R10004:");
    console.log(JSON.stringify(docSnap.data(), null, 2));
  } else {
    console.log("R10004 not found in role_types");
  }
}
run().catch(console.error);
