const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'avg-cashflow-management'
});

async function run() {
  try {
    const db = admin.firestore();
    const snap = await db.collection('dimensions').get();
    snap.forEach(doc => {
        const d = doc.data();
        console.log("DIM:", doc.id, "=> name:", d.name, "category:", d.category, "keys:", Object.keys(d).join(','));
    });
    process.exit(0);
  } catch(e) { console.error(e); process.exit(1); }
}
run();
