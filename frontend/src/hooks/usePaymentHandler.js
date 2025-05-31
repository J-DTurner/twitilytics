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
    if (!dataSessionId && !processedData) {
      console.warn('No processed data or dataSessionId available for payment metadata');
      return {
        source: 'twitilytics_app_file_upload',
        timestamp: new Date().toISOString(),
        serviceType: 'premium_analysis_file_upload'
      };
    }
    
    return {
      dataSessionId: dataSessionId, // Crucial for linking payment to the specific analysis session
      tweetCount: processedData?.allTweets?.length || processedData?.tweetCount || 0,
      timeframe: processedData?.timeframe || timeframe || 'all',
      timestamp: new Date().toISOString(),
      serviceType: 'premium_analysis_file_upload' // Specific service type
    };
  }, [processedData, dataSessionId, timeframe]);
  
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
      
      // Ensure dataSessionId exists in metadata for customer_external_id
      if (!metadata.dataSessionId) {
        throw new Error('Analysis session ID is missing. Please re-upload your file.');
      }

      const { status, url, sessionId: polarSessionId } = await createCheckoutSession({
        email,
        customer_external_id: metadata.dataSessionId, // Use dataSessionId as the primary link for Polar
        metadata // Send the whole metadata object as well
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
      const uniqueScrapeId = `scrape_${twitterHandle}_${Date.now()}`; // Create a unique ID for this scrape job
      const metadata = {
        twitterHandle,
        numBlocks,
        serviceType: 'scrape_analysis',
        timestamp: new Date().toISOString(),
        scrapeJobId: uniqueScrapeId // Store the unique ID also in metadata
      };

      const { status, url, sessionId: polarSessionId } = await createScrapeCheckoutSession({
        email,
        twitterHandle, // Backend expects this for scrape
        // numBlocks, // Backend uses fixed package, but send for metadata
        customer_external_id: uniqueScrapeId, // Use the generated unique ID for Polar
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