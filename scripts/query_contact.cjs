const admin = require('firebase-admin');
const serviceAccount = require('/Users/kyuahn/Documents/AVG/AVG Cashflow Management/scripts/serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run() {
  try {
    const db = admin.firestore();

    const contactDoc = await db.collection('tenants').doc('T10001').collection('contacts').doc('M10165').get();
    if (contactDoc.exists) {
      console.log('Contact M10165:');
      console.log(JSON.stringify(contactDoc.data(), null, 2));
    } else {
      console.log('Contact M10165 does not exist.');
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
