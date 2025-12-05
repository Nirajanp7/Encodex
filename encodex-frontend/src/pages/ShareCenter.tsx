import { useEffect, useState } from "react";
import { sharesAPI, filesAPI, handleAPIError } from "../lib/api";

export default function ShareCenterPage({ email }: { email: string }) {
  const [sharedWithMe, setSharedWithMe] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSharedFiles();
  }, []);

  const loadSharedFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await sharesAPI.listSharedWithMe();
      setSharedWithMe(response.shared_files || []);
    } catch (err: any) {
      setError(handleAPIError(err));
    } finally {
      setLoading(false);
    }
  };

  const downloadSharedFile = async (sharedFile: any) => {
    try {
      setError(null);
      // Note: This is a demo - in production, you'd need the owner's key or re-encryption
      alert(`To download this file, you'll need the owner's password for decryption.\nOwner: ${sharedFile.owner_email}`);
      
      // For now, just download the encrypted file
      const encryptedBlob = await filesAPI.download(sharedFile.file.id);
      const blob = new Blob([encryptedBlob]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = sharedFile.file.filename + ".encrypted";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      const errorMsg = handleAPIError(err);
      setError(errorMsg);
      alert("Download failed: " + errorMsg);
    }
  };

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div>
        <h2 style={{ margin: 0 }}>Shared with Me</h2>
        <p className="subtle mts">Files that other users have shared with you</p>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="card centerText">Loading shared files...</div>
      ) : sharedWithMe.length === 0 ? (
        <div className="card subtle centerText">No files shared with you yet.</div>
      ) : (
        <div className="grid">
          {sharedWithMe.map((item) => (
            <div key={item.share.id} className="card">
              <div className="fileCardHeader">
                <div className="fileName">{item.file.filename}</div>
                <span className="chip">Shared</span>
              </div>
              <div className="subtle mts">
                From: {item.owner_name} ({item.owner_email})
              </div>
              <div className="subtle mts">
                {(item.file.size / 1024).toFixed(1)} KB • {item.file.category}
              </div>
              <div className="row mtt">
                <button 
                  className="btn btnPrimary" 
                  onClick={() => downloadSharedFile(item)}
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mtt" style={{ padding: '16px', background: 'rgba(255, 193, 7, 0.1)', borderRadius: '12px', border: '1px solid rgba(255, 193, 7, 0.3)' }}>
        <strong>📝 Note:</strong> For full zero-knowledge encryption, shared files would need to be re-encrypted with your key or use public-key cryptography. 
        In this demo, shared files can be downloaded but require the owner's password for decryption.
      </div>
    </section>
  );
}
