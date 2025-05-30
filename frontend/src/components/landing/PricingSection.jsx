import React, { useState } from 'react';
import { HashLink } from 'react-router-hash-link';
import { apiRequest } from '../../utils/api';
import SharedSectionHeader from './shared/SharedSectionHeader';
import SharedEmailForm from './shared/SharedEmailForm';

/**
 * Pricing Section Component
 * 
 * This section displays the pricing information for Twitilytics,
 * focusing on the value proposition of the $9 analysis for agencies.
 */
const PricingSection = () => {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false);
  const [waitlistError, setWaitlistError] = useState(null);
  
  const toggleEmailForm = (e) => {
    e.preventDefault();
    setEmail('');
    setWaitlistError(null);
    setIsJoiningWaitlist(false);
    setShowEmailForm(!showEmailForm);
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
        alert(`Thank you! ${email} has been added to the Agency Features waitlist. Check your email for confirmation!`);
        setShowEmailForm(false);
        setEmail('');
      } else {
        setWaitlistError(response.message || 'An unknown error occurred joining the waitlist.');
        // alert(`Failed to join waitlist: ${response.message || 'Please try again.'}`);
      }
    } catch (error) {
      console.error("Error joining waitlist:", error);
      setWaitlistError(error.message || 'Failed to join waitlist due to a network or server issue.');
      // alert(`Error: ${error.message || 'Could not join the waitlist. Please try again later.'}`);
    } finally {
      setIsJoiningWaitlist(false);
    }
  };

  return (
    <section className="section pricing-section" id="pricing">
      <div className="container">
        <SharedSectionHeader
          title="Agency-Friendly, Transparent Pricing"
          subtitle="Scale your analytics across all your clients."
          theme="light"
        />
        
        <div className="pricing-cards-container">
          <div className="pricing-card highlighted">
            <div className="pricing-badge">Best Value for Agencies</div>
            <h3 className="pricing-name">Client Twitter Analysis</h3>
            <div className="pricing-price">$9<span>.00</span></div>
            <p className="pricing-per-unit">Per Twitter Archive Analysis</p>
            <p className="pricing-description">
              One-time payment for a complete analysis of each client Twitter archive
            </p>
            
            <ul className="pricing-features">
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                Executive Summary that wins client buy-in instantly
              </li>
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                Activity Analysis to optimize posting schedules
              </li>
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                Engagement Metrics that prove your ROI
              </li>
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                Topic Analysis revealing content that converts
              </li>
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                Media Analysis for winning visual strategies
              </li>
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                Monthly Trends showcasing your agency's impact
              </li>
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                AI-powered recommendations you can pitch immediately
              </li>
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                Professional PDF reports that impress clients
              </li>
            </ul>
            
            <HashLink 
              to="#file-upload"
              state={{ preselect: 'file' }}
              className="btn btn-primary btn-md btn-full"
            >
              Analyze Client Twitter
            </HashLink>
            
            <p className="pricing-guarantee">
              <strong>100% Money-Back Guarantee</strong>
            </p>
          </div>
          
          <div className="pricing-card">
            <h3 className="pricing-name">Analyze by Username</h3>
            <div className="pricing-price">$2<span>.00</span></div>
            <p className="pricing-per-unit">Per 1,000 tweets</p>
            <p className="pricing-description">
              Analyze any public Twitter profile directly by its username.
            </p>
            
            <ul className="pricing-features">
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                No archive file needed
              </li>
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                Analyze any public profile
              </li>
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                Direct profile data retrieval
              </li>
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                Same comprehensive analysis
              </li>
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                Minimum 1,000 tweets
              </li>
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                Up to 100,000 tweets
              </li>
            </ul>
            
            <HashLink 
              to="#file-upload"
              state={{ preselect: 'username' }}
              className="btn btn-primary btn-md btn-full"
            >
              Analyze by Username
            </HashLink>
            
            <p className="pricing-guarantee">
              Ideal for competitor analysis.
            </p>
          </div>
          
          <div className="pricing-card coming-soon">
            <div className="pricing-badge">Limited Early Access</div>
            <h3 className="pricing-name">Agency Pro – Founding Members</h3>
            <div className="pricing-price">Pro<span>+</span></div>
            <p className="pricing-per-unit">Exclusive Founding Member Benefits</p>
            <p className="pricing-description">
              Advanced capabilities to scale your Twitter analytics workflow
            </p>
            
            <ul className="pricing-features">
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                White-labeling with your agency branding
              </li>
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                Volume discounts for multiple client reports
              </li>
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                Client management dashboard
              </li>
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                Bulk report generation
              </li>
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                Custom report templates
              </li>
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                API access for integrations
              </li>
              <li className="pricing-feature">
                <span className="pricing-feature-icon">✓</span>
                Social Media Management tools
              </li>
            </ul>
            
            {!showEmailForm ? (
              <HashLink 
                to="#" 
                className="btn btn-secondary btn-md btn-full"
                onClick={toggleEmailForm}
              >
                Join Waitlist – Limited Spots for Early Access
              </HashLink>
            ) : (
              <SharedEmailForm
                onSubmit={handleWaitlistSubmit}
                email={email}
                onEmailChange={handleEmailChange}
                isSubmitting={isJoiningWaitlist}
                errorMessage={waitlistError}
                submitButtonText="Secure Your Early Access Spot"
                onCancel={toggleEmailForm}
                theme="light" // Pricing section is light, form inputs should match
                formClassName="waitlist-form" // Keep original class for any specific parent styling
                submitButtonClassName="btn btn-primary btn-md btn-full" // Uses primary for submit
                cancelButtonClassName="btn btn-ghost btn-md" // Uses ghost for cancel
                stackButtons={true} // Buttons in pricing card form are stacked
              />
            )}
            
            <p className="pricing-guarantee">
              No credit card required.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;