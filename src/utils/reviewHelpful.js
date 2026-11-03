const prefix = 'siomai-review-helpful-v1:';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function readHelpfulVote(storage, id) {
  const raw = storage.getItem(prefix + id);
  if (!raw) return null;
  const value = JSON.parse(raw);
  if (typeof value?.voterId !== 'string' || !uuid.test(value.voterId) || typeof value.voted !== 'boolean') throw new Error('Invalid saved vote');
  return value;
}
export function prepareHelpfulVote(storage, id, randomUUID) {
  const existing = readHelpfulVote(storage, id);
  if (existing) return existing;
  const vote = { voterId: randomUUID(), voted: false };
  storage.setItem(prefix + id, JSON.stringify(vote));
  // Persist the identity BEFORE sending; a lost response can safely retry it.
  if (readHelpfulVote(storage, id)?.voterId !== vote.voterId) throw new Error('Storage unavailable');
  return vote;
}
export function saveHelpfulVote(storage, id, vote) {
  storage.setItem(prefix + id, JSON.stringify({ ...vote, voted: true }));
}
export function validHelpfulReceipt(body, id) {
  return body?.reviewId === id && body.voted === true && Number.isSafeInteger(body.helpful) && body.helpful >= 0;
}
