const admin = require('firebase-admin');
const serviceAccount = require('/Users/kyuahn/Documents/AVG/AVG Cashflow Management/scripts/serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run() {
  try {
    const db = admin.firestore();

    const roleIds = ['R10004', 'R10005', 'Admin', 'Tenant Owner', 'Tenant Admin'];
    for (const rId of roleIds) {
      const docRef = db.collection('role_types').doc(rId);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        console.log(`Global role_types/${rId}:`);
        console.log(JSON.stringify(docSnap.data(), null, 2));
      } else {
        console.log(`Global role_types/${rId} does not exist.`);
      }
    }

    const tenantsSnap = await db.collection('tenants').get();
    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;
      for (const rId of roleIds) {
        const tRoleDoc = await db.collection(`tenants/${tenantId}/roles`).doc(rId).get();
        if (tRoleDoc.exists) {
          console.log(`Tenant ${tenantId} roles/${rId}:`);
          console.log(JSON.stringify(tRoleDoc.data(), null, 2));
        }
      }
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
