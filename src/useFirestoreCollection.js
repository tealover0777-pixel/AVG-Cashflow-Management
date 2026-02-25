import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Real-time Firestore collection hook.
 * @param {string} collectionPath  e.g. "tenants/T10001/projects" or "dimensions"
 * @returns {{ data: Object[], loading: boolean, error: Error|null }}
 */
export function useFirestoreCollection(collectionPath) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!collectionPath) {
      setLoading(false);
      return;
    }

    const ref = collection(db, collectionPath);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          doc_id: doc.id,
          id: doc.id,
          ...doc.data(),
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
