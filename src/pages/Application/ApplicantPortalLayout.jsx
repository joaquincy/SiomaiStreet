import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import PageMeta from '../../components/PageMeta';
import './Application.css';
import './ApplicationExperience.css';
import './ApplicationAccess.css';
import './ApplicantPortal.css';

export function ApplicantPortalNav() {
  const tabClass = ({ isActive }) => `app-subnav-tab${isActive ? ' active' : ''}`;
  return <nav className="app-subnav" aria-label="Application portal sections"><div className="app-subnav-inner">
    <NavLink className={tabClass} end to="/application">Submit Application</NavLink>
    <NavLink className={tabClass} to="/application/status">Track Status</NavLink>
    <NavLink className={tabClass} to="/application/onboarding">Onboarding</NavLink>
  </div>
  </nav>;
}

export default function ApplicantPortalLayout({ children }) {
  const { pathname } = useLocation();
  const onboarding = pathname.endsWith('/onboarding');
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return <main className="application-page applicant-portal"><PageMeta title={onboarding ? 'Franchise Onboarding Guide' : 'Track Your Application'} description={onboarding ? 'Prepare for your next steps with the Siomai Street franchise onboarding guide.' : 'Privately check your franchise application status and respond to document requests.'} path={pathname} /><ApplicantPortalNav /><div className="portal-shell">{children}</div></main>;
}
