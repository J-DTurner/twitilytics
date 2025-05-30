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
  const { rawTweetsJsContent, isPaidUser, timeframe, dataSource, allAnalysesContent } = useTweetData();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisHtml, setAnalysisHtml] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  
  useEffect(() => {
    if (dataSource?.type === 'scrape') {
      setAnalysisHtml(allAnalysesContent?.activityAnalysis || '');
      setLoading(false);
    } else if (rawTweetsJsContent) {
      setLoading(true);
      setError(null);
      setIsLocked(false);
      fetchActivityAnalysis(rawTweetsJsContent, isPaidUser, timeframe)
        .then(result => {
          if (result.requiresUpgrade) {
            setIsLocked(true);
            setAnalysisHtml(result.analysis);
          } else {
            setAnalysisHtml(result.analysis);
          }
        })
        .catch(err => setError(err.message || 'Failed to generate activity analysis'))
        .finally(() => setLoading(false));
    }
  }, [dataSource, allAnalysesContent, rawTweetsJsContent, isPaidUser, timeframe]);
  
  if (!rawTweetsJsContent && dataSource?.type !== 'scrape') {
    return null; // Don't render if no data is available
  }
  
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