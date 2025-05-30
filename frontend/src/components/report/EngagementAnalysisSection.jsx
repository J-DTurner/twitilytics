import React, { useEffect, useState } from 'react';
import { useTweetData } from '../../context/TweetDataContext';
import { getEngagementAnalysis as fetchEngagementAnalysis } from '../../services/analysisService';

/**
 * Engagement Analysis Section Component
 * 
 * This component displays the engagement analysis section, which shows 
 * patterns in tweet engagement, top performing tweets, and engagement metrics.
 */
const EngagementAnalysisSection = () => {
  const { rawTweetsJsContent, isPaidUser, timeframe } = useTweetData();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisHtml, setAnalysisHtml] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  
  useEffect(() => {
    if (!rawTweetsJsContent) return;
    setLoading(true); setError(null); setIsLocked(false);
    fetchEngagementAnalysis(rawTweetsJsContent, isPaidUser, timeframe)
      .then(res => {
        if (res.requiresUpgrade) { setIsLocked(true); setAnalysisHtml(res.analysis); }
        else setAnalysisHtml(res.analysis);
      })
      .catch(e => setError(e.message || 'Failed to generate engagement analysis'))
      .finally(() => setLoading(false));
  }, [rawTweetsJsContent, isPaidUser, timeframe]);
  
  const handleRetry = () => {
    if (!rawTweetsJsContent) return;
    setLoading(true); setError(null); setIsLocked(false);
    fetchEngagementAnalysis(rawTweetsJsContent, isPaidUser, timeframe)
      .then(res => {
        if (res.requiresUpgrade) { setIsLocked(true); setAnalysisHtml(res.analysis); }
        else setAnalysisHtml(res.analysis);
      })
      .catch(e => setError(e.message || 'Failed to generate engagement analysis'))
      .finally(() => setLoading(false));
  };
  
  if (!rawTweetsJsContent) return null;
  
  return (
    <section className="report-section engagement-analysis">
      <div className="section-header">
        <h2 className="section-title">Engagement Analysis</h2>
      </div>
      
      <div className="section-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Analyzing your engagement metrics...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button 
              onClick={handleRetry}
              className="retry-button"
            >
              Try Again
            </button>
          </div>
        ) : isLocked ? (
          <div className="locked-container">
            <p>This analysis is locked. Upgrade to access more insights.</p>
          </div>
        ) : (
          <div 
            className="analysis-content"
            dangerouslySetInnerHTML={{ __html: analysisHtml }}
          />
        )}
      </div>
    </section>
  );
};

export default EngagementAnalysisSection;