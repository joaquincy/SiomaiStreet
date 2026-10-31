import { useEffect, useRef, useState } from 'react';
import { BiBowlHot, BiStore, BiEnvelope, BiPhone, BiTimeFive, BiCopy, BiCheck, BiX, BiRightArrowAlt, BiInfoCircle, BiRefresh } from 'react-icons/bi';
import { validEmail } from '../../../../shared/contact';
import { phoneUrl } from '../../../../shared/storeLocations';
import './DirectContactModal.css';

const teams = [
  { id: 'customer', name: 'Customer support', description: 'Food, orders & store visits', icon: BiBowlHot },
  { id: 'franchise', name: 'Franchise inquiries', description: 'Packages & application questions', icon: BiStore },
];

export function DirectContactDetails({ channel, contact = {}, configStatus, copyNote, copied, onCopy, onReload }) {
  const email = validEmail(contact.email) ? contact.email : '';
  const phone = phoneUrl(typeof contact.phone === 'string' ? contact.phone : '');
  const hours = typeof contact.hours === 'string' ? contact.hours : '';
  const responseNote = typeof contact.responseNote === 'string' ? contact.responseNote : '';
  const team = teams.find(item => item.id === channel) || teams[0];
  if (configStatus === 'loading') return <div className="contact-direct__empty" role="status"><BiRefresh aria-hidden="true" /><h3>Finding the right details.</h3><p>Checking contact information for {team.name.toLowerCase()}…</p></div>;
  if (configStatus === 'error') return <div className="contact-direct__empty" role="status"><BiInfoCircle aria-hidden="true" /><h3>We couldn’t load the contacts.</h3><p>Try again to check the available contact options. Your message on the page is unchanged.</p><button type="button" className="contact-direct__retry" onClick={onReload}>Try again <BiRefresh aria-hidden="true" /></button></div>;
  return <div className="contact-direct__details" role="region" aria-label={`${team.name} contact details`}>
    {email || phone ? <>
      <p className="contact-direct__team-note">{team.description}</p>
      {email && <div className="contact-direct__method"><a href={`mailto:${email}`} className="contact-direct__method-link"><BiEnvelope aria-hidden="true" /><span><span>Email {team.name.toLowerCase()}</span><strong>{email}</strong><small>Opens your email app</small></span><BiRightArrowAlt aria-hidden="true" /></a><button type="button" className="contact-direct__copy" aria-label={`Copy ${team.name.toLowerCase()} email address`} onClick={() => onCopy(email)}>{copied === email || copied === true ? <BiCheck aria-hidden="true" /> : <BiCopy aria-hidden="true" />}</button></div>}
      {phone && <div className="contact-direct__method"><a href={phone} className="contact-direct__method-link"><BiPhone aria-hidden="true" /><span><span>Call {team.name.toLowerCase()}</span><strong>{contact.phone}</strong><small>Opens your phone app</small></span><BiRightArrowAlt aria-hidden="true" /></a><button type="button" className="contact-direct__copy" aria-label={`Copy ${team.name.toLowerCase()} phone number`} onClick={() => onCopy(contact.phone)}>{copied === contact.phone ? <BiCheck aria-hidden="true" /> : <BiCopy aria-hidden="true" />}</button></div>}
      <p className="contact-direct__copy-note" role="status">{copyNote}</p>
    </> : <div className="contact-direct__empty"><BiEnvelope aria-hidden="true" /><h3>Contact details are on their way.</h3><p>This team’s direct contacts haven’t been confirmed yet. {contact.enabled ? 'You can use the message form on this page.' : 'For now, the menu, store finder and franchise FAQs can help you explore.'}</p></div>}
    {(hours || email || phone) && <div className="contact-direct__hours"><BiTimeFive aria-hidden="true" /><div><h3>Service hours</h3><p>{hours || 'Hours have not been published yet.'}</p>{responseNote && <p>{responseNote}</p>}</div></div>}
  </div>;
}

export default function DirectContactModal({ initialChannel, options, configStatus, onReload, onClose }) {
  const dialog = useRef(null), heading = useRef(null), mounted = useRef(false), copySequence = useRef(0), backdropStart = useRef(false);
  const [channel, setChannel] = useState(initialChannel);
  const [copyNote, setCopyNote] = useState(''), [copied, setCopied] = useState(false);

  useEffect(() => {
    mounted.current = true;
    const element = dialog.current, opener = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    heading.current?.focus({ preventScroll: true });
    return () => {
      mounted.current = false;
      element.close();
      document.body.style.overflow = oldOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  const changeTeam = next => {
    if (next === channel) return;
    copySequence.current++; setChannel(next); setCopyNote(''); setCopied(false);
  };
  const copy = async value => {
    const sequence = ++copySequence.current;
    try {
      await navigator.clipboard.writeText(value);
      if (mounted.current && sequence === copySequence.current) { setCopyNote(value.includes('@') ? 'Email address copied.' : 'Phone number copied.'); setCopied(value); }
    } catch {
      if (mounted.current && sequence === copySequence.current) { setCopyNote('Copy is unavailable. Select and copy the contact detail above.'); setCopied(false); }
    }
  };
  const outside = event => {
    if (event.target !== event.currentTarget) return false;
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };

  return <dialog ref={dialog} id="contact-direct-dialog" className="contact-direct" aria-labelledby="contact-direct-title" aria-describedby="contact-direct-description" onCancel={event => { event.preventDefault(); onClose(); }} onPointerDown={event => { backdropStart.current = outside(event); }} onPointerUp={event => { if (backdropStart.current && outside(event)) onClose(); backdropStart.current = false; }} onPointerCancel={() => { backdropStart.current = false; }}>
    <div className="contact-direct__surface">
      <header className="contact-direct__header"><span className="contact-direct__eyebrow">SIOMAI STREET / CONTACT DESK</span><button type="button" className="contact-direct__close" onClick={onClose} aria-label="Close direct contacts"><BiX aria-hidden="true" /></button></header>
      <div className="contact-direct__body">
        <div className="contact-direct__intro"><span className="contact-direct__letter" aria-hidden="true"><BiEnvelope /></span><h2 ref={heading} id="contact-direct-title" tabIndex={-1}>A direct <em>line.</em></h2><p id="contact-direct-description">Choose a team for contact options and service hours.</p></div>
        <div className="contact-direct__teams" role="group" aria-label="Direct contact team">{teams.map(team => <button type="button" key={team.id} aria-pressed={channel === team.id} onClick={() => changeTeam(team.id)}><team.icon aria-hidden="true" /><span>{team.name}</span>{channel === team.id && <BiCheck aria-hidden="true" />}</button>)}</div>
        <span className="contact-support__sr-only" role="status">Showing {channel === 'customer' ? 'customer support' : 'franchise inquiry'} contact options.</span>
        <DirectContactDetails channel={channel} contact={options?.[channel]} configStatus={configStatus} copyNote={copyNote} copied={copied} onCopy={copy} onReload={onReload} />
      </div>
      <footer className="contact-direct__footer"><span>Your unfinished message stays on the page.</span><button type="button" onClick={onClose}>Return to contact section <BiRightArrowAlt aria-hidden="true" /></button></footer>
    </div>
  </dialog>;
}
