import { useState, useEffect, useRef } from "react";
import Head from "next/head";

type FileEntry = {
  id: string;
  name: string;
  url: string;
  filename: string;
  uploadedAt: string;
  uploadedBy: string;
};

export default function Home() {
  const [tab, setTab] = useState<"files" | "login" | "admin">("files");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);

  const [token, setToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<"file" | "link">("file");
  const [uploadLink, setUploadLink] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = localStorage.getItem("republic_token");
    const u = localStorage.getItem("republic_user");
    if (t && u) {
      setToken(t);
      setAdminUser(u);
    }
  }, []);

  const fetchFiles = async () => {
    setFilesLoading(true);
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      setFiles(Array.isArray(data) ? data.reverse() : []);
    } catch {
      setFiles([]);
    }
    setFilesLoading(false);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Invalid credentials");
      } else {
        setToken(data.token);
        setAdminUser(data.username);
        localStorage.setItem("republic_token", data.token);
        localStorage.setItem("republic_user", data.username);
        setTab("admin");
        setLoginUsername("");
        setLoginPassword("");
      }
    } catch {
      setLoginError("Connection error");
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    setToken(null);
    setAdminUser(null);
    localStorage.removeItem("republic_token");
    localStorage.removeItem("republic_user");
    setTab("files");
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName.trim()) {
      setUploadError("Please enter a name.");
      return;
    }
    if (uploadType === "file" && !uploadFile) {
      setUploadError("Please select a file.");
      return;
    }
    if (uploadType === "link" && !uploadLink.trim()) {
      setUploadError("Please enter a URL.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess(false);

    if (uploadType === "link") {
      try {
        const res = await fetch("/api/addlink", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: uploadName.trim(), url: uploadLink.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          setUploadError(data.error || "Failed to save link");
        } else {
          setUploadSuccess(true);
          setUploadName("");
          setUploadLink("");
          fetchFiles();
          setTimeout(() => setUploadSuccess(false), 3000);
        }
      } catch {
        setUploadError("Failed. Check your connection.");
      }
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("name", uploadName.trim());
    formData.append("file", uploadFile!);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || "Upload failed");
      } else {
        setUploadSuccess(true);
        setUploadName("");
        setUploadFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchFiles();
        setTimeout(() => setUploadSuccess(false), 3000);
      }
    } catch {
      setUploadError("Upload failed. Check your connection.");
    }
    setUploading(false);
  };

  const handleDelete = async (file: FileEntry) => {
    if (!confirm(`Delete "${file.name}"?`)) return;
    try {
      await fetch("/api/delete", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: file.id, url: file.url }),
      });
      fetchFiles();
    } catch {}
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isLink = (filename: string) => {
    return filename.startsWith("http://") || filename.startsWith("https://");
  };

  const getFileIcon = (filename: string) => {
    if (isLink(filename)) return "🔗";
    const ext = filename.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) return "🖼";
    if (["mp4", "mov", "avi", "mkv"].includes(ext || "")) return "🎬";
    if (["mp3", "wav", "ogg", "flac"].includes(ext || "")) return "🎵";
    if (["pdf"].includes(ext || "")) return "📄";
    if (["zip", "rar", "tar", "gz"].includes(ext || "")) return "📦";
    if (["doc", "docx"].includes(ext || "")) return "📝";
    if (["xls", "xlsx"].includes(ext || "")) return "📊";
    if (["ppt", "pptx"].includes(ext || "")) return "📋";
    return "📁";
  };

  return (
    <>
      <Head>
        <title>Republic</title>
        <meta name="description" content="Republic" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="page">
        <header className="header">
          <div className="header-inner">
            <div className="logo">
              <span className="logo-text">REPUBLIC</span>
              <span className="logo-line" />
            </div>
            <nav className="nav">
              <button
                className={`nav-btn ${tab === "files" ? "active" : ""}`}
                onClick={() => setTab("files")}
              >
                Files
              </button>
              {token ? (
                <>
                  <button
                    className={`nav-btn ${tab === "admin" ? "active" : ""}`}
                    onClick={() => setTab("admin")}
                  >
                    Upload
                  </button>
                  <button className="nav-btn logout-btn" onClick={handleLogout}>
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  className={`nav-btn ${tab === "login" ? "active" : ""}`}
                  onClick={() => setTab("login")}
                >
                  Login
                </button>
              )}
            </nav>
          </div>
        </header>

        <main className="main">

          {tab === "files" && (
            <div className="tab-content">
              <div className="tab-header">
                <h1 className="tab-title">Files</h1>
                <p className="tab-subtitle">Published by the Republic</p>
              </div>

              {filesLoading ? (
                <div className="loading">
                  <div className="loading-bar" />
                  <p>Loading...</p>
                </div>
              ) : files.length === 0 ? (
                <div className="empty">
                  <span className="empty-icon">◻</span>
                  <p>No files published yet.</p>
                </div>
              ) : (
                <div className="files-grid">
                  {files.map((file) => (
                    <a
                      key={file.id}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="file-card"
                    >
                      <span className="file-icon">{getFileIcon(file.filename)}</span>
                      <div className="file-info">
                        <span className="file-name">{file.name}</span>
                        <span className="file-meta">
                          {isLink(file.filename) ? file.url : file.filename} · {formatDate(file.uploadedAt)}
                        </span>
                      </div>
                      <span className="file-arrow">↗</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "login" && !token && (
            <div className="tab-content center">
              <div className="login-box">
                <div className="login-header">
                  <span className="login-mark">▲</span>
                  <h2>Admin Access</h2>
                </div>
                <form onSubmit={handleLogin} className="login-form">
                  <div className="field">
                    <label>Username</label>
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      autoComplete="username"
                      placeholder="Enter username"
                    />
                  </div>
                  <div className="field">
                    <label>Password</label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="Enter password"
                    />
                  </div>
                  {loginError && <p className="error-msg">{loginError}</p>}
                  <button type="submit" className="submit-btn" disabled={loginLoading}>
                    {loginLoading ? "Verifying..." : "Enter"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {tab === "admin" && token && (
            <div className="tab-content">
              <div className="tab-header">
                <h1 className="tab-title">Upload</h1>
                <p className="tab-subtitle">Signed in as <strong>{adminUser}</strong></p>
              </div>

              <div className="upload-box">
                <form onSubmit={handleUpload} className="upload-form">
                  <div className="field">
                    <label>Display Name</label>
                    <input
                      type="text"
                      value={uploadName}
                      onChange={(e) => setUploadName(e.target.value)}
                      placeholder="Name shown to users"
                    />
                  </div>

                  <div className="field">
                    <label>Type</label>
                    <div className="toggle-row">
                      <button
                        type="button"
                        className={`toggle-btn ${uploadType === "file" ? "active" : ""}`}
                        onClick={() => setUploadType("file")}
                      >
                        File
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${uploadType === "link" ? "active" : ""}`}
                        onClick={() => setUploadType("link")}
                      >
                        Link
                      </button>
                    </div>
                  </div>

                  {uploadType === "file" ? (
                    <div className="field">
                      <label>File</label>
                      <div className="drop-area" onClick={() => fileInputRef.current?.click()}>
                        {uploadFile ? (
                          <span className="drop-filename">📎 {uploadFile.name}</span>
                        ) : (
                          <span className="drop-hint">Click to select a file</span>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          style={{ display: "none" }}
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="field">
                      <label>URL</label>
                      <input
                        type="url"
                        value={uploadLink}
                        onChange={(e) => setUploadLink(e.target.value)}
                        placeholder="https://example.com"
                      />
                    </div>
                  )}

                  {uploadError && <p className="error-msg">{uploadError}</p>}
                  {uploadSuccess && <p className="success-msg">✓ Published successfully</p>}

                  <button type="submit" className="submit-btn" disabled={uploading}>
                    {uploading ? "Publishing..." : "Publish"}
                  </button>
                </form>
              </div>

              <div className="manage-section">
                <h2 className="manage-title">Published Files</h2>
                {filesLoading ? (
                  <p className="muted">Loading...</p>
                ) : files.length === 0 ? (
                  <p className="muted">No files yet.</p>
                ) : (
                  <div className="manage-list">
                    {files.map((file) => (
                      <div key={file.id} className="manage-row">
                        <span className="manage-icon">{getFileIcon(file.filename)}</span>
                        <div className="manage-info">
                          <span className="file-name">{file.name}</span>
                          <span className="file-meta">
                            {isLink(file.filename) ? file.url : file.filename} · {formatDate(file.uploadedAt)}
                          </span>
                        </div>
                        <div className="manage-actions">
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="action-link">View</a>
                          <button className="action-delete" onClick={() => handleDelete(file)}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        <footer className="footer">
          <span>REPUBLIC</span>
          <span className="footer-sep">·</span>
          <span>{new Date().getFullYear()}</span>
        </footer>
      </div>

      <style jsx>{`
        .page { min-height: 100vh; display: flex; flex-direction: column; }
        .header { border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--bg); z-index: 10; }
        .header-inner { max-width: 900px; margin: 0 auto; padding: 0 24px; height: 64px; display: flex; align-items: center; justify-content: space-between; }
        .logo { display: flex; align-items: center; gap: 12px; }
        .logo-text { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 4px; color: var(--accent); }
        .logo-line { width: 1px; height: 20px; background: var(--border); }
        .nav { display: flex; align-items: center; gap: 4px; }
        .nav-btn { background: none; border: none; color: var(--muted); font-size: 13px; letter-spacing: 1px; text-transform: uppercase; padding: 6px 14px; border-radius: 4px; transition: color 0.2s, background 0.2s; cursor: pointer; }
        .nav-btn:hover { color: var(--text); background: var(--surface2); }
        .nav-btn.active { color: var(--accent); background: var(--surface2); }
        .logout-btn { border: 1px solid var(--border); }
        .main { flex: 1; max-width: 900px; margin: 0 auto; width: 100%; padding: 48px 24px; }
        .tab-content { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .tab-header { margin-bottom: 40px; border-bottom: 1px solid var(--border); padding-bottom: 24px; }
        .tab-title { font-family: 'Bebas Neue', sans-serif; font-size: 52px; letter-spacing: 3px; color: var(--text); line-height: 1; }
        .tab-subtitle { color: var(--muted); font-size: 14px; margin-top: 6px; }
        .loading { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 80px 0; color: var(--muted); font-size: 13px; }
        .loading-bar { width: 200px; height: 2px; background: var(--border); border-radius: 1px; overflow: hidden; position: relative; }
        .loading-bar::after { content: ''; position: absolute; height: 100%; width: 60px; background: var(--accent); animation: slide 1.2s infinite ease-in-out; }
        @keyframes slide { 0% { left: -60px; } 100% { left: 200px; } }
        .empty { text-align: center; padding: 80px 0; color: var(--muted); display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .empty-icon { font-size: 32px; opacity: 0.3; }
        .files-grid { display: flex; flex-direction: column; gap: 2px; }
        .file-card { display: flex; align-items: center; gap: 16px; padding: 18px 20px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; transition: background 0.2s, border-color 0.2s; }
        .file-card:hover { background: var(--surface2); border-color: var(--accent); }
        .file-icon { font-size: 22px; flex-shrink: 0; }
        .file-info { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .file-name { font-size: 15px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .file-meta { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .file-arrow { color: var(--accent); font-size: 18px; flex-shrink: 0; }
        .center { display: flex; justify-content: center; align-items: flex-start; padding-top: 80px; }
        .login-box { width: 100%; max-width: 400px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 40px; }
        .login-header { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; }
        .login-mark { color: var(--accent); font-size: 20px; }
        .login-header h2 { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 2px; }
        .login-form { display: flex; flex-direction: column; gap: 20px; }
        .field { display: flex; flex-direction: column; gap: 8px; }
        .field label { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); }
        .field input { background: var(--bg); border: 1px solid var(--border); border-radius: 4px; color: var(--text); padding: 12px 14px; font-size: 14px; transition: border-color 0.2s; outline: none; }
        .field input:focus { border-color: var(--accent); }
        .field input::placeholder { color: var(--muted); }
        .toggle-row { display: flex; gap: 8px; }
        .toggle-btn { background: var(--bg); border: 1px solid var(--border); border-radius: 4px; color: var(--muted); padding: 8px 20px; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; transition: all 0.2s; cursor: pointer; font-family: inherit; }
        .toggle-btn.active { border-color: var(--accent); color: var(--accent); }
        .toggle-btn:hover { color: var(--text); }
        .drop-area { background: var(--bg); border: 1px dashed var(--border); border-radius: 4px; padding: 24px; text-align: center; cursor: pointer; transition: border-color 0.2s, background 0.2s; }
        .drop-area:hover { border-color: var(--accent); background: var(--surface2); }
        .drop-hint { color: var(--muted); font-size: 13px; }
        .drop-filename { color: var(--text); font-size: 13px; word-break: break-all; }
        .error-msg { color: #e74c3c; font-size: 13px; padding: 10px 14px; background: rgba(231,76,60,0.1); border-radius: 4px; border-left: 2px solid #e74c3c; }
        .success-msg { color: #2ecc71; font-size: 13px; padding: 10px 14px; background: rgba(46,204,113,0.1); border-radius: 4px; border-left: 2px solid #2ecc71; }
        .submit-btn { background: var(--accent); color: var(--bg); border: none; border-radius: 4px; padding: 13px 24px; font-size: 13px; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase; transition: background 0.2s, opacity 0.2s; cursor: pointer; font-family: inherit; }
        .submit-btn:hover:not(:disabled) { background: var(--accent2); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .upload-box { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 32px; max-width: 560px; margin-bottom: 48px; }
        .upload-form { display: flex; flex-direction: column; gap: 20px; }
        .manage-title { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 2px; margin-bottom: 20px; color: var(--muted); }
        .manage-list { display: flex; flex-direction: column; gap: 2px; }
        .manage-row { display: flex; align-items: center; gap: 14px; padding: 14px 18px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; }
        .manage-icon { font-size: 18px; flex-shrink: 0; }
        .manage-info { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .manage-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .action-link { font-size: 12px; letter-spacing: 0.5px; color: var(--accent); text-transform: uppercase; }
        .action-link:hover { color: var(--accent2); }
        .action-delete { background: none; border: 1px solid var(--border); border-radius: 3px; color: var(--muted); font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase; padding: 4px 10px; transition: color 0.2s, border-color 0.2s; cursor: pointer; font-family: inherit; }
        .action-delete:hover { color: #e74c3c; border-color: #e74c3c; }
        .muted { color: var(--muted); font-size: 14px; }
        .footer { border-top: 1px solid var(--border); padding: 20px 24px; display: flex; align-items: center; gap: 12px; justify-content: center; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--border); }
        .footer-sep { color: var(--border); }
        @media (max-width: 600px) { .tab-title { font-size: 36px; } .manage-row { flex-wrap: wrap; } .login-box { padding: 24px; } }
      `}</style>
    </>
  );
}
