import { useState, useMemo } from "react";


const REPORT_CONFIG = {
  "CASHFLOW - Full Schedule": "https://lookerstudio.google.com/embed/reporting/4252f725-57ca-40e1-b714-8c8605789cf1/page/puArF",
  "CASHFLOW - Due in 3 Months": "https://lookerstudio.google.com/embed/reporting/d0c73e5a-6fa4-4234-86fa-e6d6f5696b46/page/puArF",
  "CASHFLOW - Past Due 3 Months": "https://lookerstudio.google.com/embed/reporting/b47b0999-1766-4ebd-8df1-bf704815b3d2/page/puArF",
  "CASHFLOW - Party View": "https://lookerstudio.google.com/embed/reporting/48f62f94-c189-4844-a4c6-6e5d490d656d/page/puArF"
};

export default function PageReports({ t, isDark, activeTenantId = "" }) {
  const [tab, setTab] = useState("CASHFLOW - Full Schedule");

  // Construct dynamic Looker URL with tenant filtering
  const lookerUrl = useMemo(() => {
    const activeBaseUrl = REPORT_CONFIG[tab] || REPORT_CONFIG["CASHFLOW - Full Schedule"];
    console.log(`PageReports: Loading tab "${tab}" with tenant ${activeTenantId}`);

    if (!activeTenantId || activeTenantId === "GLOBAL") return activeBaseUrl;

    // Generate parameters for tenant filtering
    const params = {
      "selected_tenant_id": activeTenantId,
      ...Object.fromEntries(
        Array.from({ length: 21 }, (_, i) => [`ds${i}.selected_tenant_id`, activeTenantId])
      )
    };
    return `${activeBaseUrl}?params=${encodeURIComponent(JSON.stringify(params))}`;
  }, [activeTenantId, tab]);



  return (<>
    <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><div><h1 style={{ fontFamily: t.titleFont, fontWeight: t.titleWeight, fontSize: t.titleSize, color: isDark ? "#fff" : "#1C1917", letterSpacing: t.titleTracking, lineHeight: 1, marginBottom: 6 }}>Reports</h1><p style={{ fontSize: 13.5, color: t.textMuted }}>Analytics and financial summaries</p></div><button className="export-btn" style={{ background: t.accentGrad, color: "#fff", padding: "11px 22px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, boxShadow: `0 4px 16px ${t.accentShadow}`, border: "none", cursor: "pointer" }}>↓ Export PDF</button></div>

    <div style={{ display: "flex", gap: 4, marginBottom: 20, background: isDark ? "rgba(255,255,255,0.04)" : "#F1F0EE", padding: 4, borderRadius: 10, width: "fit-content" }}>
      {Object.keys(REPORT_CONFIG).map(tb => (
        <div
          key={tb}
          onClick={() => setTab(tb)}
          className="report-tab"
          style={{
            padding: "7px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: tab === tb ? 600 : 400,
            background: tab === tb ? (isDark ? "rgba(52,211,153,0.15)" : "#fff") : "transparent",
            color: tab === tb ? t.accent : t.textSecondary,
            border: tab === tb ? `1px solid ${isDark ? "rgba(52,211,153,0.25)" : "#E5E3DF"}` : "1px solid transparent",
            cursor: "pointer"
          }}
        >
          {tb}
        </div>
      ))}
    </div>

    <div style={{ width: "calc(100% + 72px)", marginLeft: -36, marginRight: -36 }}>
      <div style={{
        background: t.surface,
        borderRadius: 0,
        border: `1px solid ${t.surfaceBorder}`,
        padding: 0,
        height: "calc(100vh - 300px)", // Increased height since KPI boxes are gone
        minHeight: 700,
        overflowX: "scroll",
        overflowY: "hidden",
        marginBottom: 0,
        WebkitOverflowScrolling: "touch"
      }}>
        <iframe
          key={lookerUrl + tab}
          src={lookerUrl}
          scrolling="auto"
          style={{ width: "100%", height: "100%", border: "none", display: "block" }}
          allowFullScreen
          sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        />
      </div>
    </div>
  </>);
}
