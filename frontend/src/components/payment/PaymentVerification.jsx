import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTweetData } from '../../context/TweetDataContext';
import { verifyPaymentStatus } from '../../services/paymentService'; // verifyPaymentStatus now calls backend

/**
 * Payment Verification Component
 * 
 * This component verifies the payment status after a user returns
 * from the Polar checkout flow, updating their paid status if successful.
 */
const PaymentVerification = () => {
  const [searchParams] = useSearchParams(); // Use searchParams directly
  const navigate = useNavigate();
  const { updateDataSource, updatePaidStatus, updateProcessedDataAndSessionId, processedData: contextProcessedData } = useTweetData();
  
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Verifying your payment, please wait...');

  useEffect(() => {
    const polarCheckoutSessionId = searchParams.get('session_id');
    const sourceType = searchParams.get('source'); // Should be 'polar'
    const analysisType = searchParams.get('type'); // 'premium_analysis' or 'scrape'
    // For file uploads, data_session_id from success_url helps link back to the file session
    const analysisSessionIdFromUrl = searchParams.get('data_session_id'); 
    // For scrape, customer_external_id from success_url helps identify the scrape job
    const customerExternalIdFromUrl = searchParams.get('customer_external_id'); 


    if (!polarCheckoutSessionId || sourceType !== 'polar') {
      setStatusMessage('Invalid payment verification URL.');
      setError('Invalid or missing session ID.');
      setVerifying(false);
      setTimeout(() => navigate('/'), 3000);
      return;
    }
    
    verifyPaymentStatus(polarCheckoutSessionId)
      .then(result => {
        // result from backend: { status: 'success', paid: boolean, paymentStatus: string, customer?: {email}, metadata?: {}, analysisSession?: {dataSessionId, isPaidInternally, fileName} }
        if (result.status === 'success' && result.paid) {
          setStatusMessage('Payment successful! Preparing your report...');
          updatePaidStatus(true, polarCheckoutSessionId); // Mark user as paid, store Polar session ID

          const metadata = result.metadata || {};
          const linkedAnalysisSessionId = metadata.dataSessionId || analysisSessionIdFromUrl || metadata.scrapeJobId || customerExternalIdFromUrl;

          if (analysisType === 'scrape' || metadata.serviceType === 'scrape_analysis') {
            updateDataSource('username', { 
              handle: metadata.twitterHandle || searchParams.get('handle'), 
              blocks: parseInt(metadata.numBlocks || searchParams.get('blocks'), 10),
              paymentSessionId: polarCheckoutSessionId, // Polar's checkout session ID
              scrapeJobId: linkedAnalysisSessionId // The unique ID for this scrape job
            });
          } else { // Default to file-based analysis
            // For file uploads, the dataSessionId (analysisSessionId) is key.
            // It should have been set in Polar's customer_external_id or metadata.dataSessionId.
            if (linkedAnalysisSessionId) {
              updateDataSource('file', { 
                paymentSessionId: polarCheckoutSessionId,
                dataSessionId: linkedAnalysisSessionId // This is our internal analysis session ID
              });
              // If contextProcessedData is not for this session, it should be cleared or re-fetched
              // For now, assume TweetDataContext handles sessionId changes correctly.
              // If the processedData in context isn't linked to linkedAnalysisSessionId,
              // the report page might need to re-fetch session data using this ID.
              // The current logic in ReportPage.jsx fetches if dataSource.type is 'username' OR if rawTweetsJsContent is missing.
              // We should ensure `rawTweetsJsContent` (or rather `dataSessionId` in context) is set correctly.
              if (contextProcessedData && contextProcessedData.sessionId !== linkedAnalysisSessionId) {
                // If current context data is for a different session, clear it or update.
                // updateProcessedDataAndSessionId might need to be called if we fetch the data here.
                // For now, ReportPage.jsx should handle loading data based on `dataSource.dataSessionId`.
              }

            } else {
                // This was console.error, changing to logger.warn as it's a client-side log now
                console.warn(`[PaymentVerification] Premium analysis paid, but no dataSessionId found in Polar metadata or URL to link to an analysis session.`);
                setError('Could not link payment to your analysis session. Please contact support.');
                setVerifying(false);
                return;
            }
          }
          
          setTimeout(() => navigate('/report'), 1000); // Navigate to report page
        } else {
          setStatusMessage(`Payment not completed. Status: ${result.paymentStatus || 'unknown'}`);
          setError(`Payment verification failed. Status: ${result.paymentStatus}. If you believe this is an error, please contact support with session ID: ${polarCheckoutSessionId}`);
          setVerifying(false);
        }
      })
      .catch(err => {
        setStatusMessage('Error verifying payment.');
        setError(`Payment verification failed: ${err.message}. Please try again or contact support with session ID: ${polarCheckoutSessionId}`);
        setVerifying(false);
      });
  }, [searchParams, navigate, updateDataSource, updatePaidStatus, updateProcessedDataAndSessionId, contextProcessedData]);

  return (
    <div className="payment-verification-container">
      <div className="verification-card">
        {verifying && <div className="spinner"></div>}
        <h2 className={`text-xl font-semibold mb-2 ${error ? 'text-red-600' : 'text-gray-800'}`}>
          {error ? 'Payment Verification Issue' : verifying ? 'Verifying Payment' : 'Payment Verified'}
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
      </div>
    </div>
  );
};

export default PaymentVerification;