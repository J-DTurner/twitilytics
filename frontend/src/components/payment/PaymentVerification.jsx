import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTweetData } from '../../context/TweetDataContext';
import { verifyPaymentStatus } from '../../services/paymentService';

/**
 * Payment Verification Component
 * 
 * This component verifies the payment status after a user returns
 * from the Stripe checkout flow, updating their paid status if successful.
 */
const PaymentVerification = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { updateDataSource, updatePaidStatus } = useTweetData();
  
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const sessionId = params.get('session_id');
    const handleFromUrl = params.get('handle');
    const blocksFromUrl = params.get('blocks');
    
    if (!sessionId) return navigate('/');
    
    verifyPaymentStatus(sessionId).then(result => {
      if (result.paid) {
        const stripeMetadataAnalysisType = result.metadata?.analysisType;
        
        if (stripeMetadataAnalysisType === 'scrape') {
          // It was a "Analyze by Username" type payment
          updateDataSource('username', { 
            handle: result.metadata.twitterHandle || handleFromUrl,
            blocks: parseInt(result.metadata.numBlocks || blocksFromUrl, 10) 
          });
        } else {
          // Assume it was a "File Upload" type payment
          updateDataSource('file', { paymentSessionId: sessionId });
        }
        updatePaidStatus(true, sessionId);
        navigate('/report');
      } else {
        setError('Payment not completed.');
      }
      setVerifying(false);
    }).catch(err => {
      setError(err.message);
      setVerifying(false);
    });
  }, [params, navigate, updateDataSource, updatePaidStatus]);

  if (verifying) return <p>Verifying payment...</p>;
  if (error) return <p>Error: {error}</p>;
  return null;
};

export default PaymentVerification;