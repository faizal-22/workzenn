import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { defaultSocialSettings } from "./lib/socialSettings.js";
import { useSocialSettings } from "./contexts/SocialSettingsContext.jsx";

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
    setBusy(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: String(formData.get("email")).trim(),
        password: String(formData.get("password")),
      });

      if (error) throw error;

      const { data: admin, error: authorizationError } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (authorizationError) throw authorizationError;

      if (!admin) {
        await supabase.auth.signOut();
        setErrorMessage("This account is not authorized to access the admin dashboard.");
        return;
      }

      window.location.assign("/admin");
    } catch (error) {
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

    const email = new FormData(event.currentTarget).get("email");
    setBusy(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(String(email).trim(), {
        redirectTo: `${window.location.origin}/admin/login?mode=reset`,
      });
      if (error) throw error;
      setMessage("If an account exists for that email, a password reset link is on its way.");
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
              ? "Enter the email address linked to your admin account."
              : mode === "update"
                ? "Choose a strong password for your admin account."
                : "Sign in with an authorized WORKZENN admin account."}
          </p>
        </div>
        {!supabaseConfigured && (
          <p className="admin-alert admin-alert-error" role="alert">
            Supabase is not configured. Add the project URL and public anon key to `.env.local` to enable admin sign-in.
          </p>
        )}

        {mode === "login" && (
          <form className="admin-form" onSubmit={handleLogin}>
            <label>Email address<input autoComplete="email" name="email" required type="email" /></label>
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
            <label>Email address<input autoComplete="email" name="email" required type="email" /></label>
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

function AdminDashboard() {
  const { settings, loadError, loadSettings, saveSettings } = useSocialSettings();
  const [form, setForm] = useState(defaultSocialSettings);
  const [status, setStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setErrorMessage("");
    setStatus("");

    const username = form.instagram_username.trim().replace(/^@+/, "");
    const instagramUrl = form.instagram_url.trim();
    let normalizedUrl = instagramUrl;

    if (instagramUrl) {
      try {
        const parsedUrl = new URL(instagramUrl);
        if (
          parsedUrl.protocol !== "https:" ||
          !["instagram.com", "www.instagram.com"].includes(parsedUrl.hostname.toLowerCase())
        ) {
          throw new Error("Use a secure Instagram profile URL, such as https://www.instagram.com/yourname/.");
        }
        normalizedUrl = parsedUrl.toString();
      } catch (error) {
        setErrorMessage((error.message || "").startsWith("Use a secure")
          ? error.message
          : "Enter a valid HTTPS Instagram profile URL.");
        return;
      }
    }

    const whatsappNumber = form.whatsapp_number.replace(/\D/g, "");
    if (whatsappNumber && (whatsappNumber.length < 8 || whatsappNumber.length > 15)) {
      setErrorMessage("Enter a WhatsApp number with country code (8–15 digits).");
      return;
    }

    const nextSettings = {
      instagram_username: username,
      instagram_url: normalizedUrl,
      whatsapp_number: whatsappNumber,
      business_email: form.business_email.trim(),
    };

    setSaving(true);
    try {
      await saveSettings(nextSettings);
      setStatus("Social media settings saved.");
    } catch (error) {
      setErrorMessage(error.message || "Could not save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    if (!supabase) {
      window.location.replace("/admin/login");
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      setErrorMessage(error.message || "Could not sign out. Please try again.");
      return;
    }

    window.location.replace("/admin/login");
  }

  return (
    <main className="admin-dashboard-page">
      <header className="admin-topbar">
        <a aria-label="WORKZENN website" className="brand-mark" href="/">WORKZENN<span>.</span></a>
        <div>
          <span className="admin-account-label">Admin dashboard</span>
          <button className="admin-logout" onClick={handleLogout} type="button">Log out <span aria-hidden="true">↗</span></button>
        </div>
      </header>
      <section className="admin-dashboard-content">
        <a className="admin-back-link" href="/">← View website</a>
        <div className="admin-dashboard-heading">
          <p className="eyebrow"><span className="status-dot" /> Site configuration</p>
          <h1>Social media settings</h1>
          <p>Update your public contact and social links. Changes are used throughout the website.</p>
        </div>
        <form className="admin-settings-card" onSubmit={handleSave}>
          <div className="admin-settings-title">
            <span className="admin-settings-icon"><InstagramIcon /></span>
            <div><h2>Social & contact details</h2><p>Only authorized admins can change these values.</p></div>
          </div>
          {loadError && (
            <div className="admin-alert admin-alert-error" role="alert">
              {loadError} <button className="admin-inline-button" onClick={loadSettings} type="button">Retry</button>
            </div>
          )}
          <label>
            Instagram username
            <input autoComplete="off" name="instagram_username" onChange={updateField} placeholder="_workzennn_" value={form.instagram_username} />
            <span className="admin-field-hint">Enter without the @ symbol.</span>
          </label>
          <label>
            Instagram profile URL
            <input autoComplete="url" name="instagram_url" onChange={updateField} placeholder="https://www.instagram.com/_workzennn_/" type="url" value={form.instagram_url} />
          </label>
          <label>
            WhatsApp number
            <input autoComplete="tel" inputMode="tel" name="whatsapp_number" onChange={updateField} placeholder="Country code + number, e.g. 919876543210" value={form.whatsapp_number} />
            <span className="admin-field-hint">Include your country code; spaces and punctuation are removed when saved.</span>
          </label>
          <label>
            Business email
            <input autoComplete="email" name="business_email" onChange={updateField} placeholder="hello@yourbrand.com" type="email" value={form.business_email} />
          </label>
          {errorMessage && <p aria-live="polite" className="admin-alert admin-alert-error" role="alert">{errorMessage}</p>}
          {status && <p aria-live="polite" className="admin-alert admin-alert-success" role="status">{status}</p>}
          <button className="button button-red admin-save-button" disabled={saving} type="submit">
            {saving ? "Saving..." : "Save social settings"}
          </button>
        </form>
      </section>
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
      const { data, error } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

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
          <div className="admin-alert admin-alert-error" role="alert">
            Admin access could not be verified: {errorMessage}
          </div>
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
