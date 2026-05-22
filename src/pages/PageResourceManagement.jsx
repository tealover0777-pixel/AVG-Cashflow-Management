import React, { useState, useEffect, useRef } from "react";
import { ref, uploadBytesResumable, getDownloadURL, listAll, deleteObject, getMetadata } from "firebase/storage";
import { storage } from "../firebase";
import { DelModal } from "../components";
import { 
  FileText, Image as ImageIcon, Trash2, Download, Copy, Check, 
  UploadCloud, Search, Eye, RefreshCw, FolderOpen, AlertCircle,
  FileSpreadsheet, FileArchive, FileArchive as FilePresentation, FileDown, MoreVertical,
  LayoutGrid, List
} from "lucide-react";

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0 || !bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatDate = (isoStr) => {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return d.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const isImageFile = (filename) => {
  const ext = (filename || "").split('.').pop().toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext);
};

const getDocInfo = (filename, isDark) => {
  const ext = (filename || "").split('.').pop().toLowerCase();
  if (ext === "pdf") {
    return { color: "#EF4444", bg: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2", label: "PDF Document" };
  }
  if (["doc", "docx", "pages", "txt", "gdoc", "rtf"].includes(ext)) {
    return { color: "#3B82F6", bg: isDark ? "rgba(59,130,246,0.15)" : "#DBEAFE", label: "Word Document" };
  }
  if (["xls", "xlsx", "csv", "numbers"].includes(ext)) {
    return { color: "#10B981", bg: isDark ? "rgba(16,185,129,0.15)" : "#D1FAE5", label: "Spreadsheet" };
  }
  if (["ppt", "pptx", "key"].includes(ext)) {
    return { color: "#F59E0B", bg: isDark ? "rgba(245,158,11,0.15)" : "#FEF3C7", label: "Presentation" };
  }
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext)) {
    return { color: "#8B5CF6", bg: isDark ? "rgba(139,92,246,0.15)" : "#F3E8FF", label: "Archive" };
  }
  return { color: "#6B7280", bg: isDark ? "rgba(107,114,128,0.15)" : "#F3F4F6", label: "Document" };
};

export default function PageResourceManagement({ t, isDark, activeTenantId }) {
  const effectiveTenantId = activeTenantId || "GLOBAL";
  const fileInputRef = useRef(null);

  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // all, images, documents
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, name, size
  const [viewMode, setViewMode] = useState("card"); // card, list
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  
  // Upload progress/status tracking
  const [uploadQueue, setUploadQueue] = useState([]); // Array of { name, progress, error, status: 'uploading'|'done'|'error' }
  
  // Copy URL state helper
  const [copiedUrl, setCopiedUrl] = useState(null);
  
  // Deleting state
  const [deletingItem, setDeletingItem] = useState(null);
  
  // Toast notifications
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUploads = async () => {
    setLoading(true);
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
            console.error("Error retrieving file metadata:", e);
          }
          
          // Clean up the name for display (strip timestamp prefix)
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
            timeCreated: metadata.timeCreated || "",
            contentType: metadata.contentType || "",
            isImage: isImageFile(r.name)
          };
        })
      );
      
      setUploads(list);
    } catch (err) {
      console.error("Error loading resources:", err);
      showToast("Failed to fetch custom resources.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads();
  }, [effectiveTenantId]);

  // Drag over handler
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Drag leave handler
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // File drop handler
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadFiles(Array.from(files));
    }
  };

  // Select files manually handler
  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      uploadFiles(Array.from(files));
    }
  };

  // Upload function
  const uploadFiles = (files) => {
    files.forEach((file) => {
      const fileId = Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      const timestampName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `tenants/${effectiveTenantId}/marketing_uploads/${timestampName}`);
      
      // Add to upload queue UI state
      setUploadQueue((prev) => [
        ...prev, 
        { id: fileId, name: file.name, progress: 0, status: 'uploading' }
      ]);

      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadQueue((prev) =>
            prev.map((item) => (item.id === fileId ? { ...item, progress } : item))
          );
        },
        (error) => {
          console.error("Upload error for file " + file.name, error);
          setUploadQueue((prev) =>
            prev.map((item) => (item.id === fileId ? { ...item, status: 'error', error: error.message } : item))
          );
          showToast(`Failed to upload ${file.name}`, "error");
        },
        async () => {
          // Success
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          let metadata = {};
          try {
            metadata = await getMetadata(uploadTask.snapshot.ref);
          } catch (e) {
            console.error("Error fetching uploaded metadata:", e);
          }

          let displayName = timestampName;
          const match = timestampName.match(/^\d+_(.+)$/);
          if (match) {
            displayName = match[1];
          }

          // Add to uploads list
          setUploads((prev) => [
            {
              name: timestampName,
              displayName,
              url: downloadUrl,
              path: uploadTask.snapshot.ref.fullPath,
              size: metadata.size || file.size,
              timeCreated: metadata.timeCreated || new Date().toISOString(),
              contentType: metadata.contentType || file.type,
              isImage: isImageFile(timestampName)
            },
            ...prev
          ]);

          // Update item in queue
          setUploadQueue((prev) =>
            prev.map((item) => (item.id === fileId ? { ...item, status: 'done', progress: 100 } : item))
          );
          showToast(`Successfully uploaded ${file.name}!`, "success");
        }
      );
    });
  };

  // Copy url handler
  const handleCopyUrl = (url, name) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(name);
    setTimeout(() => setCopiedUrl(null), 2000);
    showToast("URL copied to clipboard!", "success");
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      const fileRef = ref(storage, deletingItem.path);
      await deleteObject(fileRef);
      setUploads((prev) => prev.filter((item) => item.path !== deletingItem.path));
      showToast("Resource successfully deleted.", "success");
    } catch (err) {
      console.error("Delete object failed:", err);
      showToast("Failed to delete the resource.", "error");
    } finally {
      setDeletingItem(null);
    }
  };

  // Clear upload queue items that are completed or failed
  const clearCompletedUploads = () => {
    setUploadQueue((prev) => prev.filter((item) => item.status === 'uploading'));
  };

  // Filtered and sorted files
  const filteredUploads = uploads
    .filter((item) => {
      // Tab filter
      if (activeTab === "images" && !item.isImage) return false;
      if (activeTab === "documents" && item.isImage) return false;
      
      // Search filter
      if (searchQuery.trim() !== "") {
        return item.displayName.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.timeCreated) - new Date(a.timeCreated);
      }
      if (sortBy === "oldest") {
        return new Date(a.timeCreated) - new Date(b.timeCreated);
      }
      if (sortBy === "name") {
        return a.displayName.localeCompare(b.displayName);
      }
      if (sortBy === "size") {
        return b.size - a.size;
      }
      return 0;
    });

  const imagesList = filteredUploads.filter(item => item.isImage);
  const docsList = filteredUploads.filter(item => !item.isImage);

  return (
    <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 10000,
          background: toast.type === "success" ? (isDark ? "#052e16" : "#f0fdf4") : toast.type === "error" ? (isDark ? "#2d0a0a" : "#fef2f2") : (isDark ? "#1e1b4b" : "#eff6ff"),
          border: `1px solid ${toast.type === "success" ? "#22c55e" : toast.type === "error" ? "#ef4444" : "#60a5fa"}`,
          color: toast.type === "success" ? "#22c55e" : toast.type === "error" ? "#ef4444" : "#60a5fa",
          borderRadius: 12, padding: "14px 20px", fontSize: 13.5, fontWeight: 500,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)", maxWidth: 420, lineHeight: 1.5,
          display: "flex", alignItems: "center", gap: 10
        }}>
          <span>{toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}</span>
          <span>{toast.msg}</span>
          <span onClick={() => setToast(null)} style={{ marginLeft: "auto", cursor: "pointer", opacity: 0.6, fontSize: 16 }}>✕</span>
        </div>
      )}

      {/* Header section */}
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ 
            fontFamily: t.titleFont, 
            fontWeight: t.titleWeight, 
            fontSize: t.titleSize, 
            color: isDark ? "#fff" : "#1C1917", 
            letterSpacing: t.titleTracking, 
            lineHeight: 1, 
            marginBottom: 6 
          }}>
            Resource Management
          </h1>
          <p style={{ fontSize: 13.5, color: t.textMuted }}>
            Upload, organize, and manage images and documents reusable across your marketing email campaigns.
          </p>
        </div>
        <div>
          <button 
            onClick={fetchUploads} 
            disabled={loading}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 8,
              background: isDark ? "rgba(255,255,255,0.05)" : "#fff",
              border: `1px solid ${t.border}`,
              color: t.text,
              borderRadius: 10,
              padding: "10px 16px",
              fontSize: 13.5,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <RefreshCw size={14} className={loading ? "spin-animation" : ""} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Sync Storage
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1, overflow: "hidden" }}>
        {/* Upload Area / Queue Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Drag & Drop Zone */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? t.accent : t.border}`,
              borderRadius: 16,
              background: isDragging 
                ? (isDark ? "rgba(96,165,250,0.06)" : "#EFF6FF")
                : (isDark ? "rgba(255,255,255,0.02)" : "#FAFAF9"),
              padding: "36px 20px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12
            }}
          >
            <input 
              ref={fileInputRef} 
              type="file" 
              multiple 
              onChange={handleFileSelect} 
              style={{ display: "none" }} 
            />
            
            <div style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isDragging ? t.accent : t.textMuted
            }}>
              <UploadCloud size={26} />
            </div>

            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 4 }}>
                Drag & Drop files here, or <span style={{ color: t.accent, textDecoration: "underline" }}>browse files</span>
              </div>
              <div style={{ fontSize: 12, color: t.textMuted }}>
                Supports Images (PNG, JPG, SVG, WebP) and Documents (PDF, DocX, Spreadsheets, ZIP)
              </div>
            </div>
          </div>

          {/* Upload Queue Info */}
          {uploadQueue.length > 0 && (
            <div style={{
              background: isDark ? "#171515" : "#fff",
              border: `1px solid ${t.border}`,
              borderRadius: 14,
              padding: "14px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 10
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Uploads Queue ({uploadQueue.length})</span>
                {uploadQueue.every(i => i.status !== 'uploading') && (
                  <button 
                    onClick={clearCompletedUploads}
                    style={{
                      background: "none",
                      border: "none",
                      color: t.accent,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    Clear All Completed
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxH: 150, overflowY: "auto" }}>
                {uploadQueue.map((item) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12.5 }}>
                    <div style={{ flex: 1, minWidth: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", color: t.textSecondary }}>
                      {item.name}
                    </div>
                    {item.status === 'uploading' ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, width: 140 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: isDark ? "#2A2A2A" : "#E5E7EB", overflow: "hidden" }}>
                          <div style={{ width: `${item.progress}%`, height: "100%", background: t.accentGrad, transition: "width 0.2s" }} />
                        </div>
                        <span style={{ color: t.textMuted, fontSize: 11, fontFamily: t.mono, width: 32, textAlign: "right" }}>{item.progress}%</span>
                      </div>
                    ) : item.status === 'done' ? (
                      <span style={{ color: "#10B981", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                        <Check size={13} /> Completed
                      </span>
                    ) : (
                      <span style={{ color: "#EF4444", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                        <AlertCircle size={13} /> Failed
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Toolbar & Items List Wrapper */}
        <div style={{ 
          background: isDark ? "rgba(255,255,255,0.015)" : "#fff",
          border: `1px solid ${t.border}`,
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden"
        }}>
          {/* Toolbar */}
          <div style={{ 
            padding: "16px 20px", 
            borderBottom: `1px solid ${t.surfaceBorder}`, 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12
          }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, background: isDark ? "#171515" : "#F3F4F6", padding: 3, borderRadius: 8 }}>
              {["all", "images", "documents"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: activeTab === tab ? (isDark ? "#2D2D2D" : "#fff") : "transparent",
                    color: activeTab === tab ? t.text : t.textMuted,
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "all 0.15s ease"
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Filters / Search */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, justifyContent: "flex-end", minWidth: 280 }}>
              {/* Search */}
              <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: t.textMuted }} />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    background: isDark ? "rgba(255,255,255,0.03)" : "#FAF9F6",
                    border: `1px solid ${t.surfaceBorder}`,
                    borderRadius: 8,
                    padding: "8px 12px 8px 32px",
                    fontSize: 13,
                    color: t.text,
                    outline: "none",
                    fontFamily: "inherit"
                  }}
                />
              </div>

              {/* Sort dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  background: isDark ? "rgba(255,255,255,0.03)" : "#FAF9F6",
                  border: `1px solid ${t.surfaceBorder}`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 13,
                  color: t.text,
                  outline: "none",
                  cursor: "pointer",
                  fontFamily: "inherit"
                }}
              >
                <option value="newest" style={{ color: "#000" }}>Sort: Newest</option>
                <option value="oldest" style={{ color: "#000" }}>Sort: Oldest</option>
                <option value="name" style={{ color: "#000" }}>Sort: Name</option>
                <option value="size" style={{ color: "#000" }}>Sort: Size</option>
              </select>

              {/* View Toggle */}
              <div style={{ display: "flex", gap: 2, background: isDark ? "#171515" : "#F3F4F6", padding: 3, borderRadius: 8, border: `1px solid ${t.surfaceBorder}` }}>
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  style={{
                    background: viewMode === "card" ? (isDark ? "#2D2D2D" : "#fff") : "transparent",
                    color: viewMode === "card" ? t.accent : t.textMuted,
                    border: "none",
                    borderRadius: 6,
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  title="Card View"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  style={{
                    background: viewMode === "list" ? (isDark ? "#2D2D2D" : "#fff") : "transparent",
                    color: viewMode === "list" ? t.accent : t.textMuted,
                    border: "none",
                    borderRadius: 6,
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  title="List View"
                >
                  <List size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Items Container */}
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 260, color: t.textMuted }}>
                <div style={{ width: 36, height: 36, border: `3px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderTopColor: t.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 12 }} />
                <span>Loading resources...</span>
              </div>
            ) : filteredUploads.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 260, textAlign: "center", color: t.textMuted }}>
                <FolderOpen size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                <h3 style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 4 }}>No resources found</h3>
                <p style={{ fontSize: 13, maxWidth: 360, color: t.textMuted }}>
                  {searchQuery ? "Try refining your search keyword." : "Drag & drop files above to populate your marketing resources library."}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Section: Images */}
                {(activeTab === "all" || activeTab === "images") && imagesList.length > 0 && (
                  <div>
                    <div style={{ 
                      fontSize: 11.5, 
                      fontWeight: 700, 
                      color: t.textMuted, 
                      textTransform: "uppercase", 
                      letterSpacing: "0.8px", 
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}>
                      <ImageIcon size={13} /> Images ({imagesList.length})
                    </div>
                    
                    <div style={viewMode === "card" ? { 
                      display: "grid", 
                      gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", 
                      gap: 16 
                    } : {
                      display: "flex",
                      flexDirection: "column",
                      gap: 10
                    }}>
                      {imagesList.map((item) => (
                        viewMode === "card" ? (
                          <div 
                            key={item.path}
                            style={{
                              background: isDark ? "rgba(255,255,255,0.02)" : "#fff",
                              border: `1px solid ${t.surfaceBorder}`,
                              borderRadius: 12,
                              overflow: "hidden",
                              position: "relative",
                              display: "flex",
                              flexDirection: "column",
                              transition: "transform 0.15s ease, box-shadow 0.15s ease"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "translateY(-2px)";
                              e.currentTarget.style.boxShadow = isDark ? "0 8px 24px rgba(0,0,0,0.3)" : "0 8px 24px rgba(0,0,0,0.05)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "none";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            {/* Image Thumbnail */}
                            <div style={{
                              width: "100%",
                              height: 120,
                              background: isDark ? "#171515" : "#FAF9F6",
                              borderBottom: `1px solid ${t.surfaceBorder}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                              position: "relative"
                            }}>
                              <img 
                                src={item.url} 
                                alt={item.displayName}
                                style={{
                                  maxWidth: "100%",
                                  maxHeight: "100%",
                                  objectFit: "contain"
                                }}
                              />
                              
                              {/* Hover overlay actions */}
                              <div style={{
                                position: "absolute",
                                inset: 0,
                                background: "rgba(0,0,0,0.5)",
                                opacity: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                transition: "opacity 0.2s ease"
                              }}
                              className="hover-overlay"
                              onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                              >
                                <a 
                                  href={item.url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    background: "#fff",
                                    color: "#000",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer"
                                  }}
                                  title="Open full image"
                                >
                                  <Eye size={15} />
                                </a>
                              </div>
                            </div>

                            {/* Image details */}
                            <div style={{ padding: 12, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 8 }}>
                              <div>
                                <div 
                                  style={{ 
                                    fontSize: 13, 
                                    fontWeight: 600, 
                                    color: t.text, 
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    marginBottom: 2
                                  }}
                                  title={item.displayName}
                                >
                                  {item.displayName}
                                </div>
                                <div style={{ fontSize: 11, color: t.textMuted }}>
                                  {formatBytes(item.size)} • {formatDate(item.timeCreated).split(',')[0]}
                                </div>
                              </div>

                              {/* Card actions */}
                              <div style={{ display: "flex", gap: 6, borderTop: `1px solid ${t.surfaceBorder}`, paddingTop: 10, marginTop: 4 }}>
                                <button
                                  onClick={() => handleCopyUrl(item.url, item.name)}
                                  style={{
                                    flex: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 4,
                                    background: isDark ? "rgba(255,255,255,0.04)" : "#F3F4F6",
                                    border: "none",
                                    borderRadius: 6,
                                    padding: "6px 0",
                                    fontSize: 11,
                                    fontWeight: 500,
                                    color: t.textSecondary,
                                    cursor: "pointer"
                                  }}
                                >
                                  {copiedUrl === item.name ? (
                                    <>
                                      <Check size={12} style={{ color: "#10B981" }} />
                                      <span style={{ color: "#10B981" }}>Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} />
                                      <span>Copy URL</span>
                                    </>
                                  )}
                                </button>
                                
                                <button
                                  onClick={() => setDeletingItem(item)}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "transparent",
                                    border: "none",
                                    borderRadius: 6,
                                    color: "#EF4444",
                                    cursor: "pointer"
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2"}
                                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                  title="Delete image"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div 
                            key={item.path}
                            style={{
                              background: isDark ? "rgba(255,255,255,0.015)" : "#fff",
                              border: `1px solid ${t.surfaceBorder}`,
                              borderRadius: 12,
                              padding: "10px 18px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 16,
                              transition: "border-color 0.15s ease"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = t.accent}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = t.surfaceBorder}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
                              <div style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                background: isDark ? "rgba(59,130,246,0.15)" : "#EFF6FF",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                overflow: "hidden"
                              }}>
                                <img src={item.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div 
                                  style={{ 
                                    fontSize: 13.5, 
                                    fontWeight: 600, 
                                    color: t.text, 
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap"
                                  }}
                                  title={item.displayName}
                                >
                                  {item.displayName}
                                </div>
                                <div style={{ fontSize: 11.5, color: t.textMuted, display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                                  <span>Image File</span>
                                  <span>•</span>
                                  <span>{formatBytes(item.size)}</span>
                                  <span>•</span>
                                  <span>Uploaded {formatDate(item.timeCreated)}</span>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <a 
                                href={item.url} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{
                                  width: 34,
                                  height: 34,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: 8,
                                  background: isDark ? "rgba(255,255,255,0.04)" : "#F3F4F6",
                                  color: t.textSecondary,
                                  cursor: "pointer"
                                }}
                                title="Open full image"
                              >
                                <Eye size={14} />
                              </a>
                              <button
                                onClick={() => handleCopyUrl(item.url, item.name)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  background: isDark ? "rgba(255,255,255,0.04)" : "#F3F4F6",
                                  border: "none",
                                  borderRadius: 8,
                                  padding: "8px 14px",
                                  fontSize: 12.5,
                                  fontWeight: 500,
                                  color: t.textSecondary,
                                  cursor: "pointer"
                                }}
                              >
                                {copiedUrl === item.name ? (
                                  <>
                                    <Check size={13} style={{ color: "#10B981" }} />
                                    <span style={{ color: "#10B981" }}>Copied URL</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={13} />
                                    <span>Copy URL</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => setDeletingItem(item)}
                                style={{
                                  width: 34,
                                  height: 34,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: 8,
                                  background: "transparent",
                                  border: "none",
                                  color: "#EF4444",
                                  cursor: "pointer"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                title="Delete image"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Section: Documents */}
                {(activeTab === "all" || activeTab === "documents") && docsList.length > 0 && (
                  <div>
                    <div style={{ 
                      fontSize: 11.5, 
                      fontWeight: 700, 
                      color: t.textMuted, 
                      textTransform: "uppercase", 
                      letterSpacing: "0.8px", 
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}>
                      <FileText size={13} /> Documents ({docsList.length})
                    </div>
                    
                    <div style={{ 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: 10 
                    }}>
                      {docsList.map((item) => {
                        const docInfo = getDocInfo(item.name, isDark);
                        return (
                          <div 
                            key={item.path}
                            style={{
                              background: isDark ? "rgba(255,255,255,0.015)" : "#fff",
                              border: `1px solid ${t.surfaceBorder}`,
                              borderRadius: 12,
                              padding: "12px 18px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 16,
                              transition: "border-color 0.15s ease"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = t.accent}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = t.surfaceBorder}
                          >
                            {/* Doc details left */}
                            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
                              <div style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                background: docInfo.bg,
                                color: docInfo.color,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                              }}>
                                <FileText size={20} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div 
                                  style={{ 
                                    fontSize: 13.5, 
                                    fontWeight: 600, 
                                    color: t.text, 
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap"
                                  }}
                                  title={item.displayName}
                                >
                                  {item.displayName}
                                </div>
                                <div style={{ fontSize: 11.5, color: t.textMuted, display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                                  <span>{docInfo.label}</span>
                                  <span>•</span>
                                  <span>{formatBytes(item.size)}</span>
                                  <span>•</span>
                                  <span>Uploaded {formatDate(item.timeCreated)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Doc actions right */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <button
                                onClick={() => handleCopyUrl(item.url, item.name)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  background: isDark ? "rgba(255,255,255,0.04)" : "#F3F4F6",
                                  border: "none",
                                  borderRadius: 8,
                                  padding: "8px 14px",
                                  fontSize: 12.5,
                                  fontWeight: 500,
                                  color: t.textSecondary,
                                  cursor: "pointer"
                                }}
                              >
                                {copiedUrl === item.name ? (
                                  <>
                                    <Check size={13} style={{ color: "#10B981" }} />
                                    <span style={{ color: "#10B981" }}>Copied URL</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={13} />
                                    <span>Copy URL</span>
                                  </>
                                )}
                              </button>

                              <a 
                                href={item.url} 
                                download
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  width: 34,
                                  height: 34,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: 8,
                                  background: isDark ? "rgba(255,255,255,0.04)" : "#F3F4F6",
                                  color: t.textSecondary,
                                  cursor: "pointer"
                                }}
                                title="Download document"
                              >
                                <Download size={14} />
                              </a>

                              <button
                                onClick={() => setDeletingItem(item)}
                                style={{
                                  width: 34,
                                  height: 34,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: 8,
                                  background: "transparent",
                                  border: "none",
                                  color: "#EF4444",
                                  cursor: "pointer"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                title="Delete document"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DelModal 
        target={deletingItem ? { name: deletingItem.displayName } : null}
        open={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDelete}
        label="This resource"
        t={t}
        isDark={isDark}
      />
    </div>
  );
}
