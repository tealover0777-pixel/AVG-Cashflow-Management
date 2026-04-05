import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Service account key not found at: ${serviceAccountPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "avg-cashflow-management.firebasestorage.app"
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function migrate() {
  console.log("🚀 Starting AI Data Migration (Storage -> Firestore)...");

  // 1. Migrate Knowledge Base
  console.log("\n--- Migrating Knowledge Base ---");
  const kbFile = bucket.file("system/knowledge_base.txt");
  
  try {
    const [exists] = await kbFile.exists();
    if (exists) {
      const [content] = await kbFile.download();
      const kbText = content.toString("utf8");
      
      console.log("Saving Knowledge Base to Firestore...");
      await db.doc("system/ai_config").set({
        content: kbText,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        migrated_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log("✅ Knowledge Base migrated.");
    } else {
      console.log("ℹ️ No Knowledge Base found in Storage.");
    }
  } catch (err) {
    console.error("❌ Error migrating Knowledge Base:", err.message);
  }

  // 2. Migrate Conversations
  console.log("\n--- Migrating Conversations ---");
  try {
    const [files] = await bucket.getFiles({ prefix: "help_conversations/" });
    const jsonFiles = files.filter(f => f.name.endsWith(".json"));
    
    console.log(`Found ${jsonFiles.length} conversations to migrate.`);

    for (const file of jsonFiles) {
      try {
        const [content] = await file.download();
        const data = JSON.parse(content.toString("utf8"));
        
        console.log(`Migrating conversation: ${path.basename(file.name)}`);
        
        // Use the file name (ID) as document ID to maintain consistency if possible
        const docId = path.basename(file.name, ".json");
        
        await db.collection("ai_conversations").doc(docId).set({
          ...data,
          migrated_from_storage: true,
          migrated_at: admin.firestore.FieldValue.serverTimestamp(),
          // Ensure created_at is handled properly
          created_at: data.created_at ? new Date(data.created_at) : admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (fileErr) {
        console.error(`❌ Failed to migrate ${file.name}:`, fileErr.message);
      }
    }
    console.log("✅ Conversations migration complete.");
  } catch (err) {
    console.error("❌ Error listing conversations:", err.message);
  }

  console.log("\n✨ Migration finished successfully!");
  process.exit(0);
}

migrate().catch(err => {
  console.error("\n💥 Migration failed:", err);
  process.exit(1);
});

