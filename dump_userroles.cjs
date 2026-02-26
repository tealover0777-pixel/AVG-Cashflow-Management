const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'avg-cashflow-management'
});

async function run() {
  try {
    const db = admin.firestore();
    const snap = await db.collection('user_roles').get();
    console.log(`Found ${snap.size} user_roles.`);
    snap.forEach(doc => {
        console.log("UR:", doc.id, "=>", JSON.stringify(doc.data()));
    });
    process.exit(0);
  } catch(e) { console.error(e); process.exit(1); }
}
run();
