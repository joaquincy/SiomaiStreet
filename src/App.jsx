import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import ErrorBoundary from './components/ErrorBoundary';
import SiteNotice from './components/SiteNotice';
import RateLimitNotice from './components/RateLimitNotice';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home/Home';
import BackToTop from './components/BackToTop';
import RouteScrollReset from './components/RouteScrollReset';
import {
  MenuPageSkeleton,
  ReviewsPageSkeleton,
  ApplicationPageSkeleton,
  DefaultPageSkeleton,
} from './components/Skeleton';

const MenuPage = lazy(() => import('./pages/Menu/Menu'));
const ReviewsPage = lazy(() => import('./pages/Reviews/Reviews'));
const ApplicationPage = lazy(() => import('./pages/Application/Application'));
const ApplicationStatus = lazy(() => import('./pages/Application/ApplicationStatus'));
const ApplicationOnboarding = lazy(() => import('./pages/Application/ApplicationOnboarding'));
// Keep the public /privacy URL; use a neutral module filename because browser
// content filters can block PrivacyPolicy script requests before React loads them.
const PrivacyPolicy = lazy(() => import('./pages/Legal/DataNoticePage'));
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
        <RouteScrollReset />
        <Navbar />
        <Suspense fallback={<DefaultPageSkeleton />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/menu"
              element={
                <Suspense fallback={<MenuPageSkeleton />}>
                  <MenuPage />
                </Suspense>
              }
            />
            <Route
              path="/reviews"
              element={
                <Suspense fallback={<ReviewsPageSkeleton />}>
                  <ReviewsPage />
                </Suspense>
              }
            />
            <Route
              path="/application"
              element={
                <Suspense fallback={<ApplicationPageSkeleton />}>
                  <ApplicationPage />
                </Suspense>
              }
            />
            <Route
              path="/application/status"
              element={
                <Suspense fallback={<ApplicationPageSkeleton />}>
                  <ApplicationStatus />
                </Suspense>
              }
            />
            <Route
              path="/application/onboarding"
              element={
                <Suspense fallback={<ApplicationPageSkeleton />}>
                  <ApplicationOnboarding />
                </Suspense>
              }
            />
            <Route
              path="/privacy"
              element={
                <Suspense fallback={<DefaultPageSkeleton title="Privacy Policy" />}>
                  <PrivacyPolicy />
                </Suspense>
              }
            />
            <Route
              path="/terms"
              element={
                <Suspense fallback={<DefaultPageSkeleton title="Terms of Service" />}>
                  <TermsOfService />
                </Suspense>
              }
            />
            <Route
              path="/cookies"
              element={
                <Suspense fallback={<DefaultPageSkeleton title="Cookie Policy" />}>
                  <CookiePolicy />
                </Suspense>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BackToTop />
        </Suspense>
        <Footer />
        <SiteNotice />
        <RateLimitNotice />
      </ErrorBoundary>
    </Router>
  );
}

export default App;
