// Format checks are not identity verification. Only issuer-documented formats
// are enforced; other cards and foreign/older formats remain reviewable.
export const ID_NUMBER_GUIDANCE = {
  'PhilID (National ID)': 'Use the 16-digit PhilSys Card Number (PCN) on the front, for example 1234-5678-9012-3456. Do not enter your private 12-digit PSN.',
  Passport: 'Copy the passport number from the identity page, including letters. Formats vary by issuing country and edition.',
  "Driver's License": 'Copy the license number, including letters and separators. Do not use the receipt or transaction number.',
  UMID: 'Use the 12-digit Common Reference Number (CRN) printed on the UMID card, for example 0000-0000000-0. Keep leading zeroes.',
  'Postal ID': 'Copy the ID number printed on your card. Older editions may use a different format.',
  "Voter's ID": 'Copy the identification number printed on your card, not the precinct number.',
  Other: 'Copy the number exactly as printed and identify the document and issuer above. A reviewer will assess it.',
};
export const hasIssuerFormat = type => type === 'PhilID (National ID)' || type === 'UMID';
export function idNumberIssue(data) {
  const value = (data.govIdNumber || '').trim();
  if (!value) return '';
  if (value.length > 80 || /[\p{Cc}\p{Cf}]/u.test(value)) return 'Government ID number must contain only the printed number, within 80 characters.';
  if (!hasIssuerFormat(data.govIdType)) return '';
  const compact = value.replace(/[\s-]/g, '');
  if (data.govIdType === 'UMID') {
    return /^\d{12}$/.test(compact) || (data.govIdReviewReason || '').trim().length >= 10 ? '' : 'Government ID number: enter the 12-digit UMID CRN, or describe the different printed format in at least 10 characters for staff review.';
  }
  if (/^\d{12}$/.test(compact)) return 'Government ID number: use your 16-digit PCN, not the private 12-digit PSN.';
  if (!/^\d{16}$/.test(compact) && (data.govIdReviewReason || '').trim().length < 10) return 'Government ID number: enter the 16-digit PCN, or describe the different printed format in at least 10 characters for staff review.';
  return '';
}

// Conservative repetition detection, not a language, spelling or honesty score.
// Bound work to the same input limit as the shared application validator.
export function repeatedFiller(value) {
  if (typeof value !== 'string') return false;
  const words = value.slice(0, 20000).normalize('NFKC').toLocaleLowerCase().match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || [];
  if (words.length < 20) return false;
  const counts = new Map();
  for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);
  if (Math.max(...counts.values()) / words.length >= .7) return true;
  // Catch a short phrase copied many times, with at most a small changed tail.
  for (let length = 2; length <= 8; length++) {
    let matches = 0;
    for (let i = length; i < words.length; i++) if (words[i] === words[i % length]) matches++;
    if (words.length >= length * 5 && matches / (words.length - length) >= .9) return true;
  }
  return false;
}
export const ANSWER_QUALITY_MESSAGES = {
  whyInterested: 'Why interested: this answer repeats the same word or phrase. Please describe why you want to operate a Siomai Street franchise.',
  personalValues: 'Personal values: this answer repeats the same word or phrase. Please describe your own values and how you would use them.',
  brandValuesExplanation: 'Brand values explanation: this answer repeats the same word or phrase. Please give examples of your selected values in practice.',
};
export const DUPLICATE_ID_MESSAGE = 'ID (Back): this is the same file as the front. Select the reverse side of your ID. Your front image and other answers are kept.';
export function duplicateIdSides(data, fingerprints = {}) {
  return data.govIdType !== 'Passport' && /^[a-f0-9]{64}$/.test(fingerprints.govIdFront || '') && fingerprints.govIdFront === fingerprints.govIdBack;
}
