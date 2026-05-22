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

// Mapping of legacy/parent permission -> granular/new permissions
const permissionMappings = {
  // Administration mappings
  "ADMINISTRATION_VIEW": ["USER_VIEW", "USER_PROFILE_VIEW", "INVESTMENT_VIEW", "PAYMENT_SCHEDULE_VIEW", "REPORT_VIEW"],
  "ADMINISTRATION_CREATE": ["USER_CREATE", "USER_PROFILE_CREATE", "INVESTMENT_CREATE", "PAYMENT_SCHEDULE_CREATE", "REPORT_CREATE"],
  "ADMINISTRATION_UPDATE": ["USER_UPDATE", "USER_PROFILE_UPDATE", "INVESTMENT_UPDATE", "PAYMENT_SCHEDULE_UPDATE", "REPORT_UPDATE"],
  "ADMINISTRATION_DELETE": ["USER_DELETE", "USER_PROFILE_DELETE", "INVESTMENT_DELETE", "PAYMENT_SCHEDULE_DELETE", "REPORT_DELETE"],
  
  // Banking mappings
  "BANKING_VIEW": ["PAYMENT_VIEW"],
  "BANKING_CREATE": ["PAYMENT_CREATE"],
  "BANKING_UPDATE": ["PAYMENT_UPDATE"],
  "BANKING_DELETE": ["PAYMENT_DELETE"],
  
  // CRM mappings
  "CRM_VIEW": ["CONTACT_VIEW"],
  "CRM_CREATE": ["CONTACT_CREATE"],
  "CRM_UPDATE": ["CONTACT_UPDATE"],
  "CRM_DELETE": ["CONTACT_DELETE"],
  
  // Investor Portal mappings
  "INVESTORPORTAL_VIEW": ["DEAL_VIEW"],
  "INVESTORPORTAL_CREATE": ["DEAL_CREATE"],
  "INVESTORPORTAL_UPDATE": ["DEAL_UPDATE"],
  "INVESTORPORTAL_DELETE": ["DEAL_DELETE"],
  
  // Settings mappings
  "SETTINGS_VIEW": ["FEE_VIEW"],
  "SETTINGS_CREATE": ["FEE_CREATE"],
  "SETTINGS_UPDATE": ["FEE_UPDATE"],
  "SETTINGS_DELETE": ["FEE_DELETE"],
  
  // Platform Admin mappings
  "PLATFORMADMIN_VIEW": ["PLATFORM_USER_VIEW", "PLATFORM_TENANT_VIEW", "DIMENSION_VIEW", "DIMENTION_VIEW"],
  "PLATFORMADMIN_CREATE": ["PLATFORM_USER_CREATE", "PLATFORM_TENANT_CREATE"],
  "PLATFORMADMIN_UPDATE": ["PLATFORM_USER_UPDATE", "PLATFORM_TENANT_UPDATE"],
  "PLATFORMADMIN_DELETE": ["PLATFORM_USER_DELETE", "PLATFORM_TENANT_DELETE"]
};

// Process a role document data and return the updated fields if any changes are made
function processRoleData(data, roleId, source) {
  let permissions = data.permissions || [];
  if (typeof permissions === 'string') {
    permissions = permissions.split(',').map(p => p.trim()).filter(Boolean);
  }
  
  const originalSize = permissions.length;
  const permissionSet = new Set(permissions);
  
  // Apply mapping rules
  for (const [legacy, granularList] of Object.entries(permissionMappings)) {
    if (permissionSet.has(legacy)) {
      for (const granular of granularList) {
        permissionSet.add(granular);
      }
    }
  }
  
  const updatedPermissions = Array.from(permissionSet);
  if (updatedPermissions.length !== originalSize) {
    console.log(`Updating role: ${roleId} (${source})`);
    console.log(`  Added: ${updatedPermissions.filter(p => !permissions.includes(p)).join(', ')}`);
    
    const updatePayload = {
      permissions: updatedPermissions,
      Permissions: updatedPermissions.join(', '),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    return updatePayload;
  }
  return null;
}

async function run() {
  try {
    // 1. Sync global role_types
    console.log("Syncing global role_types...");
    const globalRolesSnap = await db.collection('role_types').get();
    for (const doc of globalRolesSnap.docs) {
      const updatePayload = processRoleData(doc.data(), doc.id, "global");
      if (updatePayload) {
        await doc.ref.update(updatePayload);
      }
    }
    
    // 2. Sync tenant-specific roles
    console.log("\nSyncing tenant roles...");
    const tenantsSnap = await db.collection('tenants').get();
    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;
      const tRolesSnap = await db.collection(`tenants/${tenantId}/roles`).get();
      for (const doc of tRolesSnap.docs) {
        const updatePayload = processRoleData(doc.data(), doc.id, `tenant ${tenantId}`);
        if (updatePayload) {
          await doc.ref.update(updatePayload);
        }
      }
    }
    
    console.log("\nDone syncing permissions!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
