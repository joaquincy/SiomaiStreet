import {
  MAX_REVIEW_PHOTO_BYTES,
  REVIEW_PHOTO_TYPES,
  isValidReviewReceipt,
  validReviewSubmissionId,
} from '../../shared/reviewUpload.js';
import { rateAwareFetch } from '../utils/rateLimits.js';

const verifyReview = async (action, options) => {
  const { requestTurnstile } = await import('../utils/turnstile.js');
  return requestTurnstile(action, options);
};

export async function submitReview({
  submissionId = crypto.randomUUID(),
  name,
  text,
  rating,
  branchId,
  photo,
  signal,
  onPhase = () => {},
  verify = verifyReview,
  fetcher = rateAwareFetch,
}) {
  if (!validReviewSubmissionId(submissionId)) {
    throw new Error('This review form is out of date. Refresh the page and post your review again.');
  }
  if (!name.trim() || name.trim().length > 100 || !text.trim() || text.trim().length > 5000
    || !Number.isInteger(rating) || rating < 1 || rating > 5 || !Number.isSafeInteger(Number(branchId)) || Number(branchId) <= 0) {
    throw new Error('Choose a branch and rating, and enter your name and review. Use up to 100 characters for your name and 5,000 for your review.');
  }
  if (photo && (photo.size > MAX_REVIEW_PHOTO_BYTES || !photo.size || !REVIEW_PHOTO_TYPES.includes(photo.type))) {
    throw new Error('Choose a JPG, PNG or WebP review photo up to 3 MiB. Your review text has been kept.');
  }
  const normalizedSubmissionId = submissionId.trim().toLowerCase();
  signal?.throwIfAborted();
  onPhase('verifying');
  // Each attempt gets its own single-use token; never save it with form answers.
  const token = await verify('review', { signal });
  signal?.throwIfAborted();
  const body = new FormData();
  body.append('submissionId', normalizedSubmissionId);
  body.append('displayName', name.trim());
  body.append('text', text.trim());
  body.append('rating', String(rating));
  body.append('branchId', String(branchId));
  if (photo) body.append('photo', photo, photo.name);
  onPhase('sending');
  const response = await fetcher('/api/reviews', {
    method: 'POST', headers: { 'x-turnstile-token': token }, body,
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(60000)]) : AbortSignal.timeout(60000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Your review could not be submitted. Your answers have been kept.');
  if (!isValidReviewReceipt(result, normalizedSubmissionId)) {
    throw new Error('Your review receipt could not be confirmed. Your answers have been kept.');
  }
  return result;
}
