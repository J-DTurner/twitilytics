import React, { useEffect, useState, useRef } from 'react'; // Add useRef
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTweetData } from '../../context/TweetDataContext';
// Import the new service function
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
  
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Verifying your payment, please wait...');
  const pollCountRef = useRef(0); // Ref to store poll count

  // Helper function to process successful payment
  const processSuccessfulPayment = (result, polarCheckoutIdFromVerification) => {
      setStatusMessage('Payment successful! Preparing your report...');
      // Use the polarCheckoutId obtained from successful verification (either direct or via internal polling)
      updatePaidStatus(true, polarCheckoutIdFromVerification); 

      const metadata = result.metadata || {};
      const analysisTypeFromUrl = searchParams.get('type'); // Original type from URL
      const customerExternalIdFromUrl = searchParams.get('customer_external_id'); // Original customer_external_id from URL
      const analysisSessionIdFromUrl = searchParams.get('data_session_id'); // Original data_session_id from URL


      const serviceType = metadata.serviceType || (analysisTypeFromUrl === 'scrape' ? 'scrape_analysis' : 'premium_analysis_file_upload');

      if (serviceType === 'scrape_analysis') {
        const handle = metadata.twitterHandle || searchParams.get('handle');
        const blocks = parseInt(metadata.numBlocks || searchParams.get('blocks'), 10);
        // For scrape, the customerExternalIdFromUrl or metadata.scrapeJobId IS the internal ID
        const scrapeJobId = metadata.scrapeJobId || customerExternalIdFromUrl; 

        if (!handle || isNaN(blocks) || !scrapeJobId) {
          setError('Payment verified, but scrape details are incomplete. Please contact support with Polar Session ID: ' + polarCheckoutIdFromVerification);
          setVerifying(false);
          return;
        }
        updateDataSource('username', { 
          handle, 
          blocks,
          paymentSessionId: polarCheckoutIdFromVerification, 
          scrapeJobId 
        });
        localStorage.setItem('lastAnalysisType', 'scrape');
      } else { // premium_analysis_file_upload
        // For file uploads, data_session_id or customer_external_id IS the internal ID
        const internalAnalysisSessionId = metadata.dataSessionId || customerExternalIdFromUrl || analysisSessionIdFromUrl;
        
        if (!internalAnalysisSessionId) {
            setError('Could not link payment to your analysis session. Please contact support with Polar Session ID: ' + polarCheckoutIdFromVerification);
            setVerifying(false);
            return;
        }
        updateDataSource('file', { 
          paymentSessionId: polarCheckoutIdFromVerification,
          dataSessionId: internalAnalysisSessionId
        });
        localStorage.setItem('lastAnalysisType', 'file');
      }
      
      // Clear pending items from localStorage
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
    const internalAnalysisSessionId = searchParams.get('data_session_id') || searchParams.get('customer_external_id'); // For file uploads or scrapes

    // ADD THIS LOG:
    console.group('[PaymentVerification] URL Parameters Received');
    console.log('Raw polarCheckoutSessionId from URL:', polarCheckoutSessionIdFromUrl);
    console.log('Source Type from URL:', sourceType);
    console.log('Analysis Type from URL:', searchParams.get('type'));
    console.log('Analysis Session ID (data_session_id) from URL:', searchParams.get('data_session_id'));
    console.log('Customer External ID (customer_external_id) from URL:', searchParams.get('customer_external_id'));
    console.log('All Search Params Object:', Object.fromEntries(searchParams));
    console.groupEnd();
    // END OF ADDED LOG

    if (!polarCheckoutSessionIdFromUrl || sourceType !== 'polar') {
      setStatusMessage('Invalid payment verification URL. Missing session_id or source.');
      setError('Invalid or missing Polar session ID or source parameter in URL.');
      setVerifying(false);
      return;
    }
    
    const attemptVerification = async (polarIdToVerify) => {
      try {
        const result = await verifyPaymentStatus(polarIdToVerify);
        if (result.status === 'success' && result.paid) {
          processSuccessfulPayment(result, polarIdToVerify);
        } else {
          setStatusMessage(`Payment not completed. Status: ${result.paymentStatus || 'unknown'}.`);
          setError(`Payment verification failed. Status: ${result.paymentStatus}. If you believe this is an error, please contact support with Polar Session ID: ${polarIdToVerify}`);
          setVerifying(false);
        }
      } catch (err) {
        setStatusMessage('Error verifying payment.');
        setError(`Payment verification failed: ${err.message}. Please contact support with Polar Session ID: ${polarIdToVerify}`);
        setVerifying(false);
      }
    };

    const pollInternalStatus = async (internalId) => {
        if (!internalId) {
            setError('Cannot verify payment: essential analysis identifier is missing from URL. Please contact support.');
            setStatusMessage('Verification failed.');
            setVerifying(false);
            return;
        }

        setStatusMessage('Payment processing... Please wait while we confirm with the provider.');
        pollCountRef.current = 0;

        const intervalId = setInterval(async () => {
            pollCountRef.current += 1;
            if (pollCountRef.current > MAX_POLLS) {
                clearInterval(intervalId);
                setError('Payment verification timed out. If your payment was successful, the report will be available shortly or contact support with internal ID: ' + internalId);
                setStatusMessage('Verification Timeout');
                setVerifying(false);
                return;
            }

            try {
                console.log(`[PaymentVerification] Polling internal status for ${internalId}, attempt ${pollCountRef.current}`);
                const result = await verifyPaymentByInternalId(internalId);
                if (result.status === 'success' && result.paid) {
                    clearInterval(intervalId);
                    // Pass result and the Polar Checkout ID obtained from internal verification
                    processSuccessfulPayment(result, result.polarCheckoutSessionId); 
                } else if (result.paymentStatus && result.paymentStatus !== 'pending_webhook') {
                    // If status is something other than pending, stop polling (e.g. failed)
                    clearInterval(intervalId);
                    setStatusMessage(`Payment status: ${result.paymentStatus}.`);
                    setError(`Payment not confirmed. If you completed payment, please contact support with internal ID: ${internalId}`);
                    setVerifying(false);
                }
                // Else, continue polling if still pending_webhook and not max polls
            } catch (pollError) {
                console.error('[PaymentVerification] Error during internal status poll:', pollError);
                // Don't stop polling on transient network errors, but log it
                // If it's a persistent error from backend, it might stop if `result.status` is not 'success'
            }
        }, POLLING_INTERVAL);

        return () => clearInterval(intervalId); // Cleanup on unmount
    };


    if (polarCheckoutSessionIdFromUrl === '{CHECKOUT_SESSION_ID}') {
        console.warn('[PaymentVerification] Received placeholder session_id. Attempting verification via internal ID.');
        // Use internalAnalysisSessionId (which should be our dataSessionId or scrapeJobId)
        // This ID was passed in the success_url and is reliable.
        if (!internalAnalysisSessionId) {
             setError("Error: Critical payment and analysis identifiers are missing from the redirect URL. Please contact support.");
             setStatusMessage('Verification Aborted');
             setVerifying(false);
        } else {
            pollInternalStatus(internalAnalysisSessionId);
        }
    } else {
        // Proceed with normal verification using the provided Polar session ID
        attemptVerification(polarCheckoutSessionIdFromUrl);
    }

  }, [searchParams, navigate, updateDataSource, updatePaidStatus]); // Dependencies

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