import React, { useRef, useState } from "react";
import { aesGcmEncrypt, bufToB64 } from "../lib/crypto";
import { pushActivity } from "../lib/storage";
import { filesAPI, handleAPIError } from "../lib/api";
import type { DocType, VaultCategory } from "../lib/types";

const CATEGORIES: VaultCategory[] = ["Identification", "Insurance", "Legal", "Financial", "Other"];

export default function ScanPage({ session }: { session: { email: string; key: CryptoKey } }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<VaultCategory>("Other");
  const [autoCrop, setAutoCrop] = useState(true);
  const [enhance, setEnhance] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = () => fileRef.current?.click();
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  };

  const onSave = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      // Auto-crop/enhance are simulated
      const bytes = await file.arrayBuffer();
      const { iv, ct } = await aesGcmEncrypt(session.key, bytes);
      
      // Upload encrypted file to backend
      const encryptedBlob = new Blob([ct]);
      await filesAPI.upload(encryptedBlob, {
        filename: file.name,
        size: file.size,
        category,
        docType: "Image" as DocType,
        ivB64: bufToB64(iv),
      });
      
      pushActivity({ 
        id: crypto.randomUUID(), 
        ts: Date.now(), 
        actor: session.email, 
        type: "SCAN_SAVE", 
        meta: { filename: file.name, category, autoCrop, enhance }
      });
      
      alert("Saved to Vault!");
      setFile(null); 
      setPreviewUrl(null);
    } catch (err: any) {
      const errorMsg = handleAPIError(err);
      setError(errorMsg);
      alert("Failed to save: " + errorMsg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" style={{ display: "grid", gap: 16 }}>
      <h2 style={{ margin: 0 }}>Scan</h2>
      <p className="subtle">Capture/Upload a photo of a document. Auto-crop & enhance are simulated for now.</p>
      
      {error && (
        <div className="error">{error}</div>
      )}

      <div className="row">
        <button className="btn btnPrimary" onClick={onPick}>Upload Image</button>
        <select className="select" value={category} onChange={e => setCategory(e.target.value as VaultCategory)}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <label className="row" style={{ gap: 6 }}>
          <input type="checkbox" checked={autoCrop} onChange={e=>setAutoCrop(e.target.checked)} />
          Auto-crop
        </label>
        <label className="row" style={{ gap: 6 }}>
          <input type="checkbox" checked={enhance} onChange={e=>setEnhance(e.target.checked)} />
          Enhance
        </label>
      </div>

      {previewUrl ? (
        <div className="card" style={{ padding: 12 }}>
          <img src={previewUrl} alt="preview" style={{ maxWidth: "100%", borderRadius: 12 }} />
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
          No image selected.
        </div>
      )}

      <div className="row">
        <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp,.gif" style={{ display: "none" }} onChange={onChange} />
        <button disabled={!file || busy} className="btn btnPrimary" onClick={onSave}>{busy ? "Saving..." : "Save to Vault"}</button>
        {file && <button className="btn btnSecondary" onClick={() => { setFile(null); setPreviewUrl(null); }}>Clear</button>}
      </div>
    </section>
  );
}
