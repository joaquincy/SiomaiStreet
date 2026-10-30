// Publish contact details only after the owner verifies them.
export default function ApplicationSupport() {
  const email = import.meta.env.VITE_VERIFIED_FRANCHISE_SUPPORT_EMAIL || '';
  return <p>{/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? <>Application help: <a href={`mailto:${email}`}>{email}</a>. Include your reference number, but never send your private access code.</>
    : 'A verified application-support contact has not yet been published. Support details and response timelines must be confirmed before public launch.'}</p>;
}
