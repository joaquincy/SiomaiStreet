import { Component } from 'react';
import { Link } from 'react-router-dom';

/**
 * ErrorBoundary
 *
 * Catches unhandled React render errors in its subtree and shows
 * a recovery UI instead of crashing the entire page.
 *
 * Critical for the franchise application — prevents a single
 * component error from destroying an applicant's draft data.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Future: send to Sentry or similar error tracking
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <main
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: 'var(--space-5xl) var(--space-xl)',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--fs-display)',
              fontWeight: 900,
              color: 'var(--color-red)',
              marginBottom: '8px',
            }}
          >
            Oops!
          </h1>
          <p
            style={{
              fontSize: 'var(--fs-h3)',
              fontWeight: 700,
              color: 'var(--color-charcoal)',
              marginBottom: '8px',
            }}
          >
            Something went wrong
          </p>
          <p
            style={{
              fontSize: 'var(--fs-body)',
              color: 'var(--color-gray-500)',
              marginBottom: '24px',
              maxWidth: '480px',
            }}
          >
            Don't worry — your saved draft is still on this device.
            Try refreshing, or go back to the home page.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
            <Link to="/" className="btn btn-outline" onClick={this.handleReset}>
              Back to Home
            </Link>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
