import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

// To run this script, you may need a service account key.
// However, since we are in a managed environment, we might be able to use default credentials or a local ADC.
// For now, I'll assume we can use the environment's Firebase context if it exists.
// Alternatively, I can use the firebase-mcp-server to do this, but a script is better for bulk updates.

const serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccount.json", "utf8"));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const MAPPINGS = {
  "CONTRACT_VIEW": "INVESTMENT_VIEW",
  "CONTRACT_CREATE": "INVESTMENT_CREATE",
  "CONTRACT_UPDATE": "INVESTMENT_UPDATE",
  "CONTRACT_DELETE": "INVESTMENT_DELETE",
  "CONTRACTS_DELETE": "INVESTMENT_DELETE",
  "INVESTMENTS_DELETE": "INVESTMENT_DELETE"
};

async function migrate() {
  console.log("🚀 Starting permission migration (CONTRACT -> INVESTMENT)...");

  // 1. Migrate role_types
  console.log("\n--- Migrating role_types ---");
  const rolesSnap = await db.collection("role_types").get();
  for (const doc of rolesSnap.docs) {
    const data = doc.data();
    let updated = false;
    let perms = data.permissions || [];
    let permStr = data.Permissions || "";

    // Update Array
    const newPerms = perms.map(p => {
      if (MAPPINGS[p]) {
        updated = true;
        return MAPPINGS[p];
      }
      return p;
    });

    // Remove duplicates
    const finalPerms = [...new Set(newPerms)];
    if (finalPerms.length !== perms.length) updated = true;

    // Update String
    let newPermStr = permStr;
    Object.keys(MAPPINGS).forEach(old => {
      const regex = new RegExp(`\\b${old}\\b`, 'g');
      if (newPermStr.match(regex)) {
        updated = true;
        newPermStr = newPermStr.replace(regex, MAPPINGS[old]);
      }
    });

    // Remove duplicates in string
    const finalPermStr = [...new Set(newPermStr.split(",").map(s => s.trim()))].join(", ");

    if (updated) {
      console.log(`Updating role: ${doc.id} (${data.role_name})`);
      await doc.ref.update({
        permissions: finalPerms,
        Permissions: finalPermStr
      });
    }
  }

  // 2. Migrate dimensions/Permissions
  console.log("\n--- Migrating dimensions/Permissions ---");
  const permDimRef = db.collection("dimensions").doc("Permissions");
  const permDimSnap = await permDimRef.get();
  if (permDimSnap.exists) {
    const data = permDimSnap.data();
    let updated = false;
    
    const updateArray = (arr) => {
      return (arr || []).map(p => {
        if (MAPPINGS[p]) {
          updated = true;
          return MAPPINGS[p];
        }
        return p;
      });
    };

    const newItems = [...new Set(updateArray(data.items))];
    const newOptions = [...new Set(updateArray(data.options))];

    if (updated) {
      console.log("Updating dimensions/Permissions document");
      await permDimRef.update({
        items: newItems,
        options: newOptions
      });
    }
  }

  console.log("\n✅ Migration complete!");
}

migrate().catch(console.error);
