import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTweetData } from '../../context/TweetDataContext';
import { verifyPaymentStatus, verifyPaymentByInternalId } from '../../services/paymentService';

const POLLING_INTERVAL = 3000; // 3 seconds
const MAX_POLLS = 20; // Max 20 polls (1 minute)

const PaymentVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { 
    updateDataSource, 
    updatePaidStatus,
  } = useTweetData();
  
  const [verifying, setVerifying] = useState(true); // Keep verifying true initially
  const [error, setError] = useState(null);
  // Initial status message
  const [statusMessage, setStatusMessage] = useState('Verifying your payment, please wait...');
  const pollCountRef = useRef(0);
  const intervalIdRef = useRef(null); // To store interval ID for cleanup

  // Helper function to process successful payment
  const processSuccessfulPayment = (result, polarCheckoutIdFromVerification) => {
      setVerifying(false); // Stop verifying spinner
      setStatusMessage('Payment successful! Preparing your report...');
      updatePaidStatus(true, polarCheckoutIdFromVerification); 

      const metadata = result.metadata || {};
      const analysisTypeFromUrl = searchParams.get('type'); 
      const customerExternalIdFromUrl = searchParams.get('customer_external_id'); 
      const analysisSessionIdFromUrl = searchParams.get('data_session_id'); 

      const serviceType = metadata.serviceType || (analysisTypeFromUrl === 'scrape' ? 'scrape_analysis' : 'premium_analysis_file_upload');

      if (serviceType === 'scrape_analysis') {
        const handle = metadata.twitterHandle || searchParams.get('handle');
        const blocks = parseInt(metadata.numBlocks || searchParams.get('blocks'), 10);
        const scrapeJobId = metadata.scrapeJobId || customerExternalIdFromUrl; 

        if (!handle || isNaN(blocks) || !scrapeJobId) {
          setError('Payment verified, but scrape details are incomplete. Please contact support with Polar Session ID: ' + polarCheckoutIdFromVerification);
          return;
        }
        updateDataSource('username', { 
          handle, 
          blocks,
          paymentSessionId: polarCheckoutIdFromVerification, 
          scrapeJobId 
        });
        localStorage.setItem('lastAnalysisType', 'scrape');
      } else { 
        const internalAnalysisSessionId = metadata.dataSessionId || customerExternalIdFromUrl || analysisSessionIdFromUrl;
        
        if (!internalAnalysisSessionId) {
            setError('Could not link payment to your analysis session. Please contact support with Polar Session ID: ' + polarCheckoutIdFromVerification);
            return;
        }
        updateDataSource('file', { 
          paymentSessionId: polarCheckoutIdFromVerification,
          dataSessionId: internalAnalysisSessionId
        });
        localStorage.setItem('lastAnalysisType', 'file');
      }
      
      localStorage.removeItem('pendingPaymentSession');
      localStorage.removeItem('pendingDataSessionId');
      localStorage.removeItem('pendingScrapeJobId');
      localStorage.removeItem('pendingScrapeNumBlocks');
      localStorage.removeItem('pendingScrapeTwitterHandle');

      setTimeout(() => navigate('/report'), 1000);
  };


  useEffect(() => {
    const polarCheckoutSessionIdFromUrl = searchParams.get('session_id');
    const sourceType = searchParams.get('source');
    // data_session_id for file uploads, customer_external_id for scrapes (which is our scrapeJobId)
    const internalIdFromUrl = searchParams.get('data_session_id') || searchParams.get('customer_external_id');

    console.group('[PaymentVerification] useEffect Init');
    console.log('Raw polarCheckoutSessionId from URL:', polarCheckoutSessionIdFromUrl);
    console.log('Source Type from URL:', sourceType);
    console.log('Internal ID (data_session_id or customer_external_id) from URL:', internalIdFromUrl);
    console.groupEnd();

    if (!polarCheckoutSessionIdFromUrl || sourceType !== 'polar') {
      setStatusMessage('Invalid payment verification URL.');
      setError('Invalid or missing Polar session ID or source parameter in URL.');
      setVerifying(false);
      return;
    }
    
    const attemptDirectVerification = async (polarIdToVerify) => {
      console.log('[PaymentVerification] Attempting direct verification with Polar ID:', polarIdToVerify);
      setVerifying(true); // Ensure verifying is true
      setStatusMessage('Verifying your payment directly...');
      try {
        const result = await verifyPaymentStatus(polarIdToVerify);
        console.log('[PaymentVerification] Direct verification result:', result);
        if (result.status === 'success' && result.paid) {
          processSuccessfulPayment(result, polarIdToVerify);
        } else {
          setStatusMessage(`Payment not completed. Status: ${result.paymentStatus || 'unknown'}.`);
          setError(`Direct payment verification failed. Status: ${result.paymentStatus}. If you believe this is an error, please contact support with Polar Session ID: ${polarIdToVerify}`);
          setVerifying(false);
        }
      } catch (err) {
        console.error('[PaymentVerification] Direct verification error:', err);
        setStatusMessage('Error during direct payment verification.');
        setError(`Direct payment verification failed: ${err.message}. Please contact support with Polar Session ID: ${polarIdToVerify}`);
        setVerifying(false);
      }
    };

    const startPollingInternalStatus = (internalId) => {
        if (!internalId) {
            setError('Cannot verify payment: essential analysis identifier is missing from URL. Please contact support.');
            setStatusMessage('Verification failed: Missing internal identifier.');
            setVerifying(false);
            return;
        }

        console.log('[PaymentVerification] Starting polling for internal ID:', internalId);
        setVerifying(true); // Ensure verifying is true
        // Set a neutral message while polling
        setStatusMessage('Finalizing payment confirmation... This may take a moment.');
        setError(null); // Clear previous errors if any
        pollCountRef.current = 0;

        intervalIdRef.current = setInterval(async () => {
            pollCountRef.current += 1;
            console.log(`[PaymentVerification] Polling internal status for ${internalId}, attempt ${pollCountRef.current}`);

            if (pollCountRef.current > MAX_POLLS) {
                clearInterval(intervalIdRef.current);
                setError('Payment verification timed out. If your payment was successful, your report access will be updated soon. You can try refreshing this page or contact support if the issue persists. Internal ID: ' + internalId);
                setStatusMessage('Verification Timeout');
                setVerifying(false);
                return;
            }

            try {
                const result = await verifyPaymentByInternalId(internalId);
                console.log('[PaymentVerification] Poll result for internal ID:', internalId, result);
                if (result.status === 'success' && result.paid) {
                    clearInterval(intervalIdRef.current);
                    processSuccessfulPayment(result, result.polarCheckoutSessionId); 
                } else if (result.paymentStatus && result.paymentStatus !== 'pending_webhook') {
                    clearInterval(intervalIdRef.current);
                    setStatusMessage(`Payment status: ${result.paymentStatus}.`);
                    setError(`Payment not confirmed. Status: ${result.paymentStatus}. If you completed payment, please contact support with internal ID: ${internalId}`);
                    setVerifying(false);
                }
                // Else, continue polling if still pending_webhook and not max polls
            } catch (pollError) {
                console.error('[PaymentVerification] Error during internal status poll:', pollError);
                // Potentially add a counter for consecutive poll errors and stop if too many
            }
        }, POLLING_INTERVAL);
    };


    if (polarCheckoutSessionIdFromUrl === '{CHECKOUT_SESSION_ID}') {
        console.warn('[PaymentVerification] Received placeholder session_id. Initiating polling via internal ID.');
        startPollingInternalStatus(internalIdFromUrl);
    } else {
        // Proceed with normal verification using the provided Polar session ID
        attemptDirectVerification(polarCheckoutSessionIdFromUrl);
    }

    // Cleanup interval on component unmount
    return () => {
        if (intervalIdRef.current) {
            clearInterval(intervalIdRef.current);
        }
    };

  }, [searchParams, navigate, updateDataSource, updatePaidStatus]);

  return (
    <div className="payment-verification-container">
      <div className="verification-card">
        {verifying && <div className="spinner"></div>}
        <h2 className={`text-xl font-semibold mb-2 ${error ? 'text-red-600' : 'text-gray-800'}`}>
          {error ? 'Payment Verification Issue' : verifying ? 'Verifying Payment' : statusMessage.startsWith('Payment successful') ? 'Payment Confirmed' : 'Payment Status'}
        </h2>
        <p className="text-gray-600">{statusMessage}</p>
        {error && !verifying && (
          <>
            <p className="text-red-500 text-sm mt-2">{error}</p>
            <button 
              onClick={() => navigate('/')} 
              className="btn btn-primary btn-md mt-4"
            >
              Return to Homepage
            </button>
          </>
        )}
        {!verifying && !error && statusMessage.startsWith('Payment successful') && (
             <p className="text-gray-600">Redirecting to your report...</p>
        )}
      </div>
    </div>
  );
};

export default PaymentVerification;