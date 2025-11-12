const utf8Enc = new TextEncoder();
const utf8Dec = new TextDecoder();

export const bufToB64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};

export const b64ToBuf = (b64: string): ArrayBuffer => {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes.buffer;
};

export async function deriveKeyPBKDF2(password: string, salt: ArrayBuffer, iterations = 100_000) {
  const ikm = await crypto.subtle.importKey("raw", utf8Enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    ikm,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function aesGcmEncrypt(key: CryptoKey, data: ArrayBuffer) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { iv: iv.buffer, ct };
}

export async function aesGcmDecrypt(key: CryptoKey, iv: ArrayBuffer, ct: ArrayBuffer) {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, key, ct);
}

export async function makeVerifier(key: CryptoKey) {
  const { iv, ct } = await aesGcmEncrypt(key, utf8Enc.encode("ok"));
  return { verifierB64: bufToB64(ct), verifierIvB64: bufToB64(iv) };
}

export async function verifyKey(key: CryptoKey, verifierB64: string, verifierIvB64: string) {
  try {
    const pt = await aesGcmDecrypt(key, b64ToBuf(verifierIvB64), b64ToBuf(verifierB64));
    return utf8Dec.decode(pt) === "ok";
  } catch {
    return false;
  }
}
