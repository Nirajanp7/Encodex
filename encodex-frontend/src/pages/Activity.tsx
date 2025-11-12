import React, { useMemo, useState } from "react";
import { loadActivity } from "../lib/storage";
import type { ActivityItem } from "../lib/types";

const typeNice: Record<ActivityItem["type"], string> = {
  LOGIN: "Login", REGISTER: "Register",
  UPLOAD: "Upload", DOWNLOAD: "Download", DELETE: "Delete",
  SHARE_CREATE: "Share Created", SHARE_REVOKE: "Share Revoked",
  SCAN_SAVE: "Scan Saved",
  SETTINGS_UPDATE: "Settings Updated", CLEAR_DATA: "Cleared Data"
};

export default function ActivityPage() {
  const [q, setQ] = useState("");
  const [items] = useState<ActivityItem[]>(() => loadActivity());

  const filtered = useMemo(() =>
    items.filter(i => {
      const text = JSON.stringify(i).toLowerCase();
      return !q || text.includes(q.toLowerCase());
    }), [items, q]);

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div className="toolbar">
        <input className="search" placeholder="Search activity..." value={q} onChange={(e)=>setQ(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="card subtle centerText">No activity yet.</div>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ padding: "8px 6px" }}>Time</th>
                <th style={{ padding: "8px 6px" }}>Type</th>
                <th style={{ padding: "8px 6px" }}>Actor</th>
                <th style={{ padding: "8px 6px" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>{new Date(a.ts).toLocaleString()}</td>
                  <td style={{ padding: "8px 6px" }}>{typeNice[a.type] || a.type}</td>
                  <td style={{ padding: "8px 6px" }}>{a.actor}</td>
                  <td style={{ padding: "8px 6px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
                    {a.meta ? JSON.stringify(a.meta) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
