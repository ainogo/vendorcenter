import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import "./i18n/i18n";
import "./index.css";

const rootEl = document.getElementById("root");

if (!rootEl) {
	throw new Error("Missing root element (#root)");
}

createRoot(rootEl).render(
	<AppErrorBoundary>
		<App />
	</AppErrorBoundary>
);
