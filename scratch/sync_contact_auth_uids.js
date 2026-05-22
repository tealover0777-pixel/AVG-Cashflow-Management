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

const db = admin.firestore();
const auth = admin.auth();

async function run() {
  try {
    const tenantsSnap = await db.collection('tenants').get();
    
    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;
      const contactsSnap = await db.collection('tenants').doc(tenantId).collection('contacts').get();
      console.log(`\nProcessing Tenant: ${tenantId} - ${contactsSnap.size} contacts`);
      
      for (const contactDoc of contactsSnap.docs) {
        const contactData = contactDoc.data();
        const email = contactData.email ? contactData.email.trim().toLowerCase() : '';
        
        if (!email) {
          continue;
        }
        
        try {
          // Lookup user in Firebase Auth by email
          const userRecord = await auth.getUserByEmail(email);
          const authUid = userRecord.uid;
          
          if (contactData.auth_uid !== authUid) {
            console.log(`  Updating contact ${contactDoc.id} (${contactData.contact_name || contactData.name}): setting auth_uid to ${authUid}`);
            await db.collection('tenants').doc(tenantId).collection('contacts').doc(contactDoc.id).update({
              auth_uid: authUid
            });
          } else {
            console.log(`  Contact ${contactDoc.id} (${contactData.contact_name || contactData.name}) already has correct auth_uid: ${authUid}`);
          }
        } catch (authError) {
          if (authError.code === 'auth/user-not-found') {
            // No auth user exists for this contact email, which is normal for contacts who haven't registered
            if (contactData.auth_uid !== undefined) {
              console.log(`  Warning: Contact ${contactDoc.id} has auth_uid ${contactData.auth_uid} but no matching auth user found. Clearing it.`);
              await db.collection('tenants').doc(tenantId).collection('contacts').doc(contactDoc.id).update({
                auth_uid: admin.firestore.FieldValue.delete()
              });
            }
          } else {
            console.error(`  Error looking up auth user for email ${email}:`, authError.message);
          }
        }
      }
    }
    console.log('\nSync completed successfully.');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  }
}

run();
