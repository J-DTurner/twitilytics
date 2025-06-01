import React, { useEffect, useState } from 'react';
import { useTweetData } from '../../context/TweetDataContext';
import { getContentRecommendations as fetchContentRecommendations } from '../../services/analysisService';

/**
 * Content Recommendations Section Component
 * 
 * This component displays personalized content recommendations for the user
 * based on their Twitter data analysis. It suggests types of content, topics,
 * and posting strategies to increase engagement.
 * It's a premium feature that requires a paid account.
 */
const ContentRecommendationsSection = ({ initialRawContent }) => {
  const { rawTweetsJsContent, isPaidUser, timeframe, dataSource, allAnalysesContent } = useTweetData();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recommendationsHtml, setRecommendationsHtml] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  
useEffect(() => {
  if (dataSource?.type === 'scrape') {
    setRecommendationsHtml(allAnalysesContent?.contentRecommendations || '');
    setLoading(false);
    setError(null);
    setIsLocked(false); // Scrapes are inherently "paid"
  } else if (dataSource?.type === 'file') {
    if (initialRawContent) { // Use the prop
      setLoading(true);
      setError(null);
      setIsLocked(false);
      fetchContentRecommendations(initialRawContent, isPaidUser, timeframe) // Call service with actual raw content
        .then(result => {
          if (result.requiresUpgrade && !isPaidUser) { // Only lock if actually not paid
            setIsLocked(true);
          }
          setRecommendationsHtml(result.analysis);
        })
        .catch(err => {
          setError(err.message || 'Failed to generate content recommendations.');
          setRecommendationsHtml('');
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
    fetchContentRecommendations(initialRawContent, isPaidUser, timeframe) // Use prop
      .then(res => {
        if (res.requiresUpgrade && !isPaidUser) { 
          setIsLocked(true); 
          setRecommendationsHtml(res.analysis); 
        } else {
          setRecommendationsHtml(res.analysis);
        }
      })
      .catch(e => setError(e.message || 'Failed to generate content recommendations'))
      .finally(() => setLoading(false));
  } else if (dataSource?.type === 'scrape') {
    if (allAnalysesContent?.contentRecommendations) {
       setRecommendationsHtml(allAnalysesContent.contentRecommendations);
       setError(null); setLoading(false); setIsLocked(false);
    } else {
       setError("Scrape data for recommendations not found. Try refreshing the report.");
    }
  }
};
  
  
  return (
    <section className="report-section content-recommendations">
      <div className="section-header">
        <h2 className="section-title">Content Recommendations</h2>
      </div>
      
      <div className="section-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Generating personalized content recommendations...</p>
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
            dangerouslySetInnerHTML={{ __html: recommendationsHtml }}
          />
        )}
      </div>
    </section>
  );
};

export default ContentRecommendationsSection;