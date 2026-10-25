import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import CookieConsent from './components/CookieConsent';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home/Home';

const MenuPage = lazy(() => import('./pages/Menu/Menu'));
const ReviewsPage = lazy(() => import('./pages/Reviews/Reviews'));
const ApplicationPage = lazy(() => import('./pages/Application/Application'));
const PrivacyPolicy = lazy(() => import('./pages/Legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/Legal/TermsOfService'));
const CookiePolicy = lazy(() => import('./pages/Legal/CookiePolicy'));

/* ─── H7: Loading fallback ─── */
const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    paddingTop: 'var(--nav-height)',
  }}>
    <div className="page-loader">
      <div className="page-loader-spinner" />
      <p>Loading…</p>
    </div>
  </div>
);

/* ─── H6: 404 page ─── */
const NotFound = () => (
  <main style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    paddingTop: 'var(--nav-height)',
    textAlign: 'center',
    padding: 'var(--space-5xl) var(--space-xl)',
  }}>
    <h1 style={{
      fontFamily: 'var(--font-heading)',
      fontSize: 'var(--fs-display)',
      fontWeight: 900,
      color: 'var(--color-red)',
      marginBottom: '8px',
    }}>
      404
    </h1>
    <p style={{
      fontSize: 'var(--fs-h3)',
      fontWeight: 700,
      color: 'var(--color-charcoal)',
      marginBottom: '8px',
    }}>
      Page Not Found
    </p>
    <p style={{
      fontSize: 'var(--fs-body)',
      color: 'var(--color-gray-500)',
      marginBottom: '24px',
      maxWidth: '420px',
    }}>
      The page you're looking for doesn't exist or has been moved.
    </p>
    <Link to="/" className="btn btn-primary">
      Back to Home
    </Link>
  </main>
);

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Navbar />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/application" element={<ApplicationPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Footer />
        <CookieConsent />
      </ErrorBoundary>
    </Router>
  );
}

export default App;
