import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { SocialSettingsProvider } from "./contexts/SocialSettingsContext.jsx";
import "./index.css";

const Admin = lazy(() => import("./Admin.jsx"));
const path = window.location.pathname.replace(/\/+$/, "") || "/";
const page = path === "/admin/login" || path === "/admin" || path.startsWith("/admin/")
  ? <Suspense fallback={<main className="admin-loading">Loading admin...</main>}><Admin page={path} /></Suspense>
  : <App />;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SocialSettingsProvider>{page}</SocialSettingsProvider>
  </React.StrictMode>,
);
