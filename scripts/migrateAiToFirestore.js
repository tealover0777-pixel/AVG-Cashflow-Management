import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, listAll, getBytes } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAD8G1WvI0SniOw5qvt_RrYIy5PkhF01Js",
  authDomain: "avg-cashflow-management.firebaseapp.com",
  projectId: "avg-cashflow-management",
  storageBucket: "avg-cashflow-management.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const decoder = new TextDecoder();

async function readBytes(storageRef) {
  try {
    const buf = await getBytes(storageRef);
    return decoder.decode(buf);
  } catch (err) {
    if (err.code === "storage/object-not-found") return null;
    throw err;
  }
}

async function migrate() {
  console.log("Starting AI Data Migration...");

  // 1. Migrate Knowledge Base
  const kbRef = ref(storage, "system/knowledge_base.txt");
  const kbContent = await readBytes(kbRef);
  if (kbContent) {
    console.log("Migrating Knowledge Base...");
    await setDoc(doc(db, "system", "ai_config"), {
      content: kbContent,
      updated_at: serverTimestamp(),
      migrated_at: serverTimestamp()
    });
    console.log("Knowledge Base migrated.");
  } else {
    console.log("No Knowledge Base found in Storage.");
  }

  // 2. Migrate Conversations
  const convDirRef = ref(storage, "help_conversations");
  try {
    const listResult = await listAll(convDirRef);
    console.log(`Found ${listResult.items.length} conversations to migrate.`);

    for (const itemRef of listResult.items) {
      const text = await readBytes(itemRef);
      if (text) {
        const data = JSON.parse(text);
        console.log(`Migrating conversation: ${itemRef.name}`);
        
        // Use addDoc but try to preserve the old ID if possible (though Firestore IDs are different)
        // We'll just add them as new docs to avoid conflicts.
        await addDoc(collection(db, "ai_conversations"), {
          ...data,
          migrated_from_storage: true,
          migrated_at: serverTimestamp(),
          // Ensure created_at is a proper date or timestamp if it exists as a string
          created_at: data.created_at ? new Date(data.created_at) : serverTimestamp()
        });
      }
    }
    console.log("Conversations migration complete.");
  } catch (err) {
    if (err.code === "storage/object-not-found") {
      console.log("No conversations folder found in Storage.");
    } else {
      console.error("Error migrating conversations:", err);
    }
  }

  console.log("Migration finished successfully!");
  process.exit(0);
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
