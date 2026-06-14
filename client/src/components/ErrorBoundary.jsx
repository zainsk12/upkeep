// client/src/components/ErrorBoundary.jsx
//
// Global React Error Boundary.
// Catches unexpected rendering/runtime errors anywhere in the component tree,
// prevents the full UI from going blank, and shows a minimal recovery screen.
// Uses a class component because React's error boundary API (componentDidCatch
// + getDerivedStateFromError) is only available on class components.

import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Safe console log — visible in browser DevTools and server-side log collectors
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
    // Navigate to home so the user lands on a working page
    window.location.href = "/";
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-5">⚠️</div>
          <h1 className="text-xl font-bold text-text mb-2 font-display">
            Something went wrong
          </h1>
          <p className="text-muted text-sm leading-relaxed mb-6">
            An unexpected error occurred. Our team has been notified.
            Please try returning to the home page.
          </p>
          <button
            onClick={() => this.handleReset()}
            className="inline-flex items-center justify-center gap-2
              px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover
              text-white text-sm font-bold transition-all
              hover:-translate-y-0.5 shadow-md shadow-primary/25
              focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }
}