import React, { useState } from 'react';
import usePaymentHandler from '../../hooks/usePaymentHandler';

/**
 * Upgrade Prompt Component
 * 
 * This component displays a prompt for free users to upgrade to the premium
 * report, highlighting the additional features they'll get access to.
 */
const UpgradePrompt = () => {
  const [email, setEmail] = useState('');
  const { handlePayment, isProcessingPayment } = usePaymentHandler();
  
  // Handle email input change
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };
  
  // Handle upgrade button click
  const handleUpgradeClick = () => {
    handlePayment({ email });
  };
  
  return (
    <div className="upgrade-card">
      <h2>Unlock Premium Features</h2>
      <p>
        Get access to all premium insights and recommendations for just $9. 
        Upgrade now to see your complete Twitter analysis.
      </p>
      
      <div className="upgrade-features">
        <div className="upgrade-feature">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>Executive Summary</span>
        </div>
        
        <div className="upgrade-feature">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>Media Analysis</span>
        </div>
        
        <div className="upgrade-feature">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>Monthly Analysis</span>
        </div>
        
        <div className="upgrade-feature">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>Content Recommendations</span>
        </div>
        
        <div className="upgrade-feature">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>Image Analysis</span>
        </div>
        
        <div className="upgrade-feature">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>PDF Export</span>
        </div>
      </div>
      
      <div className="upgrade-form">
        <div className="form-group">
          <label htmlFor="upgrade-email">Email for Report Delivery:</label>
          <input 
            type="email" 
            id="upgrade-email" 
            value={email} 
            onChange={handleEmailChange} 
            placeholder="your@email.com" 
          />
        </div>
        
        <button 
          className="upgrade-button"
          onClick={handleUpgradeClick}
          disabled={isProcessingPayment || !email}
        >
          {isProcessingPayment ? 'Processing...' : 'Upgrade to Premium ($9)'}
        </button>
        
        <p className="upgrade-guarantee">
          <strong>100% Money-Back Guarantee</strong> — If you're not satisfied with your premium report, we'll refund your payment.
        </p>
      </div>
    </div>
  );
};

export default UpgradePrompt;