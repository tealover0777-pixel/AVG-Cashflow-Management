import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { uploadFile } from "../utils/storageUtils";
import { FileText, File, Trash2, Download, Plus, Loader2, X, HelpCircle, Eye } from "lucide-react";
import { Modal, FF, FIn, FSel, Tooltip } from "../components";

export default function InvestmentDocumentsTab({ t, isDark, tenantId, party, DEALS, INVESTMENTS }) {
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

    const partyId = String(party.id || party.docId || "").trim();

    useEffect(() => {
        if (!tenantId || !partyId) return;
        const q = query(collection(db, "tenants", tenantId, "parties", partyId, "documents"));
        const unsub = onSnapshot(q, (snap) => {
            setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.date_added?.seconds || 0) - (a.date_added?.seconds || 0)));
            setLoading(false);
        }, (err) => {
            console.error("Docs unsub error:", err);
            setLoading(false);
        });
        return () => unsub();
    }, [tenantId, partyId]);

    const handleUpload = async () => {
        if (!newDoc.file) return alert("Please select a file.");
        if (!newDoc.dealId) return alert("Please select a deal.");

        setUploading(true);
        setProgress(10);
        try {
            const timestamp = Date.now();
            const path = `tenants/${tenantId}/parties/${partyId}/documents/${timestamp}_${newDoc.file.name}`;
            const url = await uploadFile(newDoc.file, path);
            setProgress(90);

            const deal = DEALS.find(d => d.id === newDoc.dealId);
            const docId = `DOC_${timestamp}`;
            
            await setDoc(doc(db, "tenants", tenantId, "parties", partyId, "documents", docId), {
                id: docId,
                name: newDoc.file.name,
                url: url,
                path: path,
                size: newDoc.file.size,
                type: newDoc.file.type,
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
            }, 500);
        } catch (err) {
            console.error("Upload error:", err);
            alert("Failed to upload: " + err.message);
            setUploading(false);
        }
    };

    const handleDelete = async (docObj) => {
        if (!window.confirm(`Delete ${docObj.name}?`)) return;
        try {
            await deleteDoc(doc(db, "tenants", tenantId, "parties", partyId, "documents", docObj.id));
        } catch (err) {
            console.error("Delete error:", err);
        }
    };

    const agreements = docs.filter(d => d.category === "Agreement");
    const taxDocs = docs.filter(d => d.category === "Tax");

    // Filter deals the party is involved in
    const partyDeals = Array.from(new Set(INVESTMENTS.filter(inv => {
        const invPId = String(inv.party_id || "").trim();
        return invPId === partyId || invPId === party.id;
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
        </div>
    );
}
