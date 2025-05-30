import React, { useEffect, useState } from 'react';
import { useTweetData } from '../../context/TweetDataContext';
import { getMonthlyAnalysis as fetchMonthlyAnalysis } from '../../services/analysisService';

/**
 * Monthly Analysis Section Component
 * 
 * This component displays the monthly analysis section, which shows 
 * trends and patterns in the user's Twitter activity on a month-by-month basis.
 * It's a premium feature that requires a paid account.
 */
const MonthlyAnalysisSection = () => {
  const { rawTweetsJsContent, isPaidUser, timeframe } = useTweetData();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisHtml, setAnalysisHtml] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  
  useEffect(() => {
    if (!rawTweetsJsContent) return;
    setLoading(true); setError(null); setIsLocked(false);
    fetchMonthlyAnalysis(rawTweetsJsContent, isPaidUser, timeframe)
      .then(res => {
        if (res.requiresUpgrade) { setIsLocked(true); setAnalysisHtml(res.analysis); }
        else setAnalysisHtml(res.analysis);
      })
      .catch(e => setError(e.message || 'Failed to generate monthly analysis'))
      .finally(() => setLoading(false));
  }, [rawTweetsJsContent, isPaidUser, timeframe]);
  
  const handleRetry = () => {
    if (!rawTweetsJsContent) return;
    setLoading(true); setError(null); setIsLocked(false);
    fetchMonthlyAnalysis(rawTweetsJsContent, isPaidUser, timeframe)
      .then(res => {
        if (res.requiresUpgrade) { setIsLocked(true); setAnalysisHtml(res.analysis); }
        else setAnalysisHtml(res.analysis);
      })
      .catch(e => setError(e.message || 'Failed to generate monthly analysis'))
      .finally(() => setLoading(false));
  };
  
  if (!rawTweetsJsContent) return null;
  
  return (
    <section className="report-section monthly-analysis">
      <div className="section-header">
        <h2 className="section-title">Monthly Analysis</h2>
      </div>
      
      <div className="section-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Analyzing your monthly Twitter patterns...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button onClick={handleRetry} className="retry-button">Try Again</button>
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

export default MonthlyAnalysisSection;