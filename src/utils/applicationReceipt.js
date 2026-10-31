export function formatReceiptDate(value, includeTime = false) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null;
  return new Intl.DateTimeFormat('en-PH', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Manila',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(new Date(value));
}

export function privateReceiptText(receipt, origin) {
  const trackUrl = new URL('/application/status', origin);
  // Credentials belong only in the applicant's explicitly downloaded file, never in a URL.
  return [
    'SIOMAI STREET — APPLICATION RECEIPT',
    '',
    `Reference: ${receipt.id}`,
    `Received: ${receipt.submittedAt || 'Not provided'}`,
    `Private access code: ${receipt.accessCode || 'Not included in this receipt'}`,
    `Access expires: ${formatReceiptDate(receipt.accessExpiresAt) || 'Not provided'} (Philippine time)`,
    `Track status: ${trackUrl.href}`,
    '',
    'Receipt confirms submission only, not franchise approval, a binding franchise agreement, or account activation.',
    'Use Track Status to check for updates and replace requested documents. Do not submit a new application for corrections.',
    'Keep this file private. Anyone with the reference and access code can view status and send requested replacements.',
    'Never send your private access code to support.',
  ].join('\n');
}
