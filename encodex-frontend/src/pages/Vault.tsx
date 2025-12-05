import React, { useEffect, useState } from "react";
import { aesGcmDecrypt, aesGcmEncrypt, b64ToBuf, bufToB64 } from "../lib/crypto";
import { pushActivity } from "../lib/storage";
import { filesAPI, sharesAPI, handleAPIError } from "../lib/api";
import type { DocType, EncryptedFileMeta, VaultCategory } from "../lib/types";

const CATEGORIES: VaultCategory[] = ["Identification", "Insurance", "Legal", "Financial", "Other"];

export default function VaultPage({ session }: { session: { email: string; key: CryptoKey } }) {
  const [files, setFiles] = useState<EncryptedFileMeta[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<VaultCategory | "All">("All");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareFor, setShareFor] = useState<EncryptedFileMeta | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Load files from API on mount
  useEffect(() => {
    loadFilesFromAPI();
  }, []);

  const loadFilesFromAPI = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await filesAPI.list(cat !== "All" ? cat : undefined, q);
      setFiles(response.files || []);
    } catch (err: any) {
      setError(handleAPIError(err));
      console.error("Error loading files:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = files
    .filter(f => (cat === "All" || f.category === cat) && (!q || f.filename.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => b.createdAt - a.createdAt);

  // Calculate storage stats
  const totalFiles = files.length;
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const totalSizeGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);

  const onUpload = async (file: File, category: VaultCategory = "Other", docType: DocType = "Other") => {
    if (file.size > 100 * 1024 * 1024) {
      alert("File size exceeds 100MB limit");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      // Step 1: User selects file (already done)
      // Step 2: Generate encryption key (using session key - already available)
      // Step 3: Encrypt file client-side with AES-256-GCM
      const bytes = await file.arrayBuffer();
      const { iv, ct } = await aesGcmEncrypt(session.key, bytes);
      
      // Step 4: Prepare encrypted blob for upload via HTTPS
      const encryptedBlob = new Blob([ct]);
      
      // Step 5: Upload encrypted file to server
      await filesAPI.upload(encryptedBlob, {
        filename: file.name,
        size: file.size,
        category,
        docType,
        ivB64: bufToB64(iv),
      });
      
      // Step 6: Update UI with new file
      await loadFilesFromAPI();
      pushActivity({ 
        id: crypto.randomUUID(), 
        ts: Date.now(), 
        actor: session.email, 
        type: "UPLOAD", 
        meta: { filename: file.name, category, docType }
      });
    } catch (err: any) {
      const errorMsg = handleAPIError(err);
      setError(errorMsg);
      alert("Upload failed: " + errorMsg);
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async (f: EncryptedFileMeta) => {
    try {
      setError(null);
      // Download encrypted file from server
      const encryptedBlob = await filesAPI.download(f.id);
      
      // Decrypt file client-side
      const encryptedBytes = await encryptedBlob.arrayBuffer();
      const pt = await aesGcmDecrypt(session.key, b64ToBuf(f.ivB64), encryptedBytes);
      
      // Create download
      const blob = new Blob([pt]); 
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); 
      a.href = url; 
      a.download = f.filename; 
      a.click();
      URL.revokeObjectURL(url);
      
      pushActivity({ 
        id: crypto.randomUUID(), 
        ts: Date.now(), 
        actor: session.email, 
        type: "DOWNLOAD", 
        meta: { filename: f.filename }
      });
    } catch (err: any) {
      const errorMsg = handleAPIError(err);
      setError(errorMsg);
      alert("Download failed: " + errorMsg);
    }
  };

  const onDelete = async (id: string) => {
    const f = files.find(x => x.id === id);
    if (!confirm("Delete this file?")) return;
    
    try {
      setError(null);
      await filesAPI.delete(id);
      await loadFilesFromAPI();
      pushActivity({ 
        id: crypto.randomUUID(), 
        ts: Date.now(), 
        actor: session.email, 
        type: "DELETE", 
        meta: { filename: f?.filename }
      });
    } catch (err: any) {
      const errorMsg = handleAPIError(err);
      setError(errorMsg);
      alert("Delete failed: " + errorMsg);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      onUpload(droppedFiles[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <section style={{ display: "grid", gap: 16 }}>
      {/* Error Display */}
      {error && (
        <div className="error" style={{ marginBottom: "16px" }}>
          {error}
        </div>
      )}
      
      {/* Search and Filter Bar */}
      <div className="toolbar">
        <input className="search" placeholder="Search files..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" value={cat} onChange={e => setCat(e.target.value as any)}>
          <option value="All">All</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Main Upload Area */}
      <div className="upload-container">
        <div className="upload-main">
          <h1 className="upload-title">Secure File Upload</h1>
          <p className="upload-description">
            Your files are encrypted on your device before upload. Zero-knowledge architecture ensures complete privacy.
          </p>
          
          <div
            className={`drop-zone ${isDragging ? "dragover" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <div className="folder-icon">📁</div>
            <div className="drop-zone-text">Drop files here or click to browse</div>
            <div className="drop-zone-subtext">All file types supported • Max 100MB per file</div>
            <button className="choose-files-btn" disabled={busy}>
              {busy ? "Uploading..." : "Choose Files"}
            </button>
            <input
              id="file-input"
              type="file"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onUpload(file);
                  e.currentTarget.value = "";
                }
              }}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="sidebar-section">
          {/* Storage Stats */}
          <div className="sidebar-card">
            <h3 className="sidebar-title">
              <span className="sidebar-icon">📊</span>
              Your Storage
            </h3>
            <div className="storage-stats">
              <div className="storage-stat">
                <div className="storage-value">{totalFiles}</div>
                <div className="storage-label">Files</div>
              </div>
              <div className="storage-stat">
                <div className="storage-value">{totalSizeGB}GB</div>
                <div className="storage-label">Used</div>
              </div>
            </div>
          </div>

          {/* Upload Process Steps */}
          <div className="sidebar-card">
            <h3 className="sidebar-title">
              <span className="sidebar-icon">⚡</span>
              Upload Process
            </h3>
            <div className="upload-steps">
              <div className="upload-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <div className="step-title">Select & Encrypt</div>
                  <div className="step-desc">Files encrypted locally on your device</div>
                </div>
              </div>
              <div className="upload-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <div className="step-title">Secure Upload</div>
                  <div className="step-desc">Encrypted data sent via HTTPS</div>
                </div>
              </div>
              <div className="upload-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <div className="step-title">Safe Storage</div>
                  <div className="step-desc">Stored encrypted in the cloud</div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Features */}
          <div className="sidebar-card">
            <h3 className="sidebar-title">
              <span className="sidebar-icon">🛡️</span>
              Security Features
            </h3>
            <div className="security-feature">
              <span className="security-icon">🔒</span>
              <div className="security-content">
                <div className="security-title">AES-256-GCM Encryption</div>
                <div className="security-desc">Military-grade encryption applied before upload</div>
              </div>
            </div>
            <div className="security-feature">
              <span className="security-icon">🔑</span>
              <div className="security-content">
                <div className="security-title">Client-Side Keys</div>
                <div className="security-desc">Encryption keys never leave your device</div>
              </div>
            </div>
            <div className="security-feature">
              <span className="security-icon">🚫</span>
              <div className="security-content">
                <div className="security-title">Zero-Knowledge</div>
                <div className="security-desc">We cannot access your files, ever</div>
              </div>
            </div>
            <div className="security-feature">
              <span className="security-icon">✅</span>
              <div className="security-content">
                <div className="security-title">TLS 1.3 Transport</div>
                <div className="security-desc">Encrypted transmission to cloud storage</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card centerText" style={{ marginTop: "32px" }}>
          Loading your files...
        </div>
      )}
      
      {/* File List */}
      {!loading && filtered.length > 0 && (
        <div style={{ marginTop: "32px" }}>
          <h2 style={{ marginBottom: "16px", fontSize: "24px", fontWeight: 700 }}>Your Files</h2>
          <div className="grid">
            {filtered.map((f) => (
              <div key={f.id} className="card">
                <div className="fileCardHeader">
                  <div className="fileName">{f.filename}</div>
                  <div className="chips">
                    <span className="chipGrey">{f.docType}</span>
                    <span className="chip">{f.category}</span>
                  </div>
                </div>
                <div className="subtle mts">{(f.size/1024).toFixed(1)} KB • {new Date(f.createdAt).toLocaleString()}</div>
                <div className="row mtt">
                  <button className="btn btnPrimary" onClick={() => onDownload(f)}>Download</button>
                  <button className="btn btnSecondary" onClick={() => setShareFor(f)}>Share</button>
                  <button className="btn btnDanger" onClick={() => onDelete(f.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!loading && filtered.length === 0 && files.length === 0 && (
        <div className="subtle card centerText" style={{ marginTop: "32px" }}>
          No files yet. Upload something to get started.
        </div>
      )}

      {shareFor && <ShareDialog file={shareFor} email={session.email} onClose={() => setShareFor(null)} />}
    </section>
  );
}

function ShareDialog({ file, email, onClose }: { file: EncryptedFileMeta; email: string; onClose: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createShare();
  }, [file]);

  const createShare = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await sharesAPI.create(file.id, 7);
      setToken(response.token);
      pushActivity({ 
        id: crypto.randomUUID(), 
        ts: Date.now(), 
        actor: email, 
        type: "SHARE_CREATE", 
        meta: { filename: file.filename }
      });
    } catch (err: any) {
      setError(handleAPIError(err));
    } finally {
      setLoading(false);
    }
  };

  const link = token ? `${location.origin}${location.pathname}#share?token=${token}` : "";

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      alert("Share link copied to clipboard.");
    } catch {
      alert("Failed to copy to clipboard");
    }
  };

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0 }}>Secure Share Link</h3>
        <p className="subtle mts">Anyone with this link can download the encrypted file. Link expires in 7 days.</p>
        
        {loading && <div className="mtt">Creating share link...</div>}
        {error && <div className="error mtt">{error}</div>}
        {token && (
          <>
            <input className="input mtt" readOnly value={link} />
            <div className="row mtt">
              <button className="btn btnPrimary" onClick={copy}>Copy link</button>
              <button className="btn btnSecondary" onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
