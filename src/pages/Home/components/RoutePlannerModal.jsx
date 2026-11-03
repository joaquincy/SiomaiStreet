import { useEffect, useRef } from 'react';
import { BiX, BiNavigation } from 'react-icons/bi';

export default function RoutePlannerModal({ open, onClose, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const panel = dialog.current;
    if (!open) return;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    panel.showModal();
    document.body.style.overflow = 'hidden';
    panel.querySelector('#store-route-title')?.focus({ preventScroll: true });
    return () => {
      panel.close();
      document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open]);
  return <dialog ref={dialog} id="store-route-dialog" className="store-finder__route-dialog" aria-labelledby="store-route-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="store-finder__route-dialog-bar">
      <button type="button" className="store-finder__route-close" onClick={onClose} aria-label="Close"><BiX aria-hidden="true" /></button>
    </div>
    {children}
  </dialog>;
}
