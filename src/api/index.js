import { APPLICATION_ENDPOINT, CONTRACT_VERSION, isValidReceipt } from '../../shared/application.js';
import { uploadWithProgress } from './uploadTransport.js';

export const submitFranchiseApplication = async ({ formData, requestId, fetcher = fetch, onProgress }) => {
  const { documents = {}, ...applicationData } = formData;
  const submission = new FormData();
  submission.append('version', String(CONTRACT_VERSION));
  submission.append('requestId', requestId);
  submission.append('applicationData', JSON.stringify(applicationData));
  for (const [key, file] of Object.entries(documents)) {
    if (file instanceof File) submission.append(key, file, file.name);
  }
  let response;

  try {
    response = onProgress && typeof XMLHttpRequest !== 'undefined' ? await uploadWithProgress(APPLICATION_ENDPOINT, submission, onProgress) : await fetcher(APPLICATION_ENDPOINT, {
      method: 'POST',
      body: submission,
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error('We could not confirm receipt. Keep this application and retry; the same request will not create a duplicate.');
  }

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(result?.error || 'Your application could not be submitted. Please retry.');
    error.validationErrors = result?.validationErrors;
    throw error;
  }
  if (!isValidReceipt(result, requestId)) throw new Error('The service did not return a valid receipt. Your draft has been kept. Please retry.');
  return result;
};
