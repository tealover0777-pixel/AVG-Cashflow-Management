const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'avg-cashflow-management'
});

async function run() {
    try {
        const db = admin.firestore();
        console.log("--- Contracts for T10002 ---");
        const snap = await db.collection('tenants').doc('T10002').collection('contracts').get();
        console.log(`Found ${snap.size} contracts for T10002`);
        snap.forEach(doc => {
            console.log("Contract:", doc.id, JSON.stringify(doc.data(), null, 2));
        });

        console.log("\n--- Dimensions ---");
        const dimSnap = await db.collection('dimensions').get();
        dimSnap.forEach(doc => {
            console.log("Dimension:", doc.id, JSON.stringify(doc.data(), null, 2));
        });

        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
}
run();
