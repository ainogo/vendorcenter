import React from "react";
import ReactDOM from "react-dom/client";
import VendorApp from "./vendor/VendorApp";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import "./i18n/i18n";
import "./index.css";
import "leaflet/dist/leaflet.css";

const rootEl = document.getElementById("root");

if (!rootEl) {
  throw new Error("Missing root element (#root)");
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <VendorApp />
    </AppErrorBoundary>
  </React.StrictMode>
);
