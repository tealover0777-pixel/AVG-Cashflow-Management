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

async function reset() {
  const users = ['abc123@yahoo.com', 'kyuahn@yahoo.com'];
  for (const email of users) {
    try {
      console.log(`Locating user by email: ${email}...`);
      const userRecord = await auth.getUserByEmail(email);
      console.log(`Found UID: ${userRecord.uid}. Resetting password...`);
      await auth.updateUser(userRecord.uid, { password: 'Password123!' });
      console.log(`Password reset successfully for ${email}.`);
    } catch (e) {
      console.error(`Error resetting password for ${email}:`, e.message);
    }
  }
}

reset();
