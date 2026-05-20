import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { uploadFile, deleteFile } from "../utils/storageUtils";
import { ref, listAll, getDownloadURL, getMetadata } from "firebase/storage";
import { useAuth } from "../AuthContext";
import { FileText, File, Trash2, Download, Plus, Loader2, X } from "lucide-react";
import { fmtCurr } from "../utils";

export default function DocumentsTab({ t, isDark, dealId, dealPath, tenantId }) {
    const dp = dealPath || `deals/${dealId}`;
    const { activeTenantId } = useAuth();
    const effectiveTenantId = tenantId || activeTenantId || "GLOBAL";

    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [toast, setToast] = useState(null);
    const showToast = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
    const [confirmDelDoc, setConfirmDelDoc] = useState(null);

    const [resourceModalOpen, setResourceModalOpen] = useState(false);
    const [resources, setResources] = useState([]);
    const [resourcesLoading, setResourcesLoading] = useState(false);
    const [resourceSearchQuery, setResourceSearchQuery] = useState("");

    useEffect(() => {
        if (!dealId) return;
        const q = query(collection(db, dp, "documents"));
        const unsub = onSnapshot(q, (snap) => {
            setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0)));
            setLoading(false);
        }, (err) => {
            console.error("Docs unsub error:", err);
            setLoading(false);
        });
        return () => unsub();
    }, [dealId]);

    useEffect(() => {
        if (resourceModalOpen) {
            loadResources();
        }
    }, [resourceModalOpen]);

    const loadResources = async () => {
        setResourcesLoading(true);
        try {
            const res = await listAll(ref(storage, `tenants/${effectiveTenantId}/marketing_uploads`));
            const items = Array.isArray(res.items) ? res.items : [];
            const list = await Promise.all(
                items.map(async (r) => {
                    const url = await getDownloadURL(r);
                    let metadata = {};
                    try {
                        metadata = await getMetadata(r);
                    } catch (e) {
                        console.error("Error retrieving metadata:", e);
                    }
                    
                    let displayName = r.name;
                    const match = r.name.match(/^\d+_(.+)$/);
                    if (match) {
                        displayName = match[1];
                    }

                    return {
                        name: r.name,
                        displayName,
                        url,
                        path: r.fullPath,
                        size: metadata.size || 0,
                        contentType: metadata.contentType || "",
                        isImage: ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(displayName.split('.').pop().toLowerCase())
                    };
                })
            );
            setResources(list.filter(item => !item.isImage));
        } catch (err) {
            console.error("Error loading resources:", err);
            showToast("Failed to fetch resources: " + err.message, "error");
        } finally {
            setResourcesLoading(false);
        }
    };

    const handleSelectResource = async (resource) => {
        setUploading(true);
        try {
            const docId = `DOC_${Date.now()}`;
            await setDoc(doc(db, dp, "documents", docId), {
                name: resource.displayName,
                url: resource.url,
                path: resource.path,
                size: resource.size || 0,
                type: resource.contentType || "application/octet-stream",
                uploadedAt: serverTimestamp(),
            });
            showToast("Document loaded from Resource Management!", "success");
            setResourceModalOpen(false);
        } catch (err) {
            console.error("Error adding resource doc:", err);
            showToast("Failed to load document: " + err.message, "error");
        } finally {
            setUploading(false);
        }
    };

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
            await setDoc(doc(db, dp, "documents", docId), {
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
            await deleteDoc(doc(db, dp, "documents", docObj.id));
            if (docObj.path) await deleteFile(docObj.path);
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
                <div style={{ display: "flex", gap: 10 }}>
                    <button 
                        onClick={() => setResourceModalOpen(true)}
                        style={{
                            background: isDark ? "rgba(255,255,255,0.06)" : "#fff",
                            border: `1px solid ${t.surfaceBorder}`,
                            color: t.text,
                            padding: "8px 16px",
                            borderRadius: 9,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6
                        }}
                    >
                        <FileText size={16} />
                        Select from Resources
                    </button>
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
            {resourceModalOpen && (
                <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 16, padding: 24, maxWidth: 500, width: "95%", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#fff" : "#1C1917" }}>Select from Resource Management</div>
                            <button onClick={() => setResourceModalOpen(false)} style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center" }}><X size={18} /></button>
                        </div>
                        
                        <div style={{ position: "relative", marginBottom: 14 }}>
                            <input
                                type="text"
                                placeholder="Search documents..."
                                value={resourceSearchQuery}
                                onChange={e => setResourceSearchQuery(e.target.value)}
                                style={{
                                    width: "100%",
                                    background: isDark ? "rgba(255,255,255,0.03)" : "#FAF9F6",
                                    border: `1px solid ${t.surfaceBorder}`,
                                    borderRadius: 8,
                                    padding: "8px 12px",
                                    fontSize: 13,
                                    color: t.text,
                                    outline: "none",
                                    boxSizing: "border-box"
                                }}
                            />
                        </div>

                        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, minHeight: 200, paddingRight: 4 }}>
                            {resourcesLoading ? (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, color: t.textMuted, gap: 8 }}>
                                    <Loader2 size={18} className="animate-spin" /> Loading resources...
                                </div>
                            ) : resources.filter(r => r.displayName.toLowerCase().includes(resourceSearchQuery.toLowerCase())).length === 0 ? (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, color: t.textMuted, fontSize: 13 }}>
                                    No documents found in Resource Management.
                                </div>
                            ) : (
                                resources.filter(r => r.displayName.toLowerCase().includes(resourceSearchQuery.toLowerCase())).map((item) => (
                                    <div
                                        key={item.path}
                                        onClick={() => handleSelectResource(item)}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: "10px 12px",
                                            border: `1px solid ${t.surfaceBorder}`,
                                            borderRadius: 8,
                                            background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAFA",
                                            cursor: "pointer",
                                            transition: "background 0.2s"
                                        }}
                                        className="hover-bg-resource"
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden", marginRight: 8, flex: 1 }}>
                                            <FileText size={16} color={t.textMuted} style={{ flexShrink: 0 }} />
                                            <span style={{ fontSize: 12.5, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.displayName}>
                                                {item.displayName}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 11, color: t.textMuted, flexShrink: 0, paddingRight: 8 }}>
                                            {formatSize(item.size)}
                                        </div>
                                        <button
                                            style={{
                                                background: t.accentGrad || t.accent,
                                                color: "#fff",
                                                border: "none",
                                                padding: "4px 10px",
                                                borderRadius: 6,
                                                fontSize: 11,
                                                fontWeight: 600,
                                                cursor: "pointer"
                                            }}
                                        >
                                            Select
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        <style>{`
                            .hover-bg-resource:hover {
                                background: ${isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6"} !important;
                            }
                        `}</style>
                    </div>
                </div>
            )}
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
