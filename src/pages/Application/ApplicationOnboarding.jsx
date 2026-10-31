import { Link } from 'react-router-dom';
import { BiArrowToRight, BiCheck, BiChevronDown, BiStore, BiFile, BiCalendar } from 'react-icons/bi';
import ApplicantPortalLayout from './ApplicantPortalLayout';
import ApplicationSupport from './ApplicationSupport';

const stages = [
  { title: 'Confirm the decision', description: 'Start with an official update.', items: ['Check your application status using your reference and private access code.', 'Resolve any document requests through Track Status.', 'Wait for the team to confirm approval and the next steps. A submission receipt is not approval.'] },
  { title: 'Review your offer & agreement', description: 'Understand the details before committing.', items: ['Request the current written quotation, package inclusions, exclusions and recurring charges.', 'Review the franchise agreement and ask the team about anything that is unclear.', 'Confirm official payment instructions directly with the business before sending any money.'] },
  { title: 'Prepare your business & location', description: 'Work from a confirmed checklist.', items: ['Discuss the proposed territory, site suitability and any location conditions with the team.', 'Request the final list of business registrations, permits and site documents that apply to your situation.', 'Submit additional evidence only through a channel confirmed by the team.'] },
  { title: 'Coordinate training & setup', description: 'Agree on responsibilities and schedules.', items: ['Confirm who will operate the branch and attend any required training.', 'Agree on equipment, supplies, installation and staff responsibilities.', 'Ask for confirmed dates; this page does not reserve a training or installation slot.'] },
  { title: 'Confirm launch readiness', description: 'Open with a clear handover.', items: ['Review the final readiness checklist with your assigned contact.', 'Confirm any outstanding requirements and the approved opening date.', 'Get the operational support and escalation contacts before launch.'] },
];

export default function ApplicationOnboarding() {
  return <ApplicantPortalLayout>
    <header className="app-page-header portal-page-header"><div className="app-header-left"><h1>Franchise Onboarding</h1><p>Prepare for your next steps. Your reviewer will confirm the requirements and schedule that apply to you.</p></div></header>
    <div className="portal-onboarding-layout">

      <section className="portal-roadmap app-form-card" aria-labelledby="onboarding-roadmap-title"><div className="portal-section-heading"><div><span className="step-eyebrow">PREPARE AT YOUR PACE</span><h2 id="onboarding-roadmap-title">Your next-step guide</h2></div><span className="portal-tag">For planning</span></div><p className="portal-roadmap-note">Suggested preparation stages. The owner must confirm the final process, fees and required documents.</p>
        {stages.map((stage, index) => <details key={stage.title} className="portal-stage" open={index === 0}><summary><span className="portal-stage-number">0{index + 1}</span><span><strong>{stage.title}</strong><small>{stage.description}</small></span><BiChevronDown aria-hidden="true" /></summary><ul>{stage.items.map(item => <li key={item}><BiCheck aria-hidden="true" /><span>{item}</span></li>)}</ul></details>)}
        <div className="portal-guidance"><BiFile aria-hidden="true" /><div><strong>Keep one clear record.</strong><p>Save your receipt, written quotation and official instructions securely. This guide does not collect additional documents or payments.</p></div></div>
      </section>
      <aside className="portal-onboarding-aside helper-card"><div className="portal-art" aria-hidden="true"><BiStore /><span>SIOMAI STREET</span></div><span className="step-eyebrow">YOUR STARTING POINT</span><h2>First, check your status.</h2><p>This is a preparation guide, not your personal onboarding record. Your reviewer will confirm the requirements, contacts and schedule that apply to you.</p><Link className="portal-primary step-nav-continue" to="/application/status">Track my application <span className="btn-arrow-badge"><BiArrowToRight aria-hidden="true" /></span></Link><div className="portal-aside-note"><BiCalendar aria-hidden="true" /><span>No dates or appointments are booked on this page.</span></div></aside>
    </div><div className="portal-support"><ApplicationSupport /></div>
  </ApplicantPortalLayout>;
}
