import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTweetData } from '../../context/TweetDataContext';
import usePaymentHandler from '../../hooks/usePaymentHandler';

/**
 * Stripe Checkout Component
 * 
 * This component handles the Stripe checkout process, including 
 * verifying payment status and redirecting to the report page.
 */
const StripeCheckout = () => {
  const navigate = useNavigate();
  const { updatePaidStatus } = useTweetData();
  const { verifyPaymentFromUrl, goToReport, isVerifyingPayment, paymentError } = usePaymentHandler();
  
  const [verificationStatus, setVerificationStatus] = useState('pending'); // pending, success, failed
  
  // Check for session_id in URL on component mount
  useEffect(() => {
    const checkPayment = async () => {
      const success = await verifyPaymentFromUrl();
      
      if (success) {
        setVerificationStatus('success');
        
        // Redirect to report page after a short delay
        setTimeout(() => {
          goToReport();
        }, 2000);
      } else {
        setVerificationStatus('failed');
      }
    };
    
    checkPayment();
  }, [verifyPaymentFromUrl, goToReport]);
  
  // Return to home page
  const handleReturnHome = () => {
    navigate('/');
  };
  
  // Retry payment
  const handleRetryPayment = () => {
    navigate('/');
  };
  
  // Handle content based on verification status
  const renderContent = () => {
    if (isVerifyingPayment) {
      return (
        <div className="verification-pending">
          <div className="spinner"></div>
          <h2>Verifying Your Payment</h2>
          <p>Please wait while we confirm your payment with Stripe...</p>
        </div>
      );
    }
    
    if (verificationStatus === 'success') {
      return (
        <div className="verification-success">
          <div className="success-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h2>Payment Successful!</h2>
          <p>Thank you for your purchase. Your Twitter analysis is ready.</p>
          <p>Redirecting you to your report...</p>
        </div>
      );
    }
    
    if (verificationStatus === 'failed') {
      return (
        <div className="verification-failed">
          <div className="error-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <h2>Payment Verification Failed</h2>
          <p>We couldn't verify your payment: {paymentError || 'Unknown error'}</p>
          <div className="error-buttons">
            <button 
              onClick={handleRetryPayment}
              className="primary-button"
            >
              Try Again
            </button>
            <button 
              onClick={handleReturnHome}
              className="secondary-button"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="verification-pending">
        <div className="spinner"></div>
        <h2>Processing Your Payment</h2>
        <p>Please wait while we process your payment...</p>
      </div>
    );
  };
  
  return (
    <div className="stripe-checkout-container">
      <div className="checkout-card">
        {renderContent()}
      </div>
    </div>
  );
};

export default StripeCheckout;