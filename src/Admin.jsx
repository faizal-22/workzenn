import { useCallback, useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { defaultSocialSettings } from "./lib/socialSettings.js";
import { useSocialSettings } from "./contexts/SocialSettingsContext.jsx";

const ADMIN_EMAIL = "workzenn7@gmail.com";
const STORAGE_BUCKET = "workzenn-portfolio";
const sections = [
  ["overview", "Dashboard Overview"],
  ["portfolio", "Portfolio Management"],
  ["videos", "Upload Videos"],
  ["logos", "Upload Logos"],
  ["posters", "Upload Posters"],
  ["services", "Manage Services"],
  ["pricing", "Manage Pricing"],
  ["enquiries", "Customer Enquiries"],
  ["trials", "Free Trial Requests"],
  ["social", "Social Media Settings"],
];

function isRecoveryFlow() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  return query.get("mode") === "reset" || hash.get("type") === "recovery";
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <rect height="14" rx="4" stroke="currentColor" strokeWidth="1.5" width="14" x="3" y="3" />
      <circle cx="10" cy="10" r="3.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14.7" cy="5.6" fill="currentColor" r="1" />
    </svg>
  );
}

function AdminLogin() {
  const [mode, setMode] = useState(isRecoveryFlow() ? "update" : "login");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState(
    new URLSearchParams(window.location.search).get("unauthorized") === "1"
      ? "This account is not authorized to access the admin dashboard."
      : "",
  );
  const [busy, setBusy] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!supabase) {
      setErrorMessage("Admin sign-in is unavailable until Supabase is configured.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email")).trim();
    if (email.toLowerCase() !== ADMIN_EMAIL) {
      setErrorMessage("This account is not authorized to access the admin dashboard.");
      return;
    }

    setBusy(true);
    let authenticated = false;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: String(formData.get("password")),
      });
      if (error) throw error;
      authenticated = true;

      const { data: authorized, error: authorizationError } = await supabase.rpc("is_workzenn_admin");
      if (authorizationError) throw authorizationError;

      if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        setErrorMessage("Verify the admin email address before signing in.");
        return;
      }
      if (!authorized) {
        await supabase.auth.signOut();
        setErrorMessage("This account is not authorized to access the admin dashboard.");
        return;
      }
      window.location.assign("/admin");
    } catch (error) {
      if (authenticated) await supabase.auth.signOut();
      setErrorMessage(error.message || "Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!supabase) {
      setErrorMessage("Password recovery is unavailable until Supabase is configured.");
      return;
    }

    const email = String(new FormData(event.currentTarget).get("email")).trim();
    if (email.toLowerCase() !== ADMIN_EMAIL) {
      setErrorMessage("Password reset is available only for the authorized admin email.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(ADMIN_EMAIL, {
        redirectTo: `${window.location.origin}/admin/login?mode=reset`,
      });
      if (error) throw error;
      setMessage("If an account exists for the admin email, a password reset link is on its way.");
    } catch (error) {
      setErrorMessage(error.message || "Could not request a reset link. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordUpdate(event) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!supabase) {
      setErrorMessage("Password recovery is unavailable until Supabase is configured.");
      return;
    }

    const password = new FormData(event.currentTarget).get("password");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: String(password) });
      if (error) throw error;
      setMessage("Password updated. You can now sign in with your new password.");
      setMode("login");
      window.history.replaceState({}, "", "/admin/login");
    } catch (error) {
      setErrorMessage(error.message || "Could not update the password. Request a new reset link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-auth-page">
      <section aria-labelledby="admin-auth-title" className="admin-auth-card">
        <a aria-label="WORKZENN home" className="brand-mark" href="/">WORKZENN<span>.</span></a>
        <div className="admin-auth-intro">
          <p className="eyebrow"><span className="status-dot" /> Private workspace</p>
          <h1 id="admin-auth-title">
            {mode === "forgot" ? "Reset your password." : mode === "update" ? "Choose a new password." : "Welcome back."}
          </h1>
          <p>
            {mode === "forgot"
              ? "Request a secure reset link for the authorized admin email."
              : mode === "update"
                ? "Choose a strong password for your admin account."
                : "Sign in with the authorized WORKZENN admin account."}
          </p>
        </div>
        {!supabaseConfigured && (
          <p className="admin-alert admin-alert-error" role="alert">
            Supabase is not configured. Add the project URL and public anon key to `.env.local` to enable admin sign-in.
          </p>
        )}

        {mode === "login" && (
          <form className="admin-form" onSubmit={handleLogin}>
            <label>Email address<input autoComplete="email" defaultValue={ADMIN_EMAIL} name="email" required type="email" /></label>
            <label>Password<input autoComplete="current-password" name="password" required type="password" /></label>
            <button className="button button-red" disabled={busy || !supabaseConfigured} type="submit">
              {busy ? "Signing in..." : "Sign in"}
            </button>
            <button className="admin-text-button" onClick={() => { setMode("forgot"); setErrorMessage(""); setMessage(""); }} type="button">
              Forgot password?
            </button>
          </form>
        )}

        {mode === "forgot" && (
          <form className="admin-form" onSubmit={handleForgotPassword}>
            <label>Email address<input autoComplete="email" defaultValue={ADMIN_EMAIL} name="email" required type="email" /></label>
            <button className="button button-red" disabled={busy || !supabaseConfigured} type="submit">
              {busy ? "Sending..." : "Send reset link"}
            </button>
            <button className="admin-text-button" onClick={() => { setMode("login"); setErrorMessage(""); setMessage(""); }} type="button">
              Back to sign in
            </button>
          </form>
        )}

        {mode === "update" && (
          <form className="admin-form" onSubmit={handlePasswordUpdate}>
            <label>
              New password
              <input autoComplete="new-password" minLength={8} name="password" required type="password" />
            </label>
            <button className="button button-red" disabled={busy || !supabaseConfigured} type="submit">
              {busy ? "Updating..." : "Update password"}
            </button>
          </form>
        )}

        {errorMessage && <p aria-live="polite" className="admin-alert admin-alert-error" role="alert">{errorMessage}</p>}
        {message && <p aria-live="polite" className="admin-alert admin-alert-success" role="status">{message}</p>}
        <a className="admin-back-link" href="/">← Back to website</a>
      </section>
    </main>
  );
}

const managerConfig = {
  portfolio: {
    table: "portfolio_samples",
    title: "Portfolio samples",
    description: "Add, edit, publish, and remove portfolio work shown on the public website.",
    fields: ["name", "category", "type", "description", "asset_type", "asset_url", "published"],
  },
  videos: {
    table: "portfolio_samples",
    title: "Upload videos",
    description: "Upload a video and attach it to a portfolio sample.",
    fields: ["name", "category", "type", "description", "asset_type", "asset_url", "published"],
    assetType: "video",
  },
  logos: {
    table: "portfolio_samples",
    title: "Upload logos",
    description: "Upload a logo and attach it to a portfolio sample.",
    fields: ["name", "category", "type", "description", "asset_type", "asset_url", "published"],
    assetType: "logo",
  },
  posters: {
    table: "portfolio_samples",
    title: "Upload posters",
    description: "Upload a poster and attach it to a portfolio sample.",
    fields: ["name", "category", "type", "description", "asset_type", "asset_url", "published"],
    assetType: "poster",
  },
  services: {
    table: "services",
    title: "Services",
    description: "Manage the services displayed on the public website.",
    fields: ["title", "description", "tags", "published"],
  },
  pricing: {
    table: "pricing_plans",
    title: "Service pricing",
    description: "Manage INR prices for the services displayed on the public website.",
    fields: ["name", "detail", "price", "items", "featured", "published"],
  },
  enquiries: {
    table: "enquiries",
    title: "Customer enquiries",
    description: "Review messages submitted through the public website.",
    requestType: "enquiry",
    readOnly: true,
  },
  trials: {
    table: "enquiries",
    title: "Free trial requests",
    description: "Review requests for a complimentary consultation.",
    requestType: "trial",
    readOnly: true,
  },
};

function initialValues(section) {
  const defaults = {
    name: "",
    title: "",
    category: "Brand",
    type: "",
    description: "",
    asset_type: managerConfig[section].assetType || "poster",
    asset_url: "",
    storage_path: "",
    published: false,
    tags: "",
    detail: "",
    price: "",
    pricing_key: "",
    items: "",
    featured: false,
  };
  return defaults;
}

function canRetryEmail(row) {
  if (["pending", "failed"].includes(row.notification_status)) return true;
  return row.notification_status === "sending"
    && row.notification_attempted_at
    && Date.parse(row.notification_attempted_at) < Date.now() - 10 * 60 * 1000;
}

function AdminManager({ section }) {
  const config = managerConfig[section];
  const [rows, setRows] = useState([]);
  const [values, setValues] = useState(() => initialValues(section));
  const [editingId, setEditingId] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [retryingId, setRetryingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [status, setStatus] = useState("");

  const loadRows = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    const enquiryColumns = "id,request_type,name,email,business,service,budget,description,instagram_username,reference_image_url,status,notification_status,notification_error,notification_attempted_at,created_at";
    let query = supabase.from(config.table).select(config.table === "enquiries" ? enquiryColumns : "*");
    if (config.requestType) query = query.eq("request_type", config.requestType);
    if (config.assetType) query = query.eq("asset_type", config.assetType);
    if (section === "pricing") query = query.not("pricing_key", "is", null);
    if (config.table === "enquiries") query = query.order("created_at", { ascending: false });
    else query = query.order("sort_order", { ascending: true }).order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) setErrorMessage(error.message || "Could not load this section.");
    else setRows(data || []);
    setLoading(false);
  }, [config]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  function startEdit(row) {
    setEditingId(row.id);
    setValues({
      ...initialValues(section),
      ...row,
      tags: Array.isArray(row.tags) ? row.tags.join(", ") : "",
      items: Array.isArray(row.items) ? row.items.join("\n") : "",
    });
    setFile(null);
    setStatus("");
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId("");
    setValues(initialValues(section));
    setFile(null);
  }

  async function handleSave(event) {
    event.preventDefault();
    setErrorMessage("");
    setStatus("");
    let normalizedPrice = "";
    if (config.table === "pricing_plans") {
      normalizedPrice = String(values.price).trim();
      if (!/^(?:₹(?:[0-9]+|[0-9]{1,3}(?:,[0-9]{3})+)|Starting at ₹(?:[0-9]+|[0-9]{1,3}(?:,[0-9]{3})+)|Custom quotation)$/.test(normalizedPrice)) {
        setErrorMessage("Enter an INR price (for example ₹299 or Starting at ₹4,999) or use Custom quotation.");
        return;
      }
    }

    setBusy(true);
    let nextValues = { ...values };
    if (config.table === "pricing_plans") nextValues.price = normalizedPrice;
    let uploadedPath = "";
    let cleanupWarning = "";

    try {
      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, file, { upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;
        uploadedPath = path;
        const { data: publicUrl } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        nextValues.asset_url = publicUrl.publicUrl;
        nextValues.storage_path = path;
      }

      if (config.table === "services") {
        nextValues.tags = String(values.tags).split(",").map((tag) => tag.trim()).filter(Boolean);
      }
      if (config.table === "pricing_plans") {
        nextValues.items = String(values.items).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
      }

      const editable = config.fields.concat("sort_order").reduce((result, field) => {
        if (field in nextValues) result[field] = nextValues[field];
        return result;
      }, {});
      if (config.table === "portfolio_samples") {
        editable.asset_url = nextValues.asset_url || "";
        editable.storage_path = nextValues.storage_path || "";
      }
      if (config.table === "services") editable.tags = nextValues.tags;
      if (config.table === "pricing_plans") {
        editable.items = nextValues.items;
        editable.pricing_key = editingId
          ? values.pricing_key
          : String(values.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      }

      const request = editingId
        ? supabase.from(config.table).update(editable).eq("id", editingId)
        : supabase.from(config.table).insert(editable);
      const { error } = await request;
      if (error) throw error;

      if (uploadedPath && editingId && values.storage_path && values.storage_path !== uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from(STORAGE_BUCKET).remove([values.storage_path]);
        if (cleanupError) cleanupWarning = `Saved successfully, but the replaced upload could not be removed: ${cleanupError.message}`;
      }
      setStatus(editingId ? "Changes saved." : "Item created.");
      resetForm();
      await loadRows();
      if (cleanupWarning) setErrorMessage(cleanupWarning);
    } catch (error) {
      let cleanupMessage = "";
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
        if (cleanupError) cleanupMessage = ` The uploaded file could not be cleaned up: ${cleanupError.message}`;
      }
      setErrorMessage(`${error.message || "Could not save this item."}${cleanupMessage}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Delete "${row.name || row.title || row.email}"?`)) return;
    setErrorMessage("");
    setStatus("");
    const { error } = await supabase.from(config.table).delete().eq("id", row.id);
    if (error) {
      setErrorMessage(error.message || "Could not delete this item.");
      return;
    }
    if (row.storage_path) {
      const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove([row.storage_path]);
      if (storageError) setErrorMessage(`Item deleted, but its uploaded file could not be removed: ${storageError.message}`);
    }
    setStatus("Item deleted.");
    await loadRows();
  }

  async function handleToggle(row) {
    const { error } = await supabase.from(config.table).update({ published: !row.published }).eq("id", row.id);
    if (error) setErrorMessage(error.message || "Could not change the publish status.");
    else await loadRows();
  }

  async function handleStatusChange(row, statusValue) {
    setErrorMessage("");
    const { error } = await supabase.from("enquiries").update({ status: statusValue }).eq("id", row.id);
    if (error) setErrorMessage(error.message || "Could not update the enquiry status.");
    else await loadRows();
  }

  async function handleNotificationRetry(row) {
    setErrorMessage("");
    setRetryingId(row.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-enquiry-email", {
        body: { enquiryId: row.id },
      });
      if (error) {
        await loadRows();
        setErrorMessage(`Enquiry is still saved, but email retry failed: ${error.message}`);
        return;
      }
      if (data?.status !== "sent" && data?.status !== "already_sent") {
        await loadRows();
        setErrorMessage(`Enquiry is still saved, but email notification was not delivered: ${data?.message || "Unknown error."}`);
        return;
      }
      await loadRows();
      setStatus("Email notification delivered.");
    } catch (error) {
      await loadRows();
      setErrorMessage(`Enquiry is still saved, but email retry failed: ${error.message || "Unknown error."}`);
    } finally {
      setRetryingId("");
    }
  }

  function updateField(event) {
    const { name, value, type, checked, files } = event.target;
    if (type === "file") {
      const selectedFile = files && files[0];
      setFile(selectedFile || null);
      if (selectedFile && config.assetType) {
        setValues((current) => ({ ...current, asset_type: config.assetType }));
      }
      return;
    }
    setValues((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  return (
    <>
      <div className="admin-dashboard-heading">
        <p className="eyebrow"><span className="status-dot" /> Admin workspace</p>
        <h1>{config.title}</h1>
        <p>{config.description}</p>
      </div>
      {!config.readOnly && (
        <form className="admin-settings-card admin-manager-form" onSubmit={handleSave}>
          <div className="admin-settings-title">
            <span className="admin-settings-icon">{config.table === "portfolio_samples" ? "↥" : "+"}</span>
            <div><h2>{editingId ? "Edit item" : "Add an item"}</h2><p>Changes are protected by database authorization policies.</p></div>
          </div>

          {(config.table === "portfolio_samples" || config.table === "pricing_plans") && (
            <label>
              {config.table === "pricing_plans" ? "Service name" : "Project name"}
              <input name="name" onChange={updateField} required value={values.name} />
            </label>
          )}
          {config.table === "services" && (
            <label>Service name<input name="title" onChange={updateField} required value={values.title} /></label>
          )}
          {config.table === "portfolio_samples" && (
            <>
              <label>Category<input name="category" onChange={updateField} required value={values.category} /></label>
              <label>Project type<input name="type" onChange={updateField} value={values.type} /></label>
              <label>Description<textarea name="description" onChange={updateField} rows="3" value={values.description} /></label>
              <label>Media type
                <select name="asset_type" onChange={updateField} value={values.asset_type}>
                  <option value="video">Video</option><option value="logo">Logo</option><option value="poster">Poster</option>
                </select>
              </label>
              <label>Upload media
                <input accept={values.asset_type === "video" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp,image/gif"} name="file" onChange={updateField} type="file" />
                <span className="admin-field-hint">Up to 100 MB. Uploading a file replaces this sample&apos;s current media.</span>
              </label>
              <label>Media URL<input name="asset_url" onChange={updateField} type="url" value={values.asset_url} /></label>
            </>
          )}
          {config.table === "services" && (
            <>
              <label>Description<textarea name="description" onChange={updateField} rows="3" value={values.description} /></label>
              <label>Tags, separated by commas<input name="tags" onChange={updateField} value={values.tags} /></label>
            </>
          )}
          {config.table === "pricing_plans" && (
            <>
              <label>Plan detail<input name="detail" onChange={updateField} value={values.detail} /></label>
              <label>
                Price (INR)
                <input name="price" onChange={updateField} placeholder="₹299, Starting at ₹4,999, or Custom quotation" value={values.price} />
                <span className="admin-field-hint">Use INR only. You can set fixed prices, starting prices, or custom quotations.</span>
              </label>
              <label>What's included (one per line)<textarea name="items" onChange={updateField} rows="4" value={values.items} /></label>
              <label className="admin-checkbox-label"><input checked={values.featured} name="featured" onChange={updateField} type="checkbox" /> Highlight as featured</label>
            </>
          )}
          <label className="admin-checkbox-label">
            <input checked={values.published} name="published" onChange={updateField} type="checkbox" /> Published on the website
          </label>
          {errorMessage && <p aria-live="polite" className="admin-alert admin-alert-error" role="alert">{errorMessage}</p>}
          {status && <p aria-live="polite" className="admin-alert admin-alert-success" role="status">{status}</p>}
          <div className="admin-manager-actions">
            <button className="button button-red admin-save-button" disabled={busy} type="submit">{busy ? "Saving..." : editingId ? "Save changes" : "Create item"}</button>
            {editingId && <button className="admin-text-button" onClick={resetForm} type="button">Cancel edit</button>}
          </div>
        </form>
      )}
      {config.readOnly && errorMessage && <p aria-live="polite" className="admin-alert admin-alert-error" role="alert">{errorMessage}</p>}
      {status && config.readOnly && <p className="admin-alert admin-alert-success" role="status">{status}</p>}
      <section aria-label={config.title} className="admin-record-list">
        {loading ? <p className="admin-muted">Loading...</p> : rows.length === 0 ? <p className="admin-muted">No items yet.</p> : rows.map((row) => (
          <article className="admin-record" key={row.id}>
            <div>
              <h2>{row.name || row.title || row.email}</h2>
              <p>{row.description || row.service || row.detail || row.email || row.request_type}</p>
              {section === "pricing" && row.price && <p>Price: {row.price}</p>}
              {row.created_at && <time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString()}</time>}
              {row.request_type && <p>Enquiry ID: {row.id}</p>}
              {row.request_type && <p>Request type: {row.request_type === "trial" ? "Free trial" : "Enquiry"}</p>}
              {row.email && <a className="admin-record-link" href={`mailto:${row.email}`}>{row.email}</a>}
              {row.service && <p>Selected service: {row.service}</p>}
              {row.budget && <p>Customer budget: {row.budget}</p>}
              {row.instagram_username && <p>Instagram: @{row.instagram_username.replace(/^@+/, "")}</p>}
              {row.business && <p>Business: {row.business}</p>}
              {row.request_type && row.description && <p>Project description: {row.description}</p>}
              {row.reference_image_url && <a className="admin-record-link" href={row.reference_image_url} rel="noreferrer" target="_blank">View reference image</a>}
              {row.notification_status && (
                <p>Email notification: {{
                  sent: "Sent",
                  failed: "Failed",
                  pending: "Pending",
                  sending: "Pending",
                  not_applicable: "Not sent",
                }[row.notification_status] || "Pending"}</p>
              )}
              {row.notification_error && <p className="admin-notification-error">Notification error: {row.notification_error}</p>}
              {"published" in row && <span className={`admin-record-status${row.published ? " is-published" : ""}`}>{row.published ? "Published" : "Draft"}</span>}
              {row.asset_url && <a className="admin-record-link" href={row.asset_url} rel="noreferrer" target="_blank">View media</a>}
              {row.status && <label className="admin-record-status-control">Status
                <select onChange={(event) => handleStatusChange(row, event.target.value)} value={row.status}>
                  <option value="new">New</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
              </label>}
            </div>
            <div className="admin-record-actions">
              {config.table === "portfolio_samples" && <button className="admin-text-button" onClick={() => handleToggle(row)} type="button">{row.published ? "Unpublish" : "Publish"}</button>}
              {row.request_type && canRetryEmail(row) && (
                <button className="admin-text-button" disabled={retryingId === row.id} onClick={() => handleNotificationRetry(row)} type="button">
                  {retryingId === row.id ? "Retrying..." : "Retry email"}
                </button>
              )}
              {!config.readOnly && <button className="admin-text-button" onClick={() => startEdit(row)} type="button">Edit</button>}
              <button className="admin-text-button" onClick={() => handleDelete(row)} type="button">Delete</button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function DashboardOverview({ onNavigate }) {
  return (
    <>
      <div className="admin-dashboard-heading">
        <p className="eyebrow"><span className="status-dot" /> Private workspace</p>
        <h1>Dashboard overview</h1>
        <p>Manage your portfolio, website content, enquiries, and social links.</p>
      </div>
      <div className="admin-overview-grid">
        {sections.slice(1).map(([id, title]) => (
          <button className="admin-overview-card" key={id} onClick={() => onNavigate(id)} type="button">
            <span>{title}</span><span aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
    </>
  );
}

function SocialSettingsManager() {
  const { settings, loadError, loadSettings, saveSettings } = useSocialSettings();
  const [form, setForm] = useState(defaultSocialSettings);
  const [status, setStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(settings), [settings]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setErrorMessage("");
    setStatus("");

    setSaving(true);
    try {
      await saveSettings({
        business_email: form.business_email.trim(),
      });
      setStatus("Social media settings saved.");
    } catch (error) {
      setErrorMessage(error.message || "Could not save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="admin-dashboard-heading">
        <p className="eyebrow"><span className="status-dot" /> Site configuration</p>
        <h1>Social media settings</h1>
        <p>Update your public contact and social links. Changes are used throughout the website.</p>
      </div>
      <form className="admin-settings-card" onSubmit={handleSave}>
        <div className="admin-settings-title">
          <span className="admin-settings-icon"><InstagramIcon /></span>
          <div><h2>Contact details</h2><p>The public Instagram profile is fixed; this email is displayed as the other contact channel.</p></div>
        </div>
        {loadError && <div className="admin-alert admin-alert-error" role="alert">{loadError} <button className="admin-inline-button" onClick={loadSettings} type="button">Retry</button></div>}
        <p><a className="admin-record-link" href="https://www.instagram.com/_workzennn_/" rel="noreferrer" target="_blank">https://www.instagram.com/_workzennn_/</a></p>
        <label>Business email<input autoComplete="email" name="business_email" onChange={updateField} placeholder="hello@yourbrand.com" type="email" value={form.business_email} /></label>
        {errorMessage && <p aria-live="polite" className="admin-alert admin-alert-error" role="alert">{errorMessage}</p>}
        {status && <p aria-live="polite" className="admin-alert admin-alert-success" role="status">{status}</p>}
        <button className="button button-red admin-save-button" disabled={saving} type="submit">{saving ? "Saving..." : "Save social settings"}</button>
      </form>
    </>
  );
}

function AdminDashboard() {
  const [section, setSection] = useState("overview");
  const [errorMessage, setErrorMessage] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setErrorMessage(error.message || "Could not sign out. Please try again.");
      setLoggingOut(false);
      return;
    }
    window.location.replace("/admin/login");
  }

  return (
    <main className="admin-dashboard-page">
      <header className="admin-topbar">
        <a aria-label="WORKZENN website" className="brand-mark" href="/">WORKZENN<span>.</span></a>
        <div><span className="admin-account-label">{ADMIN_EMAIL}</span><button className="admin-logout" disabled={loggingOut} onClick={handleLogout} type="button">{loggingOut ? "Logging out..." : "Log out"} <span aria-hidden="true">↗</span></button></div>
      </header>
      <div className="admin-workspace">
        <nav aria-label="Admin dashboard" className="admin-sidebar">
          {sections.map(([id, title]) => (
            <button aria-current={section === id ? "page" : undefined} className={section === id ? "is-active" : ""} key={id} onClick={() => { setSection(id); setErrorMessage(""); }} type="button">{title}</button>
          ))}
          <a className="admin-back-link" href="/">← View website</a>
        </nav>
        <section className="admin-dashboard-content">
          {errorMessage && <p aria-live="polite" className="admin-alert admin-alert-error" role="alert">{errorMessage}</p>}
          {section === "overview" ? <DashboardOverview onNavigate={setSection} /> : null}
          {section === "social" ? <SocialSettingsManager /> : null}
          {managerConfig[section] ? <AdminManager key={section} section={section} /> : null}
        </section>
      </div>
    </main>
  );
}

export function AdminRoute() {
  const [access, setAccess] = useState("checking");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!supabase) {
      window.location.replace("/admin/login");
      return undefined;
    }
    let active = true;
    let checkId = 0;
    let handlingUnauthorized = false;

    async function verifySession(session) {
      const currentCheck = ++checkId;
      if (!session) {
        window.location.replace("/admin/login?redirect=%2Fadmin");
        return;
      }
      setAccess("checking");
      const { data, error } = await supabase.rpc("is_workzenn_admin");
      if (!active || currentCheck !== checkId) return;
      if (error) {
        setErrorMessage(error.message || "Could not verify admin access.");
        setAccess("error");
        return;
      }
      if (!data) {
        handlingUnauthorized = true;
        await supabase.auth.signOut();
        if (active) window.location.replace("/admin/login?unauthorized=1");
        return;
      }
      setAccess("authorized");
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setErrorMessage(error.message || "Could not verify your session.");
        setAccess("error");
        return;
      }
      verifySession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" && !handlingUnauthorized) {
        window.location.replace("/admin/login");
      } else if (event === "TOKEN_REFRESHED" && session) {
        verifySession(session);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (access === "authorized") return <AdminDashboard />;
  if (access === "error") {
    return (
      <main className="admin-auth-page">
        <section className="admin-auth-card">
          <a aria-label="WORKZENN home" className="brand-mark" href="/">WORKZENN<span>.</span></a>
          <div className="admin-alert admin-alert-error" role="alert">Admin access could not be verified: {errorMessage}</div>
          <a className="button button-outline" href="/admin/login">Return to admin sign in</a>
        </section>
      </main>
    );
  }
  return <main aria-label="Verifying admin access" className="admin-loading"><span className="status-dot" /> Verifying admin access...</main>;
}

export { AdminLogin };

export default function Admin({ page }) {
  return page === "/admin/login" ? <AdminLogin /> : <AdminRoute />;
}
