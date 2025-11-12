import React, { useMemo, useState } from "react";
import { loadShares, saveShares, pushActivity } from "../lib/storage";
import type { EncryptedFileMeta } from "../lib/types";

export default function ShareCenterPage({ email }: { email: string }) {
  const [shares, setShares] = useState<Record<string, EncryptedFileMeta>>(() => loadShares());
  const [q, setQ] = useState("");

  const items = useMemo(() =>
    Object.entries(shares)
      .filter(([token, f]) => !q || f.filename.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b[1].createdAt - a[1].createdAt), [shares, q]);

  const linkFor = (token: string) => `${location.origin}${location.pathname}#share?token=${token}`;

  const copy = async (token: string) => {
    await navigator.clipboard.writeText(linkFor(token));
    alert("Link copied.");
  };

  const revoke = (token: string) => {
    if (!confirm("Revoke this share link?")) return;
    const next = { ...shares };
    delete next[token];
    setShares(next);
    saveShares(next);
    pushActivity({ id: crypto.randomUUID(), ts: Date.now(), actor: email, type: "SHARE_REVOKE", meta: { token }});
  };

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div className="toolbar">
        <input className="search" placeholder="Search shared files..." value={q} onChange={(e)=>setQ(e.target.value)} />
      </div>

      {items.length === 0 ? (
        <div className="card subtle centerText">No active share links.</div>
      ) : (
        <div className="grid">
          {items.map(([token, f]) => (
            <div key={token} className="card">
              <div className="fileCardHeader">
                <div className="fileName">{f.filename}</div>
                <span className="chip">Shared</span>
              </div>
              <div className="subtle mts">{(f.size/1024).toFixed(1)} KB • {new Date(f.createdAt).toLocaleString()}</div>
              <input className="input mtt" readOnly value={linkFor(token)} />
              <div className="row mtt">
                <button className="btn btnPrimary" onClick={() => copy(token)}>Copy Link</button>
                <button className="btn btnDanger" onClick={() => revoke(token)}>Revoke</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
