const admin = require('firebase-admin');
const serviceAccount = require('/Users/kyuahn/Documents/AVG/AVG Cashflow Management/scripts/serviceAccount.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  const roles = ['R10001', 'R10002', 'R10003', 'R10004'];
  for (const roleId of roles) {
    const docRef = db.collection('role_types').doc(roleId);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      console.log(`\nROLE ${roleId}:`);
      console.log(JSON.stringify(docSnap.data(), null, 2));
    } else {
      console.log(`\nROLE ${roleId} not found`);
    }
  }
}
run().catch(console.error);
