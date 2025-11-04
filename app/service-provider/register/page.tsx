import React, { useState } from 'react';

interface ServiceProviderFormData {
  companyName: string;
  registrationNumber: string;
  taxId: string;
  country: string;
  address: string;
  city: string;
  postalCode: string;
  contactPerson: string;
  email: string;
  phone: string;
  website: string;
  services: string[];
  businessType: string;
  yearsInBusiness: string;
  annualRevenue: string;
  numberOfEmployees: string;
  documents: { [key: string]: File | null };
}

const ServiceProviderRegisterPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ServiceProviderFormData>({
    companyName: '',
    registrationNumber: '',
    taxId: '',
    country: '',
    address: '',
    city: '',
    postalCode: '',
    contactPerson: '',
    email: '',
    phone: '',
    website: '',
    services: [],
    businessType: '',
    yearsInBusiness: '',
    annualRevenue: '',
    numberOfEmployees: '',
    documents: {}
  });

  const availableServices = [
    'Parcel Delivery',
    'Air Freight',
    'Ocean Freight (FCL)',
    'Ocean Freight (LCL)',
    'Railway Transport',
    'Inland Transport',
    'Warehousing',
    'Customs Clearance',
    'Last Mile Delivery'
  ];

  const requiredDocuments = [
    { id: 'certificate-incorporation', name: 'Certificate of Incorporation', required: true },
    { id: 'business-license', name: 'Business License', required: true },
    { id: 'tax-certificate', name: 'Tax Registration Certificate', required: true },
    { id: 'insurance-certificate', name: 'Insurance Certificate', required: false },
    { id: 'bank-statement', name: 'Bank Statement (Latest 3 months)', required: false }
  ];

  const handleInputChange = (field: keyof ServiceProviderFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleServiceToggle = (service: string) => {
    setFormData(prev => {
      const services = prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service];
      return { ...prev, services };
    });
  };

  const handleDocumentUpload = (docId: string, file: File | null) => {
    if (!file) {
      setFormData(prev => ({
        ...prev,
        documents: { ...prev.documents, [docId]: null }
      }));
      return;
    }

    // Validate file type (not just relying on accept attribute which can be bypassed)
    const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = allowedTypes.includes(fileExtension) || allowedMimeTypes.includes(file.type);
    
    if (!isValidType) {
      alert(`Invalid file type. Please upload only PDF, DOC, DOCX, JPG, or PNG files.`);
      return;
    }

    // Validate file size (max 10MB per file)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      alert(`File size exceeds the maximum allowed size of 10MB. Please choose a smaller file.`);
      return;
    }

    // File passed validation, proceed with upload
    setFormData(prev => ({
      ...prev,
      documents: { ...prev.documents, [docId]: file }
    }));
  };

  const handleBackClick = () => {
    // Use event delegation - trigger click on landing page button
    const landingBtn = document.querySelector('[data-page="landing"]') as HTMLElement;
    if (landingBtn) {
      landingBtn.click();
    }
  };

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      if (currentStep < 6) {
        setCurrentStep(currentStep + 1);
      } else {
        await handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.companyName && formData.registrationNumber && formData.country);
      case 2:
        return !!(formData.contactPerson && formData.email && formData.phone);
      case 3:
        return formData.services.length > 0;
      case 4:
        return !!(formData.businessType && formData.yearsInBusiness);
      case 5:
        const requiredDocs = requiredDocuments.filter(d => d.required);
        return requiredDocs.every(doc => formData.documents[doc.id] != null);
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    try {
      // Validate that we have the required data before submitting
      if (!formData.companyName || !formData.email || !formData.registrationNumber) {
        alert('Please complete all required fields before submitting.');
        return;
      }

      // Prepare form data for submission
      const formDataToSubmit = new FormData();
      formDataToSubmit.append('companyName', formData.companyName);
      formDataToSubmit.append('registrationNumber', formData.registrationNumber);
      formDataToSubmit.append('taxId', formData.taxId || '');
      formDataToSubmit.append('country', formData.country);
      formDataToSubmit.append('address', formData.address || '');
      formDataToSubmit.append('city', formData.city || '');
      formDataToSubmit.append('postalCode', formData.postalCode || '');
      formDataToSubmit.append('contactPerson', formData.contactPerson);
      formDataToSubmit.append('email', formData.email);
      formDataToSubmit.append('phone', formData.phone);
      formDataToSubmit.append('website', formData.website || '');
      formDataToSubmit.append('services', JSON.stringify(formData.services));
      formDataToSubmit.append('businessType', formData.businessType);
      formDataToSubmit.append('yearsInBusiness', formData.yearsInBusiness);
      formDataToSubmit.append('annualRevenue', formData.annualRevenue || '');
      formDataToSubmit.append('numberOfEmployees', formData.numberOfEmployees || '');

      // Append uploaded documents
      Object.keys(formData.documents).forEach(docId => {
        const file = formData.documents[docId];
        if (file) {
          formDataToSubmit.append(`documents[${docId}]`, file);
        }
      });

      // Submit to API endpoint with proper error handling
      const API_ENDPOINT = '/api/service-provider/register';
      
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        body: formDataToSubmit
      });

      // Check if the endpoint exists (404) or if there's an error
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Registration endpoint not found. Please contact support or try again later.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later or contact support if the problem persists.');
        } else {
          // Try to get error message from response
          let errorMessage = 'Registration failed. Please try again.';
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            errorMessage = `Registration failed with status ${response.status}. Please try again.`;
          }
          throw new Error(errorMessage);
        }
      }

      // Parse successful response
      const result = await response.json();
      const applicationId = result.applicationId || `SPR-${Date.now().toString().slice(-6)}`;
      
      console.log('Service provider registration submitted successfully:', { ...formData, applicationId });
      
      // Move to confirmation step
      setCurrentStep(7);
    } catch (error: any) {
      console.error('Error submitting service provider registration:', error);
      
      // Show user-friendly error message
      alert(error.message || 'An error occurred while submitting your application. Please try again or contact support.');
      
      // Don't advance to confirmation step on error
      // User stays on step 6 to fix issues and retry
    }
  };

  const renderStepIndicator = () => (
    <div className="visual-progress-bar" id="progress-bar-service-provider">
      {[1, 2, 3, 4, 5, 6].map(step => (
        <div
          key={step}
          className={`progress-step ${currentStep >= step ? 'active' : ''}`}
        />
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="service-step active">
      <h3>Step 1: Company Details</h3>
      <div className="form-section two-column">
        <div className="input-wrapper">
          <label htmlFor="spr-company-name">Company Name <span>*</span></label>
          <input
            type="text"
            id="spr-company-name"
            value={formData.companyName}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
            required
          />
        </div>
        <div className="input-wrapper">
          <label htmlFor="spr-registration-number">Business Registration No. <span>*</span></label>
          <input
            type="text"
            id="spr-registration-number"
            value={formData.registrationNumber}
            onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
            required
          />
        </div>
        <div className="input-wrapper">
          <label htmlFor="spr-tax-id">Tax ID / VAT Number</label>
          <input
            type="text"
            id="spr-tax-id"
            value={formData.taxId}
            onChange={(e) => handleInputChange('taxId', e.target.value)}
          />
        </div>
        <div className="input-wrapper">
          <label htmlFor="spr-country">Country <span>*</span></label>
          <input
            type="text"
            id="spr-country"
            value={formData.country}
            onChange={(e) => handleInputChange('country', e.target.value)}
            required
          />
        </div>
        <div className="input-wrapper" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="spr-address">Business Address</label>
          <input
            type="text"
            id="spr-address"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
          />
        </div>
        <div className="input-wrapper">
          <label htmlFor="spr-city">City</label>
          <input
            type="text"
            id="spr-city"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
          />
        </div>
        <div className="input-wrapper">
          <label htmlFor="spr-postal-code">Postal Code</label>
          <input
            type="text"
            id="spr-postal-code"
            value={formData.postalCode}
            onChange={(e) => handleInputChange('postalCode', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="service-step active">
      <h3>Step 2: Contact Information</h3>
      <div className="form-section two-column">
        <div className="input-wrapper">
          <label htmlFor="spr-contact-person">Contact Person <span>*</span></label>
          <input
            type="text"
            id="spr-contact-person"
            value={formData.contactPerson}
            onChange={(e) => handleInputChange('contactPerson', e.target.value)}
            required
          />
        </div>
        <div className="input-wrapper">
          <label htmlFor="spr-email">Email Address <span>*</span></label>
          <input
            type="email"
            id="spr-email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            required
          />
        </div>
        <div className="input-wrapper">
          <label htmlFor="spr-phone">Phone Number <span>*</span></label>
          <input
            type="tel"
            id="spr-phone"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            required
          />
        </div>
        <div className="input-wrapper">
          <label htmlFor="spr-website">Website</label>
          <input
            type="url"
            id="spr-website"
            value={formData.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
            placeholder="https://example.com"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="service-step active">
      <h3>Step 3: Services Offered</h3>
      <p className="subtitle">Select all services your company provides:</p>
      <div className="form-section">
        <div className="services-grid">
          {availableServices.map(service => (
            <div
              key={service}
              className={`service-type-btn ${formData.services.includes(service) ? 'active' : ''}`}
              onClick={() => handleServiceToggle(service)}
              style={{ cursor: 'pointer', marginBottom: '1rem' }}
            >
              <strong>{service}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="service-step active">
      <h3>Step 4: Business Information</h3>
      <div className="form-section two-column">
        <div className="input-wrapper">
          <label htmlFor="spr-business-type">Business Type <span>*</span></label>
          <select
            id="spr-business-type"
            value={formData.businessType}
            onChange={(e) => handleInputChange('businessType', e.target.value)}
            required
          >
            <option value="">Select...</option>
            <option value="freight-forwarder">Freight Forwarder</option>
            <option value="carrier">Carrier</option>
            <option value="logistics-provider">Logistics Provider</option>
            <option value="warehouse">Warehouse Operator</option>
            <option value="customs-broker">Customs Broker</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="input-wrapper">
          <label htmlFor="spr-years-business">Years in Business <span>*</span></label>
          <select
            id="spr-years-business"
            value={formData.yearsInBusiness}
            onChange={(e) => handleInputChange('yearsInBusiness', e.target.value)}
            required
          >
            <option value="">Select...</option>
            <option value="0-1">Less than 1 year</option>
            <option value="1-3">1-3 years</option>
            <option value="3-5">3-5 years</option>
            <option value="5-10">5-10 years</option>
            <option value="10+">10+ years</option>
          </select>
        </div>
        <div className="input-wrapper">
          <label htmlFor="spr-annual-revenue">Annual Revenue (USD)</label>
          <select
            id="spr-annual-revenue"
            value={formData.annualRevenue}
            onChange={(e) => handleInputChange('annualRevenue', e.target.value)}
          >
            <option value="">Select...</option>
            <option value="0-100k">$0 - $100,000</option>
            <option value="100k-500k">$100,000 - $500,000</option>
            <option value="500k-1m">$500,000 - $1,000,000</option>
            <option value="1m-5m">$1M - $5M</option>
            <option value="5m+">$5M+</option>
          </select>
        </div>
        <div className="input-wrapper">
          <label htmlFor="spr-employees">Number of Employees</label>
          <select
            id="spr-employees"
            value={formData.numberOfEmployees}
            onChange={(e) => handleInputChange('numberOfEmployees', e.target.value)}
          >
            <option value="">Select...</option>
            <option value="1-10">1-10</option>
            <option value="11-50">11-50</option>
            <option value="51-200">51-200</option>
            <option value="201-500">201-500</option>
            <option value="500+">500+</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="service-step active">
      <h3>Step 5: Upload Documents</h3>
      <p className="subtitle">Drag & drop your files or click to upload.</p>
      <div className="form-section">
        <div className="compliance-checklist">
          {requiredDocuments.map(doc => (
            <div key={doc.id} className="compliance-doc-item">
              <div className="compliance-doc-info">
                <h4>
                  {doc.name} {doc.required && <span>(Required)</span>}
                </h4>
              </div>
              <div className="file-drop-area">
                {formData.documents[doc.id] ? (
                  <div className="file-drop-area-uploaded">
                    <div className="file-info">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="file-icon">
                        <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 18.375 9h-7.5A3.75 3.75 0 0 1 7.125 5.25V1.5H5.625Zm7.5 0v3.75c0 .621.504 1.125 1.125 1.125h3.75a3.75 3.75 0 0 1-3.75 3.75h-7.5a.75.75 0 0 0-.75.75v11.25c0 .414.336.75.75.75h12.75a.75.75 0 0 0 .75-.75V12.75a.75.75 0 0 0-.75-.75h-7.5a2.25 2.25 0 0 1-2.25-2.25V1.5h-1.5Z" clipRule="evenodd" />
                      </svg>
                      <div className="file-details">
                        <span className="file-name">{formData.documents[doc.id]?.name}</span>
                        <span className="file-status-badge">Uploaded</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="remove-file-btn"
                      onClick={() => handleDocumentUpload(doc.id, null)}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <>
                    <div 
                      className="file-drop-area-idle"
                      onClick={() => {
                        const input = document.querySelector(`input[data-doc-id="${doc.id}"]`) as HTMLInputElement;
                        input?.click();
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="upload-icon">
                        <path fillRule="evenodd" d="M11.47 2.47a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06l-3.22-3.22V16.5a.75.75 0 0 1-1.5 0V4.81L8.03 8.03a.75.75 0 0 1-1.06-1.06l4.5-4.5ZM3 15.75A2.25 2.25 0 0 1 5.25 18h13.5A2.25 2.25 0 0 1 21 15.75v-3a.75.75 0 0 1 1.5 0v3A3.75 3.75 0 0 1 18.75 19.5H5.25A3.75 3.75 0 0 1 1.5 15.75v-3a.75.75 0 0 1 1.5 0v3Z" clipRule="evenodd" />
                      </svg>
                      <span>Drop file or click</span>
                    </div>
                    <input
                      type="file"
                      className="file-input hidden"
                      data-doc-id={doc.id}
                      accept=".pdf,.doc,.docx,.jpg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        handleDocumentUpload(doc.id, file);
                      }}
                    />
                    <p className="helper-text" style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Accepted formats: PDF, DOC, DOCX, JPG, PNG. Maximum file size: 10MB per file.
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep6 = () => {
    const requiredDocs = requiredDocuments.filter(d => d.required);
    const uploadedDocs = requiredDocs.filter(doc => formData.documents[doc.id] != null);
    
    return (
      <div className="service-step active">
        <h3>Step 6: Review & Submit</h3>
        <div className="form-section">
          <div className="payment-overview">
            <h4>Application Summary</h4>
            <div className="review-item">
              <span>Company Name:</span>
              <strong>{formData.companyName}</strong>
            </div>
            <div className="review-item">
              <span>Registration Number:</span>
              <strong>{formData.registrationNumber}</strong>
            </div>
            <div className="review-item">
              <span>Country:</span>
              <strong>{formData.country}</strong>
            </div>
            <div className="review-item">
              <span>Contact Person:</span>
              <strong>{formData.contactPerson}</strong>
            </div>
            <div className="review-item">
              <span>Email:</span>
              <strong>{formData.email}</strong>
            </div>
            <div className="review-item">
              <span>Services Offered:</span>
              <strong>{formData.services.join(', ') || 'None selected'}</strong>
            </div>
            <div className="review-item">
              <span>Business Type:</span>
              <strong>{formData.businessType}</strong>
            </div>
            <hr />
            <h4>Uploaded Documents</h4>
            <ul>
              {uploadedDocs.length > 0 ? (
                uploadedDocs.map(doc => (
                  <li key={doc.id}>
                    {doc.name}: {formData.documents[doc.id]?.name}
                  </li>
                ))
              ) : (
                <li>No documents uploaded</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderStep7 = () => {
    const applicationId = `SPR-${Date.now().toString().slice(-6)}`;
    
    return (
      <div className="service-step active">
        <div className="confirmation-container">
          <h3>Application Received!</h3>
          <p>
            Thank you for your interest in becoming a Vcanship partner. Your application ID is{' '}
            <strong>{applicationId}</strong>. Our partnership team will review your submission and be in touch within 3-5 business days.
          </p>
          <div className="confirmation-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={handleBackClick}
            >
              Back to Services
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <button className="back-btn" onClick={handleBackClick}>
        Back to Services
      </button>
      <div className="service-page-header">
        <div className="tf-hero">
          <div className="tf-hero-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 3.75a3 3 0 0 0-2.07-2.07l-1.25-.375a3 3 0 0 0-3.878 3.878l.375 1.25a3 3 0 0 0 2.07 2.07l1.25.375a3 3 0 0 0 3.878-3.878l-.375-1.25Zm-12 15a3 3 0 0 0-2.07-2.07l-1.25-.375a3 3 0 0 0-3.878 3.878l.375 1.25a3 3 0 0 0 2.07 2.07l1.25.375a3 3 0 0 0 3.878-3.878l-.375-1.25Z" />
            </svg>
          </div>
          <div>
            <h2>Become a Service Provider Partner</h2>
            <p className="subtitle" style={{ margin: 0, maxWidth: 'none' }}>
              Join our network of trusted logistics partners. Expand your reach and grow your business with Vcanship.
            </p>
          </div>
        </div>
      </div>
      
      <div className="form-container">
        {currentStep < 7 && renderStepIndicator()}
        
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
        {currentStep === 6 && renderStep6()}
        {currentStep === 7 && renderStep7()}

        {currentStep < 7 && (
          <div className="form-actions">
            {currentStep > 1 && (
              <button type="button" className="secondary-btn" onClick={handleBack}>
                Back
              </button>
            )}
            <button
              type="button"
              className="main-submit-btn"
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              style={{ marginLeft: 'auto' }}
            >
              {currentStep === 6 ? 'Submit Application' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceProviderRegisterPage;

