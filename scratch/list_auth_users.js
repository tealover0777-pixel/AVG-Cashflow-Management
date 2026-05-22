import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

const serviceAccountPath = join(process.cwd(), 'scripts', 'serviceAccount.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'avg-cashflow-management'
  });
}

const auth = admin.auth();

async function run() {
  try {
    const listUsersResult = await auth.listUsers(100);
    console.log(`\nFound ${listUsersResult.users.length} users in Firebase Auth:`);
    listUsersResult.users.forEach((userRecord) => {
      console.log(`- Email: ${userRecord.email} | UID: ${userRecord.uid} | Claims: ${JSON.stringify(userRecord.customClaims)} | Created: ${userRecord.metadata.creationTime}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error listing users:', error);
    process.exit(1);
  }
}

run();
