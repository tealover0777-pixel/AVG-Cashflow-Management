import React, { useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc, collectionGroup } from "firebase/firestore";
import { uploadBase64 } from "../utils/storageUtils";

export default function MigrationTool({ t, isDark, onComplete }) {
    const [status, setStatus] = useState("idle"); // idle, running, complete, error
    const [logs, setLogs] = useState([]);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    const addLog = (msg) => setLogs(prev => [msg, ...prev].slice(0, 50));

    const runMigration = async () => {
        setStatus("running");
        setLogs(["Starting migration..."]);
        let processedCount = 0;
        let migrationCount = 0;

        try {
            // 1. Migrate Tenants Logos
            addLog("Checking tenants...");
            const tenantSnap = await getDocs(collection(db, "tenants"));
            const tenants = tenantSnap.docs;
            setProgress({ current: 0, total: tenants.length });

            for (const tenantDoc of tenants) {
                const data = tenantDoc.data();
                const logo = data.tenant_logo || data.logo;
                if (logo && logo.startsWith("data:image")) {
                    addLog(`Migrating logo for tenant: ${tenantDoc.id}`);
                    const path = `tenants/${tenantDoc.id}/branding/logo_migrated_${Date.now()}`;
                    const url = await uploadBase64(logo, path);
                    await updateDoc(tenantDoc.ref, { 
                        tenant_logo: url,
                        logo_migrated: true 
                    });
                    migrationCount++;
                }
                processedCount++;
                setProgress(p => ({ ...p, current: processedCount }));
            }

            // 2. Migrate Global Users Profile Photos
            addLog("Checking global users...");
            const userSnap = await getDocs(collection(db, "global_users"));
            const users = userSnap.docs;
            processedCount = 0;
            setProgress({ current: 0, total: users.length });

            for (const userDoc of users) {
                const data = userDoc.data();
                const photo = data.photo_url || data.photoURL;
                if (photo && photo.startsWith("data:image")) {
                    addLog(`Migrating photo for user: ${userDoc.id}`);
                    const path = `users/${userDoc.id}/profile_migrated_${Date.now()}`;
                    const url = await uploadBase64(photo, path);
                    await updateDoc(userDoc.ref, { 
                        photo_url: url,
                        photo_migrated: true 
                    });
                    migrationCount++;
                }
                processedCount++;
                setProgress(p => ({ ...p, current: processedCount }));
            }

            // 3. Migrate Tenant-Specific Users (Subcollections)
            // Using collectionGroup for efficiency
            addLog("Checking tenant-specific user subcollections...");
            const subUserSnap = await getDocs(collectionGroup(db, "users"));
            const subUsers = subUserSnap.docs;
            processedCount = 0;
            setProgress({ current: 0, total: subUsers.length });

            for (const subUserDoc of subUsers) {
                // Ensure we only process files in tenants/{id}/users
                if (!subUserDoc.ref.path.includes("tenants/")) continue;

                const data = subUserDoc.data();
                const photo = data.photo_url || data.photoURL;
                if (photo && photo.startsWith("data:image")) {
                    const uid = data.auth_uid || subUserDoc.id;
                    addLog(`Migrating sub-photo for user: ${uid} in ${subUserDoc.ref.parent.parent.id}`);
                    const path = `users/${uid}/profile_sub_migrated_${Date.now()}`;
                    const url = await uploadBase64(photo, path);
                    await updateDoc(subUserDoc.ref, { 
                        photo_url: url,
                        photo_migrated: true 
                    });
                    migrationCount++;
                }
                processedCount++;
                setProgress(p => ({ ...p, current: processedCount }));
            }

            setStatus("complete");
            addLog(`Migration finished! Moved ${migrationCount} images to Storage.`);
            if (onComplete) onComplete();
        } catch (err) {
            console.error("Migration error:", err);
            setStatus("error");
            addLog(`Error: ${err.message}`);
        }
    };

    return (
        <div style={{ padding: 20, background: isDark ? "rgba(255,255,255,0.02)" : "#FAFAF9", borderRadius: 12, border: `1px solid ${t.surfaceBorder}` }}>
            <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 4 }}>Image Storage Migration</h3>
                <p style={{ fontSize: 13, color: t.textMuted }}>This tool moves images (logos/photos) from Firestore Base64 fields into Firebase Storage.</p>
            </div>

            {status === "idle" && (
                <button 
                    onClick={runMigration} 
                    style={{ background: t.accentGrad, color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
                >
                    🚀 Start Migration
                </button>
            )}

            {status === "running" && (
                <div style={{ width: "100%", background: isDark ? "rgba(255,255,255,0.05)" : "#E5E7EB", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
                    <div style={{ width: `${(progress.current / progress.total) * 100}%`, background: t.accent, height: "100%", transition: "width 0.3s ease" }} />
                </div>
            )}

            {(status === "running" || status === "complete" || status === "error") && (
                <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                        <span>Activity Log</span>
                        {status === "running" && <span>{progress.current} / {progress.total}</span>}
                    </div>
                    <div style={{ height: 150, overflowY: "auto", background: isDark ? "#000" : "#fff", border: `1px solid ${t.surfaceBorder}`, padding: 12, borderRadius: 8, fontFamily: t.mono, fontSize: 11 }}>
                        {logs.map((log, i) => (
                            <div key={i} style={{ marginBottom: 4, color: log.startsWith("Error") ? "#F87171" : (log.includes("finished") ? "#34D399" : t.textSecondary) }}>
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {status === "complete" && (
                <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(52,211,153,0.1)", color: "#34D399", borderRadius: 8, fontSize: 13, textAlign: "center", fontWeight: 600 }}>
                    ✅ Migration Successful
                </div>
            )}
        </div>
    );
}
