const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'avg-cashflow-management'
});

async function run() {
  try {
    const db = admin.firestore();
    const snap = await db.collection('role_types').get();
    console.log(`Found ${snap.size} role_types.`);
    snap.forEach(doc => {
        console.log("UR:", doc.id, "=>", JSON.stringify(doc.data()));
    });
    process.exit(0);
  } catch(e) { console.error(e); process.exit(1); }
}
run();
