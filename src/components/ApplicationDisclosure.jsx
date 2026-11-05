import { BiChevronDown } from 'react-icons/bi';
import './ApplicationNotices.css';

// Native disclosure keeps keyboard operation and expanded state without extra JS.
export default function ApplicationDisclosure({ title, hint, icon: Icon, children, compact = false }) {
  return <details className={`application-disclosure${compact ? ' application-disclosure--compact' : ''}`}>
    <summary>
      {Icon && <span className="application-notice-icon" aria-hidden="true"><Icon /></span>}
      <span className="application-disclosure-caption"><span className="application-disclosure-title">{title}</span>{hint && <span className="application-disclosure-hint">{hint}</span>}</span>
      <BiChevronDown className="application-disclosure-chevron" aria-hidden="true" />
    </summary>
    <div className="application-disclosure-body">{children}</div>
  </details>;
}
