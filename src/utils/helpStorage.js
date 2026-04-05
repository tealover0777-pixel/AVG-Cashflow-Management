import { ref, uploadString, getBytes, listAll, deleteObject } from "firebase/storage";
import { storage } from "../firebase";

const KB_PATH = "system/knowledge_base.txt";
const CONV_DIR = "help_conversations";

const decoder = new TextDecoder();

function generateId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function readBytes(storageRef) {
  const buf = await getBytes(storageRef);
  return decoder.decode(buf);
}

// ── Knowledge Base ─────────────────────────────────────────────────────────

export async function readKnowledgeBase() {
  try {
    return await readBytes(ref(storage, KB_PATH));
  } catch (err) {
    if (err.code === "storage/object-not-found") return null;
    throw err;
  }
}

export async function writeKnowledgeBase(content) {
  await uploadString(ref(storage, KB_PATH), content, "raw", { contentType: "text/plain" });
}

// ── Conversations ──────────────────────────────────────────────────────────

export async function saveConversation(data) {
  const id = generateId();
  const payload = { ...data, id, created_at: new Date().toISOString() };
  await uploadString(
    ref(storage, `${CONV_DIR}/${id}.json`),
    JSON.stringify(payload),
    "raw",
    { contentType: "application/json" }
  );
  return id;
}

export async function loadConversations() {
  const listResult = await listAll(ref(storage, CONV_DIR));
  if (listResult.items.length === 0) return [];
  const items = await Promise.all(
    listResult.items.map(async (itemRef) => {
      const text = await readBytes(itemRef);
      return JSON.parse(text);
    })
  );
  return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function updateConversation(id, updates) {
  const fileRef = ref(storage, `${CONV_DIR}/${id}.json`);
  const existing = JSON.parse(await readBytes(fileRef));
  const updated = { ...existing, ...updates };
  await uploadString(fileRef, JSON.stringify(updated), "raw", { contentType: "application/json" });
}

export async function deleteConversation(id) {
  await deleteObject(ref(storage, `${CONV_DIR}/${id}.json`));
}
