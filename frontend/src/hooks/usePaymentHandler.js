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
    if (!dataSessionId) {
      console.warn('No dataSessionId available for standard payment metadata.');
      return {
        source: 'twitilytics_app_file_upload',
        timestamp: new Date().toISOString(),
        serviceType: 'premium_analysis_file_upload',
      };
    }
    
    return {
      dataSessionId: dataSessionId,
      tweetCount: processedData?.allTweets?.length || processedData?.tweetCount || 0,
      timeframe: processedData?.timeframe || timeframe || 'all',
      timestamp: new Date().toISOString(),
      serviceType: 'premium_analysis_file_upload'
    };
  }, [processedData, dataSessionId, timeframe]);
  
  const handleStandardPayment = useCallback(async ({ email } = {}) => {
    if (!dataSessionId) {
      setPaymentError('Analysis session not found. Please re-upload your file.');
      setIsProcessingPayment(false); // Ensure state is reset
      return;
    }
    
    setIsProcessingPayment(true);
    setPaymentError(null);
    
    try {
      const metadata = generateStandardCheckoutMetadata();
      const { status, url, sessionId: polarCheckoutSessionId } = await createCheckoutSession({
        email,
        customer_external_id: dataSessionId, // Use our internal analysis session ID
        metadata
      });
      
      if (status === 'success' && url) {
        localStorage.setItem('pendingPaymentSession', polarCheckoutSessionId);
        localStorage.setItem('pendingDataSessionId', dataSessionId); // Store our dataSessionId
        window.location.href = url;
      } else {
        throw new Error( (await createCheckoutSession({email, customer_external_id: dataSessionId, metadata})).message || 'Invalid response from payment service for standard payment');
      }
    } catch (error) {
      console.error('Standard payment initiation error:', error);
      setPaymentError(`Payment processing failed: ${error.message}. Please try again.`);
      setIsProcessingPayment(false);
    } 
    // No finally here, as successful redirect means component unmounts
  }, [dataSessionId, generateStandardCheckoutMetadata]);

  const handleScrapePayment = useCallback(async ({ email, twitterHandle, numBlocks } = {}) => {
    setIsProcessingPayment(true);
    setPaymentError(null);
    
    try {
      const uniqueScrapeJobId = `scrape_${twitterHandle}_${numBlocks}_${Date.now()}`;
      const metadata = {
        twitterHandle,
        numBlocks, 
        serviceType: 'scrape_analysis',
        timestamp: new Date().toISOString(),
        scrapeJobId: uniqueScrapeJobId 
      };

      const { status, url, sessionId: polarCheckoutSessionId } = await createScrapeCheckoutSession({
        email,
        twitterHandle,
        numBlocks, // Send numBlocks, backend will decide Price ID based on it
        customer_external_id: uniqueScrapeJobId,
        metadata
      });
      
      if (status === 'success' && url) {
        localStorage.setItem('pendingPaymentSession', polarCheckoutSessionId);
        localStorage.setItem('pendingScrapeJobId', uniqueScrapeJobId);
        localStorage.setItem('pendingScrapeNumBlocks', numBlocks.toString()); // Store numBlocks
        localStorage.setItem('pendingScrapeTwitterHandle', twitterHandle); // Store handle
        window.location.href = url;
      } else {
        throw new Error((await createScrapeCheckoutSession({email, twitterHandle, numBlocks, customer_external_id: uniqueScrapeJobId, metadata})).message || 'Invalid response from payment service for scrape payment');
      }
    } catch (error) {
      console.error('Scrape payment initiation error:', error);
      setPaymentError(`Payment processing failed: ${error.message}. Please try again.`);
      setIsProcessingPayment(false);
    }
    // No finally here for same reason as above
  }, []);
  
  const verifyPaymentFromUrl = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const polarCheckoutSessionId = urlParams.get('session_id');
    
    if (!polarCheckoutSessionId) {
        return false; 
    }
    
    setIsVerifyingPayment(true);
    setPaymentError(null);
    
    try {
      const result = await verifyPaymentStatus(polarCheckoutSessionId); 
      
      if (result.status === 'success' && result.paid) {
        updatePaidStatus(true, polarCheckoutSessionId);
        
        const metadata = result.metadata || {};
        // Infer serviceType from metadata or URL params as fallback
        const serviceType = metadata.serviceType || (urlParams.get('type') === 'scrape' ? 'scrape_analysis' : 'premium_analysis_file_upload');
        
        if (serviceType === 'scrape_analysis') {
          const scrapeJobId = metadata.scrapeJobId || urlParams.get('customer_external_id') || localStorage.getItem('pendingScrapeJobId');
          const handle = metadata.twitterHandle || urlParams.get('handle') || localStorage.getItem('pendingScrapeTwitterHandle');
          const blocks = parseInt(metadata.numBlocks || urlParams.get('blocks') || localStorage.getItem('pendingScrapeNumBlocks'), 10);

          if (!scrapeJobId || !handle || isNaN(blocks)) {
            console.error("Critical: Missing data for scrape analysis after payment verification.", {scrapeJobId, handle, blocks, metadata});
            setPaymentError("Payment successful, but crucial scrape details are missing. Please contact support.");
            return false;
          }

          updateDataSource('username', { 
            handle, 
            blocks,
            paymentSessionId: polarCheckoutSessionId, // Polar's checkout ID
            scrapeJobId // Our unique ID for this scrape job
          });
        } else { 
          const analysisDataSessionId = metadata.dataSessionId || urlParams.get('data_session_id') || localStorage.getItem('pendingDataSessionId');
          if (analysisDataSessionId) {
            updateDataSource('file', { 
              paymentSessionId: polarCheckoutSessionId, // Polar's checkout ID
              dataSessionId: analysisDataSessionId // Our internal analysis session ID for the file
            });
          } else {
            console.error("Critical: Could not determine analysisDataSessionId after successful file payment.");
            setPaymentError("Payment successful, but could not link to your analysis session. Please contact support.");
            return false;
          }
        }
        localStorage.removeItem('pendingPaymentSession');
        localStorage.removeItem('pendingDataSessionId');
        localStorage.removeItem('pendingScrapeJobId');
        localStorage.removeItem('pendingScrapeNumBlocks');
        localStorage.removeItem('pendingScrapeTwitterHandle');
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