import React, { useEffect, useState } from "react";
import "./App.css";
import { deriveKeyPBKDF2, makeVerifier, verifyKey, bufToB64, b64ToBuf } from "./lib/crypto";
import { pushActivity } from "./lib/storage";
import { authAPI, clearAuthToken, handleAPIError } from "./lib/api";
import VaultPage from "./pages/Vault";
import ScanPage from "./pages/Scan";
import ShareCenterPage from "./pages/ShareCenter";
import ActivityPage from "./pages/Activity";
import SettingsPage from "./pages/Settings";
import SharePublicView from "./pages/SharePublic";

const useHashRoute = () => {
  const [route, setRoute] = useState<string>(() => window.location.hash.slice(1) || "login");
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.slice(1) || "login");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return { route, push: (r: string) => (window.location.hash = r) };
};

const navItems = [
  { key: "vault", label: "Vault" },
  { key: "scan", label: "Scan" },
  { key: "share-center", label: "Share Center" },
  { key: "activity", label: "Activity" },
  { key: "settings", label: "Settings" },
];

export default function App() {
  const { route, push } = useHashRoute();
  const [session, setSession] = useState<{ email: string; key: CryptoKey } | null>(null);
  const authed = !!session;

  return (
    <div className="app">
      <header className="header">
        <div className="brand" onClick={() => push(authed ? "vault" : "login")}>
          <div className="logo">🔐</div>
          <div className="brandTitle">EncodeX</div>
        </div>
        {authed ? (
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn btnSecondary" onClick={() => push("vault")}>
              My Files
            </button>
            <button className="btn btnSecondary" onClick={() => push("settings")}>
              Settings
            </button>
            <button className="btn btnSecondary" onClick={() => { 
              setSession(null); 
              clearAuthToken();
              push("login"); 
            }}>
              Logout
            </button>
          </div>
        ) : (
          <div className="headerNote">Secure document vault</div>
        )}
      </header>

      {authed && (
        <div className="navbar">
          <div className="navbarInner">
            {navItems.map(n => (
              <a key={n.key} className={`navLink ${route === n.key ? "navActive" : ""}`} onClick={() => push(n.key)}>
                {n.label}
              </a>
            ))}
          </div>
        </div>
      )}

      <main className="main">
        {!authed && (route === "login" || route === "register") && (
          <AuthScreen
            mode={route as "login" | "register"}
            onSwap={(m) => push(m)}
            onAuthed={(s) => { setSession(s); push("vault"); }}
          />
        )}

        {authed && route === "vault" && <VaultPage session={session!} />}
        {authed && route === "scan" && <ScanPage session={session!} />}
        {authed && route === "share-center" && <ShareCenterPage email={session!.email} />}
        {authed && route === "activity" && <ActivityPage />}
        {authed && route === "settings" && <SettingsPage email={session!.email} />}

        {!authed && route === "share" && <SharePublicView />}
      </main>

      <footer className="footer">End-to-end encrypted storage • Client-side crypto • Secure sharing</footer>
    </div>
  );
}

function AuthScreen({
  mode, onSwap, onAuthed
}: {
  mode: "login" | "register";
  onSwap: (mode: "login" | "register") => void;
  onAuthed: (session: { email: string; key: CryptoKey }) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); 
    setBusy(true);
    try {
      if (mode === "register") {
        // Generate encryption key from password
        const salt = crypto.getRandomValues(new Uint8Array(16)).buffer;
        const iterations = 150_000;
        const key = await deriveKeyPBKDF2(password, salt, iterations) as CryptoKey;
        const { verifierB64, verifierIvB64 } = await makeVerifier(key);
        
        // Register with backend
        await authAPI.register({
          email,
          name: name || email.split("@")[0],
          saltB64: bufToB64(salt),
          kdfIterations: iterations,
          verifierB64,
          verifierIvB64,
        });
        
        pushActivity({ id: crypto.randomUUID(), ts: Date.now(), actor: email, type: "REGISTER" });
        onAuthed({ email, key });
      } else {
        // Step 1: Get user data from backend
        const loginResponse = await authAPI.login(email);
        const user = loginResponse.user;
        
        // Step 2: Derive key from password using user's salt
        const key = await deriveKeyPBKDF2(password, b64ToBuf(user.saltB64), user.kdfIterations) as CryptoKey;
        
        // Step 3: Verify password client-side
        const ok = await verifyKey(key, user.verifierB64, user.verifierIvB64);
        if (!ok) throw new Error("Incorrect password");
        
        // Step 4: Get JWT tokens from backend
        await authAPI.verify(email, true);
        
        pushActivity({ id: crypto.randomUUID(), ts: Date.now(), actor: email, type: "LOGIN" });
        onAuthed({ email, key });
      }
    } catch (err: any) {
      setError(handleAPIError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card authCard">
      <h2 style={{ margin: 0 }}>{mode === "register" ? "Create your secure vault" : "Welcome back"}</h2>
      <p className="subtle mts">{mode === "register" ? "Your password derives your encryption key. We never store it." : "Enter your credentials to unlock your vault."}</p>

      <form onSubmit={submit} style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {mode === "register" && (
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Jane Doe" required />
          </div>
        )}
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" required />
        </div>
        {error && <div className="error">{error}</div>}
        <button disabled={busy} className="btn btnPrimary">{busy ? (mode === "register" ? "Creating..." : "Unlocking...") : (mode === "register" ? "Create vault" : "Unlock vault")}</button>
      </form>

      <div className="mtt" style={{ fontSize: 14 }}>
        {mode === "register" ? <>Already have an account? <a onClick={() => onSwap("login")}>Sign in</a></>
                             : <>New here? <a onClick={() => onSwap("register")}>Create an account</a></>}
      </div>
    </section>
  );
}
