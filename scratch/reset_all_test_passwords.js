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
  const adminUsers = ['kyuahn@yahoo.com', 'kyuahn95@hotmail.com'];
  const memberUsers = [
    'abc123@yahoo.com',
    'aaa@hotmail.com',
    'soulmate0220@gmail.com',
    'avc@yahoo.com',
    'fortlee0717@gmail.com'
  ];

  console.log('--- Resetting Admin Users to Citib@nk2 ---');
  for (const email of adminUsers) {
    try {
      const user = await auth.getUserByEmail(email);
      await auth.updateUser(user.uid, { password: 'Citib@nk2' });
      console.log(`Successfully reset ${email} to Citib@nk2`);
    } catch (e) {
      console.error(`Failed to reset ${email}:`, e.message);
    }
  }

  console.log('\n--- Resetting Member/Test Users to Citibank2 ---');
  for (const email of memberUsers) {
    try {
      const user = await auth.getUserByEmail(email);
      await auth.updateUser(user.uid, { password: 'Citibank2' });
      console.log(`Successfully reset ${email} to Citibank2`);
    } catch (e) {
      console.error(`Failed to reset ${email}:`, e.message);
    }
  }

  process.exit(0);
}

run();
