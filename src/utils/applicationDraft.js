import { sanitizeApplication, UUID_PATTERN, DOCUMENT_KEYS } from '../../shared/application.js';
const DRAFT_KEY = 'siomai-street-franchise-draft-v1';
const DATABASE_NAME = 'siomai-street-franchise-drafts';
const DATABASE_VERSION = 1;
const DOCUMENT_STORE = 'documents';
// Local-device retention only; this is not the server's application retention policy.
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const isDraftCurrent = (draft, now = Date.now()) => {
  const updatedAt = typeof draft?.updatedAt === 'string' ? Date.parse(draft.updatedAt) : NaN;
  return UUID_PATTERN.test(draft?.requestId) && Number.isFinite(updatedAt)
    && updatedAt <= now && now - updatedAt < DRAFT_TTL_MS;
};

const openDatabase = () => new Promise((resolve, reject) => {
  const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  let blocked = false;

  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(DOCUMENT_STORE)) {
      request.result.createObjectStore(DOCUMENT_STORE, { keyPath: 'key' });
    }
  };
  request.onsuccess = () => {
    if (blocked) request.result.close();
    else resolve(request.result);
  };
  request.onerror = () => reject(request.error);
  request.onblocked = () => {
    blocked = true;
    reject(new Error('Draft storage is blocked by another tab.'));
  };
});

const readStoredDraft = (requireAccess = false) => {
  let storedDraft;
  try {
    storedDraft = window.localStorage.getItem(DRAFT_KEY);
  } catch (error) {
    // An inaccessible store does not prove that its files are orphaned/expired.
    if (requireAccess) throw error;
    return null;
  }
  try {
    return storedDraft ? JSON.parse(storedDraft) : null;
  } catch {
    return null;
  }
};

export const loadApplicationDraft = () => {
  const candidate = readStoredDraft();
  const storedDraft = isDraftCurrent(candidate) ? candidate : null;

  return {
    currentStep: Number.isInteger(storedDraft?.currentStep) ? storedDraft.currentStep : 0,
    requestId: UUID_PATTERN.test(storedDraft?.requestId) ? storedDraft.requestId : crypto.randomUUID(),
    formData: sanitizeApplication(storedDraft?.formData),
    discarded: !!candidate && !storedDraft,
  };
};

export const loadDraftDocuments = async (requestId) => {
  const draft = readStoredDraft(true);
  if (!isDraftCurrent(draft)) {
    // Also remove orphaned files when metadata is missing, corrupt or expired.
    await clearApplicationDraft();
    return {};
  }
  if (requestId && draft.requestId !== requestId) {
    throw new Error('The saved draft changed in another tab.');
  }
  const database = await openDatabase();

  try {
    const records = await new Promise((resolve, reject) => {
      const request = database.transaction(DOCUMENT_STORE, 'readonly')
        .objectStore(DOCUMENT_STORE)
        .getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return Object.fromEntries(records.filter(record => record &&
      (!record.requestId || record.requestId === draft.requestId) &&
      DOCUMENT_KEYS.includes(record.key) && record.file instanceof File)
      .map(({ key, file }) => [key, file]));
  } finally {
    database.close();
  }
};

export const saveApplicationDraft = (currentStep, formData, requestId) => {
  const serializableFormData = { ...sanitizeApplication(formData) };
  delete serializableFormData.documents;

  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
      currentStep,
      requestId,
      formData: serializableFormData,
      updatedAt: new Date().toISOString(),
    }));
    return true;
  } catch {
    return false;
  }
};

export const saveDraftDocuments = async (documents = {}, requestId) => {
  if (!UUID_PATTERN.test(requestId)) throw new Error('A draft request ID is required.');
  const database = await openDatabase();

  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(DOCUMENT_STORE, 'readwrite');
      const store = transaction.objectStore(DOCUMENT_STORE);

      store.clear();
      Object.entries(documents).forEach(([key, file]) => {
        store.put({ key, file, requestId });
      });

      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
};

export const clearApplicationDraft = async () => {
  // Attempt both stores even when one is unavailable; never report partial cleanup as success.
  const results = await Promise.allSettled([
    Promise.resolve().then(() => window.localStorage.removeItem(DRAFT_KEY)),
    clearDraftDocuments(),
  ]);
  if (results.some(result => result.status === 'rejected')) {
    throw new Error('Local draft cleanup failed. Answers or files may remain on this device.');
  }
};

const clearDraftDocuments = async () => {
  const database = await openDatabase();

  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(DOCUMENT_STORE, 'readwrite');
      transaction.objectStore(DOCUMENT_STORE).clear();
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
};
