const DRAFT_KEY = 'siomai-street-franchise-draft-v1';
const DATABASE_NAME = 'siomai-street-franchise-drafts';
const DATABASE_VERSION = 1;
const DOCUMENT_STORE = 'documents';

const openDatabase = () => new Promise((resolve, reject) => {
  const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(DOCUMENT_STORE)) {
      request.result.createObjectStore(DOCUMENT_STORE, { keyPath: 'key' });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const readStoredDraft = () => {
  try {
    const storedDraft = window.localStorage.getItem(DRAFT_KEY);
    return storedDraft ? JSON.parse(storedDraft) : null;
  } catch {
    return null;
  }
};

export const loadApplicationDraft = () => {
  const storedDraft = readStoredDraft();

  return {
    currentStep: Number.isInteger(storedDraft?.currentStep) ? storedDraft.currentStep : 0,
    formData: storedDraft?.formData && typeof storedDraft.formData === 'object'
      ? storedDraft.formData
      : {},
  };
};

export const loadDraftDocuments = async () => {
  const database = await openDatabase();

  try {
    const records = await new Promise((resolve, reject) => {
      const request = database.transaction(DOCUMENT_STORE, 'readonly')
        .objectStore(DOCUMENT_STORE)
        .getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return Object.fromEntries(records.map(({ key, file }) => [key, file]));
  } finally {
    database.close();
  }
};

export const saveApplicationDraft = (currentStep, formData) => {
  const { documents, ...serializableFormData } = formData;

  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
      currentStep,
      formData: serializableFormData,
      updatedAt: new Date().toISOString(),
    }));
  } catch {
    // The form remains usable when browser storage is unavailable.
  }
};

export const saveDraftDocuments = async (documents = {}) => {
  const database = await openDatabase();

  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(DOCUMENT_STORE, 'readwrite');
      const store = transaction.objectStore(DOCUMENT_STORE);

      store.clear();
      Object.entries(documents).forEach(([key, file]) => {
        store.put({ key, file });
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
  window.localStorage.removeItem(DRAFT_KEY);

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
