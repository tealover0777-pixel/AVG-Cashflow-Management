import { useState, useEffect } from "react";
import { collection, onSnapshot, collectionGroup } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Real-time Firestore collection hook.
 * @param {string} collectionPath  e.g. "tenants/T10001/projects" or "dimensions"
 * @param {boolean} isGroup        If true, uses collectionGroup query
 * @returns {{ data: Object[], loading: boolean, error: Error|null }}
 */
export function useFirestoreCollection(collectionPath, isGroup = false) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!collectionPath) {
      setLoading(false);
      return;
    }

    const ref = isGroup ? collectionGroup(db, collectionPath) : collection(db, collectionPath);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          ...doc.data(),
          doc_id: doc.id,
          docId: doc.id,
          id: doc.id,
          _path: doc.ref.path,
        }));
        setData(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore error on", collectionPath, err);
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [collectionPath]);

  return { data, loading, error };
}
