const admin = require('firebase-admin');
process.env.GCLOUD_PROJECT = 'avg-cashflow-management';
admin.initializeApp();
const db = admin.firestore();

async function cleanup() {
    console.log('Searching for U10006...');
    try {
        const tenants = await db.collection('tenants').get();
        for (const t of tenants.docs) {
            const u6 = await t.ref.collection('users').doc('U10006').get();
            if (u6.exists) {
                console.log(`FOUND U10006 in Tenant ${t.id}. Email: ${u6.data().email}`);
                await u6.ref.delete();
                console.log(`DELETED U10006 from Tenant ${t.id}`);
            }

            const u5 = await t.ref.collection('users').doc('U10005').get();
            if (u5.exists) {
                console.log(`FOUND U10005 in Tenant ${t.id}. Email: ${u5.data().email}`);
            }
        }
        console.log('Cleanup complete.');
        process.exit(0);
    } catch (err) {
        console.error('Error during cleanup:', err.message);
        process.exit(1);
    }
}

cleanup();
