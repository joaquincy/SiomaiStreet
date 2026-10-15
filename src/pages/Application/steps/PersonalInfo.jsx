import {
  BiUser,
  BiEnvelope,
  BiGroup,
} from 'react-icons/bi';
import { ToggleGroup, ToggleOption, FormSelect } from '../../../components/FormElements';
import './Steps.css';

const PersonalInfo = ({ formData, updateField }) => {
  return (
    <div className="step-content animate-fade-in">
      <div className="step-header-centered">
        <div className="step-icon-wrapper blue">
          <BiUser />
        </div>
        <h2 className="step-title">Tell Us About Yourself</h2>
        <p className="step-subtitle">Please provide your legal personal details.</p>
      </div>

      <div className="form-section">
        <h3 className="section-title">
          <BiUser className="section-icon" /> Section A: Primary Applicant
        </h3>

        <div className="form-row three-cols">
          <div className="form-field">
            <label htmlFor="pi-firstName">First Name</label>
            <input
              id="pi-firstName"
              type="text"
              className="form-input"
              placeholder="e.g. Juan"
              value={formData.firstName || ''}
              onChange={(e) => updateField('firstName', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="pi-middleName">Middle Name</label>
            <input
              id="pi-middleName"
              type="text"
              className="form-input"
              placeholder="e.g. Dela"
              value={formData.middleName || ''}
              onChange={(e) => updateField('middleName', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="pi-lastName">Last Name</label>
            <input
              id="pi-lastName"
              type="text"
              className="form-input"
              placeholder="e.g. Cruz"
              value={formData.lastName || ''}
              onChange={(e) => updateField('lastName', e.target.value)}
            />
          </div>
        </div>

        <div className="form-row two-cols">
          <div className="form-field">
            <label htmlFor="pi-dob">Date of Birth</label>
            <input
              id="pi-dob"
              type="date"
              className="form-input"
              value={formData.dateOfBirth || ''}
              onChange={(e) => updateField('dateOfBirth', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Nationality &amp; Citizenship Status</label>
            <FormSelect
              options={['Filipino Citizen', 'Dual Citizen', 'Foreign National (with Alien Certificate of Registration)', 'Other']}
              placeholder="Select..."
              value={formData.citizenship}
              onChange={(val) => updateField('citizenship', val)}
            />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="pi-address">Current Residential Address</label>
          <input
            id="pi-address"
            type="text"
            className="form-input"
            placeholder="Street, City, Province, ZIP, Country"
            value={formData.address || ''}
            onChange={(e) => updateField('address', e.target.value)}
          />
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">
          <BiEnvelope className="section-icon" /> Contact &amp; Address
        </h3>

        <div className="form-row two-cols">
          <div className="form-field">
            <label htmlFor="pi-phone1">Primary Phone Number</label>
            <input
              id="pi-phone1"
              type="tel"
              className="form-input"
              placeholder="e.g. +63 912 345 6789"
              value={formData.primaryPhone || ''}
              onChange={(e) => updateField('primaryPhone', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="pi-phone2">Secondary Phone Number (Optional)</label>
            <input
              id="pi-phone2"
              type="tel"
              className="form-input"
              placeholder="e.g. +63 998 765 4321"
              value={formData.secondaryPhone || ''}
              onChange={(e) => updateField('secondaryPhone', e.target.value)}
            />
          </div>
        </div>

        <div className="form-row two-cols">
          <div className="form-field">
            <label htmlFor="pi-email">Email Address</label>
            <input
              id="pi-email"
              type="email"
              className="form-input"
              placeholder="juan@example.com"
              value={formData.email || ''}
              onChange={(e) => updateField('email', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="pi-confirmEmail">Confirm Email Address</label>
            <input
              id="pi-confirmEmail"
              type="email"
              className="form-input"
              placeholder="juan@example.com"
              value={formData.confirmEmail || ''}
              onChange={(e) => updateField('confirmEmail', e.target.value)}
            />
          </div>
        </div>

        <div className="form-row two-cols">
          <div className="form-field">
            <label>Government ID Type</label>
            <FormSelect
              options={['Passport', 'Driver\'s License', 'UMID', 'PhilID (National ID)', 'Postal ID', 'Voter\'s ID', 'Other']}
              placeholder="Select..."
              value={formData.govIdType}
              onChange={(val) => updateField('govIdType', val)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="pi-govIdNum">Government ID Number</label>
            <input
              id="pi-govIdNum"
              type="text"
              className="form-input"
              placeholder="ID Number"
              value={formData.govIdNumber || ''}
              onChange={(e) => updateField('govIdNumber', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="form-section highlight-box">
        <h3 className="section-title">
          <BiGroup className="section-icon" /> Emergency Contact
        </h3>

        <div className="form-row three-cols">
          <div className="form-field">
            <label htmlFor="pi-emName">Name</label>
            <input
              id="pi-emName"
              type="text"
              className="form-input"
              placeholder="Full Name"
              value={formData.emergencyName || ''}
              onChange={(e) => updateField('emergencyName', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="pi-emRel">Relationship</label>
            <input
              id="pi-emRel"
              type="text"
              className="form-input"
              placeholder="e.g. Spouse"
              value={formData.emergencyRelationship || ''}
              onChange={(e) => updateField('emergencyRelationship', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="pi-emPhone">Phone Number</label>
            <input
              id="pi-emPhone"
              type="tel"
              className="form-input"
              placeholder="Phone Number"
              value={formData.emergencyPhone || ''}
              onChange={(e) => updateField('emergencyPhone', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">Section B: Co-Applicant</h3>
        <div className="form-field toggle-inline">
          <label className="toggle-label">Adding a co-applicant / business partner?</label>
          <ToggleGroup>
            <ToggleOption
              label="No"
              selected={formData.hasCoApplicant !== 'yes'}
              onClick={() => updateField('hasCoApplicant', 'no')}
            />
            <ToggleOption
              label="Yes"
              selected={formData.hasCoApplicant === 'yes'}
              onClick={() => updateField('hasCoApplicant', 'yes')}
            />
          </ToggleGroup>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">Section C: Marital Status</h3>
        <div className="form-row two-cols">
          <div className="form-field">
            <FormSelect
              options={['Single', 'Married', 'Widowed', 'Separated', 'Divorced']}
              placeholder="Select..."
              value={formData.maritalStatus}
              onChange={(val) => updateField('maritalStatus', val)}
            />
          </div>
        </div>
      </div>

    </div>
  );
};

export default PersonalInfo;
