import React, { useEffect, useState } from 'react';
import { useTweetData } from '../../context/TweetDataContext';
import { getTopicAnalysis as fetchTopicAnalysis } from '../../services/analysisService';

/**
 * Topic Analysis Section Component
 * 
 * This component displays the topic analysis section, which shows 
 * the main topics and themes in the user's tweets.
 */
const TopicAnalysisSection = () => {
  const { rawTweetsJsContent, isPaidUser, timeframe } = useTweetData();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisHtml, setAnalysisHtml] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  
  // Fetch topic analysis when processedData changes
  useEffect(() => {
    if (!rawTweetsJsContent) return;
    setLoading(true); setError(null); setIsLocked(false);
    fetchTopicAnalysis(rawTweetsJsContent, isPaidUser, timeframe)
      .then(res => {
        if (res.requiresUpgrade) { setIsLocked(true); setAnalysisHtml(res.analysis); }
        else setAnalysisHtml(res.analysis);
      })
      .catch(e => setError(e.message || 'Failed to generate topic analysis'))
      .finally(() => setLoading(false));
  }, [rawTweetsJsContent, isPaidUser, timeframe]);
  
  // Handle retry button click
  const handleRetry = () => {
    if (!rawTweetsJsContent) return;
    setLoading(true); setError(null); setIsLocked(false);
    fetchTopicAnalysis(rawTweetsJsContent, isPaidUser, timeframe)
      .then(res => {
        if (res.requiresUpgrade) { setIsLocked(true); setAnalysisHtml(res.analysis); }
        else setAnalysisHtml(res.analysis);
      })
      .catch(e => setError(e.message || 'Failed to generate topic analysis'))
      .finally(() => setLoading(false));
  };
  
  if (!rawTweetsJsContent) return null;
  
  return (
    <section className="report-section topic-analysis">
      <div className="section-header">
        <h2 className="section-title">Topic Analysis</h2>
      </div>
      
      <div className="section-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Analyzing the topics in your tweets...</p>
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
          <div 
            className="analysis-content"
            dangerouslySetInnerHTML={{ __html: analysisHtml }}
          />
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

export default TopicAnalysisSection;