import { createContext, useContext } from 'react';

export const ApplicationFeedbackContext = createContext({
  showErrors: false,
  issues: [],
  errorsFor: () => [],
});

export const useApplicationFeedback = () => useContext(ApplicationFeedbackContext);

