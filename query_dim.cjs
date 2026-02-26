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
        if ((d.name || d.category || doc.id).toLowerCase().includes('role')) {
            console.log("Found Role Dimension:", doc.id, JSON.stringify(d, null, 2));
        }
    });

    // Also check if UserRoles is simply the doc ID
    const directDoc = await db.collection('dimensions').doc('UserRoles').get();
    if (directDoc.exists) console.log("Direct UserRoles doc:", JSON.stringify(directDoc.data(), null, 2));

    process.exit(0);
  } catch(e) { console.error(e); process.exit(1); }
}
run();
