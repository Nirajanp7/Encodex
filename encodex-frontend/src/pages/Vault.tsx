import React, { useEffect, useRef, useState } from "react";
import { aesGcmDecrypt, aesGcmEncrypt, b64ToBuf, bufToB64 } from "../lib/crypto";
import { loadFiles, saveFiles, pushActivity } from "../lib/storage";
import type { DocType, EncryptedFileMeta, VaultCategory } from "../lib/types";

const CATEGORIES: VaultCategory[] = ["Identification", "Insurance", "Legal", "Financial", "Other"];
const DOCTYPES: DocType[] = ["PDF", "Image", "Document", "Spreadsheet", "Presentation", "Other"];

export default function VaultPage({ session }: { session: { email: string; key: CryptoKey } }) {
  const [files, setFiles] = useState<EncryptedFileMeta[]>(() => loadFiles(session.email));
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<VaultCategory | "All">("All");
  const [busy, setBusy] = useState(false);
  const [shareFor, setShareFor] = useState<EncryptedFileMeta | null>(null);

  useEffect(() => { saveFiles(session.email, files); }, [files, session.email]);

  const filtered = files
    .filter(f => (cat === "All" || f.category === cat) && (!q || f.filename.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => b.createdAt - a.createdAt);

  const onUpload = async (file: File, category: VaultCategory, docType: DocType) => {
    setBusy(true);
    try {
      const bytes = await file.arrayBuffer();
      const { iv, ct } = await aesGcmEncrypt(session.key, bytes);
      const meta: EncryptedFileMeta = {
        id: crypto.randomUUID(),
        owner: session.email,
        filename: file.name,
        size: file.size,
        category, docType,
        createdAt: Date.now(),
        ivB64: bufToB64(iv),
        ctB64: bufToB64(ct),
      };
      setFiles(prev => [meta, ...prev]);
      pushActivity({ id: crypto.randomUUID(), ts: Date.now(), actor: session.email, type: "UPLOAD", meta: { filename: file.name, category, docType }});
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async (f: EncryptedFileMeta) => {
    try {
      const pt = await aesGcmDecrypt(session.key, b64ToBuf(f.ivB64), b64ToBuf(f.ctB64));
      const blob = new Blob([pt]); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = f.filename; a.click();
      URL.revokeObjectURL(url);
      pushActivity({ id: crypto.randomUUID(), ts: Date.now(), actor: session.email, type: "DOWNLOAD", meta: { filename: f.filename }});
    } catch { alert("Decryption failed. Wrong key?"); }
  };

  const onDelete = (id: string) => {
    const f = files.find(x => x.id === id);
    if (!confirm("Delete this file?")) return;
    setFiles(prev => prev.filter(f => f.id !== id));
    pushActivity({ id: crypto.randomUUID(), ts: Date.now(), actor: session.email, type: "DELETE", meta: { filename: f?.filename }});
  };

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div className="toolbar">
        <input className="search" placeholder="Search files..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" value={cat} onChange={e => setCat(e.target.value as any)}>
          <option value="All">All</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <UploadButton disabled={busy} onUpload={onUpload} />
      </div>

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
        {filtered.length === 0 && <div className="subtle card centerText">No files yet. Upload something to get started.</div>}
      </div>

      {shareFor && <ShareDialog file={shareFor} email={session.email} onClose={() => setShareFor(null)} />}
    </section>
  );
}

function UploadButton({ disabled, onUpload }: {
  disabled?: boolean;
  onUpload: (file: File, category: VaultCategory, docType: DocType) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [cat, setCat] = useState<VaultCategory>("Other");
  const [docType, setDocType] = useState<DocType>("Other");

  const acceptFor = (dt: DocType): string => {
    switch (dt) {
      case "PDF": return ".pdf";
      case "Image": return ".png,.jpg,.jpeg,.webp,.gif,.tiff";
      case "Document": return ".doc,.docx,.odt,.rtf,.txt,.md,.pdf";
      case "Spreadsheet": return ".xls,.xlsx,.ods,.csv";
      case "Presentation": return ".ppt,.pptx,.odp,.pdf";
      default: return "*/*";
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUpload(file, cat, docType);
    e.currentTarget.value = "";
  };

  return (
    <div className="row">
      <select className="select" value={docType} onChange={(e) => setDocType(e.target.value as DocType)}>
        {DOCTYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <select className="select" value={cat} onChange={(e) => setCat(e.target.value as VaultCategory)}>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input ref={fileRef} type="file" style={{ display: "none" }} accept={acceptFor(docType)} onChange={onChange} />
      <button disabled={disabled} className="btn btnPrimary" onClick={() => fileRef.current?.click()}>Upload</button>
    </div>
  );
}

function ShareDialog({ file, email, onClose }: { file: EncryptedFileMeta; email: string; onClose: () => void }) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const shares = JSON.parse(localStorage.getItem("encodex_shares") || "{}");
    const t = crypto.randomUUID();
    shares[t] = file;
    localStorage.setItem("encodex_shares", JSON.stringify(shares));
    setToken(t);
    pushActivity({ id: crypto.randomUUID(), ts: Date.now(), actor: email, type: "SHARE_CREATE", meta: { filename: file.filename }});
  }, [file, email]);

  const link = token ? `${location.origin}${location.pathname}#share?token=${token}` : "";

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    alert("Share link copied to clipboard.");
  };

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0 }}>Secure Share Link</h3>
        <p className="subtle mts">Anyone with this link can download the encrypted file (needs your key in this demo).</p>
        <input className="input" readOnly value={link} />
        <div className="row mtt">
          <button className="btn btnPrimary" onClick={copy}>Copy link</button>
          <button className="btn btnSecondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
