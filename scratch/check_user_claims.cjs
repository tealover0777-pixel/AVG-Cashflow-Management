const admin = require('firebase-admin');
const { readFileSync } = require('fs');
const { join } = require('path');

const serviceAccountPath = join(__dirname, '..', 'scripts', 'serviceAccount.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'avg-cashflow-management'
  });
}

async function checkUser(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log(`User: ${email}`);
    console.log(`  UID: ${user.uid}`);
    console.log(`  Custom Claims: ${JSON.stringify(user.customClaims, null, 2)}`);
  } catch (e) {
    console.error(`Error fetching user ${email}:`, e.message);
  }
}

async function run() {
  await checkUser('tenants@americanvisioncap.com');
  await checkUser('soulmate0220@gmail.com');
  process.exit(0);
}

run();
