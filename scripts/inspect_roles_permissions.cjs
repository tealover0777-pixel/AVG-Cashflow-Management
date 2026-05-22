const admin = require('firebase-admin');
const serviceAccount = require('/Users/kyuahn/Documents/AVG/AVG Cashflow Management/scripts/serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run() {
  try {
    const db = admin.firestore();

    console.log('=== ROLE TYPES ===');
    const rolesSnap = await db.collection('role_types').get();
    rolesSnap.forEach(doc => {
      console.log(`Role ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
      console.log('-----------------------------------');
    });

    console.log('\n=== DIMENSIONS ===');
    const dimsSnap = await db.collection('dimensions').get();
    dimsSnap.forEach(doc => {
      console.log(`Dim ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
      console.log('-----------------------------------');
    });

    console.log('\n=== USERS WITH ROLE R10004 ===');
    const globalUsersSnap = await db.collection('global_users').where('role', '==', 'R10004').get();
    console.log(`Found ${globalUsersSnap.size} global users with R10004`);
    globalUsersSnap.forEach(doc => {
      console.log(`Doc ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
      console.log('-----------------------------------');
    });

    // Check all tenants to see if there are tenant-level roles or users with R10004
    const tenantsSnap = await db.collection('tenants').get();
    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;
      
      const tRolesSnap = await db.collection(`tenants/${tenantId}/roles`).get();
      if (!tRolesSnap.empty) {
        console.log(`\n=== TENANT ${tenantId} ROLES ===`);
        tRolesSnap.forEach(doc => {
          console.log(`Tenant Role ID: ${doc.id}`);
          console.log(JSON.stringify(doc.data(), null, 2));
          console.log('-----------------------------------');
        });
      }

      const tUsersSnap = await db.collection(`tenants/${tenantId}/users`).where('role_id', '==', 'R10004').get();
      if (!tUsersSnap.empty) {
        console.log(`\n=== TENANT ${tenantId} USERS WITH R10004 ===`);
        tUsersSnap.forEach(doc => {
          console.log(`Tenant User ID: ${doc.id}`);
          console.log(JSON.stringify(doc.data(), null, 2));
          console.log('-----------------------------------');
        });
      }

      const tUsersSnap2 = await db.collection(`tenants/${tenantId}/users`).where('role', '==', 'R10004').get();
      if (!tUsersSnap2.empty) {
        console.log(`\n=== TENANT ${tenantId} USERS WITH role=R10004 ===`);
        tUsersSnap2.forEach(doc => {
          console.log(`Tenant User ID: ${doc.id}`);
          console.log(JSON.stringify(doc.data(), null, 2));
          console.log('-----------------------------------');
        });
      }
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
