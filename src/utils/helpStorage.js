import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../firebase";

const AI_CONFIG_DOC = "system/ai_config";
const CONV_COLLECTION = "ai_conversations";

// ── Knowledge Base ─────────────────────────────────────────────────────────

export async function readKnowledgeBase() {
  try {
    const snap = await getDoc(doc(db, AI_CONFIG_DOC));
    if (snap.exists()) {
      return snap.data().content || "";
    }
    return null;
  } catch (err) {
    console.error("helpStorage: readKnowledgeBase error:", err);
    throw err;
  }
}

export async function writeKnowledgeBase(content) {
  try {
    await setDoc(doc(db, AI_CONFIG_DOC), { 
      content, 
      updated_at: serverTimestamp() 
    }, { merge: true });
  } catch (err) {
    console.error("helpStorage: writeKnowledgeBase error:", err);
    throw err;
  }
}

// ── Conversations ──────────────────────────────────────────────────────────

export async function saveConversation(data) {
  try {
    const docRef = await addDoc(collection(db, CONV_COLLECTION), { 
      ...data, 
      created_at: serverTimestamp() 
    });
    return docRef.id;
  } catch (err) {
    console.error("helpStorage: saveConversation error:", err);
    throw err;
  }
}

export async function loadConversations() {
  try {
    const q = query(collection(db, CONV_COLLECTION), orderBy("created_at", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        // Convert Firestore Timestamp to ISO string for compatibility with existing code
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : new Date().toISOString()
      };
    });
  } catch (err) {
    console.error("helpStorage: loadConversations error:", err);
    throw err;
  }
}

export async function updateConversation(id, updates) {
  try {
    const docRef = doc(db, CONV_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updated_at: serverTimestamp()
    });
  } catch (err) {
    console.error("helpStorage: updateConversation error:", err);
    throw err;
  }
}

export async function deleteConversation(id) {
  try {
    await deleteDoc(doc(db, CONV_COLLECTION, id));
  } catch (err) {
    console.error("helpStorage: deleteConversation error:", err);
    throw err;
  }
}

