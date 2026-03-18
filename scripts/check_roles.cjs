const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'avg-cashflow-management'
});

async function run() {
    try {
        const db = admin.firestore();

        // Check "UserRoles" collection directly
        const snap1 = await db.collection('UserRoles').get();
        console.log(`Found ${snap1.size} docs in UserRoles collection.`);
        snap1.forEach(doc => {
            console.log("UserRoles doc:", doc.id, "=>", JSON.stringify(doc.data()));
        });

        // Check "global_users" collection
        const snap2 = await db.collection('global_users').get();
        console.log(`Found ${snap2.size} docs in global_users collection.`);
        snap2.forEach(doc => {
            console.log("global_users doc:", doc.id, "=>", JSON.stringify(doc.data()));
        });

        // Check "Roles" collection
        const snap3 = await db.collection('roles').get();
        console.log(`Found ${snap3.size} docs in roles collection.`);
        snap3.forEach(doc => {
            console.log("roles doc:", doc.id, "=>", JSON.stringify(doc.data()));
        });

        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
}
run();
