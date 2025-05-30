import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createCheckoutSession,
  createScrapeCheckoutSession,
  verifyPaymentStatus
} from '../services/paymentService'; // verifyPaymentStatus now returns Polar-based status
import { useTweetData } from '../context/TweetDataContext';

/**
 * Custom hook for handling payments with Polar
 */
const usePaymentHandler = () => {
  const navigate = useNavigate();
  const { 
    processedData, 
    dataSessionId, 
    timeframe, 
    updatePaidStatus, 
    updateDataSource 
  } = useTweetData();
  
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  
  /**
   * Generate metadata for the Polar checkout session
   * @returns {Object} Metadata for the checkout session
   */
  const generateStandardCheckoutMetadata = useCallback(() => {
    // This function was used to store processedData in localStorage and link via dataKey.
    // With server-side sessions for tweet data (useTweetFileProcessor hook changes),
    // the primary link might be the server-side dataSessionId.

    if (!dataSessionId && !processedData) { // Check both, processedData can be from direct analysis
      console.warn('No processed data or dataSessionId available for payment metadata');
      // Fallback or throw error if critical
      return {
        source: 'twitilytics_app',
        timestamp: new Date().toISOString(),
      };
    }
    
    return {
      // dataKey: dataKey, // If still using localStorage link for some reason
      dataSessionId: dataSessionId, // Link to server-side stored tweet data
      tweetCount: processedData?.allTweets?.length || processedData?.tweetCount || 0,
      timeframe: processedData?.timeframe || timeframe || 'all',
      timestamp: new Date().toISOString(),
      serviceType: 'premium_analysis_report'
    };
  }, [processedData, dataSessionId, timeframe]); // Re-run if processedData changes in context
  
  /**
   * Handle standard payment initiation (Premium Analysis Report)
   * @param {Object} options - Payment options
   * @param {string} options.email - User's email (optional)
   */
  const handleStandardPayment = useCallback(async ({ email } = {}) => {
    // `processedData` should be available if user is at payment step after upload/processing
    // Or `dataSessionId` from context if data was processed and stored server-side.

    if (!processedData && !dataSessionId) {
      setPaymentError('No data available to analyze. Please upload your tweets.js file first.');
      return;
    }
    
    setIsProcessingPayment(true);
    setPaymentError(null);
    
    try {
      const metadata = generateStandardCheckoutMetadata();
      // Add userId to metadata if available, for Polar's customer_external_id
      // metadata.userId = user?.id; // Example if you have a user system

      const { status, url, sessionId: polarSessionId } = await createCheckoutSession({ // This now calls backend which uses Polar
        email,
        metadata
      });
      
      if (status === 'success' && url) {
        localStorage.setItem('pendingPaymentSession', polarSessionId); // Store Polar session ID
        window.location.href = url; // Redirect to Polar checkout
      } else {
        throw new Error('Invalid response from payment service for standard payment');
      }
    } catch (error) {
      console.error('Standard payment initiation error:', error);
      setPaymentError(`Payment processing failed: ${error.message}. Please try again.`);
    } finally {
      setIsProcessingPayment(false);
    }
  }, [processedData, dataSessionId, generateStandardCheckoutMetadata]);

  /**
   * Handle scrape payment initiation
   * @param {Object} options - Payment options
   * @param {string} options.email - User's email
   * @param {string} options.twitterHandle - Twitter handle to scrape
   * @param {number} options.numBlocks - Number of 1k-tweet blocks this package implies.
   *                                     This is now for metadata, actual package is fixed by backend.
   */
  const handleScrapePayment = useCallback(async ({ email, twitterHandle, numBlocks } = {}) => {
    setIsProcessingPayment(true);
    setPaymentError(null);
    
    try {
      // Metadata for Polar
      const metadata = {
        twitterHandle,
        numBlocks, // Number of blocks this package represents
        serviceType: 'scrape_analysis',
        timestamp: new Date().toISOString()
      };

      // `numBlocks` here might be used by frontend to inform user, but backend uses a fixed package Price ID.
      // The call to createScrapeCheckoutSession now triggers Polar checkout for that fixed package.
      const { status, url, sessionId: polarSessionId } = await createScrapeCheckoutSession({
        email,
        twitterHandle, // For backend logic
        // numBlocks, // Not used by backend to select price, but can be in metadata
        metadata
      });
      
      if (status === 'success' && url) {
        localStorage.setItem('pendingPaymentSession', polarSessionId); // Store Polar session ID
        window.location.href = url; // Redirect to Polar checkout
      } else {
        throw new Error('Invalid response from payment service for scrape payment');
      }
    } catch (error) {
      console.error('Scrape payment initiation error:', error);
      setPaymentError(`Payment processing failed: ${error.message}. Please try again.`);
    } finally {
      setIsProcessingPayment(false);
    }
  }, []);
  
  /**
   * Verify payment status from URL parameter after Polar redirect
   * @returns {Promise<boolean>} Whether payment was successful
   */
  const verifyPaymentFromUrl = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const polarSessionId = urlParams.get('session_id'); // This is Polar's checkout session ID
    
    if (!polarSessionId) {
      // Check if it's from a pending session storage, e.g. if page reloaded before redirect finished
      const pendingSessionId = localStorage.getItem('pendingPaymentSession');
      if (!pendingSessionId) return false;
      // sessionId = pendingSessionId; // Use with caution, ensure it's for the current flow
      // Better to rely on URL param from Polar redirect.
      return false;
    }
    
    setIsVerifyingPayment(true);
    setPaymentError(null);
    
    try {
      // `verifyPaymentStatus` now talks to backend which talks to Polar
      const result = await verifyPaymentStatus(polarSessionId); 
      
      if (result.status === 'success' && result.paid) {
        updatePaidStatus(true, polarSessionId); // Update context with paid status and Polar session ID
        
        // Update data source based on metadata from payment
        if (result.metadata?.analysisType === 'scrape' || result.metadata?.serviceType === 'scrape_analysis') {
          updateDataSource('username', { 
            handle: result.metadata.twitterHandle, 
            blocks: parseInt(result.metadata.numBlocks, 10),
            paymentSessionId: polarSessionId // Store Polar session ID
          });
        } else { // Default to file-based analysis payment
          updateDataSource('file', { 
            paymentSessionId: polarSessionId, // Store Polar session ID
            dataSessionId: result.metadata?.dataSessionId // Link to uploaded file session if present
          });
        }
        localStorage.removeItem('pendingPaymentSession');
        return true;
      } else {
        setPaymentError(`Payment not completed. Status: ${result.paymentStatus || 'unknown'}`);
        return false;
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setPaymentError(`Failed to verify payment: ${error.message}`);
      return false;
    } finally {
      setIsVerifyingPayment(false);
    }
  }, [updatePaidStatus, updateDataSource]);
  
  const goToReport = useCallback(() => {
    navigate('/report', { replace: true });
  }, [navigate]);
  
  return {
    isProcessingPayment,
    isVerifyingPayment,
    paymentError,
    handleStandardPayment, // For premium report from uploaded file
    handleScrapePayment,   // For scrape package
    verifyPaymentFromUrl,
    goToReport
  };
};

export default usePaymentHandler;