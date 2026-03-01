import { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { sortData } from "../utils";
import { Bdg, StatCard, Pagination, ActBtns, useResizableColumns, TblHead, Modal, FF, FIn, DelModal } from "../components";
import { useAuth } from "../AuthContext";

export default function PageTenants({ t, isDark, TENANTS = [], collectionPath = "" }) {
    const { hasPermission, isSuperAdmin } = useAuth();
    // Usually only SUPER ADMIN can create/delete tenants, or users with explicit permissions
    const canCreate = isSuperAdmin || hasPermission("PLATFORM_TENANT_CREATE");
    const canUpdate = isSuperAdmin || hasPermission("PLATFORM_TENANT_UPDATE");
    const canDelete = isSuperAdmin || hasPermission("PLATFORM_TENANT_DELETE");
    const [hov, setHov] = useState(null);
    const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
    const [delT, setDelT] = useState(null);
    const [sort, setSort] = useState({ key: null, direction: "asc" });
    const [page, setPage] = useState(1);
    const onSort = k => { setSort(s => ({ key: k, direction: s.key === k && s.direction === "asc" ? "desc" : "asc" })); setPage(1); };

    const nextTenantId = (() => {
        if (TENANTS.length === 0) return "T10001";
        const maxNum = Math.max(...TENANTS.map(p => {
            const m = String(p.id).match(/^T(\d+)$/);
            return m ? Number(m[1]) : 0;
        }));
        return "T" + (maxNum + 1);
    })();

    const openAdd = () => setModal({
        open: true,
        mode: "add",
        data: { id: nextTenantId, name: "", logo: "", owner_id: "", email: "", phone: "", notes: "" }
    });
    const openEdit = r => setModal({ open: true, mode: "edit", data: { ...r } });
    const close = () => setModal(m => ({ ...m, open: false }));
    const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

    const handleSaveTenant = async () => {
        const d = modal.data;
        const payload = {
            tenant_name: d.name || "",
            tenant_logo: d.logo || "",
            owner_id: d.owner_id || "",
            tenant_email: d.email || "",
            tenant_phone: d.phone || "",
            Notes: d.notes || "",
            updated_at: serverTimestamp(),
        };
        try {
            if (modal.mode === "edit" && d.docId) {
                await updateDoc(doc(db, collectionPath, d.docId), payload);
            } else {
                await setDoc(doc(db, collectionPath, d.id), {
                    ...payload,
                    tenant_id: d.id,
                    created_at: serverTimestamp()
                });
            }
        } catch (err) {
            console.error("Failed to save tenant:", err);
        }
        close();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 1024 * 1024) {
            alert("File is too large! Please choose an image under 1MB.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setF("logo", reader.result);
        };
        reader.readAsDataURL(file);
    };

    const cols = [
        { l: "TENANT ID", w: "110px", k: "id" },
        { l: "NAME", w: "1fr", k: "name" },
        { l: "LOGO", w: "100px", k: "logo" },
        { l: "OWNER ID", w: "100px", k: "owner_id" },
        { l: "EMAIL", w: "1.2fr", k: "email" },
        { l: "PHONE", w: "120px", k: "phone" },
        { l: "NOTES", w: "1.2fr", k: "notes" },
        { l: "CREATED", w: "95px", k: "created_at" },
        { l: "UPDATED", w: "95px", k: "updated_at" },
        { l: "ACTIONS", w: "80px" }
    ];
    const { gridTemplate, headerRef, onResizeStart } = useResizableColumns(cols);
    const [colFilters, setColFilters] = useState({});
    const setColFilter = (key, val) => { setColFilters(f => ({ ...f, [key]: val })); setPage(1); };
    const filtered = TENANTS.filter(p => cols.every(c => {
        if (!c.k || !colFilters[c.k]) return true;
        return String(p[c.k] || "").toLowerCase().includes(colFilters[c.k].toLowerCase());
    }));
    const sorted = sortData(filtered, sort);
    const paginated = sorted.slice((page - 1) * 20, page * 20);
    const totalPages = Math.ceil(sorted.length / 20);

    const handleDeleteTenant = async () => {
        if (!delT || !delT.docId) return;
        try {
            await deleteDoc(doc(db, collectionPath, delT.docId));
            setDelT(null);
        } catch (err) { console.error("Delete tenant error:", err); }
    };

    return (<>
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
                <h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Tenants</h1>
                <p style={{ fontSize: 13.5, color: t.textMuted }}>Manage platform tenants and owners</p>
            </div>
            {canCreate && (
                <button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Tenant
                </button>
            )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
            {[{ label: "Total Tenants", value: TENANTS.length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" }].map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}
        </div>

        <div style={{ background: t.surface, borderRadius: 16, border: `1px solid ${t.surfaceBorder}`, overflow: "auto", backdropFilter: isDark ? "blur(20px)" : "none", boxShadow: t.tableShadow }}>
            <TblHead cols={cols} t={t} isDark={isDark} sortConfig={sort} onSort={onSort} gridTemplate={gridTemplate} headerRef={headerRef} onResizeStart={onResizeStart} />
            <div style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "6px 22px", borderBottom: `1px solid ${t.rowDivider}`, background: isDark ? "rgba(255,255,255,0.015)" : "#FDFDFC" }}>
                {cols.map(c => c.k ? <input key={c.k} value={colFilters[c.k] || ""} onChange={e => setColFilter(c.k, e.target.value)} placeholder="Filter..." style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${t.surfaceBorder}`, background: isDark ? "rgba(30, 58, 138, 0.3)" : "rgba(219, 234, 254, 0.7)", color: isDark ? "rgba(255,255,255,0.8)" : "#44403C", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }} /> : <div key={c.l || "nofilter"} />)}
            </div>
            {paginated.map((p, i) => {
                const isHov = hov === p.id;
                const isImg = p.logo && (p.logo.startsWith("http") || p.logo.startsWith("data:image"));
                return (<div key={p.id} className="data-row" onMouseEnter={() => setHov(p.id)} onMouseLeave={() => setHov(null)} style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "12px 22px", borderBottom: i < paginated.length - 1 ? `1px solid ${t.rowDivider}` : "none", alignItems: "center", background: isHov ? t.rowHover : "transparent", transition: "all 0.15s ease" }}>
                    <div style={{ fontFamily: t.mono, fontSize: 11, color: t.idText }}>{p.id}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: isDark ? "rgba(255,255,255,0.85)" : (isHov ? "#1C1917" : "#44403C"), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{p.name}</div>
                    <div>
                        {isImg ? (
                            <img src={p.logo} alt="Logo" style={{ height: 24, maxWidth: "100%", borderRadius: 4, objectFit: "contain" }} />
                        ) : (
                            <div style={{ fontSize: 10, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.logo || <span style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#D4D0CB" }}>—</span>}</div>
                        )}
                    </div>
                    <div style={{ fontFamily: t.mono, fontSize: 11, color: t.idText }}>{p.owner_id || <span style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#D4D0CB" }}>—</span>}</div>
                    <div style={{ fontSize: 12.5, color: isDark ? "#60A5FA" : "#4F46E5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.email || <span style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#D4D0CB" }}>—</span>}</div>
                    <div style={{ fontFamily: t.mono, fontSize: 11, color: t.textMuted }}>{p.phone || <span style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#D4D0CB" }}>—</span>}</div>
                    <div style={{ fontSize: 12, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{p.notes || <span style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#D4D0CB" }}>—</span>}</div>
                    <div style={{ fontFamily: t.mono, fontSize: 10.5, color: t.idText }}>{p.created_at || <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>}</div>
                    <div style={{ fontFamily: t.mono, fontSize: 10.5, color: t.idText }}>{p.updated_at || <span style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D4D0CB" }}>—</span>}</div>
                    <ActBtns show={isHov && (canUpdate || canDelete)} t={t} onEdit={canUpdate ? () => openEdit(p) : null} onDel={canDelete ? () => setDelT({ id: p.id, name: p.name, docId: p.docId }) : null} />
                </div>);
            })}
        </div>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: t.textSubtle }}>Showing <strong style={{ color: t.textSecondary }}>{paginated.length}</strong> of <strong style={{ color: t.textSecondary }}>{sorted.length}</strong> tenants</span>
            <Pagination totalPages={totalPages} currentPage={page} onPageChange={setPage} t={t} />
        </div>

        <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "New Tenant" : "Edit Tenant"} onSave={handleSaveTenant} width={580} t={t} isDark={isDark}>
            <FF label="Tenant ID" t={t}>
                <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px", letterSpacing: "0.5px" }}>{modal.data.id}</div>
            </FF>
            <FF label="Tenant Name" t={t}><FIn value={modal.data.name} onChange={e => setF("name", e.target.value)} placeholder="e.g. AVG Real Estate" t={t} /></FF>
            <FF label="Tenant Logo" t={t}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {modal.data.logo && <img src={modal.data.logo} alt="Preview" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "contain", background: isDark ? "rgba(255,255,255,0.05)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}` }} />}
                    <div style={{ flex: 1 }}>
                        <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} id="tenant-logo-upload" />
                        <label htmlFor="tenant-logo-upload" style={{ display: "inline-block", background: isDark ? "rgba(255,255,255,0.08)" : "#F5F4F1", color: t.text, border: `1px solid ${t.border}`, borderRadius: 9, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                            {modal.data.logo ? "Change Photo" : "Upload Logo"}
                        </label>
                        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>Recommended: Square or horizontal image, PNG/JPG under 1MB.</div>
                    </div>
                    {modal.data.logo && <button onClick={() => setF("logo", "")} style={{ background: "none", border: "none", color: "#F87171", fontSize: 12, cursor: "pointer" }}>Remove</button>}
                </div>
            </FF>
            <FF label="Owner ID" t={t}><FIn value={modal.data.owner_id} onChange={e => setF("owner_id", e.target.value)} placeholder="e.g. O10001" t={t} /></FF>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FF label="Email" t={t}><FIn value={modal.data.email} onChange={e => setF("email", e.target.value)} placeholder="email@tenant.com" t={t} /></FF>
                <FF label="Phone" t={t}><FIn value={modal.data.phone} onChange={e => setF("phone", e.target.value)} placeholder="e.g. +1 234 567 8900" t={t} /></FF>
            </div>
            <FF label="Notes" t={t}><FIn value={modal.data.notes} onChange={e => setF("notes", e.target.value)} placeholder="Internal remarks..." t={t} /></FF>
        </Modal>

        <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeleteTenant} label="This tenant" t={t} isDark={isDark} />
    </>);
}
