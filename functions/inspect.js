const admin = require('firebase-admin');
const serviceAccount = require('../scripts/serviceAccount.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function run() {
  try {
    const db = admin.firestore();
    const paymentsSnap = await db.collection('tenants').doc('T10002').collection('payments').get();
    console.log(`Found ${paymentsSnap.size} payments in T10002.`);
    paymentsSnap.forEach(doc => {
      console.log(`Payment ${doc.id}:`, JSON.stringify(doc.data(), null, 2));
    });
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
