import admin from 'firebase-admin';

admin.initializeApp({
  projectId: 'avg-cashflow-management'
});

const db = admin.firestore();
const users = [
  {
    uid: 'sNvFmqQss8OhjFAffVijbnMaGRC2',
    data: {
      email: 'kyuahn@yahoo.com',
      first_name: 'Kitty',
      last_name: 'Chen',
      role: 'R10010',
      tenantId: 'GLOBAL',
      isGlobal: true,
      status: 'Active',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }
  },
  {
    uid: 'kyuahn',
    data: {
      email: 'kyuahn@yahoo.com',
      first_name: 'Kyu',
      last_name: 'Ahn',
      role: 'R10010',
      tenantId: 'GLOBAL',
      isGlobal: true,
      status: 'Active',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }
  }
];

async function seedUsers() {
  for (const user of users) {
    try {
      console.log(`Seeding UID: ${user.uid}`);
      await db.collection('global_users').doc(user.uid).set(user.data, { merge: true });
      console.log(`Success for ${user.uid}`);
    } catch (err) {
      console.error(`Error for ${user.uid}:`, err.message);
    }
  }
}

seedUsers();
