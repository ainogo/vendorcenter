import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="w-full h-[300px] rounded-xl border flex items-center justify-center bg-muted/30">
            <p className="text-sm text-muted-foreground">Map could not be loaded. You can still fill in other details.</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
