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
    // processedData: contextProcessedData, // Less relevant now, ReportPage fetches if needed
    // updateProcessedDataAndSessionId // Not needed here, ReportPage fetches
  } = useTweetData();
  
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Verifying your payment, please wait...');

  useEffect(() => {
    const polarCheckoutSessionId = searchParams.get('session_id');
    const sourceType = searchParams.get('source'); // Should be 'polar'
    
    // URL params are potential fallbacks if metadata is incomplete, but metadata from Polar is primary.
    const analysisTypeFromUrl = searchParams.get('type'); 
    const analysisSessionIdFromUrl = searchParams.get('data_session_id'); 
    const customerExternalIdFromUrl = searchParams.get('customer_external_id'); // Could be scrapeJobId or dataSessionId

    if (!polarCheckoutSessionId || sourceType !== 'polar') {
      setStatusMessage('Invalid payment verification URL.');
      setError('Invalid or missing Polar session ID.');
      setVerifying(false);
      setTimeout(() => navigate('/'), 3000);
      return;
    }
    
    verifyPaymentStatus(polarCheckoutSessionId) // This calls our backend /api/payment/status/:id
      .then(result => {
        // Backend result: { status: 'success', paid: boolean, paymentStatus: string, customer?: {email}, metadata?: {...} }
        if (result.status === 'success' && result.paid) {
          setStatusMessage('Payment successful! Preparing your report...');
          updatePaidStatus(true, polarCheckoutSessionId);

          const metadata = result.metadata || {};
          // Determine service type primarily from metadata, fallback to URL if necessary
          const serviceType = metadata.serviceType || (analysisTypeFromUrl === 'scrape' ? 'scrape_analysis' : 'premium_analysis_file_upload');

          if (serviceType === 'scrape_analysis') {
            const handle = metadata.twitterHandle || searchParams.get('handle');
            const blocks = parseInt(metadata.numBlocks || searchParams.get('blocks'), 10);
            // scrapeJobId was set as customer_external_id or in metadata.scrapeJobId
            const scrapeJobId = metadata.scrapeJobId || customerExternalIdFromUrl || metadata.customer_external_id; 

            if (!handle || isNaN(blocks) || !scrapeJobId) {
              console.error("PaymentVerification: Missing critical info for scrape analysis.", { handle, blocks, scrapeJobId, metadata });
              setError('Payment verified, but scrape details are incomplete. Please contact support.');
              setVerifying(false);
              return;
            }
            updateDataSource('username', { 
              handle, 
              blocks,
              paymentSessionId: polarCheckoutSessionId, 
              scrapeJobId
            });
            localStorage.setItem('lastAnalysisType', 'scrape'); // Hint for ReportPage
          } else { // Default to file-based analysis
            // dataSessionId was set as customer_external_id or in metadata.dataSessionId
            const analysisDataSessionId = metadata.dataSessionId || customerExternalIdFromUrl || analysisSessionIdFromUrl;
            
            if (!analysisDataSessionId) {
                console.error(`PaymentVerification: Premium analysis paid, but no dataSessionId found.`, { metadata, customerExternalIdFromUrl, analysisSessionIdFromUrl });
                setError('Could not link payment to your analysis session. Please contact support with Polar Session ID: ' + polarCheckoutSessionId);
                setVerifying(false);
                return;
            }
            updateDataSource('file', { 
              paymentSessionId: polarCheckoutSessionId,
              dataSessionId: analysisDataSessionId
            });
            localStorage.setItem('lastAnalysisType', 'file'); // Hint for ReportPage
          }
          
          // Clear pending items from localStorage as they are now processed
          localStorage.removeItem('pendingPaymentSession');
          localStorage.removeItem('pendingDataSessionId');
          localStorage.removeItem('pendingScrapeJobId');
          localStorage.removeItem('pendingScrapeNumBlocks');
          localStorage.removeItem('pendingScrapeTwitterHandle');

          setTimeout(() => navigate('/report'), 1000);
        } else {
          setStatusMessage(`Payment not completed. Status: ${result.paymentStatus || 'unknown'}.`);
          setError(`Payment verification failed. Status: ${result.paymentStatus}. If you believe this is an error, please contact support with Polar Session ID: ${polarCheckoutSessionId}`);
          setVerifying(false);
        }
      })
      .catch(err => {
        setStatusMessage('Error verifying payment.');
        setError(`Payment verification failed: ${err.message}. Please contact support with Polar Session ID: ${polarCheckoutSessionId}`);
        setVerifying(false);
      });
  // Removed contextProcessedData and updateProcessedDataAndSessionId from dependencies
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
          <button 
            onClick={() => navigate('/')} 
            className="btn btn-primary btn-md mt-4"
          >
            Return to Homepage
          </button>
        )}
        {!verifying && !error && statusMessage.startsWith('Payment successful') && (
             <p className="text-gray-600">Redirecting to your report...</p>
        )}
      </div>
    </div>
  );
};

export default PaymentVerification;