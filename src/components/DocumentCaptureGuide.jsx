import { BiCamera, BiChevronDown, BiCrop, BiSearchAlt, BiSun } from 'react-icons/bi';

export default function DocumentCaptureGuide() {
  return <details className="document-capture-guide">
    <summary>
      <span className="capture-guide-icon"><BiCamera aria-hidden="true" /></span>
      <span className="capture-guide-heading"><strong>How to photograph your documents</strong><span>A clear photo now means fewer corrections later.</span></span>
      <BiChevronDown className="capture-guide-chevron" aria-hidden="true" />
    </summary>
    <div className="capture-guide-body">
      <figure className="capture-guide-example">
        <svg viewBox="0 0 360 240" role="img" aria-label="Synthetic document example: leave space around all four corners, and keep text clear. Not a real ID.">
          <rect x="22" y="16" width="316" height="208" rx="18" fill="#ebe6dc" />
          <path d="M42 62V40h22 M296 40h22v22 M318 178v22h-22 M64 200H42v-22" fill="none" stroke="#b51d2b" strokeWidth="2" strokeLinecap="round" />
          <rect x="55" y="54" width="250" height="136" rx="10" fill="#d9d0c2" />
          <rect x="55" y="50" width="250" height="136" rx="10" fill="#fffdfa" stroke="#e5ddd1" />
          <rect x="69" y="66" width="58" height="76" rx="6" fill="#f0e9de" />
          <circle cx="98" cy="90" r="12" fill="#cbbca6" /><path d="M79 130v-8c0-19 38-19 38 0v8" fill="#cbbca6" />
          <text x="141" y="81" fontSize="10" fontFamily="sans-serif" fill="#9c2431" letterSpacing="1">SAMPLE DOCUMENT</text>
          <text x="141" y="102" fontSize="12" fontFamily="sans-serif" fill="#534b41">Not a real ID</text>
          <path d="M141 116h137 M141 129h94 M69 159h209 M69 169h141" stroke="#e2dacf" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <figcaption><span className="capture-example-dot" aria-hidden="true" />All corners visible. Details in focus.<small>Synthetic example · Never upload this image.</small></figcaption>
      </figure>
      <ol className="capture-tips">
        <li><BiSun aria-hidden="true" /><div><strong>Find soft, even light</strong><p>Use a flat surface. Avoid flash glare, shadows and reflections over text.</p></div></li>
        <li><BiCrop aria-hidden="true" /><div><strong>Leave room around the edges</strong><p>Hold the camera straight and steady. Keep all four corners inside the frame.</p></div></li>
        <li><BiSearchAlt aria-hidden="true" /><div><strong>Zoom in before confirming</strong><p>Check names, numbers and fine print. Retake if blurred. For portraits, use a plain white background.</p></div></li>
      </ol>
      <p className="capture-guide-note">The current application requires both sides of your ID. Changes need owner approval. Include only the evidence requested; a clear photo does not establish authenticity.</p>
    </div>
  </details>;
}
