import { useState } from 'react';
import { Link } from 'react-router-dom';
import ApplicationSupport from './ApplicationSupport';
export default function ReceiptAccess({ receipt }) {
  const [message,setMessage]=useState('');
  return <div className="receipt-next-steps">
    {receipt?.accessCode ? <>
      <h3>Private tracking access</h3>
      <p>Anyone with this code and your reference can view status and send requested replacements. Keep both private.</p>
      <code className="access-code">{receipt.accessCode}</code>
      <p>Expires: {new Date(receipt.accessExpiresAt).toLocaleDateString()}. Save before leaving; this code is not kept in your browser draft.</p>
      <button type="button" className="ref-copy-btn" onClick={()=>{
        const blob=new Blob([`Siomai Street application receipt\nReference: ${receipt.id}\nPrivate access code: ${receipt.accessCode}\nAccess expires: ${receipt.accessExpiresAt}\nTrack: ${window.location.origin}/application/status\nReceipt is not approval. Keep this file private.\n`],{type:'text/plain'});
        const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='siomai-street-private-receipt.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Receipt download started. Store the downloaded file privately.');
      }}>Download private receipt</button>
      <p role="status">{message}</p>
    </> : <p>Tracking access was not included in this receipt. Keep your reference for support.</p>}
    <ol><li>Save your receipt.</li><li>Open Track Status with your reference and private code.</li><li>Replace requested documents there; do not submit a new application.</li></ol>
    <ApplicationSupport /><Link to="/application/status">Track Status and document requests</Link>
  </div>;
}
