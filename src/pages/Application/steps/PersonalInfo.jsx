import { useState } from 'react';
import { BiUser, BiEnvelope, BiGroup, BiHeart } from 'react-icons/bi';
import { ApplicationField } from '../../../components/ApplicationField';
import { personalFeedback } from '../../../utils/personalFeedback';
import './Steps.css';

const sections = [
  ['Primary applicant', [
    ['firstName', 'First Name', true, 'text', 'Use your legal given name as shown on your government ID.', 'given-name'],
    ['middleName', 'Middle Name', false, 'text', 'Leave blank if not applicable.', 'additional-name'],
    ['lastName', 'Last Name', true, 'text', 'Use your legal family name.', 'family-name'],
    ['dateOfBirth', 'Date of Birth', true, 'date', 'Applicants must be at least 18 years old.', 'bday'],
    ['citizenship', 'Nationality & Citizenship Status', true, ['Filipino Citizen', 'Dual Citizen', 'Foreign National (with Alien Certificate of Registration)', 'Other'], 'Select your current legal citizenship status.'],
    ['address', 'Current Residential Address', true, 'text', 'Include house/unit number, street, barangay, city, province, and postal code.', 'street-address'],
  ]],
  ['Contact and identification', [
    ['primaryPhone', 'Primary Phone Number', true, 'tel', 'Enter 7 to 15 digits, for example +63 912 345 6789.', 'tel'],
    ['secondaryPhone', 'Secondary Phone Number', false, 'tel', 'Optional backup mobile or landline number.'],
    ['email', 'Email Address', true, 'email', 'We will send application updates here, for example juan@example.com.', 'email'],
    ['confirmEmail', 'Confirm Email Address', true, 'email', 'Re-enter the exact same email address to prevent typos.', 'email'],
    ['govIdType', 'Government ID Type', true, ['Passport', "Driver's License", 'UMID', 'PhilID (National ID)', 'Postal ID', "Voter's ID", 'Other'], 'Choose the valid government ID you will upload in Step 7.'],
    ['govIdNumber', 'Government ID Number', true, 'text', 'Enter the ID number exactly as printed on your selected ID.'],
  ]],
  ['Emergency contact', [
    ['emergencyName', 'Full Name', false, 'text', 'Optional contact person in case you cannot be reached.'],
    ['emergencyRelationship', 'Relationship', false, 'text', 'For example spouse, parent, or sibling.'],
    ['emergencyPhone', 'Phone Number', false, 'tel', 'For example +63 917 000 0000.'],
  ]],
];

const sectionIcons = [BiUser, BiEnvelope, BiGroup];

export default function PersonalInfo({ formData, updateField, showErrors = false }) {
  const [touched, setTouched] = useState({});
  const issues = personalFeedback(formData);

  const renderField = ([key, label, required, type = 'text', hint, autoComplete], co = false) => {
    const id = `${co ? 'co' : 'pi'}-${key}`;
    return (
      <ApplicationField
        key={id}
        id={id}
        label={label}
        required={required}
        hint={hint}
        type={Array.isArray(type) ? undefined : type}
        options={Array.isArray(type) ? type : undefined}
        autoComplete={autoComplete}
        name={co ? `coApplicant.${key}` : key}
        value={co ? formData.coApplicant?.[key] : formData[key]}
        errors={showErrors || touched[id] ? issues.filter((issue) => issue.id === id).map((issue) => issue.message) : []}
        onBlur={() => setTouched((previous) => ({ ...previous, [id]: true }))}
        onChange={(value) =>
          co
            ? updateField('coApplicant', { ...formData.coApplicant, [key]: value })
            : updateField(key, value)
        }
      />
    );
  };

  return (
    <div className="personal-pilot step-content">
      <header className="personal-pilot-intro step-intro">
        <span className="pilot-intro-icon step-intro-icon red" aria-hidden="true">
          <BiUser />
        </span>
        <div className="step-intro-copy">
          <span className="step-eyebrow">Step 02 · Applicant Identity &amp; Contact</span>
          <h2 id="personal-step-title" tabIndex={-1} className="step-intro-title">
            Tell Us About <span className="title-highlight">Yourself</span>
          </h2>
          <p className="step-intro-subtitle">
            Provide your <strong>legal identity</strong> and <strong>contact details</strong>. Every field is clearly marked Required, Optional, or Conditional.
          </p>
        </div>
      </header>

      {sections.map(([title, fields], index) => {
        const Icon = sectionIcons[index];
        return (
          <section key={title} className="form-section">
            <h3 className="section-title">
              <Icon className="section-icon" aria-hidden="true" />
              <span>{title}</span>
            </h3>
            <div className="pilot-field-grid">{fields.map((field) => renderField(field))}</div>
          </section>
        );
      })}

      <section className="form-section">
        <h3 className="section-title">
          <BiGroup className="section-icon" aria-hidden="true" />
          <span>Co-applicant / Business Partner</span>
        </h3>
        <ApplicationField
          id="pi-hasCoApplicant"
          label="Adding a co-applicant / business partner?"
          conditional="Conditional"
          options={['No', 'Yes']}
          hint="If you select Yes, all four co-applicant details below become required."
          value={formData.hasCoApplicant === 'yes' ? 'Yes' : 'No'}
          onChange={(value) => updateField('hasCoApplicant', value.toLowerCase())}
        />
        {formData.hasCoApplicant === 'yes' && (
          <div className="pilot-field-grid co-applicant-grid">
            {[
              ['firstName', 'Co-applicant First Name', true, 'text', 'Legal given name of your co-applicant.'],
              ['lastName', 'Co-applicant Last Name', true, 'text', 'Legal family name of your co-applicant.'],
              ['email', 'Co-applicant Email', true, 'email', 'For example partner@example.com.'],
              ['phone', 'Co-applicant Phone', true, 'tel', '7 to 15 digits, for example +63 912 345 6789.'],
            ].map((field) => renderField(field, true))}
          </div>
        )}
      </section>

      <section className="form-section">
        <h3 className="section-title">
          <BiHeart className="section-icon" aria-hidden="true" />
          <span>Marital status</span>
        </h3>
        {renderField([
          'maritalStatus',
          'Marital Status',
          true,
          ['Single', 'Married', 'Widowed', 'Separated', 'Divorced'],
          'Required for franchise contract and spousal/partner signatory determination.',
        ])}
      </section>
    </div>
  );
}
