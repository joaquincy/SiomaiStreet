// Leave space for multipart fields below Vercel's 4.5 MB request limit.
export const MAX_REVIEW_PHOTO_BYTES = 3 * 1024 * 1024;
export const MAX_REVIEW_REQUEST_BYTES = 4 * 1024 * 1024;
export const REVIEW_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const REVIEW_SUBMISSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validReviewSubmissionId(value) {
  return typeof value === 'string' && REVIEW_SUBMISSION_ID_PATTERN.test(value.trim());
}

export function isValidReviewReceipt(receipt, submissionId) {
  if (!receipt || typeof receipt !== 'object') return false;
  if (typeof receipt.id !== 'string' || !receipt.id || receipt.status !== 'pending') return false;
  if (receipt.submissionId !== undefined) {
    if (!validReviewSubmissionId(receipt.submissionId)) return false;
    if (submissionId && receipt.submissionId.trim().toLowerCase() !== String(submissionId).trim().toLowerCase()) return false;
  }
  return true;
}
