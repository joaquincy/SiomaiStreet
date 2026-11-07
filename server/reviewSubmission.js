import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  MAX_REVIEW_PHOTO_BYTES,
  MAX_REVIEW_REQUEST_BYTES,
  REVIEW_PHOTO_TYPES,
  REVIEW_SUBMISSION_ID_PATTERN,
} from '../shared/reviewUpload.js';

export { REVIEW_SUBMISSION_ID_PATTERN };
const allowedTypes = new Set(REVIEW_PHOTO_TYPES);
const badRequest = message => Object.assign(new Error(message), { status: 400 });
const safeFileName = name => name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-100) || 'upload';

// One fingerprint per review content. A retry with the same submission ID must
// carry identical content (including exact photo metadata and bytes) to receive the receipt.
export function reviewRequestHash({ displayName, reviewText, rating, branchId, photoMeta = null }) {
  return createHash('sha256')
    .update(JSON.stringify(['review-v1', displayName, reviewText, rating, branchId, photoMeta]))
    .digest('hex');
}

const hashesMatch = (storedHash, expectedHash) => {
  if (typeof storedHash !== 'string' || !/^[0-9a-f]{64}$/i.test(storedHash)) return false;
  return timingSafeEqual(Buffer.from(storedHash.toLowerCase(), 'hex'), Buffer.from(expectedHash.toLowerCase(), 'hex'));
};

const receiptFor = (row, submissionId, replayed) => ({
  id: row.id,
  submissionId,
  status: row.status || 'pending',
  ...(replayed ? { replayed: true } : {}),
});

/**
 * POST /api/reviews with application-style idempotency:
 * - the browser sends a random submissionId (UUID v4) that it reuses for retries of the same review;
 * - the database enforces one review per submission_id (unique constraint / index);
 * - an identical retry returns the original receipt (200 OK), while a modified retry under the same ID is rejected (409).
 */
export function createReviewSubmissionHandler({ json, rate, verify, readMultipart, request, uploadFile, deleteStorageObjects }) {
  const findBySubmission = async submissionId => {
    const rows = await request(`/rest/v1/reviews?select=id,status,photo_path,request_hash&submission_id=eq.${encodeURIComponent(submissionId)}&limit=1`);
    return rows?.[0] || null;
  };

  const replay = (res, row, submissionId, requestHash) => {
    if (!hashesMatch(row.request_hash, requestHash)) {
      return json(res, 409, { error: 'This review was already submitted with different details. Refresh the page before posting another review.' });
    }
    return json(res, 200, receiptFor(row, submissionId, true));
  };

  return async (req, res) => {
    res.setHeader('Connection', 'close');
    if (!await rate(req)) return json(res, 429, { error: 'Too many review submissions. Please try again later.' });
    // Check the header token before reading photo bytes. No unverified fallback.
    try { await verify(req); }
    catch (error) {
      return json(res, error.status === 400 ? 400 : 503, { error: error.status === 400
        ? 'Security verification expired or failed. Post your review again to start a fresh check. Your answers have been kept.'
        : 'Security verification is temporarily unavailable. Your review has not been sent; keep your answers and try again.' });
    }
    if (req.aborted || res.destroyed) return;

    const form = await readMultipart(req, { maxBytes: MAX_REVIEW_REQUEST_BYTES });
    if (form.getAll('submissionId').length > 1) throw badRequest('Expected a single submission identifier.');
    const rawSubmissionId = form.get('submissionId');
    const submissionId = typeof rawSubmissionId === 'string' ? rawSubmissionId.trim().toLowerCase() : '';
    const displayName = String(form.get('displayName') || '').trim();
    const reviewText = String(form.get('text') || '').trim();
    const rating = Number(form.get('rating'));
    const branchId = Number(form.get('branchId'));
    const photo = form.get('photo');

    if (!REVIEW_SUBMISSION_ID_PATTERN.test(submissionId)) throw badRequest('This review form is out of date. Refresh the page and post your review again.');
    if (displayName.length < 1 || displayName.length > 100) throw badRequest('Enter a display name (up to 100 characters).');
    if (reviewText.length < 1 || reviewText.length > 5000) throw badRequest('Enter a review up to 5,000 characters.');
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw badRequest('Choose a rating from 1 to 5.');
    if (!Number.isSafeInteger(branchId) || branchId <= 0) throw badRequest('Choose an active branch.');

    const hasPhoto = photo instanceof File && photo.size > 0;
    if (hasPhoto && (photo.size > MAX_REVIEW_PHOTO_BYTES || !allowedTypes.has(photo.type))) {
      throw badRequest('Review photos must be JPG, PNG, or WebP files up to 3 MiB.');
    }

    const photoMeta = hasPhoto
      ? {
        type: photo.type,
        size: photo.size,
        sha256: createHash('sha256').update(Buffer.from(await photo.arrayBuffer())).digest('hex'),
      }
      : null;
    const requestHash = reviewRequestHash({ displayName, reviewText, rating, branchId, photoMeta });

    // A lost response followed by a retry: return the original receipt without re-uploading or duplicating.
    const existing = await findBySubmission(submissionId);
    if (existing) return replay(res, existing, submissionId, requestHash);

    const activeBranches = await request(`/rest/v1/branches?select=branch_id&branch_id=eq.${branchId}&branch_status=eq.Active&limit=1`);
    if (!activeBranches?.length) throw badRequest('That branch is no longer available for reviews.');

    let photoPath = null;
    if (hasPhoto) {
      photoPath = `${submissionId}/${randomUUID()}/${safeFileName(photo.name)}`;
      await uploadFile('review-photos', photoPath, photo, photo.type);
    }

    try {
      const rows = await request('/rest/v1/reviews', {
        method: 'POST',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify({
          submission_id: submissionId,
          request_hash: requestHash,
          branch_id: branchId,
          display_name: displayName,
          rating,
          review_text: reviewText,
          photo_path: photoPath,
          status: 'pending',
          helpful_count: 0,
          is_verified: false,
        }),
      });
      if (!rows?.[0]?.id) throw new Error('Review insert returned no receipt.');
      return json(res, 201, receiptFor(rows[0], submissionId, false));
    } catch (error) {
      // A timeout or unique-key race may mean COMMIT succeeded. Check before deleting storage objects.
      const winner = await findBySubmission(submissionId).catch(() => null);
      if (winner) {
        if (photoPath && winner.photo_path !== photoPath) {
          await deleteStorageObjects('review-photos', [photoPath]).catch(() => {});
        }
        return replay(res, winner, submissionId, requestHash);
      }
      if (photoPath) await deleteStorageObjects('review-photos', [photoPath]).catch(() => {});
      throw error;
    }
  };
}
