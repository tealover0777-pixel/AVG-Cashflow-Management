import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { uploadFile } from "../utils/storageUtils";
import { FileText, File, Trash2, Download, Plus, Loader2, X } from "lucide-react";
import { fmtCurr } from "../utils";

export default function DocumentsTab({ t, isDark, dealId }) {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [toast, setToast] = useState(null);
    const showToast = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
    const [confirmDelDoc, setConfirmDelDoc] = useState(null);

    useEffect(() => {
        if (!dealId) return;
        const q = query(collection(db, "deals", dealId, "documents"));
        const unsub = onSnapshot(q, (snap) => {
            setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0)));
            setLoading(false);
        }, (err) => {
            console.error("Docs unsub error:", err);
            setLoading(false);
        });
        return () => unsub();
    }, [dealId]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setProgress(10);
        try {
            const path = `deals/${dealId}/documents/${Date.now()}_${file.name}`;
            const url = await uploadFile(file, path);
            setProgress(90);

            const docId = `DOC_${Date.now()}`;
            await setDoc(doc(db, "deals", dealId, "documents", docId), {
                name: file.name,
                url: url,
                path: path,
                size: file.size,
                type: file.type,
                uploadedAt: serverTimestamp(),
            });
            setProgress(100);
            setTimeout(() => {
                setUploading(false);
                setProgress(0);
            }, 500);
        } catch (err) {
            console.error("Upload error:", err);
            showToast("Failed to upload: " + err.message, "error");
            setUploading(false);
        }
    };

    const handleDelete = (docObj) => setConfirmDelDoc(docObj);

    const doDelete = async (docObj) => {
        try {
            await deleteDoc(doc(db, "deals", dealId, "documents", docObj.id));
            // Note: We should also delete from Storage, but for now we focus on Firestore consistency.
            // storageUtils could be expanded with deleteFile if needed.
        } catch (err) {
            console.error("Delete error:", err);
        }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading) return <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>Loading documents...</div>;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: t.text }}>Documents</h3>
                <label style={{ 
                    background: t.accentGrad, 
                    color: "#fff", 
                    padding: "8px 16px", 
                    borderRadius: 9, 
                    fontSize: 13, 
                    fontWeight: 600, 
                    cursor: uploading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    opacity: uploading ? 0.7 : 1
                }}>
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    {uploading ? "Uploading..." : "Upload Document"}
                    <input type="file" onChange={handleFileChange} style={{ display: "none" }} disabled={uploading} />
                </label>
            </div>

            {uploading && (
                <div style={{ width: "100%", background: isDark ? "rgba(255,255,255,0.05)" : "#E5E7EB", height: 6, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${progress}%`, background: t.accent, height: "100%", transition: "width 0.3s ease" }} />
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {docs.length === 0 ? (
                    <div style={{ gridColumn: "1/-1", padding: 60, textAlign: "center", border: `2px dashed ${t.surfaceBorder}`, borderRadius: 16, color: t.textMuted }}>
                        No documents uploaded for this deal yet.
                    </div>
                ) : docs.map(d => (
                    <div key={d.id} style={{ 
                        background: isDark ? "rgba(255,255,255,0.03)" : "#fff", 
                        border: `1px solid ${t.surfaceBorder}`, 
                        borderRadius: 12, 
                        padding: 14,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        transition: "all 0.2s ease",
                        cursor: "default"
                    }}>
                        <div style={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: 10, 
                            background: isDark ? "rgba(59,130,246,0.15)" : "#EFF6FF", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            color: t.accent 
                        }}>
                            {d.type?.includes("pdf") ? <FileText size={20} /> : <File size={20} />}
                        </div>
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={d.name}>
                                {d.name}
                            </div>
                            <div style={{ fontSize: 11, color: t.textSubtle, marginTop: 2 }}>
                                {formatSize(d.size)} • {d.uploadedAt ? new Date(d.uploadedAt.seconds * 1000).toLocaleDateString() : "Just now"}
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 4 }}>
                            <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ padding: 6, borderRadius: 8, color: t.textSecondary, transition: "background 0.2s" }} className="hover-bg">
                                <Download size={16} />
                            </a>
                            <button onClick={() => handleDelete(d)} style={{ padding: 6, borderRadius: 8, color: "#EF4444", border: "none", background: "none", cursor: "pointer", transition: "background 0.2s" }} className="hover-bg-red">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            <style>{`
                .hover-bg:hover { background: ${isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6"}; }
                .hover-bg-red:hover { background: rgba(239, 68, 68, 0.1); }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
            {confirmDelDoc && (
                <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 14, padding: 24, maxWidth: 380, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: isDark ? "#fff" : "#1C1917" }}>Delete Document?</div>
                        <p style={{ fontSize: 13.5, color: isDark ? "rgba(255,255,255,0.5)" : "#6B7280", marginBottom: 20, lineHeight: 1.6 }}>Delete <strong>{confirmDelDoc.name}</strong>? This cannot be undone.</p>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={async () => { await doDelete(confirmDelDoc); setConfirmDelDoc(null); }} style={{ flex: 1, background: "#EF4444", color: "#fff", border: "none", borderRadius: 9, padding: "10px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Delete</button>
                            <button onClick={() => setConfirmDelDoc(null)} style={{ flex: 1, background: isDark ? "rgba(255,255,255,0.08)" : "#F5F4F1", color: isDark ? "#fff" : "#1C1917", border: "none", borderRadius: 9, padding: "10px", fontSize: 13.5, cursor: "pointer" }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            {toast && (
                <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: toast.type === "error" ? (isDark ? "#2d0a0a" : "#fef2f2") : (isDark ? "#052e16" : "#f0fdf4"), border: `1px solid ${toast.type === "error" ? "#ef4444" : "#22c55e"}`, color: toast.type === "error" ? "#ef4444" : "#22c55e", borderRadius: 12, padding: "14px 20px", fontSize: 13.5, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 10, maxWidth: 380 }}>
                    <span>{toast.type === "error" ? "❌" : "✅"}</span>
                    <span>{toast.msg}</span>
                    <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16, marginLeft: 8, opacity: 0.7 }}>✕</button>
                </div>
            )}
        </div>
    );
}
