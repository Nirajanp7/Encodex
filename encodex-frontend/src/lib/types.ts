export type VaultCategory = "Identification" | "Insurance" | "Legal" | "Financial" | "Other";
export type DocType = "PDF" | "Image" | "Document" | "Spreadsheet" | "Presentation" | "Other";

export type UserRecord = {
  email: string;
  name: string;
  saltB64: string;
  kdfIterations: number;
  verifierB64: string;
  verifierIvB64: string;
};

export type EncryptedFileMeta = {
  id: string;
  owner: string;
  filename: string;
  size: number;
  category: VaultCategory;
  docType: DocType;
  createdAt: number;
  ivB64: string;
  ctB64: string;
};

export type ActivityItem = {
  id: string;
  ts: number;
  actor: string;
  type:
    | "LOGIN" | "REGISTER"
    | "UPLOAD" | "DOWNLOAD" | "DELETE"
    | "SHARE_CREATE" | "SHARE_REVOKE"
    | "SCAN_SAVE"
    | "SETTINGS_UPDATE" | "CLEAR_DATA";
  meta?: Record<string, any>;
};
