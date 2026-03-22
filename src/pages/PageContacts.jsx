import React, { useState, useMemo, useRef, useEffect } from "react";
import TanStackTable from '../components/TanStackTable';
import { getContactColumns } from '../components/ContactsTanStackConfig';
import { db, functions } from "../firebase";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { initials, av, badge, sortData, fmtCurr } from "../utils";
import { StatCard, Bdg, Pagination, ActBtns, Modal, FF, FIn, FSel, DelModal, Tooltip } from "../components";
import { useAuth } from "../AuthContext";

export default function PageContacts({ t, isDark, CONTACTS = [], INVESTMENTS = [], SCHEDULES = [], DEALS = [], collectionPath = "", DIMENSIONS = [], tenantId = "" }) {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canCreate = hasPermission("CONTACT_CREATE") || hasPermission("PARTY_CREATE");
  const canUpdate = hasPermission("CONTACT_UPDATE") || hasPermission("PARTY_UPDATE");
  const canDelete = hasPermission("CONTACT_DELETE") || hasPermission("PARTY_DELETE");
  const canInvite = isSuperAdmin || hasPermission("USER_INVITE") || hasPermission("USER_CREATE");
  const roleOpts = (DIMENSIONS.find(d => d.name === "ContactRole") || {}).items || ["Investor", "Borrower"];
  const partyTypeOpts = (DIMENSIONS.find(d => d.name === "ContactType") || {}).items || ["Individual", "Company", "Trust", "Partnership"];
  const investorTypeOpts = (DIMENSIONS.find(d => d.name === "InvestorType") || {}).items || ["Fixed", "Equity", "Both"];
  const [chip, setChip] = useState("All");
  const [modal, setModal] = useState({ open: false, mode: "add", data: {} });
  const [delT, setDelT] = useState(null);
  const nextContactId = (() => {
    if (CONTACTS.length === 0) return "M10001";
    const maxNum = Math.max(...CONTACTS.map(p => { const m = String(p.id).match(/^M(\d+)$/); return m ? Number(m[1]) : 0; }));
    return "M" + (maxNum + 1);
  })();
  const openAdd = () => setModal({ open: true, mode: "add", data: { id: nextContactId, first_name: "", last_name: "", type: "Individual", role: "Investor", email: "" } });
  const openEdit = r => {
    let fn = r.first_name || "";
    let ln = r.last_name || "";
    if (!fn && !ln && r.name) {
      const parts = r.name.trim().split(/\s+/);
      if (parts.length > 1) {
        ln = parts.pop();
        fn = parts.join(" ");
      } else {
        fn = parts[0] || "";
      }
    }
    setModal({ open: true, mode: "edit", data: { ...r, first_name: fn, last_name: ln } });
  };
  const close = () => setModal(m => ({ ...m, open: false }));
  const setF = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));
  const handleSaveContact = async () => {
    const d = modal.data;
    const payload = {
      party_name: `${d.first_name || ""} ${d.last_name || ""}`.trim() || d.name || "",
      first_name: d.first_name || "",
      last_name: d.last_name || "",
      party_type: d.type || "",
      role_type: d.role || "",
      investor_type: d.investor_type || "",
      email: d.email || "",
      phone: d.phone || "",
      address: d.address || "",
      tax_id: d.tax_id || "",
      bank_information: d.bank_information || "",
      updated_at: serverTimestamp(),
    };
    try {
      if (modal.mode === "edit" && d.docId) {
        await updateDoc(doc(db, collectionPath, d.docId), payload);
      } else {
        await setDoc(doc(db, collectionPath, d.id), { ...payload, created_at: serverTimestamp() });
      }
    } catch (err) { console.error("Save contact error:", err); }
    close();
  };

  const handleDeleteContact = async () => {
    if (!delT || !delT.docId) return;
    try {
      await deleteDoc(doc(db, collectionPath, delT.docId));
      setDelT(null);
    } catch (err) { console.error("Delete contact error:", err); }
  };
  const [detailContact, setDetailContact] = useState(null);
  const [invitingId, setInvitingId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [inviteConfirm, setInviteConfirm] = useState(null);
  const handleInviteContact = (party) => {
    if (!party.email) {
      alert("This contact has no email address. Please add a valid email first.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(party.email)) {
      alert("The email address provided is not in a valid format. Please correct it first.");
      return;
    }
    setInviteConfirm(party);
  };
  const executeInvite = async () => {
    const party = inviteConfirm;
    setInviteConfirm(null);
    if (!party) return;
    setProcessing(true);
    setInvitingId(party.id);
    try {
      const inviteUserFn = httpsCallable(functions, "inviteUser");
      const result = await inviteUserFn({
        email: party.email,
        role: "R10001",
        tenantId: tenantId || "",
        user_name: party.name || "",
        phone: party.phone || "",
        partyId: party.id || "",
        notes: `Invited from Contacts page — ${party.id}`,
      });
      setInviteResult({ email: party.email, user_id: result.data.user_id, link: result.data.link });
    } catch (err) {
      console.error("Invite contact error:", err);
      alert("Invite failed: " + (err.message || "Unknown error"));
    } finally {
      setInvitingId(null);
      setProcessing(false);
    }
  };
  const chips = ["All", "Investors", "Borrowers", "Companies"];
  const [pageSize, setPageSize] = useState(30);
  const [sel, setSel] = useState(new Set());
  const gridRef = useRef(null);

  // Dynamically calculate page size based on available vertical space
  useEffect(() => {
    const calculatePageSize = () => {
      const viewportHeight = window.innerHeight;

      // Table container matches: calc(100vh - 480px)
      const gridContainerHeight = viewportHeight - 480;
      const availableForRows = gridContainerHeight - 90; // Header + Footer + padding
      const calculatedRows = Math.floor(availableForRows / 40); // 40px estimated row height

      const newPageSize = Math.max(20, calculatedRows); 
      setPageSize(newPageSize);
    };

    // Initial calculation with a slight delay to ensure layout is settled
    const timer = setTimeout(calculatePageSize, 100);

    calculatePageSize();
    window.addEventListener('resize', calculatePageSize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculatePageSize);
    };
  }, []);


  // TanStack Table: Data filtering (memoized)
  const filteredData = useMemo(() => {
    return CONTACTS.filter(p => {
      if (chip === "Investors" && p.role !== "Investor") return false;
      if (chip === "Borrowers" && p.role !== "Borrower") return false;
      if (chip === "Companies" && p.type !== "Company") return false;
      return true;
    });
  }, [CONTACTS, chip]);

  // TanStack Table: Column definitions
  const permissions = { canUpdate, canDelete, canInvite };
  
  const columnContext = useMemo(() => ({
    isDark,
    t,
    permissions,
    callbacks: {
      onEdit: openEdit,
      onDelete: (target) => setDelT(target),
      onInvite: handleInviteContact,
      onNameClick: (party) => setDetailContact(party)
    },
    invitingId
  }), [isDark, t, permissions, invitingId]);

  const columnDefs = useMemo(() => {
    return getContactColumns(permissions, isDark, t, columnContext);
  }, [permissions, isDark, t, columnContext]);

  return (<>
    {/* Full-screen Loading Overlay (Freeze) */}
    {processing && (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <div style={{ width: 44, height: 44, border: "3px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 16 }} />
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.5px" }}>Inviting Member...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )}

    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><div><h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Contacts</h1><p style={{ fontSize: 13.5, color: t.textMuted }}>Manage Investors, Borrowers, and Companies</p></div>
      {canCreate && <Tooltip text="Add a new investor or borrower" t={t}><button className="primary-btn" onClick={openAdd} style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Contact</button></Tooltip>}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
      {[{ label: "Total Contacts", value: CONTACTS.length, accent: isDark ? "#60A5FA" : "#3B82F6", bg: isDark ? "rgba(96,165,250,0.08)" : "#EFF6FF", border: isDark ? "rgba(96,165,250,0.15)" : "#BFDBFE" }, { label: "Investors", value: CONTACTS.filter(p => p.role === "Investor").length, accent: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52,211,153,0.08)" : "#ECFDF5", border: isDark ? "rgba(52,211,153,0.15)" : "#A7F3D0" }, { label: "Borrowers", value: CONTACTS.filter(p => p.role === "Borrower").length, accent: isDark ? "#FB923C" : "#C2410C", bg: isDark ? "rgba(251,146,60,0.08)" : "#FFF7ED", border: isDark ? "rgba(251,146,60,0.15)" : "#FED7AA" }, { label: "Companies", value: CONTACTS.filter(p => p.type === "Company").length, accent: isDark ? "#A78BFA" : "#7C3AED", bg: isDark ? "rgba(167,139,250,0.08)" : "#F5F3FF", border: isDark ? "rgba(167,139,250,0.15)" : "#DDD6FE" }].map(s => <StatCard key={s.label} {...s} titleFont={t.titleFont} isDark={isDark} />)}
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>{chips.map((c, i) => { const isA = chip === c; return (<span key={c} className="filter-chip" onClick={() => setChip(c)} style={{ fontSize: 12, fontWeight: isA ? 600 : 500, padding: "5px 14px", borderRadius: 20, background: isA ? t.accent : t.chipBg, color: isA ? "#fff" : t.textSecondary, border: `1px solid ${isA ? t.accent : t.chipBorder}`, cursor: "pointer" }}>{c}</span>); })}</div>
    </div>
    <div style={{ height: 'calc(100vh - 480px)', width: '100%', minHeight: '500px' }}>
      <TanStackTable
        ref={gridRef}
        data={filteredData}
        columns={columnDefs}
        isDark={isDark}
        t={t}
        pageSize={pageSize}
        onSelectionChange={(selected) => setSel(new Set(selected.map(r => r.id)))}
      />
    </div>
    <Modal open={modal.open} onClose={close} title={modal.mode === "add" ? "New Contact" : "Edit Contact"} onSave={handleSaveContact} width={600} t={t} isDark={isDark}>
      <FF label="Contact ID" t={t}>
        <div style={{ fontFamily: t.mono, fontSize: 13, color: t.idText, background: isDark ? "rgba(255,255,255,0.04)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 13px", letterSpacing: "0.5px" }}>{modal.data.id}</div>
      </FF>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="First Name" t={t}><FIn value={modal.data.first_name || ""} onChange={e => setF("first_name", e.target.value)} placeholder="e.g. Pao Fu" t={t} /></FF>
        <FF label="Last Name" t={t}><FIn value={modal.data.last_name || ""} onChange={e => setF("last_name", e.target.value)} placeholder="e.g. Chen" t={t} /></FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Contact Type" t={t}><FSel value={modal.data.type || "Individual"} onChange={e => setF("type", e.target.value)} options={partyTypeOpts} t={t} /></FF>
        <FF label="Role" t={t}><FSel value={modal.data.role || "Investor"} onChange={e => setF("role", e.target.value)} options={roleOpts} t={t} /></FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Investor Type" t={t}><FSel value={modal.data.investor_type || "Fixed"} onChange={e => setF("investor_type", e.target.value)} options={investorTypeOpts} t={t} /></FF>
        <FF label="Tax ID" t={t}><FIn value={modal.data.tax_id || ""} onChange={e => setF("tax_id", e.target.value)} placeholder="e.g. 123-45-6789" t={t} /></FF>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FF label="Email" t={t}><FIn value={modal.data.email || ""} onChange={e => setF("email", e.target.value)} placeholder="email@example.com" t={t} type="email" /></FF>
        <FF label="Phone" t={t}><FIn value={modal.data.phone || ""} onChange={e => setF("phone", e.target.value)} placeholder="e.g. 212-411-4566" t={t} /></FF>
      </div>
      <FF label="Address" t={t}><FIn value={modal.data.address || ""} onChange={e => setF("address", e.target.value)} placeholder="Full address" t={t} /></FF>
      <FF label="Bank Information" t={t}><FIn value={modal.data.bank_information || ""} onChange={e => setF("bank_information", e.target.value)} placeholder="e.g. Citibank" t={t} /></FF>
    </Modal>
    <DelModal target={delT} onClose={() => setDelT(null)} onConfirm={handleDeleteContact} label="This contact" t={t} isDark={isDark} />
    <Modal open={!!inviteConfirm} onClose={() => setInviteConfirm(null)} title="Invite as Member" onSave={executeInvite} saveLabel="Invite" t={t} isDark={isDark}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", textAlign: "center", padding: "8px 0" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: isDark ? "rgba(96,165,250,0.15)" : "#EFF6FF", border: `1px solid ${isDark ? "rgba(96,165,250,0.25)" : "#BFDBFE"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: isDark ? "#60A5FA" : "#2563EB" }}>✉️</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: isDark ? "#fff" : "#1C1917", marginBottom: 8 }}>Invite {inviteConfirm?.name}?</div>
          <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.7 }}>{inviteConfirm?.email} will be invited as a Member (R10001).</div>
        </div>
      </div>
    </Modal>
    {detailContact && (() => {
      const dp = detailContact;
      const dpId = String(dp.id || "").trim();
      const dpDocId = String(dp.docId || "").trim();
      const partyInvestments = INVESTMENTS.filter(c => {
        const cPId = String(c.party_id || "").trim();
        return (cPId === dpId || (dpDocId && cPId === dpDocId));
      });
      const partySchedules = SCHEDULES.filter(s => {
        const sPId = String(s.party_id || "").trim();
        const isMatched = sPId === dpId || (dpDocId && sPId === dpDocId);
        return isMatched || partyInvestments.some(c => c.id === s.investment);
      }).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
      const totalValue = partyInvestments.reduce((sum, c) => sum + Number(String(c.amount || 0).replace(/[^0-9.-]/g, '')), 0);
      return (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 18, padding: 0, maxWidth: 720, width: "92%", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.3)", border: `1px solid ${t.surfaceBorder}` }}>
            {/* Header */}
            <div style={{ padding: "22px 28px", borderBottom: `1px solid ${t.surfaceBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {(() => { const a2 = av(dp.name, isDark); return <div style={{ width: 42, height: 42, borderRadius: 12, background: a2.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: a2.c, border: `1px solid ${a2.c}22` }}>{initials(dp.name)}</div>; })()}
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: isDark ? "#fff" : "#1C1917" }}>{dp.name}</div>
                  <div style={{ fontSize: 12, color: t.textMuted, display: "flex", gap: 10, marginTop: 2 }}>
                    <span style={{ fontFamily: t.mono }}>{dp.id}</span>
                    <span><Bdg status={dp.role} isDark={isDark} /></span>
                  </div>
                </div>
              </div>
              <button onClick={() => setDetailContact(null)} style={{ width: 32, height: 32, borderRadius: 8, background: isDark ? "rgba(255,255,255,0.08)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, cursor: "pointer", color: t.textMuted }}>×</button>
            </div>
            {/* Body */}
            <div style={{ flex: 1, overflow: "auto", padding: "20px 28px" }}>
              {/* Investments grouped by project */}
              {(() => {
                const investmentsByProject = {};
                partyInvestments.forEach(c => {
                  const key = c.project || "Unassigned";
                  (investmentsByProject[key] = investmentsByProject[key] || []).push(c);
                });
                const projectNames = Object.keys(investmentsByProject);
                return (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Investments ({partyInvestments.length})</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: t.accent }}>{fmtCurr(totalValue)}</span>
                    </div>
                    {partyInvestments.length === 0 && <div style={{ fontSize: 12, color: t.textMuted, padding: "12px 0" }}>No investments</div>}
                    {projectNames.map(projName => (
                      <div key={projName} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: t.accent, marginBottom: 6, padding: "4px 0", borderBottom: `1px solid ${t.surfaceBorder}` }}>{projName}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {investmentsByProject[projName].map(c => {
                            const [bg, color, brd] = badge(c.status, isDark);
                            return (
                              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB", border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6"}` }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                    <span style={{ fontFamily: t.mono, fontSize: 12, fontWeight: 600, color: isDark ? "#fff" : "#1C1917" }}>{c.id}</span>
                                    <Bdg status={c.status} isDark={isDark} />
                                  </div>
                                  <div style={{ fontSize: 11, color: t.textMuted }}>{c.type || "—"} · {c.rate || "—"} · {c.freq || "—"} · {c.start_date || "—"} ~ {c.maturity_date || "—"}</div>
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", flexShrink: 0 }}>{c.amount}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {/* Payment Schedules grouped by project */}
              {(() => {
                const schedulesByProject = {};
                partySchedules.forEach(s => {
                  const investment = partyInvestments.find(c => c.id === s.investment);
                  const proj = DEALS.find(p => p.id === s.deal_id);
                  const key = investment?.project || proj?.name || "Unassigned";
                  (schedulesByProject[key] = schedulesByProject[key] || []).push(s);
                });
                const projectNames = Object.keys(schedulesByProject);
                return (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#fff" : "#1C1917", marginBottom: 10 }}>Payment Schedules ({partySchedules.length})</div>
                    {partySchedules.length === 0 && <div style={{ fontSize: 12, color: t.textMuted, padding: "12px 0" }}>No payment schedules</div>}
                    {projectNames.map(projName => (
                      <div key={projName} style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: t.accent, marginBottom: 6, padding: "4px 0", borderBottom: `1px solid ${t.surfaceBorder}` }}>{projName}</div>
                        <div style={{ borderRadius: 12, border: `1px solid ${t.surfaceBorder}`, overflow: "hidden" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#FAFAFA" }}>
                              <tr>
                                <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: t.textMuted }}>INVESTMENT</th>
                                <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: t.textMuted }}>DUE DATE</th>
                                <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: t.textMuted }}>TYPE</th>
                                <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: t.textMuted }}>DIR</th>
                                <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: t.textMuted }}>AMOUNT</th>
                                <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: t.textMuted }}>STATUS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {schedulesByProject[projName].map((s, i) => {
                                const arr = schedulesByProject[projName];
                                const [sbg, sc, sbrd] = badge(s.status, isDark);
                                return (
                                  <tr key={s.schedule_id || i} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${t.surfaceBorder}` : "none" }}>
                                    <td style={{ padding: "10px 14px", fontSize: 11.5, fontFamily: t.mono, fontWeight: 500 }}>{s.investment}</td>
                                    <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: t.mono, color: t.textMuted }}>{s.dueDate}</td>
                                    <td style={{ padding: "10px 14px", fontSize: 11, color: t.textSecondary }}>{s.type}{s.fee_id ? ` · ${s.fee_id}` : ""}</td>
                                    <td style={{ padding: "10px 14px", fontSize: 10, fontWeight: 600, color: s.direction === "IN" ? "#10B981" : "#EF4444" }}>{s.direction}</td>
                                    <td style={{ padding: "10px 14px", fontSize: 11.5, fontWeight: 600 }}>{s.signed_payment_amount}</td>
                                    <td style={{ padding: "10px 14px" }}><Bdg status={s.status} isDark={isDark} /></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      );
    })()}
    {inviteResult && (
      <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: isDark ? "#1C1917" : "#fff", borderRadius: 16, padding: 28, maxWidth: 540, width: "90%", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
          <h3 style={{ fontFamily: t.titleFont, fontSize: 18, marginBottom: 8, color: isDark ? "#fff" : "#1C1917" }}>Member Invited</h3>
          <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 12, lineHeight: 1.6 }}>
            <strong>{inviteResult.email}</strong> has been invited as a Member (R10001).
          </p>
          {inviteResult.user_id && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: t.textMuted }}>User ID:</span>
              <span style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 700, color: t.accent, background: isDark ? "rgba(255,255,255,0.08)" : "#F0F9FF", padding: "3px 10px", borderRadius: 6 }}>{inviteResult.user_id}</span>
            </div>
          )}
          {inviteResult.link && (<>
            <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 6 }}>Verification link:</p>
            <div style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#F5F4F1", border: `1px solid ${t.surfaceBorder}`, borderRadius: 9, padding: "10px 14px", fontFamily: t.mono, fontSize: 12, wordBreak: "break-all", color: t.accent, marginBottom: 16 }}>{inviteResult.link}</div>
          </>)}
          <div style={{ display: "flex", gap: 10 }}>
            {inviteResult.link && <button onClick={() => navigator.clipboard.writeText(inviteResult.link)} style={{ flex: 1, background: t.accentGrad, color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Copy Link</button>}
            <button onClick={() => setInviteResult(null)} style={{ flex: 1, background: isDark ? "rgba(255,255,255,0.08)" : "#F5F4F1", color: t.text, border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 18px", fontSize: 13.5, cursor: "pointer" }}>Close</button>
          </div>
        </div>
      </div>
    )}
  </>);
}
