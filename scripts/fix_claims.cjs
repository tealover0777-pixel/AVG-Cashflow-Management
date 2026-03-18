const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'avg-cashflow-management'
});

const uid = '9EIXnenXboUO2twvX7StvizLu7o1';
const claims = {
    role: 'R10009',
    isGlobal: true,
    tenantId: ''
};

async function run() {
    try {
        console.log(`Setting custom claims for ${uid}...`);
        await admin.auth().setCustomUserClaims(uid, claims);

        console.log('Verifying claims...');
        const user = await admin.auth().getUser(uid);
        console.log('Current Custom Claims:', JSON.stringify(user.customClaims, null, 2));

        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

run();
