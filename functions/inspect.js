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
    const docRef = db.collection('tenants').doc('T10002').collection('contacts').doc('M10002');
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      console.log('Contact M10002 Data:', JSON.stringify(docSnap.data(), null, 2));
    } else {
      console.log('Contact M10002 does not exist!');
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
