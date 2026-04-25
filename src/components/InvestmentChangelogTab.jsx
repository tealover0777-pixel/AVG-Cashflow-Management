import React from "react";

export default function InvestmentChangelogTab({ t, isDark, LEDGER = [], USERS = [], currentUser = null, contact, selectedInvestmentId }) {
  // 1. Filter ledger entries: Only selected investment OR the contact profile
  const filteredLogs = LEDGER.filter(l => 
     (l.entity_id === selectedInvestmentId && selectedInvestmentId) || 
     (l.entity_id === contact?.id && contact?.id) || 
     (l.entity_id === contact?.docId && contact?.docId)
  ).sort((a, b) => {
    const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
    const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at);
    return dateB - dateA;
  });

  if (filteredLogs.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: t.textMuted }}>
        <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.2 }}>📋</div>
        <div style={{ fontSize: 15, fontWeight: 500 }}>No activity logs found</div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>Activity related to this investment or contact profile will appear here.</div>
      </div>
    );
  }

  // 2. Helper to find user name
  const getUser = (uid) => {
    if (!uid) return { first_name: "System", last_name: "", role: "System" };
    const u = USERS.find(u => u.auth_uid === uid || u.id === uid || u.user_id === uid);
    if (u) return u;
    if (currentUser?.uid === uid && currentUser?.email) {
      return { first_name: currentUser.displayName || currentUser.email, last_name: "", role: "Team member" };
    }
    return { first_name: uid, last_name: "", role: "Team member" };
  };

  // 3. Helper for relative time (simplified)
  const getRelativeTime = (dateInput) => {
    const d = dateInput?.toDate ? dateInput.toDate() : new Date(dateInput);
    const now = new Date();
    const diff = now - d;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days === 0) {
      if (hours === 0) {
        if (minutes === 0) return "Just now";
        return `${minutes}m ago`;
      }
      return `${hours}h ago`;
    }
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, padding: "10px 12px 40px 24px" }}>
      {filteredLogs.map((log, i) => {
        const user = getUser(log.user_id);
        const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || "System";
        const role = user.role || (log.user_id === "system" ? "System" : "Team member");
        const date = log.created_at?.toDate ? log.created_at.toDate() : new Date(log.created_at);
        const formattedDate = date.toLocaleString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', hour12: true 
        });
        const relative = getRelativeTime(log.created_at);

        return (
          <div key={log.id || i} style={{ position: "relative", display: "flex", gap: 24 }}>
            {/* Vertical Line */}
            {i !== filteredLogs.length - 1 && (
              <div style={{ 
                position: "absolute", left: -16, top: 22, bottom: -32,
                width: 2, background: isDark ? "rgba(255,255,255,0.06)" : "#F1F1EF" 
              }} />
            )}
            
            {/* Circle/Dot */}
            <div style={{ 
              position: "absolute", left: -21, top: 6, zIndex: 1,
              width: 12, height: 12, borderRadius: "50%", 
              background: isDark ? "#0F0F0F" : "#fff",
              border: `2.5px solid ${t.accent}`
            }} />

            {/* Content Container */}
            <div style={{ flex: 1 }}>
              {/* Header Info */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                 <div style={{ fontSize: 12, color: t.textMuted, fontWeight: 500 }}>
                    {formattedDate}
                 </div>
                 <div style={{ width: 3, height: 3, borderRadius: "50%", background: t.textMuted, opacity: 0.4 }} />
                 <div style={{ fontSize: 12, color: t.accent, fontWeight: 600 }}>
                    {relative}
                 </div>
              </div>

              {/* Note / Action */}
              <div style={{ 
                fontSize: 14, 
                fontWeight: 500, 
                color: isDark ? "#E5E7EB" : "#1C1917", 
                lineHeight: 1.6,
                marginBottom: 14,
                background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                padding: "10px 14px",
                borderRadius: 8,
                border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`
              }}>
                {log.note || log.notes || "Recorded an update"}
              </div>

              {/* User Bio Badge */}
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 8, 
                padding: "2px 2px", 
                borderRadius: 20, 
                alignSelf: "flex-start" 
              }}>
                <div style={{ fontSize: 12, color: t.textSecondary }}>
                   <span style={{ fontWeight: 600, color: isDark ? "#fff" : "#444" }}>{name}</span> 
                   <span style={{ opacity: 0.6, marginLeft: 4 }}>• {role}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
