import React, { useState } from 'react';
import { apiRequest } from '../../utils/api';
import SharedSectionHeader from './shared/SharedSectionHeader';
import SharedBenefitCard from './shared/SharedBenefitCard';
import SharedEmailForm from './shared/SharedEmailForm';

const AgencySuccessProgram = () => {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false);
  const [waitlistError, setWaitlistError] = useState(null);

  const toggleEmailForm = () => {
    setShowEmailForm(!showEmailForm);
    setWaitlistError(null); // Clear error when toggling
  };

  const handleEmailChange = (event) => {
    setEmail(event.target.value);
  };

  const handleWaitlistSubmit = async (event) => {
    event.preventDefault();
    setWaitlistError(null);
    setIsJoiningWaitlist(true);
    try {
      const response = await apiRequest('POST', '/api/email/join-waitlist', { email });
      if (response.success) {
        alert(`Thank you! ${email} has been added to the Agency Success Program waitlist. Check your email for confirmation!`);
        setShowEmailForm(false);
        setEmail('');
      } else {
        setWaitlistError(response.message || 'An unknown error occurred joining the waitlist.');
        // alert(`Failed to join waitlist: ${response.message || 'Please try again.'}`); // Alert is redundant if error is displayed in form
      }
    } catch (error) {
      console.error("Error joining waitlist:", error);
      setWaitlistError(error.message || 'Failed to join waitlist due to a network or server issue.');
      // alert(`Error: ${error.message || 'Could not join the waitlist. Please try again later.'}`); // Alert is redundant
    } finally {
      setIsJoiningWaitlist(false);
    }
  };

  const benefits = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
          <line x1="7" y1="7" x2="7.01" y2="7"></line>
        </svg>
      ),
      title: "Benefits",
      description: "Early access to white-labeling with your agency's branding and customized Twitter analytics."
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="5" x2="5" y2="19"></line>
          <circle cx="6.5" cy="6.5" r="2.5"></circle>
          <circle cx="17.5" cy="17.5" r="2.5"></circle>
        </svg>
      ),
      title: "Bulk pricing",
      description: "Volume discounts for agencies with multiple clients, special pricing tiers, and priority support."
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
      ),
      title: "Free Agency Guide",
      description: "Sell Twitter Audits as a $297 Service and boost your monthly recurring revenue through Twitter insights."
    }
  ];

  return (
    <section className="section agency-success-section" id="agency-program">
      <div className="container">
        <div className="agency-program agency-program-dark-theme">
          <SharedSectionHeader
            title="Agency Success Program"
            subtitle="Join our exclusive program for agencies."
            theme="dark"
          />
          
          <div className="agency-benefits-grid">
            {benefits.map((benefit, index) => (
              <SharedBenefitCard
                key={index}
                icon={benefit.icon}
                title={benefit.title}
                description={benefit.description}
              />
            ))}
          </div>
          
          {!showEmailForm ? (
            <div className="text-center">
              <button
                type="button"
                className="btn btn-accent btn-lg"
                onClick={toggleEmailForm}
              >
                Join Waitlist
              </button>
            </div>
          ) : (
            <SharedEmailForm
              onSubmit={handleWaitlistSubmit}
              email={email}
              onEmailChange={handleEmailChange}
              isSubmitting={isJoiningWaitlist}
              errorMessage={waitlistError}
              submitButtonText="Join Waitlist"
              onCancel={toggleEmailForm}
              theme="dark" // Assuming .agency-program provides the dark context for inputs
              formClassName="agency-waitlist-form" // Keep original class for any specific parent styling
              submitButtonClassName="btn btn-accent btn-md"
              cancelButtonClassName="btn btn-ghost btn-md"
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default AgencySuccessProgram; 