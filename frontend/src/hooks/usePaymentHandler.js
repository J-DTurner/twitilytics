import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createCheckoutSession,
  createScrapeCheckoutSession,
  verifyPaymentStatus
} from '../services/paymentService';
import { useTweetData } from '../context/TweetDataContext';

const usePaymentHandler = () => {
  const navigate = useNavigate();
  const { 
    processedData, 
    dataSessionId, // This is our internal analysis session ID for uploaded files
    timeframe, 
    updatePaidStatus, 
    updateDataSource 
  } = useTweetData();
  
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  
  const generateStandardCheckoutMetadata = useCallback(() => {
    // For file uploads, dataSessionId is crucial.
    if (!dataSessionId) {
      console.warn('No dataSessionId available for standard payment metadata. This is needed to link payment to analysis.');
      // Fallback, though this scenario should ideally be prevented by UI flow.
      return {
        source: 'twitilytics_app_file_upload',
        timestamp: new Date().toISOString(),
        serviceType: 'premium_analysis_file_upload',
        // dataSessionId will be undefined here, which is problematic.
      };
    }
    
    return {
      dataSessionId: dataSessionId, // This is our internal analysis session ID
      tweetCount: processedData?.allTweets?.length || processedData?.tweetCount || 0, // Use processedData from context if available
      timeframe: processedData?.timeframe || timeframe || 'all',
      timestamp: new Date().toISOString(),
      serviceType: 'premium_analysis_file_upload'
    };
  }, [processedData, dataSessionId, timeframe]);
  
  const handleStandardPayment = useCallback(async ({ email } = {}) => {
    // dataSessionId comes from useTweetData context, set after file upload processing by useTweetFileProcessor
    if (!dataSessionId) {
      setPaymentError('Analysis session not found. Please re-upload your file.');
      return;
    }
    
    setIsProcessingPayment(true);
    setPaymentError(null);
    
    try {
      const metadata = generateStandardCheckoutMetadata();
      // customer_external_id should be our internal analysis session ID (dataSessionId)
      // to link the Polar customer/order back to this specific analysis.
      const { status, url, sessionId: polarCheckoutSessionId } = await createCheckoutSession({
        email,
        customer_external_id: dataSessionId, // Use our internal analysis session ID
        metadata // Send the whole metadata object
      });
      
      if (status === 'success' && url) {
        localStorage.setItem('pendingPaymentSession', polarCheckoutSessionId);
        localStorage.setItem('pendingDataSessionId', dataSessionId); // Store our dataSessionId too
        window.location.href = url;
      } else {
        throw new Error('Invalid response from payment service for standard payment');
      }
    } catch (error) {
      console.error('Standard payment initiation error:', error);
      setPaymentError(`Payment processing failed: ${error.message}. Please try again.`);
    } finally {
      setIsProcessingPayment(false);
    }
  }, [dataSessionId, generateStandardCheckoutMetadata]);

  const handleScrapePayment = useCallback(async ({ email, twitterHandle, numBlocks } = {}) => {
    setIsProcessingPayment(true);
    setPaymentError(null);
    
    try {
      // For scrapes, customer_external_id can be a unique ID for this specific scrape job.
      const uniqueScrapeJobId = `scrape_${twitterHandle}_${Date.now()}`;
      const metadata = {
        twitterHandle,
        numBlocks, // numBlocks here defines what package the user *selected* on frontend
        serviceType: 'scrape_analysis',
        timestamp: new Date().toISOString(),
        scrapeJobId: uniqueScrapeJobId // Store it in metadata too for redundancy
      };

      const { status, url, sessionId: polarCheckoutSessionId } = await createScrapeCheckoutSession({
        email,
        twitterHandle,
        // numBlocks is implicitly handled by backend's priceId selection for scrape packages
        customer_external_id: uniqueScrapeJobId, // Use the generated unique ID
        metadata
      });
      
      if (status === 'success' && url) {
        localStorage.setItem('pendingPaymentSession', polarCheckoutSessionId);
        localStorage.setItem('pendingScrapeJobId', uniqueScrapeJobId); // Store unique scrape ID
        window.location.href = url;
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
  
  const verifyPaymentFromUrl = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const polarCheckoutSessionId = urlParams.get('session_id'); // This is Polar's checkout session ID
    
    if (!polarCheckoutSessionId) {
      // This handles cases where the page might be reloaded or navigated to without the session_id
      // Try to get from localStorage if it was a pending session
      const pendingPolarSessionId = localStorage.getItem('pendingPaymentSession');
      if (pendingPolarSessionId) {
          // Potentially redirect to the proper URL with session_id to trigger verification
          // Or, if we are already on /payment/verify, proceed with pendingPolarSessionId
          // For simplicity, if on /payment/verify and session_id is missing, it's likely an issue.
          // console.warn("Verifying payment: session_id missing from URL, checking localStorage.");
          // For now, strict check on URL param for /payment/verify page.
          // FileUploadSection.jsx or other components initiate payment and redirect.
          // PaymentVerification.jsx handles the /payment/verify route.
          return false; 
      }
      return false;
    }
    
    setIsVerifyingPayment(true);
    setPaymentError(null);
    
    try {
      const result = await verifyPaymentStatus(polarCheckoutSessionId); 
      
      if (result.status === 'success' && result.paid) {
        updatePaidStatus(true, polarCheckoutSessionId);
        
        const metadata = result.metadata || {};
        const serviceType = metadata.serviceType || (urlParams.get('type') === 'scrape' ? 'scrape_analysis' : 'premium_analysis_file_upload');
        
        if (serviceType === 'scrape_analysis') {
          const scrapeJobId = metadata.scrapeJobId || urlParams.get('customer_external_id') || localStorage.getItem('pendingScrapeJobId');
          updateDataSource('username', { 
            handle: metadata.twitterHandle || urlParams.get('handle'), 
            blocks: parseInt(metadata.numBlocks || urlParams.get('blocks'), 10),
            paymentSessionId: polarCheckoutSessionId,
            scrapeJobId // Link to the specific scrape job
          });
        } else { // Default to file-based analysis payment
          // dataSessionId is our internal analysis session ID.
          // It was passed to Polar as customer_external_id or in metadata.dataSessionId.
          const analysisDataSessionId = metadata.dataSessionId || urlParams.get('data_session_id') || localStorage.getItem('pendingDataSessionId');
          if (analysisDataSessionId) {
            updateDataSource('file', { 
              paymentSessionId: polarCheckoutSessionId,
              dataSessionId: analysisDataSessionId 
            });
          } else {
            console.error("Critical: Could not determine analysisDataSessionId after successful file payment.");
            setPaymentError("Payment successful, but could not link to your analysis. Please contact support.");
            return false; // Indicate verification failed to link
          }
        }
        localStorage.removeItem('pendingPaymentSession');
        localStorage.removeItem('pendingDataSessionId');
        localStorage.removeItem('pendingScrapeJobId');
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
    handleStandardPayment,
    handleScrapePayment,
    verifyPaymentFromUrl,
    goToReport
  };
};

export default usePaymentHandler;