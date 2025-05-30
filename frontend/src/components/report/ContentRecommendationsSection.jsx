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
const ContentRecommendationsSection = () => {
  const { rawTweetsJsContent, isPaidUser, timeframe } = useTweetData();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recommendationsHtml, setRecommendationsHtml] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  
  useEffect(() => {
    if (!rawTweetsJsContent) return;
    setLoading(true); setError(null); setIsLocked(false);
    fetchContentRecommendations(rawTweetsJsContent, isPaidUser, timeframe)
      .then(res => {
        if (res.requiresUpgrade) { setIsLocked(true); setRecommendationsHtml(res.analysis); }
        else setRecommendationsHtml(res.analysis);
      })
      .catch(e => setError(e.message || 'Failed to generate content recommendations'))
      .finally(() => setLoading(false));
  }, [rawTweetsJsContent, isPaidUser, timeframe]);
  
  const handleRetry = () => {
    if (!rawTweetsJsContent) return;
    setLoading(true); setError(null); setIsLocked(false);
    fetchContentRecommendations(rawTweetsJsContent, isPaidUser, timeframe)
      .then(res => {
        if (res.requiresUpgrade) { setIsLocked(true); setRecommendationsHtml(res.analysis); }
        else setRecommendationsHtml(res.analysis);
      })
      .catch(e => setError(e.message || 'Failed to generate content recommendations'))
      .finally(() => setLoading(false));
  };
  
  if (!rawTweetsJsContent) return null;
  
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