import { useState, useEffect, useRef } from "react";
import Head from "next/head";

type FileEntry = {
  id: string;
  name: string;
  url: string;
  filename: string;
  uploadedAt: string;
  uploadedBy: string;
  access: string;
};

type Dev = {
  id: string;
  name: string;
  title: string;
  image: string;
  addedAt: string;
};

type UserEntry = {
  id: string;
  username: string;
  tier: "basic" | "premium";
  createdAt: string;
};

export default function Home() {
  const [tab, setTab] = useState<"files" | "devs" | "login" | "admin">("files");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesLocked, setFilesLocked] = useState(false);
  const [devs, setDevs] = useState<Dev[]>([]);
  const [devsLoading, setDevsLoading] = useState(true);
  const [users, setUsers] = useState<UserEntry[]>([]);

  const [token, setToken] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<string>("");
  const [currentRole, setCurrentRole] = useState<string>("");

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<"file" | "link">("file");
  const [uploadLink, setUploadLink] = useState("");
  const [uploadAccess, setUploadAccess] = useState<"basic" | "premium" | "both">("both");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [devName, setDevName] = useState("");
  const [devTitle, setDevTitle] = useState("");
  const [devImage, setDevImage] = useState<File | null>(null);
  const [devSaving, setDevSaving] = useState(false);
  const [devError, setDevError] = useState("");
  const [devSuccess, setDevSuccess] = useState(false);
  const devImageRef = useRef<HTMLInputElement>(null);
  const [devImagePreview, setDevImagePreview] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newTier, setNewTier] = useState<"basic" | "premium">("basic");
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState("");
  const [userSuccess, setUserSuccess] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const getToken = () => localStorage.getItem("republic_token") || "";

  useEffect(() => {
    const t = localStorage.getItem("republic_token") || "";
    const u = localStorage.getItem("republic_user") || "";
    const r = localStorage.getItem("republic_role") || "";
    setToken(t); setCurrentUser(u); setCurrentRole(r);
    fetchFiles(t);
    fetchDevs();
    if (r === "admin" && t) fetchUsers(t);

    // Visit tracking
    try {
      const visitCount = parseInt(localStorage.getItem("republic_visits") || "0") + 1;
      const isReturning = visitCount > 1;
      localStorage.setItem("republic_visits", visitCount.toString());

      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loggedIn: !!t,
          username: u || null,
          role: r || null,
          userAgent: navigator.userAgent,
          isReturning,
          visitCount,
          page: window.location.hostname,
        }),
      }).catch(() => {});
    } catch {}
  }, []);

  const fetchFiles = async (t: string) => {
    setFilesLoading(true);
    try {
      const headers: HeadersInit = {};
      if (t) headers["Authorization"] = `Bearer ${t}`;
      const res = await fetch("/api/files", { headers });
      const data = await res.json();
      if (data.locked) { setFilesLocked(true); setFiles([]); }
      else { setFilesLocked(false); setFiles(Array.isArray(data.files) ? data.files.reverse() : []); }
    } catch { setFiles([]); }
    setFilesLoading(false);
  };

  const fetchDevs = async () => {
    setDevsLoading(true);
    try {
      const res = await fetch("/api/devs");
      const data = await res.json();
      setDevs(Array.isArray(data) ? data : []);
    } catch { setDevs([]); }
    setDevsLoading(false);
  };

  const fetchUsers = async (t: string) => {
    try {
      const res = await fetch("/api/manageuser", { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch { setUsers([]); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(""); setLoginLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error || "Invalid credentials"); }
      else {
        const t = data.token; const r = data.role; const u = data.username;
        setToken(t); setCurrentUser(u); setCurrentRole(r);
        localStorage.setItem("republic_token", t);
        localStorage.setItem("republic_user", u);
        localStorage.setItem("republic_role", r);
        setLoginUsername(""); setLoginPassword("");
        fetchFiles(t);
        if (r === "admin") { setTab("admin"); fetchUsers(t); }
        else { setTab("files"); }
      }
    } catch { setLoginError("Connection error"); }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    setToken(""); setCurrentUser(""); setCurrentRole("");
    localStorage.removeItem("republic_token");
    localStorage.removeItem("republic_user");
    localStorage.removeItem("republic_role");
    setTab("files"); fetchFiles("");
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = getToken();
    if (!uploadName.trim()) { setUploadError("Please enter a name."); return; }
    if (uploadType === "file" && !uploadFile) { setUploadError("Please select a file."); return; }
    if (uploadType === "link" && !uploadLink.trim()) { setUploadError("Please enter a URL."); return; }
    setUploading(true); setUploadError(""); setUploadSuccess(false);

    if (uploadType === "link") {
      try {
        const res = await fetch("/api/addlink", {
          method: "POST",
          headers: { "Authorization": `Bearer ${t}`, "Content-Type": "application/json" },
          body: JSON.stringify({ name: uploadName.trim(), url: uploadLink.trim(), access: uploadAccess }),
        });
        if (!res.ok) { const data = await res.json(); setUploadError(data.error || "Failed to save link"); }
        else { setUploadSuccess(true); setUploadName(""); setUploadLink(""); await fetchFiles(t); setTimeout(() => setUploadSuccess(false), 3000); }
      } catch { setUploadError("Network error. Try again."); }
      setUploading(false); return;
    }

    const formData = new FormData();
    formData.append("name", uploadName.trim());
    formData.append("file", uploadFile!);
    formData.append("access", uploadAccess);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Authorization": `Bearer ${t}` },
        body: formData,
      });
      if (!res.ok) { const data = await res.json(); setUploadError(data.error || "Upload failed"); }
      else {
        setUploadSuccess(true); setUploadName(""); setUploadFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await fetchFiles(t); setTimeout(() => setUploadSuccess(false), 3000);
      }
    } catch { setUploadError("Upload failed. Check your connection."); }
    setUploading(false);
  };

  const handleDelete = async (file: FileEntry) => {
    const t = getToken(); setDeleteConfirm(null);
    try {
      await fetch("/api/delete", {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: file.id, url: file.url }),
      });
      await fetchFiles(t);
    } catch {}
  };

  const handleDeleteDev = async (dev: Dev) => {
    const t = getToken(); setDeleteConfirm(null);
    try {
      await fetch("/api/managedev", {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: dev.id }),
      });
      await fetchDevs();
    } catch {}
  };

  const handleDeleteUser = async (user: UserEntry) => {
    const t = getToken(); setDeleteConfirm(null);
    try {
      await fetch("/api/manageuser", {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id }),
      });
      await fetchUsers(t);
    } catch {}
  };

  const handleAddDev = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = getToken();
    if (!devName.trim() || !devTitle.trim()) { setDevError("Name and title are required."); return; }
    setDevSaving(true); setDevError(""); setDevSuccess(false);
    const formData = new FormData();
    formData.append("name", devName.trim());
    formData.append("title", devTitle.trim());
    if (devImage) formData.append("image", devImage);
    try {
      const res = await fetch("/api/managedev", {
        method: "POST",
        headers: { "Authorization": `Bearer ${t}` },
        body: formData,
      });
      if (!res.ok) { const data = await res.json(); setDevError(data.error || "Failed"); }
      else {
        setDevSuccess(true); setDevName(""); setDevTitle(""); setDevImage(null); setDevImagePreview(null);
        if (devImageRef.current) devImageRef.current.value = "";
        await fetchDevs(); setTimeout(() => setDevSuccess(false), 3000);
      }
    } catch { setDevError("Network error. Try again."); }
    setDevSaving(false);
  };

  const handleDevImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setDevImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setDevImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else { setDevImagePreview(null); }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = getToken();
    if (!newUsername.trim() || !newPassword.trim()) { setUserError("Username and password required."); return; }
    setUserSaving(true); setUserError(""); setUserSuccess(false);
    try {
      const res = await fetch("/api/manageuser", {
        method: "POST",
        headers: { "Authorization": `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword.trim(), tier: newTier }),
      });
      if (!res.ok) { const data = await res.json(); setUserError(data.error || "Failed"); }
      else {
        setUserSuccess(true); setNewUsername(""); setNewPassword(""); setNewTier("basic");
        await fetchUsers(t); setTimeout(() => setUserSuccess(false), 3000);
      }
    } catch { setUserError("Network error. Try again."); }
    setUserSaving(false);
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const isLink = (filename: string) => filename.startsWith("http://") || filename.startsWith("https://");
  const getFileIcon = (filename: string) => {
    if (isLink(filename)) return "🔗";
    const ext = filename.split(".").pop()?.toLowerCase();
    if (["jpg","jpeg","png","gif","webp","svg"].includes(ext||"")) return "🖼";
    if (["mp4","mov","avi","mkv"].includes(ext||"")) return "🎬";
    if (["mp3","wav","ogg","flac"].includes(ext||"")) return "🎵";
    if (["pdf"].includes(ext||"")) return "📄";
    if (["zip","rar","tar","gz"].includes(ext||"")) return "📦";
    if (["doc","docx"].includes(ext||"")) return "📝";
    return "📁";
  };
  const accessLabel = (a: string) => a === "basic" ? "Basic" : a === "premium" ? "Premium" : "All";
  const accessColor = (a: string) => a === "premium" ? "#c8a96e" : a === "basic" ? "#7fb3d3" : "#888";

  return (
    <>
      <Head>
        <title>Republic</title>
        <meta name="description" content="Republic" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {deleteConfirm && (
        <div className="overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-text">Are you sure you want to delete this?</p>
            <div className="confirm-btns">
              <button className="confirm-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="confirm-delete" onClick={() => {
                const [type, ...rest] = deleteConfirm.split(":");
                const id = rest.join(":");
                if (type === "file") handleDelete(files.find(f => f.id === id)!);
                if (type === "dev") handleDeleteDev(devs.find(d => d.id === id)!);
                if (type === "user") handleDeleteUser(users.find(u => u.id === id)!);
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="page">
        <header className="header">
          <div className="header-inner">
            <div className="logo">
              <span className="logo-text">REPUBLIC</span>
              <span className="logo-line" />
            </div>
            <nav className="nav">
              <button className={`nav-btn ${tab === "files" ? "active" : ""}`} onClick={() => setTab("files")}>Files</button>
              <button className={`nav-btn ${tab === "devs" ? "active" : ""}`} onClick={() => setTab("devs")}>Team</button>
              {currentRole === "admin" && (
                <button className={`nav-btn ${tab === "admin" ? "active" : ""}`} onClick={() => setTab("admin")}>Admin</button>
              )}
              {token ? (
                <button className="nav-btn logout-btn" onClick={handleLogout}>Sign Out</button>
              ) : (
                <button className={`nav-btn ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>Login</button>
              )}
            </nav>
          </div>
        </header>

        <main className="main">

          {tab === "files" && (
            <div className="tab-content">
              <div className="tab-header">
                <h1 className="tab-title">Files</h1>
                {currentRole
                  ? <p className="tab-subtitle">Signed in as <strong>{currentUser}</strong> · <span style={{ color: currentRole === "premium" ? "#c8a96e" : currentRole === "admin" ? "#2ecc71" : "#7fb3d3", textTransform: "capitalize" }}>{currentRole}</span></p>
                  : <p className="tab-subtitle">Login to access files</p>}
              </div>
              {filesLocked ? (
                <div className="lock-screen">
                  <div className="lock-icon">🔒</div>
                  <h2 className="lock-title">Members Only</h2>
                  <p className="lock-text">You need an account to access files.</p>
                  <button className="submit-btn" onClick={() => setTab("login")}>Login</button>
                </div>
              ) : filesLoading ? (
                <div className="loading"><div className="loading-bar" /><p>Loading...</p></div>
              ) : files.length === 0 ? (
                <div className="empty"><span className="empty-icon">◻</span><p>No files available.</p></div>
              ) : (
                <div className="files-grid">
                  {files.map((file) => (
                    <a key={file.id} href={file.url} target="_blank" rel="noopener noreferrer" className="file-card">
                      <span className="file-icon">{getFileIcon(file.filename)}</span>
                      <div className="file-info">
                        <span className="file-name">{file.name}</span>
                        <span className="file-meta">{isLink(file.filename) ? file.url : file.filename} · {formatDate(file.uploadedAt)}</span>
                      </div>
                      <span className="access-pill" style={{ background: accessColor(file.access) + "22", color: accessColor(file.access), border: `1px solid ${accessColor(file.access)}44` }}>{accessLabel(file.access)}</span>
                      <span className="file-arrow">↗</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "devs" && (
            <div className="tab-content">
              <div className="tab-header">
                <h1 className="tab-title">Team</h1>
                <p className="tab-subtitle">The people behind the Republic</p>
              </div>
              {devsLoading ? (
                <div className="loading"><div className="loading-bar" /><p>Loading...</p></div>
              ) : devs.length === 0 ? (
                <div className="empty"><span className="empty-icon">◻</span><p>No team members added yet.</p></div>
              ) : (
                <div className="devs-grid">
                  {devs.map((dev) => (
                    <div key={dev.id} className="dev-card">
                      <div className="dev-avatar">
                        {dev.image ? <img src={dev.image} alt={dev.name} className="dev-img" /> : <span className="dev-initial">{dev.name.charAt(0).toUpperCase()}</span>}
                      </div>
                      <div className="dev-info">
                        <span className="dev-name">{dev.name}</span>
                        <span className="dev-title-text">{dev.title}</span>
                      </div>
                    </div>
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
                  <h2>Sign In</h2>
                </div>
                <form onSubmit={handleLogin} className="login-form">
                  <div className="field">
                    <label>Username</label>
                    <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} autoComplete="username" placeholder="Enter username" />
                  </div>
                  <div className="field">
                    <label>Password</label>
                    <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} autoComplete="current-password" placeholder="Enter password" />
                  </div>
                  {loginError && <p className="error-msg">{loginError}</p>}
                  <button type="submit" className="submit-btn" disabled={loginLoading}>{loginLoading ? "Signing in..." : "Sign In"}</button>
                </form>
              </div>
            </div>
          )}

          {tab === "admin" && currentRole === "admin" && (
            <div className="tab-content">
              <div className="tab-header">
                <h1 className="tab-title">Admin</h1>
                <p className="tab-subtitle">Signed in as <strong>{currentUser}</strong></p>
              </div>

              <h2 className="section-title">Publish File or Link</h2>
              <div className="upload-box">
                <form onSubmit={handleUpload} className="upload-form">
                  <div className="field">
                    <label>Display Name</label>
                    <input type="text" value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="Name shown to users" />
                  </div>
                  <div className="field">
                    <label>Type</label>
                    <div className="toggle-row">
                      <button type="button" className={`toggle-btn ${uploadType === "file" ? "active" : ""}`} onClick={() => setUploadType("file")}>File</button>
                      <button type="button" className={`toggle-btn ${uploadType === "link" ? "active" : ""}`} onClick={() => setUploadType("link")}>Link</button>
                    </div>
                  </div>
                  {uploadType === "file" ? (
                    <div className="field">
                      <label>File</label>
                      <div className="drop-area" onClick={() => fileInputRef.current?.click()}>
                        {uploadFile ? <span className="drop-filename">📎 {uploadFile.name}</span> : <span className="drop-hint">Click to select a file</span>}
                        <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                      </div>
                    </div>
                  ) : (
                    <div className="field">
                      <label>URL</label>
                      <input type="url" value={uploadLink} onChange={(e) => setUploadLink(e.target.value)} placeholder="https://example.com" />
                    </div>
                  )}
                  <div className="field">
                    <label>Access Level</label>
                    <div className="toggle-row">
                      <button type="button" className={`toggle-btn ${uploadAccess === "basic" ? "active" : ""}`} onClick={() => setUploadAccess("basic")}>Basic</button>
                      <button type="button" className={`toggle-btn ${uploadAccess === "both" ? "active" : ""}`} onClick={() => setUploadAccess("both")}>Both</button>
                      <button type="button" className={`toggle-btn ${uploadAccess === "premium" ? "active" : ""}`} onClick={() => setUploadAccess("premium")}>Premium</button>
                    </div>
                  </div>
                  {uploadError && <p className="error-msg">{uploadError}</p>}
                  {uploadSuccess && <p className="success-msg">✓ Published successfully</p>}
                  <button type="submit" className="submit-btn" disabled={uploading}>{uploading ? "Publishing..." : "Publish"}</button>
                </form>
              </div>

              <h2 className="section-title">Create User Account</h2>
              <div className="upload-box">
                <form onSubmit={handleAddUser} className="upload-form">
                  <div className="field">
                    <label>Username</label>
                    <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="e.g. john123" autoCapitalize="none" autoCorrect="off" />
                  </div>
                  <div className="field">
                    <label>Password</label>
                    <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Set their password" autoCapitalize="none" autoCorrect="off" />
                  </div>
                  <div className="field">
                    <label>Access Level</label>
                    <div className="toggle-row">
                      <button type="button" className={`toggle-btn ${newTier === "basic" ? "active" : ""}`} onClick={() => setNewTier("basic")}>Basic</button>
                      <button type="button" className={`toggle-btn ${newTier === "premium" ? "active" : ""}`} onClick={() => setNewTier("premium")}>Premium</button>
                    </div>
                  </div>
                  {userError && <p className="error-msg">{userError}</p>}
                  {userSuccess && <p className="success-msg">✓ Account created</p>}
                  <button type="submit" className="submit-btn" disabled={userSaving}>{userSaving ? "Creating..." : "Create Account"}</button>
                </form>
              </div>

              <h2 className="section-title">Add Team Member</h2>
              <div className="upload-box">
                <form onSubmit={handleAddDev} className="upload-form">
                  <div className="field">
                    <label>Name</label>
                    <input type="text" value={devName} onChange={(e) => setDevName(e.target.value)} placeholder="e.g. John Doe" />
                  </div>
                  <div className="field">
                    <label>Title / Role</label>
                    <input type="text" value={devTitle} onChange={(e) => setDevTitle(e.target.value)} placeholder="e.g. Lead Developer" />
                  </div>
                  <div className="field">
                    <label>Profile Photo <span className="label-optional">(optional)</span></label>
                    <div className="avatar-upload-row">
                      {devImagePreview && <img src={devImagePreview} alt="Preview" className="avatar-preview" />}
                      <div className="drop-area" onClick={() => devImageRef.current?.click()} style={{ flex: 1 }}>
                        {devImage ? <span className="drop-filename">📎 {devImage.name}</span> : <span className="drop-hint">Click to upload photo</span>}
                        <input ref={devImageRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleDevImageChange} />
                      </div>
                    </div>
                  </div>
                  {devError && <p className="error-msg">{devError}</p>}
                  {devSuccess && <p className="success-msg">✓ Team member added</p>}
                  <button type="submit" className="submit-btn" disabled={devSaving}>{devSaving ? "Saving..." : "Add Member"}</button>
                </form>
              </div>

              <h2 className="section-title">Published Files</h2>
              {files.length === 0 ? <p className="muted">No files yet.</p> : (
                <div className="manage-list">
                  {files.map((file) => (
                    <div key={file.id} className="manage-row">
                      <span className="manage-icon">{getFileIcon(file.filename)}</span>
                      <div className="manage-info">
                        <span className="file-name">{file.name}</span>
                        <span className="file-meta">{isLink(file.filename) ? file.url : file.filename} · {formatDate(file.uploadedAt)}</span>
                      </div>
                      <span className="access-pill" style={{ background: accessColor(file.access) + "22", color: accessColor(file.access), border: `1px solid ${accessColor(file.access)}44` }}>{accessLabel(file.access)}</span>
                      <div className="manage-actions">
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="action-link">View</a>
                        <button className="action-delete" onClick={() => setDeleteConfirm(`file:${file.id}`)}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h2 className="section-title">User Accounts</h2>
              {users.length === 0 ? <p className="muted">No user accounts yet.</p> : (
                <div className="manage-list">
                  {users.map((user) => (
                    <div key={user.id} className="manage-row">
                      <span className="manage-icon">👤</span>
                      <div className="manage-info">
                        <span className="file-name">{user.username}</span>
                        <span className="file-meta">Created {formatDate(user.createdAt)}</span>
                      </div>
                      <span className="access-pill" style={{ background: accessColor(user.tier) + "22", color: accessColor(user.tier), border: `1px solid ${accessColor(user.tier)}44` }}>{user.tier}</span>
                      <div className="manage-actions">
                        <button className="action-delete" onClick={() => setDeleteConfirm(`user:${user.id}`)}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h2 className="section-title">Team Members</h2>
              {devs.length === 0 ? <p className="muted">No team members yet.</p> : (
                <div className="manage-list">
                  {devs.map((dev) => (
                    <div key={dev.id} className="manage-row">
                      <div className="manage-avatar">
                        {dev.image ? <img src={dev.image} alt={dev.name} className="manage-avatar-img" /> : <span className="manage-avatar-initial">{dev.name.charAt(0).toUpperCase()}</span>}
                      </div>
                      <div className="manage-info">
                        <span className="file-name">{dev.name}</span>
                        <span className="file-meta">{dev.title}</span>
                      </div>
                      <div className="manage-actions">
                        <button className="action-delete" onClick={() => setDeleteConfirm(`dev:${dev.id}`)}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        <footer className="footer">
          <span>REPUBLIC</span><span className="footer-sep">·</span><span>{new Date().getFullYear()}</span>
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
        .nav-btn { background: none; border: none; color: var(--muted); font-size: 13px; letter-spacing: 1px; text-transform: uppercase; padding: 6px 14px; border-radius: 4px; transition: color 0.2s, background 0.2s; cursor: pointer; font-family: inherit; }
        .nav-btn:hover { color: var(--text); background: var(--surface2); }
        .nav-btn.active { color: var(--accent); background: var(--surface2); }
        .logout-btn { border: 1px solid var(--border); }
        .main { flex: 1; max-width: 900px; margin: 0 auto; width: 100%; padding: 48px 24px; }
        .tab-content { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .tab-header { margin-bottom: 40px; border-bottom: 1px solid var(--border); padding-bottom: 24px; }
        .tab-title { font-family: 'Bebas Neue', sans-serif; font-size: 52px; letter-spacing: 3px; color: var(--text); line-height: 1; }
        .tab-subtitle { color: var(--muted); font-size: 14px; margin-top: 6px; }
        .section-title { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 2px; margin-bottom: 20px; color: var(--muted); }
        .lock-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 24px; gap: 16px; text-align: center; }
        .lock-icon { font-size: 48px; }
        .lock-title { font-family: 'Bebas Neue', sans-serif; font-size: 36px; letter-spacing: 2px; color: var(--text); }
        .lock-text { color: var(--muted); font-size: 14px; margin-bottom: 8px; }
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
        .access-pill { font-size: 11px; padding: 2px 8px; border-radius: 20px; letter-spacing: 0.5px; text-transform: uppercase; flex-shrink: 0; }
        .devs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .dev-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 28px 20px; display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; transition: border-color 0.2s, background 0.2s; }
        .dev-card:hover { border-color: var(--accent); background: var(--surface2); }
        .dev-avatar { width: 80px; height: 80px; border-radius: 50%; overflow: hidden; background: var(--surface2); border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; }
        .dev-img { width: 100%; height: 100%; object-fit: cover; }
        .dev-initial { font-family: 'Bebas Neue', sans-serif; font-size: 36px; color: var(--accent); }
        .dev-info { display: flex; flex-direction: column; gap: 4px; }
        .dev-name { font-size: 15px; font-weight: 500; color: var(--text); }
        .dev-title-text { font-size: 12px; color: var(--muted); letter-spacing: 0.5px; text-transform: uppercase; }
        .avatar-upload-row { display: flex; align-items: center; gap: 12px; }
        .avatar-preview { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border); flex-shrink: 0; }
        .manage-avatar { width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: var(--surface2); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .manage-avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .manage-avatar-initial { font-family: 'Bebas Neue', sans-serif; font-size: 18px; color: var(--accent); }
        .center { display: flex; justify-content: center; align-items: flex-start; padding-top: 80px; }
        .login-box { width: 100%; max-width: 400px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 40px; }
        .login-header { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; }
        .login-mark { color: var(--accent); font-size: 20px; }
        .login-header h2 { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 2px; }
        .login-form { display: flex; flex-direction: column; gap: 20px; }
        .field { display: flex; flex-direction: column; gap: 8px; }
        .field label { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); }
        .label-optional { font-size: 10px; opacity: 0.6; text-transform: none; letter-spacing: 0; }
        .field input { background: var(--bg); border: 1px solid var(--border); border-radius: 4px; color: var(--text); padding: 12px 14px; font-size: 16px; transition: border-color 0.2s; outline: none; }
        .field input:focus { border-color: var(--accent); }
        .field input::placeholder { color: var(--muted); }
        .toggle-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .toggle-btn { background: var(--bg); border: 1px solid var(--border); border-radius: 4px; color: var(--muted); padding: 10px 20px; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; transition: all 0.2s; cursor: pointer; font-family: inherit; min-height: 44px; }
        .toggle-btn.active { border-color: var(--accent); color: var(--accent); }
        .toggle-btn:hover { color: var(--text); }
        .drop-area { background: var(--bg); border: 1px dashed var(--border); border-radius: 4px; padding: 24px; text-align: center; cursor: pointer; transition: border-color 0.2s, background 0.2s; }
        .drop-area:hover { border-color: var(--accent); background: var(--surface2); }
        .drop-hint { color: var(--muted); font-size: 13px; }
        .drop-filename { color: var(--text); font-size: 13px; word-break: break-all; }
        .error-msg { color: #e74c3c; font-size: 13px; padding: 10px 14px; background: rgba(231,76,60,0.1); border-radius: 4px; border-left: 2px solid #e74c3c; }
        .success-msg { color: #2ecc71; font-size: 13px; padding: 10px 14px; background: rgba(46,204,113,0.1); border-radius: 4px; border-left: 2px solid #2ecc71; }
        .submit-btn { background: var(--accent); color: var(--bg); border: none; border-radius: 4px; padding: 14px 24px; font-size: 13px; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase; transition: background 0.2s, opacity 0.2s; cursor: pointer; font-family: inherit; min-height: 48px; }
        .submit-btn:hover:not(:disabled) { background: var(--accent2); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .upload-box { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 32px; max-width: 560px; margin-bottom: 48px; }
        .upload-form { display: flex; flex-direction: column; gap: 20px; }
        .manage-list { display: flex; flex-direction: column; gap: 2px; margin-bottom: 40px; }
        .manage-row { display: flex; align-items: center; gap: 14px; padding: 14px 18px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; flex-wrap: wrap; }
        .manage-icon { font-size: 18px; flex-shrink: 0; }
        .manage-info { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .manage-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .action-link { font-size: 12px; letter-spacing: 0.5px; color: var(--accent); text-transform: uppercase; padding: 8px 12px; }
        .action-link:hover { color: var(--accent2); }
        .action-delete { background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.3); border-radius: 6px; color: #e74c3c; font-size: 16px; padding: 8px 12px; cursor: pointer; font-family: inherit; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
        .action-delete:hover { background: rgba(231,76,60,0.25); }
        .muted { color: var(--muted); font-size: 14px; margin-bottom: 40px; }
        .footer { border-top: 1px solid var(--border); padding: 20px 24px; display: flex; align-items: center; gap: 12px; justify-content: center; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--border); }
        .footer-sep { color: var(--border); }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .confirm-box { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 32px; max-width: 360px; width: 100%; text-align: center; }
        .confirm-text { color: var(--text); font-size: 15px; margin-bottom: 24px; line-height: 1.5; }
        .confirm-btns { display: flex; gap: 12px; }
        .confirm-cancel { flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; color: var(--muted); font-size: 14px; padding: 12px; cursor: pointer; font-family: inherit; min-height: 48px; }
        .confirm-delete { flex: 1; background: #e74c3c; border: none; border-radius: 6px; color: white; font-size: 14px; font-weight: 500; padding: 12px; cursor: pointer; font-family: inherit; min-height: 48px; }
        @media (max-width: 600px) { .tab-title { font-size: 36px; } .login-box { padding: 24px; } .devs-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); } .upload-box { padding: 20px; } }
      `}</style>
    </>
  );
}
