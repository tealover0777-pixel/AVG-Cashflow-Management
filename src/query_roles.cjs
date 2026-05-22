const admin = require('firebase-admin');
const serviceAccount = require('/Users/kyuahn/Documents/AVG/AVG Cashflow Management/scripts/serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run() {
  try {
    const db = admin.firestore();
    const snap = await db.collection('role_types').get();
    console.log(`Found ${snap.size} roles in role_types:`);
    snap.forEach(doc => {
      console.log(`Role ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
      console.log('-----------------------------------');
    });
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
