import React, { useEffect, useState } from 'react';
import { useTweetData } from '../../context/TweetDataContext';
import { getTopicAnalysis as fetchTopicAnalysis } from '../../services/analysisService';

/**
 * Topic Analysis Section Component
 * 
 * This component displays the topic analysis section, which shows 
 * the main topics and themes in the user's tweets.
 */
const TopicAnalysisSection = ({ initialRawContent }) => {
  const { rawTweetsJsContent, isPaidUser, timeframe, dataSource, allAnalysesContent } = useTweetData();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisHtml, setAnalysisHtml] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  
useEffect(() => {
  if (dataSource?.type === 'scrape') {
    setAnalysisHtml(allAnalysesContent?.topicAnalysis || '');
    setLoading(false);
    setError(null);
    setIsLocked(false); // Scrapes are inherently "paid"
  } else if (dataSource?.type === 'file') {
    if (initialRawContent) { // Use the prop
      setLoading(true);
      setError(null);
      setIsLocked(false);
      fetchTopicAnalysis(initialRawContent, isPaidUser, timeframe) // Call service with actual raw content
        .then(result => {
          if (result.requiresUpgrade && !isPaidUser) { // Only lock if actually not paid
            setIsLocked(true);
          }
          setAnalysisHtml(result.analysis);
        })
        .catch(err => {
          setError(err.message || 'Failed to generate topic analysis.');
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
    fetchTopicAnalysis(initialRawContent, isPaidUser, timeframe) // Use prop
      .then(res => {
        if (res.requiresUpgrade && !isPaidUser) { 
          setIsLocked(true); 
          setAnalysisHtml(res.analysis); 
        } else {
          setAnalysisHtml(res.analysis);
        }
      })
      .catch(e => setError(e.message || 'Failed to generate topic analysis'))
      .finally(() => setLoading(false));
  } else if (dataSource?.type === 'scrape') {
    if (allAnalysesContent?.topicAnalysis) {
       setAnalysisHtml(allAnalysesContent.topicAnalysis);
       setError(null); setLoading(false); setIsLocked(false);
    } else {
       setError("Scrape data for topic analysis not found. Try refreshing the report.");
    }
  }
};
  
  
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