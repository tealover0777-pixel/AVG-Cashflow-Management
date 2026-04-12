import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, listAll } from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "../AuthContext";
import { 
  ChevronLeft, Edit2, UploadCloud, Calendar, Mail, Send,
  FileEdit, Settings, Smartphone, Monitor, Paperclip, Save,
  Columns, TrendingUp, Square, Minus, Type, AlignLeft, Image as ImageIcon,
  FileText, Video, Users, Menu, Code, Table,
  Search, ChevronRight, ChevronDown, ChevronUp, X as XIcon, CheckCircle
} from "lucide-react";

export default function PageEmailBuilder({ t, isDark, setActivePage }) {
  const [activeRightTab, setActiveRightTab] = useState("Content");

  const rightTabs = [
    { id: "Content", icon: Square },
    { id: "Blocks", icon: Columns },
    { id: "Body", icon: AlignLeft },
    { id: "Images", icon: ImageIcon },
    { id: "Uploads", icon: UploadCloud },
    { id: "Audit", icon: FileText },
  ];

  const contentBlocks = [
    { label: "COLUMNS", icon: Columns },
    { label: "KPIs", icon: TrendingUp },
    { label: "BUTTON", icon: Square },
    { label: "DIVIDER", icon: Minus },
    { label: "HEADING", icon: Type },
    { label: "PARAGRAPH", icon: AlignLeft },
    { label: "IMAGE", icon: ImageIcon },
    { label: "AI SUMMARY", icon: FileText },
    { label: "VIDEO", icon: Video },
    { label: "SOCIAL", icon: Users },
    { label: "MENU", icon: Menu },
    { label: "HTML", icon: Code },
    { label: "TABLE", icon: Table },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Inter, sans-serif", background: t.background }}>
      {/* Absolute Top Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: `1px solid ${t.border}`, background: t.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button 
            onClick={() => setActivePage("Marketing emails")}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 20, padding: "4px 12px", cursor: "pointer", color: isDark ? "#60A5FA" : "#3B82F6", fontSize: 13, fontWeight: 600 }}
          >
            <ChevronLeft size={16} /> Back
          </button>
          
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600, color: t.text }}>
            New draft <Edit2 size={14} color={t.textMuted} style={{ cursor: "pointer" }} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 12, color: t.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
            <UploadCloud size={14} /> Saved
          </span>
          <button style={{ background: "transparent", border: "none", color: isDark ? "#60A5FA" : "#3B82F6", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Schedule a demo
          </button>
          <button style={{ background: isDark ? "#1E3A8A" : "#1D4ED8", color: "#fff", border: "none", borderRadius: 4, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            Send test email <ChevronDownIcon size={14} />
          </button>
          <button style={{ background: isDark ? "#1E3A8A" : "#1D4ED8", color: "#fff", border: "none", borderRadius: 4, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            Send <ChevronDownIcon size={14} />
          </button>
        </div>
      </div>

      {/* Sub Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 24px", borderBottom: `1px solid ${t.border}`, background: t.surface }}>
        <div style={{ display: "flex", gap: 24, paddingLeft: "50%", transform: "translateX(-50%)" }}>
          <TabButton icon={<FileEdit size={14} />} label="Edit" active t={t} isDark={isDark} />
          <TabButton icon={<Settings size={14} />} label="Settings" t={t} isDark={isDark} />
          <TabButton icon={<Smartphone size={14} />} label="Mobile review" t={t} isDark={isDark} />
          <TabButton icon={<Monitor size={14} />} label="Desktop review" t={t} isDark={isDark} />
        </div>
        
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${isDark ? "#3B82F6" : "#2563EB"}`, color: isDark ? "#60A5FA" : "#2563EB", borderRadius: 4, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Add attachment <span style={{ background: isDark ? "#3B82F6" : "#2563EB", color: "#fff", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>0</span>
          </button>
          <button style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${isDark ? "#3B82F6" : "#2563EB"}`, color: isDark ? "#60A5FA" : "#2563EB", borderRadius: 4, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <Save size={14} /> Save as new template
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        
        {/* Canvas Area */}
        <div style={{ flex: 1, background: isDark ? "#111" : "#F8FAFC", display: "flex", flexDirection: "column", alignItems: "center", padding: 40, overflowY: "auto" }}>
          
          {/* Drop Zone Box */}
          <div style={{ 
            width: "100%", maxWidth: 600,
            background: isDark ? "rgba(59,130,246,0.05)" : "#EFF6FF",
            border: `1px dashed ${isDark ? "#3B82F6" : "#93C5FD"}`,
            padding: 40, textAlign: "center", borderRadius: 4,
            color: isDark ? "#60A5FA" : "#2563EB", fontSize: 13, fontWeight: 500
          }}>
            No content here. Drag content from right.
          </div>
          
          <div style={{ marginTop: 24, fontSize: 12, color: t.textMuted }}>
            Don't want to receive this type of email? <a href="#" style={{ color: isDark ? "#60A5FA" : "#2563EB", textDecoration: "none" }}>Unsubscribe</a>
          </div>

        </div>

        {/* Right Sidebar - Tools */}
        <div style={{ width: 380, background: t.surface, borderLeft: `1px solid ${t.border}`, display: "flex" }}>
          
          {/* Tools Grid */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
             {activeRightTab === "Content" && <ContentTab t={t} isDark={isDark} contentBlocks={contentBlocks} />}
             {activeRightTab === "Blocks" && <BlocksTab t={t} isDark={isDark} />}
             {activeRightTab === "Body" && <BodyTab t={t} isDark={isDark} />}
             {activeRightTab === "Images" && <ImagesTab t={t} isDark={isDark} />}
             {activeRightTab === "Uploads" && <UploadsTab t={t} isDark={isDark} />}
             {activeRightTab === "Audit" && (
                <div style={{ padding: 16, textAlign: "center", color: t.textMuted, fontSize: 13, marginTop: 40 }}>
                   <FileText size={32} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
                   No audits found. Your email looks great!
                </div>
             )}
          </div>

          {/* Far Right Tabs */}
          <div style={{ width: 64, borderLeft: `1px solid ${t.border}`, display: "flex", flexDirection: "column", background: isDark ? "#111" : "#FAFAFA" }}>
            {rightTabs.map(rtab => {
              const active = activeRightTab === rtab.id;
              return (
                <div 
                  key={rtab.id}
                  onClick={() => setActiveRightTab(rtab.id)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "16px 0", cursor: "pointer",
                    background: active ? t.surface : "transparent",
                    borderLeft: active ? `3px solid ${isDark ? "#60A5FA" : "#3B82F6"}` : "3px solid transparent",
                    color: active ? (isDark ? "#60A5FA" : "#3B82F6") : t.textMuted
                  }}
                >
                  <div style={{ position: "relative" }}>
                     <rtab.icon size={20} strokeWidth={1.5} />
                     {rtab.id === "Audit" && (
                       <span style={{ position: "absolute", top: -6, right: -8, background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 700, width: 14, height: 14, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>2</span>
                     )}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: active ? 600 : 500 }}>{rtab.id}</span>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
}

// Small helper for down-chevron in buttons
function ChevronDownIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6"/>
    </svg>
  );
}

// Helper for top sub-toolbar tabs
function TabButton({ icon, label, active, t, isDark }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      color: active ? (isDark ? "#60A5FA" : "#2563EB") : t.textMuted,
      fontSize: 13, fontWeight: active ? 600 : 500, cursor: "pointer",
      borderBottom: active ? `2px solid ${isDark ? "#60A5FA" : "#2563EB"}` : "2px solid transparent",
      paddingBottom: 4,
      transform: "translateY(2px)" // Align with border perfectly
    }}>
      {icon}
      {label}
    </div>
  );
}

function ContentTab({ t, isDark, contentBlocks }) {
  return (
    <div style={{ padding: 16 }}>
       <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {contentBlocks.map((block) => (
            <div key={block.label} style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
              background: isDark ? "#1F2937" : "#fff", border: `1px solid ${t.border}`, borderRadius: 4,
              padding: "16px 8px", cursor: "grab", color: t.text,
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              transition: "border-color 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = isDark ? "#60A5FA" : "#3B82F6"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = t.border}
            >
              <block.icon size={24} strokeWidth={1.5} color={t.textMuted} />
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>{block.label}</span>
            </div>
          ))}
       </div>
    </div>
  );
}

function BlocksTab({ t, isDark }) {
  return (
    <div>
       <div style={{ padding: "16px", borderBottom: `1px solid ${t.border}` }}>
         <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px 0", color: t.text }}>Blocks</h3>
         <div style={{ position: "relative" }}>
           <Search size={16} color={t.textMuted} style={{ position: "absolute", left: 12, top: 10 }} />
           <input placeholder="Search" style={{ width: "100%", padding: "10px 10px 10px 36px", border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, color: t.text }} />
         </div>
       </div>

       <div style={{ padding: 16 }}>
         <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
              <span style={{ fontSize: 14, color: t.text, fontWeight: 500 }}>Blank</span>
              <span style={{ fontSize: 12, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center" }}>All <ChevronRight size={14} /></span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ height: 60, border: `1px solid ${t.border}`, background: isDark ? "#333" : "#F3F4F6", borderRadius: 2 }}></div>
              <div style={{ display: "flex", gap: 8, height: 60 }}>
                <div style={{ flex: 1, border: `1px solid ${t.border}`, background: isDark ? "#333" : "#F3F4F6", borderRadius: 2 }}></div>
                <div style={{ flex: 1, border: `1px solid ${t.border}`, background: isDark ? "#333" : "#F3F4F6", borderRadius: 2 }}></div>
              </div>
            </div>
         </div>

         <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
              <span style={{ fontSize: 14, color: t.text, fontWeight: 500 }}>AVG Overview</span>
              <span style={{ fontSize: 12, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center" }}>All <ChevronRight size={14} /></span>
            </div>
            <div style={{ height: 120, background: "#555", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexDirection: "column" }}>
               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", width: "100%", textAlign: "center", padding: "0 10px" }}>
                  <div><div style={{ fontSize: 18, fontWeight: "bold" }}>10+</div><div style={{ fontSize: 7 }}>years of consistent outperformance</div></div>
                  <div><div style={{ fontSize: 18, fontWeight: "bold" }}>$250 M+</div><div style={{ fontSize: 7 }}>Assets Under Managed</div></div>
                  <div><div style={{ fontSize: 18, fontWeight: "bold" }}>300+</div><div style={{ fontSize: 7 }}>Trusted by investors</div></div>
                  <div><div style={{ fontSize: 18, fontWeight: "bold" }}>100+</div><div style={{ fontSize: 7 }}>Properties Managed</div></div>
               </div>
            </div>
         </div>
       </div>
    </div>
  );
}

function BodyTab({ t, isDark }) {
  const [openSections, setOpenSections] = React.useState({ general: true, emailSettings: true, links: true, accessibility: true });
  
  const toggle = (sec) => setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  
  const AccordionHeader = ({ id, label }) => (
    <div onClick={() => toggle(id)} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", cursor: "pointer", background: isDark ? "#1F2937" : "#F9FAFB", borderBottom: `1px solid ${t.border}` }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{label}</span>
      {openSections[id] ? <ChevronUp size={16} color={t.textMuted} /> : <ChevronDownIcon size={16} />}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <AccordionHeader id="general" label="General" />
      {openSections.general && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <span style={{ fontSize: 12, color: t.text }}>Text Color</span>
             <div style={{ width: 24, height: 24, background: "#000", border: `1px solid ${t.border}`, borderRadius: 4 }}></div>
           </div>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <span style={{ fontSize: 12, color: t.text }}>Background Color</span>
             <div style={{ width: 24, height: 24, background: "#fff", border: `1px solid ${t.border}`, borderRadius: 4, position: "relative" }}>
               <div style={{ position: "absolute", top: -6, right: -6, background: "#666", borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <XIcon size={10} color="#fff" />
               </div>
             </div>
           </div>
           
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <span style={{ fontSize: 12, color: t.text }}>Content Width</span>
             <div style={{ display: "flex", border: `1px solid ${t.border}`, borderRadius: 4, overflow: "hidden" }}>
                <input type="text" value="600" readOnly style={{ width: 44, padding: "6px", textAlign: "center", border: "none", borderRight: `1px solid ${t.border}`, background: t.surface, color: t.text, fontSize: 12 }} />
                <div style={{ width: 30, padding: "6px", textAlign: "center", background: isDark ? "#1F2937" : "#F3F4F6", borderRight: `1px solid ${t.border}`, fontSize: 12, color: t.textMuted }}>px</div>
                <button style={{ width: 30, background: t.surface, border: "none", borderRight: `1px solid ${t.border}`, cursor: "pointer", color: t.textMuted }}>-</button>
                <button style={{ width: 30, background: t.surface, border: "none", cursor: "pointer", color: t.textMuted }}>+</button>
             </div>
           </div>

           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <span style={{ fontSize: 12, color: t.text }}>Content Alignment</span>
             <div style={{ display: "flex", border: `1px solid ${t.border}`, borderRadius: 4, overflow: "hidden" }}>
                <button style={{ padding: "6px 12px", background: t.surface, border: "none", borderRight: `1px solid ${t.border}`, cursor: "pointer", color: t.textMuted }}><AlignLeft size={14} /></button>
                <button style={{ padding: "6px 12px", background: isDark ? "#60A5FA" : "#1F2937", border: "none", cursor: "pointer", color: "#fff" }}><Menu size={14} /></button>
             </div>
           </div>

           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <span style={{ fontSize: 12, color: t.text }}>Font Family</span>
             <div style={{ display: "flex", alignItems: "center", padding: "6px 12px", border: `1px solid ${t.border}`, borderRadius: 4, fontSize: 12, gap: 8, cursor: "pointer", color: t.text }}>
                Montserrat <ChevronDownIcon size={14} />
             </div>
           </div>

           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <span style={{ fontSize: 12, color: t.text }}>Font Weight</span>
             <div style={{ display: "flex", alignItems: "center", padding: "6px 12px", border: `1px solid ${t.border}`, borderRadius: 4, fontSize: 12, gap: 8, cursor: "pointer", color: t.text }}>
                Regular <ChevronDownIcon size={14} />
             </div>
           </div>
        </div>
      )}
      
      <AccordionHeader id="emailSettings" label="Email Settings" />
      {openSections.emailSettings && (
        <div style={{ padding: 16 }}>
           <span style={{ fontSize: 12, color: t.text, display: "block", marginBottom: 8 }}>Preheader Text</span>
           <input type="text" style={{ width: "100%", padding: 8, border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, color: t.text, marginBottom: 8 }} />
           <p style={{ margin: 0, fontSize: 10, color: t.textMuted }}>A preheader is the short summary text that follows the subject line when viewing an email from the inbox.</p>
        </div>
      )}

      <AccordionHeader id="links" label="Links" />
      {openSections.links && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <span style={{ fontSize: 12, color: t.text }}>Color</span>
             <div style={{ width: 24, height: 24, background: "#0000FF", border: `1px solid ${t.border}`, borderRadius: 4 }}></div>
           </div>
           
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <span style={{ fontSize: 12, color: t.text }}>Underline</span>
             <div style={{ width: 36, height: 20, background: isDark ? "#60A5FA" : "#1F2937", borderRadius: 10, position: "relative", cursor: "pointer" }}>
               <div style={{ position: "absolute", right: 2, top: 2, width: 16, height: 16, background: "#fff", borderRadius: "50%" }}></div>
               <CheckCircle size={12} color={isDark ? "#1F2937" : "#fff"} style={{ position: "absolute", left: 4, top: 4 }} />
             </div>
           </div>
        </div>
      )}

      <AccordionHeader id="accessibility" label="Accessibility" />
      {openSections.accessibility && (
        <div style={{ padding: 16 }}>
           <span style={{ fontSize: 12, color: t.text, display: "block", marginBottom: 8 }}>HTML Title</span>
           <input type="text" style={{ width: "100%", padding: 8, border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, color: t.text, marginBottom: 8 }} />
           <p style={{ margin: 0, fontSize: 10, color: t.textMuted }}>Sets the HTML &lt;title&gt; tag in the exported HTML.</p>
        </div>
      )}
    </div>
  );
}

function ImagesTab({ t }) {
  const { user, profile, isSuperAdmin, isGlobalRole, isR10010 } = useAuth();
  const rawRole = (profile?.role || "").toLowerCase();
  const isAdmin = isSuperAdmin || isGlobalRole || isR10010 || 
                  ["super admin", "platform admin", "r10009", "r10010"].includes(rawRole) || 
                  rawRole.includes("admin") ||
                  user?.email?.toLowerCase() === "kyuahn@yahoo.com";

  const [query, setQuery] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchKey = async () => {
      try {
        const docRef = doc(db, "system", "integrations");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().unsplash_api_key) {
          setApiKey(docSnap.data().unsplash_api_key);
        } else if (isAdmin) {
          setShowKeyInput(true);
        }
      } catch (err) {
        console.error("Error fetching Unsplash API Key:", err);
      }
    };
    fetchKey();
  }, [isAdmin]);

  const searchImages = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    if (!apiKey) {
      if (isAdmin) setShowKeyInput(true);
      else setError("Unsplash integration is not configured. Please contact a Platform Administrator.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://api.unsplash.com/search/photos?page=1&per_page=20&query=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Client-ID ${apiKey}`
        }
      });
      
      if (res.status === 401) {
        setError("Invalid API Key. Please check your Access Key.");
        if (isAdmin) setShowKeyInput(true);
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error("Failed to fetch images");

      const data = await res.json();
      setImages(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async () => {
    try {
      await setDoc(doc(db, "system", "integrations"), { unsplash_api_key: apiKey }, { merge: true });
      setShowKeyInput(false);
      setError(null);
      if (query.trim()) searchImages();
    } catch (err) {
      console.error("Error saving API key", err);
      setError("Failed to save API key.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "16px", borderBottom: `1px solid ${t.border}` }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px 0", color: t.text }}>Images</h3>
        
        <form onSubmit={searchImages} style={{ position: "relative", marginBottom: 12 }}>
           <Search size={16} color={t.textMuted} style={{ position: "absolute", left: 12, top: 10 }} />
           <input 
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             placeholder="Search Unsplash..." 
             style={{ width: "100%", padding: "10px 10px 10px 36px", border: `1px solid ${t.border}`, borderRadius: 4, background: t.surface, color: t.text }} 
           />
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: 10, color: t.textMuted, margin: 0, lineHeight: 1.4 }}>
            Powered by Unsplash.
          </p>
          {isAdmin && (
            <button 
              onClick={() => setShowKeyInput(!showKeyInput)}
              style={{ background: "none", border: "none", color: "#3A86FF", fontSize: 10, cursor: "pointer" }}
            >
              {showKeyInput ? "Hide Settings" : "Settings"}
            </button>
          )}
        </div>
      </div>
      
      <div style={{ padding: 16, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        
        {showKeyInput && isAdmin && (
          <div style={{ padding: 16, background: t.surface, borderRadius: 4, border: `1px solid ${t.border}` }}>
            <h4 style={{ margin: "0 0 8px", fontSize: 13, color: t.text }}>Unsplash Setup <span style={{ fontSize: 10, color: t.textMuted, fontWeight: 400, marginLeft: 4 }}>(Platform-wide Integration)</span></h4>
            <p style={{ margin: "0 0 12px", fontSize: 11, color: t.textMuted }}>
              To search millions of images, you need a free Unsplash Access Key. Create an app on the <a href="https://unsplash.com/developers" target="_blank" rel="noreferrer" style={{ color: "#3A86FF", textDecoration: "none" }}>Unsplash Developer</a> portal.
            </p>
            <input 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste Access Key here" 
              style={{ width: "100%", padding: "8px", border: `1px solid ${t.border}`, borderRadius: 4, background: t.background, color: t.text, marginBottom: 8, fontSize: 12 }} 
            />
            {error && <p style={{ color: "#EF4444", fontSize: 11, margin: "0 0 8px" }}>{error}</p>}
            <button 
              onClick={saveApiKey}
              style={{ width: "100%", background: "#3A86FF", color: "#fff", border: "none", padding: "8px", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              Save Key
            </button>
          </div>
        )}

        {apiKey === "" && !isAdmin && (
          <div style={{ textAlign: "center", padding: "32px 16px", color: t.textMuted, fontSize: 12, background: t.surface, borderRadius: 4, border: `1px dashed ${t.border}` }}>
            Unsplash integration is not configured. Please contact a Platform Administrator to set it up.
          </div>
        )}

        {!showKeyInput && images.length === 0 && !loading && (
          <div style={{ gridColumn: "1 / -1", background: "#06D6A0", borderRadius: 4, padding: 16, color: "#fff", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
             <h4 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Let <span style={{ color: "#E0F2FE" }}>AI</span> Create Images</h4>
             <p style={{ margin: "0 0 16px", fontSize: 12, opacity: 0.9, lineHeight: 1.4 }}>If you can't find what you need by searching, AI can create it.</p>
             <button style={{ background: "#059669", border: "none", color: "#fff", padding: "8px 16px", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>See the Magic</button>
          </div>
        )}

        {loading && <div style={{ textAlign: "center", padding: "32px 0", color: t.textMuted, fontSize: 12 }}>Loading images...</div>}

        {!loading && images.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignContent: "flex-start" }}>
            {images.map(img => (
              <div 
                key={img.id} 
                style={{ 
                  height: 120, 
                  borderRadius: 4, 
                  backgroundImage: `url(${img.urls.small})`, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center',
                  cursor: "pointer",
                  border: `1px solid ${t.border}`
                }}
                title={img.alt_description}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

function UploadsTab({ t, isDark }) {
  const [uploads, setUploads] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    try {
      const listRef = ref(storage, 'marketing_uploads');
      const res = await listAll(listRef);
      // Fetch latest uploads first
      const itemRefs = res.items.reverse();
      const urlPromises = itemRefs.map(itemRef => getDownloadURL(itemRef));
      const urls = await Promise.all(urlPromises);
      setUploads(urls);
    } catch (error) {
      console.error("Error fetching uploads:", error);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const uploadFile = async (file) => {
    if (!file) return;
    setIsUploading(true);
    const storageRef = ref(storage, `marketing_uploads/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Error uploading:", error);
        setIsUploading(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setUploads(prev => [downloadURL, ...prev]);
          setIsUploading(false);
          setUploadProgress(0);
        });
      }
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "16px", borderBottom: `1px solid ${t.border}` }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px 0", color: t.text }}>Uploads</h3>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*"
          onChange={handleFileSelect} 
        />

        <button 
          onClick={() => fileInputRef.current.click()}
          style={{ 
            width: "100%", 
            background: isDark ? "#333" : "#222", 
            color: "#fff", 
            border: "none", 
            padding: "12px", 
            borderRadius: 4, 
            fontWeight: 600, 
            fontSize: 13, 
            marginBottom: 16, 
            cursor: isUploading ? "not-allowed" : "pointer",
            opacity: isUploading ? 0.7 : 1
          }}
          disabled={isUploading}
        >
          {isUploading ? `Uploading... ${Math.round(uploadProgress)}%` : 'Upload Image'}
        </button>
        
        <div 
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current.click()}
          style={{ 
            border: `1px dashed ${t.border}`, 
            borderRadius: 4, 
            padding: "32px 16px", 
            textAlign: "center", 
            background: t.surface,
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = "#3A86FF"}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = t.border}
        >
          <UploadCloud size={24} color={t.textMuted} style={{ margin: "0 auto 8px" }} />
          <p style={{ margin: 0, fontSize: 12, color: t.textMuted }}>Drop a new image here, or click to select files to upload.</p>
        </div>
      </div>

      <div style={{ padding: 16, flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignContent: "flex-start" }}>
         {uploads.length === 0 ? (
           <div style={{ gridColumn: "1 / -1", textAlign: "center", fontSize: 12, color: t.textMuted, padding: "32px 0" }}>
             {isUploading ? "Processing..." : "No uploads yet"}
           </div>
         ) : (
           uploads.map((url, i) => (
             <div 
               key={i} 
               style={{ 
                 height: 100, 
                 background: t.surface, 
                 borderRadius: 4, 
                 backgroundImage: `url(${url})`, 
                 backgroundSize: 'cover', 
                 backgroundPosition: 'center', 
                 border: `1px solid ${t.border}`,
                 cursor: "pointer"
               }}
             />
           ))
         )}
      </div>
    </div>
  );
}
