import React, { useEffect, useState } from "react";
import { b64ToBuf, deriveKeyPBKDF2, aesGcmDecrypt } from "../lib/crypto";
import { loadShares, loadUsers } from "../lib/storage";
import type { EncryptedFileMeta } from "../lib/types";

export default function SharePublicView() {
  const [meta, setMeta] = useState<EncryptedFileMeta | null>(null);
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const qs = new URLSearchParams(location.hash.split("?")[1] || "");
    const t = qs.get("token");
    if (!t) return;
    const shares = loadShares();
    setMeta(shares[t] || null);
  }, []);

  const download = async () => {
    if (!meta) return;
    setBusy(true); setErr(null);
    try {
      const users = loadUsers();
      const owner = users.find((u) => u.email === email);
      if (!owner) throw new Error("Unknown owner email");
      const key = await deriveKeyPBKDF2(password, b64ToBuf(owner.saltB64), owner.kdfIterations) as CryptoKey;
      const pt = await aesGcmDecrypt(key, b64ToBuf(meta.ivB64), b64ToBuf(meta.ctB64));
      const blob = new Blob([pt]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = meta.filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErr(e?.message || "Decryption failed");
    } finally {
      setBusy(false);
    }
  };

  if (!meta) return <div className="card centerText authCard">Invalid or expired link.</div>;

  return (
    <section className="card authCard">
      <h2 style={{ margin: 0 }}>Download shared file</h2>
      <div className="subtle mts">{meta.filename} • {(meta.size / 1024).toFixed(1)} KB</div>

      <div className="mtt">
        <label className="label">Owner email</label>
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@example.com" />
      </div>
      <div className="mts">
        <label className="label">Owner password (demo)</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </div>
      {err && <div className="error mtt">{err}</div>}
      <button className="btn btnPrimary mtt" disabled={busy} onClick={download}>
        {busy ? "Decrypting..." : "Download"}
      </button>
      <p className="subtle mtt" style={{ fontSize: 13 }}>
        Real app note: sender wraps a random file key with recipient's public key. No passwords shared.
      </p>
    </section>
  );
}
