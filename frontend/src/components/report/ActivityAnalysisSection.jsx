import React, { useEffect, useState } from 'react';
import { useTweetData } from '../../context/TweetDataContext';
import { getActivityAnalysis as fetchActivityAnalysis } from '../../services/analysisService';

/**
 * Activity Analysis Section Component
 * 
 * This component displays the activity analysis section, which shows 
 * patterns in tweeting behavior, best times to tweet, and activity trends.
 */
const ActivityAnalysisSection = () => {
  const { rawTweetsJsContent, isPaidUser, timeframe, dataSource, allAnalysesContent, dataSessionId } = useTweetData();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisHtml, setAnalysisHtml] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  
useEffect(() => {
  if (dataSource?.type === 'scrape') {
    setAnalysisHtml(allAnalysesContent?.activityAnalysis || '');
    setLoading(false);
    setError(null);
    setIsLocked(false); // Scrapes are inherently "paid"
  } else if (dataSource?.type === 'file') {
    if (dataSessionId) { // Use dataSessionId from context
      setLoading(true);
      setError(null);
      setIsLocked(false);
      fetchActivityAnalysis(dataSessionId, isPaidUser, timeframe) // Pass dataSessionId to the service call
        .then(result => {
          if (result.requiresUpgrade && !isPaidUser) { // Only lock if actually not paid
            setIsLocked(true);
          }
          setAnalysisHtml(result.analysis);
        })
        .catch(err => {
          setError(err.message || 'Failed to generate activity analysis.');
          setAnalysisHtml('');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(true); // Waiting for ReportPage to provide data session ID
    }
  } else {
    setLoading(false);
    // setError("Appropriate data source not available for analysis."); // Or rely on ReportPage error
  }
// Add dataSessionId to dependencies, remove initialRawContent
}, [dataSource, allAnalysesContent, dataSessionId, isPaidUser, timeframe]);
  
  return (
    <section className="report-section activity-analysis">
      <div className="section-header">
        <h2 className="section-title">Activity Analysis</h2>
      </div>
      
      <div className="section-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Analyzing your Twitter activity patterns...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p className="error-message">{error}</p>
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

export default ActivityAnalysisSection;