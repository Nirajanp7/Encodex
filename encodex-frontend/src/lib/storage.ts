import type { ActivityItem, EncryptedFileMeta, UserRecord } from "./types";

const USERS_KEY = "encodex_users";
const FILES_PREFIX = "encodex_files_";
const SHARES_KEY = "encodex_shares";
const ACTIVITY_KEY = "encodex_activity";

export function loadUsers(): UserRecord[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch { return []; }
}
export function saveUsers(users: UserRecord[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
export function upsertUser(next: UserRecord) {
  const all = loadUsers();
  const i = all.findIndex(u => u.email === next.email);
  if (i >= 0) all[i] = next; else all.push(next);
  saveUsers(all);
}

export function loadFiles(email: string): EncryptedFileMeta[] {
  try { return JSON.parse(localStorage.getItem(FILES_PREFIX + email) || "[]"); } catch { return []; }
}
export function saveFiles(email: string, files: EncryptedFileMeta[]) {
  localStorage.setItem(FILES_PREFIX + email, JSON.stringify(files));
}

export function loadShares(): Record<string, EncryptedFileMeta> {
  try { return JSON.parse(localStorage.getItem(SHARES_KEY) || "{}"); } catch { return {}; }
}
export function saveShares(obj: Record<string, EncryptedFileMeta>) {
  localStorage.setItem(SHARES_KEY, JSON.stringify(obj));
}

export function loadActivity(): ActivityItem[] {
  try { return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]"); } catch { return []; }
}
export function pushActivity(item: ActivityItem) {
  const all = loadActivity();
  all.unshift(item);
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(all.slice(0, 500))); // Keep latest 500
}

// Clear all EncodeX data from localStorage
export function clearAllData() {
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith("encodex_") || k.startsWith(FILES_PREFIX)) {
      localStorage.removeItem(k);
    }
  });
}
