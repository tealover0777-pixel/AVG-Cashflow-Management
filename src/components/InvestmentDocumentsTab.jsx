import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { uploadFile, deleteFile } from "../utils/storageUtils";
import { ref, listAll, getDownloadURL, getMetadata } from "firebase/storage";
import { useAuth } from "../AuthContext";
import { FileText, File, Trash2, Download, Plus, Loader2, X, HelpCircle, Eye } from "lucide-react";
import { Modal, FF, FIn, FSel, Tooltip, DelModal } from "../components.jsx";

export default function InvestmentDocumentsTab({ t, isDark, tenantId, contact, party, DEALS, INVESTMENTS }) {
    const { activeTenantId } = useAuth();
    const effectiveTenantId = tenantId || activeTenantId || "GLOBAL";

    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form state for new document
    const [newDoc, setNewDoc] = useState({
        file: null,
        category: "Agreement",
        dealId: "",
        label: ""
    });
    const [toast, setToast] = useState(null);
    const showToast = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
    const [confirmDelDoc, setConfirmDelDoc] = useState(null);

    const [uploadMode, setUploadMode] = useState("file"); // "file" or "resource"
    const [resourceSearchQuery, setResourceSearchQuery] = useState("");
    const [resources, setResources] = useState([]);
    const [resourcesLoading, setResourcesLoading] = useState(false);
    const [selectedResource, setSelectedResource] = useState(null);

    const src = contact || party; // accept either prop name
    const partyId = String(src.id || src.docId || "").trim();

    useEffect(() => {
        if (!tenantId || !partyId) return;
        const q = query(collection(db, "tenants", tenantId, "contacts", partyId, "documents"));
        const unsub = onSnapshot(q, (snap) => {
            setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.date_added?.seconds || 0) - (a.date_added?.seconds || 0)));
            setLoading(false);
        }, (err) => {
            console.error("Docs unsub error:", err);
            setLoading(false);
        });
        return () => unsub();
    }, [tenantId, partyId]);

    useEffect(() => {
        if (!isModalOpen) {
            setUploadMode("file");
            setSelectedResource(null);
        }
    }, [isModalOpen]);

    useEffect(() => {
        if (isModalOpen && uploadMode === "resource") {
            loadResources();
        }
    }, [isModalOpen, uploadMode]);

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

    const formatSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleUpload = async () => {
        if (uploadMode === "file" && !newDoc.file) { showToast("Please select a file.", "error"); return; }
        if (uploadMode === "resource" && !selectedResource) { showToast("Please select a resource document.", "error"); return; }
        if (!newDoc.dealId) { showToast("Please select a deal.", "error"); return; }

        setUploading(true);
        setProgress(10);
        try {
            const timestamp = Date.now();
            let url, path, name, size, type;

            if (uploadMode === "file") {
                path = `tenants/${tenantId}/contacts/${partyId}/documents/${timestamp}_${newDoc.file.name}`;
                url = await uploadFile(newDoc.file, path);
                name = newDoc.file.name;
                size = newDoc.file.size;
                type = newDoc.file.type;
            } else {
                url = selectedResource.url;
                path = selectedResource.path;
                name = selectedResource.displayName;
                size = selectedResource.size;
                type = selectedResource.contentType;
            }
            
            setProgress(90);

            const deal = DEALS.find(d => d.id === newDoc.dealId);
            const docId = `DOC_${timestamp}`;
            
            await setDoc(doc(db, "tenants", tenantId, "contacts", partyId, "documents", docId), {
                id: docId,
                name: name,
                url: url,
                path: path,
                size: size,
                type: type,
                category: newDoc.category,
                deal_id: newDoc.dealId,
                deal_name: deal?.name || newDoc.dealId,
                label: newDoc.label,
                date_added: serverTimestamp(),
            });

            setProgress(100);
            setTimeout(() => {
                setUploading(false);
                setProgress(0);
                setIsModalOpen(false);
                setNewDoc({ file: null, category: "Agreement", dealId: "", label: "" });
                setSelectedResource(null);
                setUploadMode("file");
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
            await deleteDoc(doc(db, "tenants", tenantId, "contacts", partyId, "documents", docObj.id));
            if (docObj.path) await deleteFile(docObj.path);
        } catch (err) {
            console.error("Delete error:", err);
        }
    };

    const agreements = docs.filter(d => d.category === "Agreement");
    const taxDocs = docs.filter(d => d.category === "Tax");

    // Filter deals the contact is involved in
    const partyDeals = Array.from(new Set(INVESTMENTS.filter(inv => {
        const invPId = String(inv.contact_id || "").trim();
        return invPId === partyId || invPId === src.id;
    }).map(inv => inv.deal_id))).map(id => DEALS.find(d => d.id === id)).filter(Boolean);

    if (loading) return <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>Loading documents...</div>;

    const renderTable = (items, categoryTitle, categoryValue) => (
        <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 12, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden", marginBottom: 32 }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#fff" : "#111827" }}>{categoryTitle}</h3>
                <button 
                  onClick={() => { setNewDoc(prev => ({ ...prev, category: categoryValue })); setIsModalOpen(true); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: t.accentGrad || t.accent, color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                    <Plus size={16} /> Add document
                </button>
            </div>
            {items.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontSize: 13 }}>No documents found for this category.</div>
            ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAFA", borderBottom: `1px solid ${t.surfaceBorder}` }}>
                        <tr>
                            <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: t.textMuted }}>DOCUMENT NAME</th>
                            <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: t.textMuted }}>DEAL NAME</th>
                            <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: t.textMuted }}>DESCRIPTION</th>
                            <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: t.textMuted }}>DATE ADDED</th>
                            <th style={{ padding: "12px 24px", fontSize: 11, fontWeight: 700, color: t.textMuted, textAlign: "right" }}>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((d, i) => (
                            <tr key={d.id} style={{ borderBottom: i < items.length - 1 ? `1px solid ${t.surfaceBorder}` : "none" }}>
                                <td style={{ padding: "14px 24px", fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }}>
                                    <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
                                        {d.type?.includes("pdf") ? <FileText size={16} color={t.accent} /> : <File size={16} color={t.accent} />}
                                        {d.name}
                                    </a>
                                </td>
                                <td style={{ padding: "14px 24px", fontSize: 13, color: t.textSecondary }}>{d.deal_name || "—"}</td>
                                <td style={{ padding: "14px 24px", fontSize: 13, color: t.textSecondary }}>{d.label || "—"}</td>
                                <td style={{ padding: "14px 24px", fontSize: 13, color: t.textSecondary }}>{d.date_added ? new Date(d.date_added.seconds * 1000).toLocaleDateString() : "Just now"}</td>
                                <td style={{ padding: "14px 24px", textAlign: "right" }}>
                                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                                        <a href={d.url} target="_blank" rel="noopener noreferrer" title="View" style={{ color: t.textSecondary }}><Eye size={16} /></a>
                                        <a href={d.url} download={d.name} title="Download" style={{ color: t.textSecondary }}><Download size={16} /></a>
                                        <button onClick={() => handleDelete(d)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 0 }}><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            {renderTable(agreements, "Agreements and Applications", "Agreement")}
            {renderTable(taxDocs, "Tax Documents", "Tax")}

            {isModalOpen && (
                <Modal 
                    open={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    title="Upload Document" 
                    onSave={handleUpload} 
                    saveLabel={uploading ? "Uploading..." : "Upload"} 
                    loading={uploading}
                    t={t} 
                    isDark={isDark}
                >
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{ display: "flex", gap: 12, marginBottom: 4 }}>
                            <button
                                type="button"
                                onClick={() => setUploadMode("file")}
                                style={{
                                    flex: 1,
                                    padding: "8px 12px",
                                    borderRadius: 8,
                                    border: `1px solid ${uploadMode === "file" ? t.accent : t.surfaceBorder}`,
                                    background: uploadMode === "file" ? (isDark ? "rgba(59,130,246,0.1)" : "#EFF6FF") : "transparent",
                                    color: uploadMode === "file" ? t.accent : t.text,
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: "pointer"
                                }}
                            >
                                Upload Local File
                            </button>
                            <button
                                type="button"
                                onClick={() => setUploadMode("resource")}
                                style={{
                                    flex: 1,
                                    padding: "8px 12px",
                                    borderRadius: 8,
                                    border: `1px solid ${uploadMode === "resource" ? t.accent : t.surfaceBorder}`,
                                    background: uploadMode === "resource" ? (isDark ? "rgba(59,130,246,0.1)" : "#EFF6FF") : "transparent",
                                    color: uploadMode === "resource" ? t.accent : t.text,
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: "pointer"
                                }}
                            >
                                Select from Resources
                            </button>
                        </div>

                        {uploadMode === "file" ? (
                            <FF label="File" t={t}>
                                <input 
                                    type="file" 
                                    onChange={e => setNewDoc(prev => ({ ...prev, file: e.target.files[0] }))}
                                    style={{ 
                                        width: "100%", 
                                        padding: "10px", 
                                        border: `1px solid ${t.surfaceBorder}`, 
                                        borderRadius: 9, 
                                        background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
                                        color: t.text
                                    }} 
                                />
                            </FF>
                        ) : (
                            <FF label="Select Resource Document" t={t}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    <input
                                        type="text"
                                        placeholder="Search resource documents..."
                                        value={resourceSearchQuery}
                                        onChange={e => setResourceSearchQuery(e.target.value)}
                                        style={{
                                            width: "100%",
                                            background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
                                            border: `1px solid ${t.surfaceBorder}`,
                                            borderRadius: 8,
                                            padding: "8px 12px",
                                            fontSize: 13,
                                            color: t.text,
                                            outline: "none",
                                            boxSizing: "border-box"
                                        }}
                                    />
                                    
                                    <div style={{ maxHeight: 180, overflowY: "auto", border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, padding: 8, background: isDark ? "rgba(0,0,0,0.15)" : "#fff" }}>
                                        {resourcesLoading ? (
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80, color: t.textMuted, gap: 6, fontSize: 13 }}>
                                                <Loader2 size={16} className="animate-spin" /> Loading resources...
                                            </div>
                                        ) : resources.filter(r => r.displayName.toLowerCase().includes(resourceSearchQuery.toLowerCase())).length === 0 ? (
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80, color: t.textMuted, fontSize: 12.5 }}>
                                                No documents found in Resource Management.
                                            </div>
                                        ) : (
                                            resources.filter(r => r.displayName.toLowerCase().includes(resourceSearchQuery.toLowerCase())).map((item) => {
                                                const isSelected = selectedResource?.path === item.path;
                                                return (
                                                    <div
                                                        key={item.path}
                                                        onClick={() => setSelectedResource(item)}
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "space-between",
                                                            padding: "8px 10px",
                                                            borderRadius: 6,
                                                            background: isSelected 
                                                                ? (isDark ? "rgba(59,130,246,0.15)" : "#EFF6FF") 
                                                                : "transparent",
                                                            border: `1px solid ${isSelected ? t.accent : "transparent"}`,
                                                            cursor: "pointer",
                                                            transition: "background 0.2s"
                                                        }}
                                                        className="hover-bg-resource-item"
                                                    >
                                                        <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden", marginRight: 8, flex: 1 }}>
                                                            <FileText size={15} color={isSelected ? t.accent : t.textMuted} style={{ flexShrink: 0 }} />
                                                            <span style={{ fontSize: 12, color: isSelected ? t.accent : t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.displayName}>
                                                                {item.displayName}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: 11, color: t.textMuted, flexShrink: 0 }}>
                                                            {formatSize(item.size)}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    <style>{`
                                        .hover-bg-resource-item:hover {
                                            background: ${isDark ? "rgba(255,255,255,0.04)" : "#F3F4F6"} !important;
                                        }
                                    `}</style>
                                </div>
                            </FF>
                        )}
                        <FF label="Category" t={t}>
                            <FSel 
                                value={newDoc.category} 
                                onChange={e => setNewDoc(prev => ({ ...prev, category: e.target.value }))}
                                options={["Agreement", "Tax"]}
                                t={t}
                            />
                        </FF>
                        <FF label="Deal" t={t}>
                            <select 
                                value={newDoc.dealId} 
                                onChange={e => setNewDoc(prev => ({ ...prev, dealId: e.target.value }))}
                                style={{ width: "100%", background: t.searchBg, border: `1px solid ${t.searchBorder}`, borderRadius: 9, padding: "10px 13px", color: t.searchText, fontSize: 13.5, fontFamily: "inherit", outline: "none" }}
                            >
                                <option value="">Select a deal...</option>
                                {partyDeals.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </FF>
                        <FF label="Description (Label)" t={t}>
                            <FIn 
                                value={newDoc.label} 
                                onChange={e => setNewDoc(prev => ({ ...prev, label: e.target.value }))}
                                placeholder="e.g. TOD, Account Application, 1099" 
                                t={t}
                            />
                        </FF>
                    </div>
                </Modal>
            )}
            <DelModal open={!!confirmDelDoc} onClose={() => setConfirmDelDoc(null)} onDel={async () => { await doDelete(confirmDelDoc); setConfirmDelDoc(null); }} title="Delete Document?" t={t}>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: t?.textMuted }}>Delete <strong>{confirmDelDoc?.name}</strong>? This cannot be undone.</p>
            </DelModal>
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
