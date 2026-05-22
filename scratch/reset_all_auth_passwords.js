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
    let count = 0;
    const listUsersResult = await auth.listUsers(1000);
    console.log(`Found ${listUsersResult.users.length} users. Resetting passwords...`);

    for (const userRecord of listUsersResult.users) {
      const email = userRecord.email;
      if (!email) continue;

      let password = 'Citibank2';
      let type = 'Member/Test';

      // Identify admin/platform accounts
      if (email.includes('kyuahn') || email.includes('tealover')) {
        password = 'Citib@nk2';
        type = 'Admin/Platform';
      }

      try {
        await auth.updateUser(userRecord.uid, { password });
        console.log(`- [${type}] Reset ${email} to: ${password}`);
        count++;
      } catch (e) {
        console.error(`- Failed to reset ${email}:`, e.message);
      }
    }

    console.log(`\nSuccessfully reset passwords for ${count} users.`);
    process.exit(0);
  } catch (error) {
    console.error('Error during password reset:', error);
    process.exit(1);
  }
}

run();
