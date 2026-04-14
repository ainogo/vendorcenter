import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export default class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep this log for field diagnosis when users report blank screens.
    console.error("[app-error-boundary] Unhandled render error", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: "22px", marginBottom: "10px", fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ fontSize: "14px", opacity: 0.8, marginBottom: "16px" }}>
            The page failed to render. Please refresh once.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: "#f97316",
              color: "#fff",
              border: 0,
              borderRadius: "10px",
              padding: "10px 14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Refresh page
          </button>
        </div>
      </div>
    );
  }
}
