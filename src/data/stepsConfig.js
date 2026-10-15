import { BiUser, BiBriefcase, BiWallet, BiHeart, BiStore, BiUpload, BiShield, BiEdit } from 'react-icons/bi';
import { HiOutlineClipboardCheck } from 'react-icons/hi';

export const APPLICATION_STEPS = [
  {
    id: 'pre-qualification',
    label: 'Pre-Qualification',
    icon: HiOutlineClipboardCheck,
    helperTitle: 'Why do we ask this?',
    helperText:
      'We want to ensure that opening a franchise is financially feasible for you from day one. This short assessment will help set you up for success.',
  },
  {
    id: 'personal-info',
    label: 'Personal Info',
    icon: BiUser,
    helperTitle: 'Your privacy matters',
    helperText:
      'Your personal information is kept strictly confidential and is only used to process your franchise application.',
  },
  {
    id: 'business-background',
    label: 'Business Background',
    icon: BiBriefcase,
    helperTitle: 'Experience helps',
    helperText:
      'While prior business experience is not required, understanding your background helps us tailor the right support package for you.',
  },
  {
    id: 'financial-capability',
    label: 'Financial Capability',
    icon: BiWallet,
    helperTitle: 'Financial readiness',
    helperText:
      'This helps us recommend the franchise package that best matches your financial capacity and investment goals.',
  },
  {
    id: 'brand-alignment',
    label: 'Brand Alignment',
    icon: BiHeart,
    helperTitle: 'Partnership fit',
    helperText:
      'Understanding your values and vision helps us ensure a strong, lasting franchise partnership.',
  },
  {
    id: 'franchise-plan',
    label: 'Franchise Plan',
    icon: BiStore,
    helperTitle: 'Your business plan',
    helperText:
      'Your franchise plan helps us understand your goals and provide the right level of operational support.',
  },
  {
    id: 'document-upload',
    label: 'Document Upload',
    icon: BiUpload,
    helperTitle: 'Required documents',
    helperText:
      'Uploading your documents now speeds up the verification process. Files are selected locally and will be transmitted when online submission is activated.',
  },
  {
    id: 'legal-consents',
    label: 'Legal & Consents',
    icon: BiShield,
    helperTitle: 'Legal protection',
    helperText:
      'These agreements protect both you and Siomai Street, ensuring a transparent and fair franchise relationship.',
  },
  {
    id: 'review-submit',
    label: 'Review & Submit',
    icon: BiEdit,
    helperTitle: 'Almost there!',
    helperText:
      'Review your application carefully. You can go back to any step to make changes before submitting.',
  },
];

export const REGIONS = [
  'Metro Manila (NCR)',
  'Central Luzon',
  'CALABARZON',
  'Ilocos Region',
  'Cagayan Valley',
  'Bicol Region',
  'Western Visayas',
  'Central Visayas',
  'Eastern Visayas',
  'Zamboanga Peninsula',
  'Northern Mindanao',
  'Davao Region',
  'SOCCSKSARGEN',
  'Caraga',
  'BARMM',
  'CAR (Cordillera)',
  'MIMAROPA',
];
