import React from "react";
import ReactDOM from "react-dom/client";
import AdminApp from "./admin/AdminApp";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import "./i18n/i18n";
import "./index.css";

const rootEl = document.getElementById("root");

if (!rootEl) {
  throw new Error("Missing root element (#root)");
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AdminApp />
    </AppErrorBoundary>
  </React.StrictMode>
);
