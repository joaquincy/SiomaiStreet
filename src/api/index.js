const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const getErrorMessage = async (response) => {
  try {
    const payload = await response.json();
    return payload.message || payload.error || 'Unable to submit your application. Please try again.';
  } catch {
    return 'Unable to submit your application. Please try again.';
  }
};

export const submitFranchiseApplication = async ({ formData, turnstileToken }) => {
  const { documents = {}, ...application } = formData;
  const submission = new FormData();

  submission.append('application', JSON.stringify(application));

  Object.entries(documents).forEach(([documentType, file]) => {
    submission.append(`documents[${documentType}]`, file, file.name);
  });

  if (turnstileToken) {
    submission.append('turnstileToken', turnstileToken);
  }

  let response;

  try {
    response = await fetch(`${apiBaseUrl}/api/applications`, {
      method: 'POST',
      body: submission,
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error('We could not reach the application service. Your saved draft remains on this device.');
  }

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json();
};
