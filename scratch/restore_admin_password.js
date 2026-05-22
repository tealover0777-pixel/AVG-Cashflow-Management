import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

const serviceAccountPath = join(process.cwd(), 'scripts', 'serviceAccount.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'avg-cashflow-management'
});

const auth = admin.auth();

async function run() {
  const email = 'kyuahn@yahoo.com';
  try {
    console.log(`Locating user by email: ${email}...`);
    const userRecord = await auth.getUserByEmail(email);
    console.log(`Found UID: ${userRecord.uid}. Restoring password to Citib@nk2...`);
    await auth.updateUser(userRecord.uid, { password: 'Citib@nk2' });
    console.log(`Password restored successfully for ${email}.`);
  } catch (e) {
    console.error(`Error restoring password for ${email}:`, e.message);
  }
  process.exit(0);
}

run();
