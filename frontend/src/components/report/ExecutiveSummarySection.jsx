import React, { useEffect, useState } from 'react';
import { useTweetData } from '../../context/TweetDataContext';
import { getExecutiveSummary as fetchExecutiveSummary } from '../../services/analysisService';

/**
 * Executive Summary Section Component
 * 
 * This component displays the executive summary analysis from the Twitter data.
 * It shows a premium overlay for free users and fetches the analysis for paid users.
 */
const ExecutiveSummarySection = () => {
  const { rawTweetsJsContent, isPaidUser, timeframe, dataSource, allAnalysesContent } = useTweetData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisHtml, setAnalysisHtml] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (dataSource?.type === 'scrape') {
      setAnalysisHtml(allAnalysesContent?.executiveSummary || '');
      setLoading(false);
    } else if (rawTweetsJsContent) {
      setLoading(true);
      setError(null);
      setIsLocked(false);
      fetchExecutiveSummary(rawTweetsJsContent, isPaidUser, timeframe)
        .then(result => {
          if (result.requiresUpgrade) {
            setIsLocked(true);
            setAnalysisHtml(result.analysis);
          } else {
            setAnalysisHtml(result.analysis);
          }
        })
        .catch(err => {
          setError(err.message || 'Failed to generate executive summary.');
          setAnalysisHtml('');
        })
        .finally(() => setLoading(false));
    }
  }, [dataSource, allAnalysesContent, rawTweetsJsContent, isPaidUser, timeframe]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-container flex items-center space-x-2 text-gray-500 py-4">
          <div className="loading-spinner h-5 w-5 border-2 border-gray-200 rounded-full animate-spin border-t-blue-600" />
          <p>Generating your executive summary...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="error-container text-red-600">
          <p className="font-semibold">Error: {error}</p>
        </div>
      );
    }
    return (
      <div className="analysis-content prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: analysisHtml || '<p class="italic text-gray-500">Summary not available.</p>' }} />
    );
  };

  return (
    <section className="report-section executive-summary mb-12">
      <div className="section-header bg-white px-6 py-4 border-b border-gray-200 rounded-t-lg flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Executive Summary</h2>
        {isPaidUser && !isLocked && <span className="premium-badge bg-yellow-200 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">Premium</span>}
      </div>
      <div className="section-content bg-white p-6 rounded-b-lg shadow">
        {renderContent()}
      </div>
    </section>
  );
};

export default ExecutiveSummarySection;