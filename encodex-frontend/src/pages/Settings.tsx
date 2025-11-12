import React, { useState } from "react";
import { clearAllData, loadUsers, pushActivity, upsertUser } from "../lib/storage";
import type { UserRecord } from "../lib/types";

export default function SettingsPage({ email }: { email: string }) {
  const users = loadUsers();
  const user = users.find(u => u.email === email) as UserRecord | undefined;

  const [name, setName] = useState(user?.name || "");
  const [note, setNote] = useState<string | null>(null);

  const save = () => {
    if (!user) return;
    upsertUser({ ...user, name });
    setNote("Saved.");
    pushActivity({ id: crypto.randomUUID(), ts: Date.now(), actor: email, type: "SETTINGS_UPDATE", meta: { name }});
    setTimeout(()=>setNote(null), 1200);
  };

  const exportMeta = () => {
    const blob = new Blob([JSON.stringify({ users, note: "EncodeX export (metadata only)" }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "encodex-export.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const clear = () => {
    if (!confirm("This will remove all EncodeX local data for every user. Continue?")) return;
    clearAllData();
    pushActivity({ id: crypto.randomUUID(), ts: Date.now(), actor: email, type: "CLEAR_DATA" });
    alert("Cleared local data. Reload the app.");
    location.reload();
  };

  return (
    <section className="card" style={{ display: "grid", gap: 14, maxWidth: 720 }}>
      <h2 style={{ margin: 0 }}>Settings</h2>
      <div className="subtle">Account settings are local-only in this demo.</div>

      <div>
        <label className="label">Email</label>
        <input className="input" value={email} readOnly />
      </div>

      <div>
        <label className="label">Name</label>
        <input className="input" value={name} onChange={e=>setName(e.target.value)} />
      </div>

      <div className="row">
        <button className="btn btnPrimary" onClick={save}>Save</button>
        <button className="btn btnSecondary" onClick={exportMeta}>Export metadata</button>
        <button className="btn btnDanger" onClick={clear}>Clear local data</button>
      </div>

      {note && <div className="card" style={{ padding: 10 }}>{note}</div>}

      <hr style={{ border: 0, borderTop: "1px solid var(--border)" }} />

      <div className="subtle" style={{ fontSize: 13 }}>
        Password changes / MFA require a real backend and key rotation. This demo keeps crypto client-side only.
      </div>
    </section>
  );
}
