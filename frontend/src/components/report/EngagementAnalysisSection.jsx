import React, { useEffect, useState } from 'react';
import { useTweetData } from '../../context/TweetDataContext';
import { getEngagementAnalysis as fetchEngagementAnalysis } from '../../services/analysisService';

/**
 * Engagement Analysis Section Component
 * 
 * This component displays the engagement analysis section, which shows 
 * patterns in tweet engagement, top performing tweets, and engagement metrics.
 */
const EngagementAnalysisSection = ({ initialRawContent }) => {
  const { rawTweetsJsContent, isPaidUser, timeframe, dataSource, allAnalysesContent } = useTweetData();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisHtml, setAnalysisHtml] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  
useEffect(() => {
  if (dataSource?.type === 'scrape') {
    setAnalysisHtml(allAnalysesContent?.engagementAnalysis || '');
    setLoading(false);
    setError(null);
    setIsLocked(false); // Scrapes are inherently "paid"
  } else if (dataSource?.type === 'file') {
    if (initialRawContent) { // Use the prop
      setLoading(true);
      setError(null);
      setIsLocked(false);
      fetchEngagementAnalysis(initialRawContent, isPaidUser, timeframe) // Call service with actual raw content
        .then(result => {
          if (result.requiresUpgrade && !isPaidUser) { // Only lock if actually not paid
            setIsLocked(true);
          }
          setAnalysisHtml(result.analysis);
        })
        .catch(err => {
          setError(err.message || 'Failed to generate engagement analysis.');
          setAnalysisHtml('');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(true); // Waiting for ReportPage to provide raw content
    }
  } else {
    setLoading(false);
    // setError("Appropriate data source not available for analysis."); // Or rely on ReportPage error
  }
// Add initialRawContent to the dependency array
}, [dataSource, allAnalysesContent, initialRawContent, isPaidUser, timeframe]);
  
const handleRetry = () => {
  if (dataSource?.type === 'file') {
    if (!initialRawContent) { // Check prop
      setError('Cannot retry: analysis content is missing.');
      return;
    }
    setLoading(true); setError(null); setIsLocked(false);
    fetchEngagementAnalysis(initialRawContent, isPaidUser, timeframe) // Use prop
      .then(res => {
        if (res.requiresUpgrade && !isPaidUser) { 
          setIsLocked(true); 
          setAnalysisHtml(res.analysis); 
        } else {
          setAnalysisHtml(res.analysis);
        }
      })
      .catch(e => setError(e.message || 'Failed to generate engagement analysis'))
      .finally(() => setLoading(false));
  } else if (dataSource?.type === 'scrape') {
    if (allAnalysesContent?.engagementAnalysis) {
       setAnalysisHtml(allAnalysesContent.engagementAnalysis);
       setError(null); setLoading(false); setIsLocked(false);
    } else {
       setError("Scrape data for engagement analysis not found. Try refreshing the report.");
    }
  }
};
  
  
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