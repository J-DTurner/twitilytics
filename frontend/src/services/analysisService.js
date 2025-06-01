const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Fetch analysis using session ID (preferred method)
 */
const fetchAnalysisWithSession = async (endpoint, sessionId, additionalData = {}) => {
  // console.log(`[AnalysisService] Fetching ${endpoint} analysis with session ID: ${sessionId}`);
  try {
    const sessionResponse = await fetch(`${API_BASE_URL}/analyze/session/${sessionId}/raw`);
    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.json().catch(() => ({ message: 'Session not found or expired. Please re-upload your file.' }));
      throw new Error(errorData.message);
    }
    
    const sessionData = await sessionResponse.json();
    const { rawContent } = sessionData;
    const isPaidForAnalysis = additionalData.isPaid_explicit !== undefined ? additionalData.isPaid_explicit : sessionData.isPaidUser;
    const timeframeForAnalysis = additionalData.timeframe_explicit !== undefined ? additionalData.timeframe_explicit : sessionData.timeframe;

    const cleanedAdditionalData = { ...additionalData };
    delete cleanedAdditionalData.isPaid_explicit;
    delete cleanedAdditionalData.timeframe_explicit;
    
    return await fetchAnalysis(endpoint, rawContent, isPaidForAnalysis, timeframeForAnalysis, cleanedAdditionalData);
  } catch (error) {
    console.error(`[AnalysisService] Session fetch error for ${endpoint} (session: ${sessionId}):`, error);
    throw error;
  }
};

/**
 * Legacy fetch analysis using raw content (for backward compatibility)
 */
const fetchAnalysis = async (endpoint, tweetsJsContent, isPaid, timeframe, additionalData = {}) => {
  console.log(`[AnalysisService] Fetching ${endpoint} analysis. Paid: ${isPaid}, Timeframe: ${timeframe}`);
  const url = `${API_BASE_URL}/analyze/${endpoint}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tweetsJsContent, isPaid, timeframe, analysisType: endpoint, ...additionalData })
    });
    if (!response.ok) {
      let errorData;
      try { errorData = await response.json(); }
      catch { const errorText = await response.text(); throw new Error(errorText || `HTTP error ${response.status}`); }
      const errorMessage = errorData.message || `HTTP error ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }
    const result = await response.json();
    if (result.status === 'error') throw new Error(result.message || 'Analysis failed');
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
  // console.log(`[AnalysisService] smartFetch for ${endpoint}. Content type: ${typeof contentOrSessionId}, Starts with session_: ${typeof contentOrSessionId === 'string' && contentOrSessionId.startsWith('session_')}`);
  if ((typeof contentOrSessionId === 'string' && !contentOrSessionId.startsWith('session_')) || 
      (endpoint === 'image' && (!contentOrSessionId || typeof contentOrSessionId === 'string'))) { 
    return await fetchAnalysis(endpoint, contentOrSessionId, isPaid, timeframe, additionalData);
  } 
  else if (typeof contentOrSessionId === 'string' && contentOrSessionId.startsWith('session_')) {
    // console.warn(`[AnalysisService] smartFetchAnalysis called with sessionID for ${endpoint}. This should be a fallback.`);
    const sessionAdditionalData = { ...additionalData, isPaid_explicit: isPaid, timeframe_explicit: timeframe };
    return await fetchAnalysisWithSession(endpoint, contentOrSessionId, sessionAdditionalData);
  } 
  else {
    console.error(`[AnalysisService] Invalid contentOrSessionId for ${endpoint}:`, contentOrSessionId);
    throw new Error(`Invalid data provided for ${endpoint} analysis (contentOrSessionId was type ${typeof contentOrSessionId}).`);
  }
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