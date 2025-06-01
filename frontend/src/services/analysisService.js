const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';


/**
 * Legacy fetch analysis using raw content (for backward compatibility)
 */
const fetchAnalysis = async (endpoint, dataPayload, isPaid, timeframe, additionalData = {}) => {
  console.log(`[AnalysisService] Fetching ${endpoint} analysis. Paid: ${isPaid}, Timeframe: ${timeframe}`);
  const url = `${API_BASE_URL}/analyze/${endpoint}`;
  try {
    const body = {
      ...dataPayload, 
      isPaid,
      timeframe,
      analysisType: endpoint,
      ...additionalData
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      let errorData;
      try { errorData = await response.json(); }
      catch { const errorText = await response.text(); throw new Error(errorText || `HTTP error ${response.status}`); }
      const errorMessage = errorData.message || (errorData.errors ? errorData.errors.map(e => e.msg).join(', ') : `HTTP error ${response.status}`);
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }
    const result = await response.json();
    if (result.status === 'error') throw new Error(result.message || (result.errors ? result.errors.map(e => e.msg).join(', ') : 'Analysis failed'));
    return result;
  } catch (error) {
    console.error(`[AnalysisService] Fetch error for ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Smart analysis function that detects if input is session ID or raw content
 */
const smartFetchAnalysis = async (endpoint, contentOrSessionId, isPaid, timeframe, additionalData = {}) => {
  let dataPayload;
  if ((typeof contentOrSessionId === 'string' && !contentOrSessionId.startsWith('session_')) || 
      (endpoint === 'image' && (!contentOrSessionId || typeof contentOrSessionId === 'string'))) {
    dataPayload = { tweetsJsContent: contentOrSessionId };
  } 
  else if (typeof contentOrSessionId === 'string' && contentOrSessionId.startsWith('session_')) {
    dataPayload = { dataSessionId: contentOrSessionId };
  } 
  else if (endpoint === 'image') { 
    dataPayload = { tweetsJsContent: null }; 
  }
  else {
    console.error(`[AnalysisService] Invalid contentOrSessionId for ${endpoint}:`, contentOrSessionId);
    throw new Error(`Invalid data source for ${endpoint} analysis.`);
  }
  return await fetchAnalysis(endpoint, dataPayload, isPaid, timeframe, additionalData);
};

export const getFullScrapedAnalysis = async (twitterHandle, paymentSessionId, timeframe, numBlocks) => {
  const response = await fetch(`${API_BASE_URL}/analyze/scrape-and-analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ twitterHandle, paymentSessionId, timeframe, numBlocks })
  });
  if (!response.ok) throw new Error('Scraped analysis failed');
  return await response.json();
};

// Updated exports that use smart detection
export const getExecutiveSummary = (contentOrSessionId, paid, tf) => smartFetchAnalysis('executive-summary', contentOrSessionId, paid, tf);
export const getActivityAnalysis = (contentOrSessionId, paid, tf) => smartFetchAnalysis('activity', contentOrSessionId, paid, tf);
export const getTopicAnalysis = (contentOrSessionId, paid, tf) => smartFetchAnalysis('topic', contentOrSessionId, paid, tf);
export const getEngagementAnalysis = (contentOrSessionId, paid, tf) => smartFetchAnalysis('engagement', contentOrSessionId, paid, tf);
export const getMediaAnalysis = (contentOrSessionId, paid, tf) => smartFetchAnalysis('media', contentOrSessionId, paid, tf);
export const getMonthlyAnalysis = (contentOrSessionId, paid, tf) => smartFetchAnalysis('monthly', contentOrSessionId, paid, tf);
export const getContentRecommendations = (contentOrSessionId, paid, tf) => smartFetchAnalysis('content-recommendations', contentOrSessionId, paid, tf);
export const getImageAnalysis = (imageUrl, tweetText, paid) => smartFetchAnalysis('image', '', paid, 'all', { imageUrl, tweetText }); 