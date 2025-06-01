import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTweetData } from '../../context/TweetDataContext';
import { verifyPaymentStatus } from '../../services/paymentService';

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

  useEffect(() => {
    const polarCheckoutSessionId = searchParams.get('session_id');
    const sourceType = searchParams.get('source'); // Should be 'polar'
    
    const analysisTypeFromUrl = searchParams.get('type'); 
    const analysisSessionIdFromUrl = searchParams.get('data_session_id'); 
    const customerExternalIdFromUrl = searchParams.get('customer_external_id'); // Could be scrapeJobId or dataSessionId

    // ADD THIS LOG:
    console.group('[PaymentVerification] URL Parameters Received');
    console.log('Raw polarCheckoutSessionId from URL:', polarCheckoutSessionId);
    console.log('Source Type from URL:', sourceType);
    console.log('Analysis Type from URL:', analysisTypeFromUrl);
    console.log('Analysis Session ID (data_session_id) from URL:', analysisSessionIdFromUrl);
    console.log('Customer External ID (customer_external_id) from URL:', customerExternalIdFromUrl);
    console.log('All Search Params Object:', Object.fromEntries(searchParams));
    console.groupEnd();
    // END OF ADDED LOG

    if (!polarCheckoutSessionId || sourceType !== 'polar') {
      setStatusMessage('Invalid payment verification URL. Missing session_id or source.');
      setError('Invalid or missing Polar session ID or source parameter in URL.');
      setVerifying(false);
      // setTimeout(() => navigate('/'), 3000); // Consider removing auto-redirect on error
      return;
    }
    
    // ADD A CHECK FOR THE LITERAL PLACEHOLDER STRING
    if (polarCheckoutSessionId === '{CHECKOUT_SESSION_ID}') {
        console.error('[PaymentVerification] Critical Error: Received literal placeholder "{CHECKOUT_SESSION_ID}" as session_id from URL.');
        setStatusMessage('Error: Invalid session identifier from payment provider.');
        setError('Received a placeholder session ID. Payment verification cannot proceed. This often indicates an issue with the payment provider redirect setup or that the redirect happened before the placeholder was replaced. Please contact support if your payment was successful.');
        setVerifying(false);
        // setTimeout(() => navigate('/'), 7000); // Optional: redirect after a longer delay for user to read message
        return;
    }
    // END OF ADDED CHECK
    
    verifyPaymentStatus(polarCheckoutSessionId) // This calls our backend /api/payment/status/:id
      .then(result => {
        // Backend result: { status: 'success', paid: boolean, paymentStatus: string, customer?: {email}, metadata?: {...} }
        console.log('[PaymentVerification] Backend verification result:', result); // Log backend response

        if (result.status === 'success' && result.paid) {
          setStatusMessage('Payment successful! Preparing your report...');
          updatePaidStatus(true, polarCheckoutSessionId);

          const metadata = result.metadata || {};
          console.log('[PaymentVerification] Payment successful. Metadata from Polar:', metadata);

          const serviceType = metadata.serviceType || (analysisTypeFromUrl === 'scrape' ? 'scrape_analysis' : 'premium_analysis_file_upload');
          console.log('[PaymentVerification] Determined serviceType:', serviceType);

          if (serviceType === 'scrape_analysis') {
            const handle = metadata.twitterHandle || searchParams.get('handle');
            const blocks = parseInt(metadata.numBlocks || searchParams.get('blocks'), 10);
            const scrapeJobId = metadata.scrapeJobId || customerExternalIdFromUrl || metadata.customer_external_id; 

            console.log('[PaymentVerification] Scrape Analysis Details - Handle:', handle, 'Blocks:', blocks, 'ScrapeJobID:', scrapeJobId);

            if (!handle || isNaN(blocks) || !scrapeJobId) {
              console.error("[PaymentVerification] Missing critical info for scrape analysis.", { handle, blocks, scrapeJobId, metadata, searchParams: Object.fromEntries(searchParams) });
              setError('Payment verified, but scrape details are incomplete. Please contact support with Polar Session ID: ' + polarCheckoutSessionId);
              setVerifying(false);
              return;
            }
            updateDataSource('username', { 
              handle, 
              blocks,
              paymentSessionId: polarCheckoutSessionId, 
              scrapeJobId
            });
            localStorage.setItem('lastAnalysisType', 'scrape');
          } else { 
            const analysisDataSessionId = metadata.dataSessionId || customerExternalIdFromUrl || analysisSessionIdFromUrl;
            console.log('[PaymentVerification] File Analysis Details - DataSessionID:', analysisDataSessionId);
            
            if (!analysisDataSessionId) {
                console.error(`[PaymentVerification] Premium analysis (file) paid, but no dataSessionId found.`, { metadata, customerExternalIdFromUrl, analysisSessionIdFromUrl, searchParams: Object.fromEntries(searchParams) });
                setError('Could not link payment to your analysis session. Please contact support with Polar Session ID: ' + polarCheckoutSessionId);
                setVerifying(false);
                return;
            }
            updateDataSource('file', { 
              paymentSessionId: polarCheckoutSessionId,
              dataSessionId: analysisDataSessionId
            });
            localStorage.setItem('lastAnalysisType', 'file');
          }
          
          localStorage.removeItem('pendingPaymentSession');
          localStorage.removeItem('pendingDataSessionId');
          localStorage.removeItem('pendingScrapeJobId');
          localStorage.removeItem('pendingScrapeNumBlocks');
          localStorage.removeItem('pendingScrapeTwitterHandle');
          console.log('[PaymentVerification] Cleaned up pending localStorage items.');

          setTimeout(() => navigate('/report'), 1000);
        } else {
          setStatusMessage(`Payment not completed. Status: ${result.paymentStatus || 'unknown'}.`);
          setError(`Payment verification failed. Status: ${result.paymentStatus}. If you believe this is an error, please contact support with Polar Session ID: ${polarCheckoutSessionId}`);
          setVerifying(false);
        }
      })
      .catch(err => {
        console.error('[PaymentVerification] Error during verifyPaymentStatus call:', err);
        setStatusMessage('Error verifying payment.');
        setError(`Payment verification failed: ${err.message}. Please contact support with Polar Session ID: ${polarCheckoutSessionId}`);
        setVerifying(false);
      });
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