import { createContext, useState, useContext, useCallback, useEffect } from 'react';

// Create the context
const TweetDataContext = createContext(null);

/**
 * Provider component for managing tweet data state across the application
 * 
 * This context provides a central place to store and access the processed
 * tweet data, paid status, and other related state.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const TweetDataProvider = ({ children }) => {
  // Main data state
  const [processedData, setProcessedData] = useState(null);
  const [dataSessionId, setDataSessionId] = useState(null); // Replace raw content with session ID
  const [timeframe, setTimeframe] = useState('all');
  const [dataSource, setDataSource] = useState(null);
  const [allAnalysesContent, setAllAnalysesContent] = useState(null);
  
  // User payment status
  const [isPaidUser, setIsPaidUser] = useState(false);
  const [paymentSessionId, setPaymentSessionId] = useState(null);
  
  // Initialize state from localStorage on mount
  useEffect(() => {
    // Check paid status
    const storedPaidStatus = localStorage.getItem('isPaidUser') === 'true';
    setIsPaidUser(storedPaidStatus);
    
    // Get payment session ID if available
    const storedSessionId = localStorage.getItem('paymentSessionId');
    if (storedSessionId) {
      setPaymentSessionId(storedSessionId);
    }
    
    // Try to retrieve stored data (but not raw content anymore)
    try {
      // Check for old processed data and clean it up
      const oldProcessedData = localStorage.getItem('currentProcessedData');
      if (oldProcessedData) {
        console.log('Cleaning up old processed data from localStorage');
        localStorage.removeItem('currentProcessedData');
      }
      
      // Get data session ID instead of raw content
      const storedDataSessionId = localStorage.getItem('dataSessionId');
      if (storedDataSessionId) {
        setDataSessionId(storedDataSessionId);
      }
      
      const storedTimeframe = localStorage.getItem('selectedTimeframe');
      if (storedTimeframe) {
        setTimeframe(storedTimeframe);
      }
      const storedDataSource = localStorage.getItem('dataSource');
      if (storedDataSource) {
        setDataSource(JSON.parse(storedDataSource));
      }
      const storedAnalyses = localStorage.getItem('allAnalysesContent');
      if (storedAnalyses) {
        setAllAnalysesContent(JSON.parse(storedAnalyses));
      }
    } catch (error) {
      console.error('Error retrieving stored tweet data:', error);
      // Clear corrupted data
      localStorage.removeItem('currentProcessedDataMetadata');
      localStorage.removeItem('dataSessionId');
    }
  }, []);
  
  /**
   * Update the processed data with a session ID instead of raw content
   * @param {Object} data - The processed tweet data
   * @param {string} sessionId - The server session ID for the data
   * @param {boolean} persist - Whether to persist the data to localStorage
   */
  const updateProcessedDataAndSessionId = useCallback((data, sessionId, persist = true) => {
    setProcessedData(data);
    setDataSessionId(sessionId);
    if (persist) {
      try {
        // Only store essential metadata, not the full processed data
        if (data) {
          const metadata = {
            tweetCount: data.allTweets?.length || 0,
            originalTweetCount: data.originalTweets?.length || 0,
            replyCount: data.replies?.length || 0,
            mediaCount: data.mediaUrls?.length || 0,
            timeframe: data.timeframe || 'all',
            processedAt: new Date().toISOString()
          };
          localStorage.setItem('currentProcessedDataMetadata', JSON.stringify(metadata));
        } else {
          localStorage.removeItem('currentProcessedDataMetadata');
        }
        if (sessionId) {
          localStorage.setItem('dataSessionId', sessionId);
        } else {
          localStorage.removeItem('dataSessionId');
        }
      } catch (error) {
        console.error('Error saving analysis metadata:', error);
        // Don't show alert for storage errors, just log them
        console.warn('Unable to save analysis metadata to localStorage. Continuing without local storage.');
      }
    }
  }, []);

  /**
   * Legacy method for backward compatibility - now redirects to session-based storage
   * @deprecated Use updateProcessedDataAndSessionId instead
   */
  const updateProcessedDataAndRawContent = useCallback((data, rawContent, persist = true) => {
    console.warn('updateProcessedDataAndRawContent is deprecated. Raw content is no longer stored locally.');
    // Only update processed data, ignore raw content
    setProcessedData(data);
    if (persist && data) {
      try {
        // Store only metadata, not full data
        const metadata = {
          tweetCount: data.allTweets?.length || 0,
          originalTweetCount: data.originalTweets?.length || 0,
          replyCount: data.replies?.length || 0,
          mediaCount: data.mediaUrls?.length || 0,
          timeframe: data.timeframe || 'all',
          processedAt: new Date().toISOString()
        };
        localStorage.setItem('currentProcessedDataMetadata', JSON.stringify(metadata));
      } catch (error) {
        console.error('Error saving analysis metadata:', error);
        console.warn('Unable to save analysis metadata to localStorage. Continuing without local storage.');
      }
    }
  }, []);
  
  /**
   * Update the selected timeframe
   * @param {string} newTimeframe - The new timeframe to use
   * @param {boolean} persist - Whether to persist the timeframe to localStorage
   */
  const updateTimeframe = useCallback((newTimeframe, persist = true) => {
    setTimeframe(newTimeframe);
    
    if (persist) {
      localStorage.setItem('selectedTimeframe', newTimeframe);
    }
    
    // Set in window for legacy code compatibility
    if (typeof window !== 'undefined') {
      window.selectedTimeframe = newTimeframe;
    }
  }, []);
  
  /**
   * Update the user's paid status
   * @param {boolean} paid - Whether the user has paid
   * @param {string} sessionId - The payment session ID
   */
  const updatePaidStatus = useCallback((paid, sessionId = null) => {
    setIsPaidUser(paid);
    localStorage.setItem('isPaidUser', paid.toString());
    
    // Set in window for legacy code compatibility
    if (typeof window !== 'undefined') {
      window.isPaidUser = paid;
    }
    
    if (sessionId) {
      setPaymentSessionId(sessionId);
      localStorage.setItem('paymentSessionId', sessionId);
    }
  }, []);
  
  /**
   * Clear all stored data
   */
  const clearData = useCallback(() => {
    setProcessedData(null);
    setDataSessionId(null);
    localStorage.removeItem('currentProcessedDataMetadata');
    localStorage.removeItem('dataSessionId');
    // Clean up legacy raw content storage
    localStorage.removeItem('rawTweetsJsContent');
    // Clean up old processed data storage
    localStorage.removeItem('currentProcessedData');
  }, []);
  
  /**
   * Update the data source
   * @param {string} type - The type of data source ('file' or 'scrape')
   * @param {Object} details - Additional details about the data source
   */
  const updateDataSource = useCallback((type, details) => {
    const ds = type ? { type, ...details } : null;
    setDataSource(ds);
    
    // Persist in localStorage
    if (ds) {
      localStorage.setItem('dataSource', JSON.stringify(ds));
    } else {
      localStorage.removeItem('dataSource');
    }
  }, []);

  /**
   * Reset everything, including paid status
   */
  const resetEverything = useCallback(() => {
    setProcessedData(null);
    setDataSessionId(null);
    setTimeframe('all');
    setIsPaidUser(false);
    setPaymentSessionId(null);
    setDataSource(null);
    setAllAnalysesContent(null);
    localStorage.removeItem('currentProcessedDataMetadata');
    localStorage.removeItem('dataSessionId');
    localStorage.removeItem('selectedTimeframe');
    localStorage.removeItem('isPaidUser');
    localStorage.removeItem('paymentSessionId');
    localStorage.removeItem('dataSource');
    localStorage.removeItem('allAnalysesContent');
    // Clean up legacy storage
    localStorage.removeItem('rawTweetsJsContent');
    localStorage.removeItem('currentProcessedData');
    
    // Reset window variables for legacy code
    if (typeof window !== 'undefined') {
      window.selectedTimeframe = 'all';
      window.isPaidUser = false;
    }
  }, []);
  
  // The context value
  const contextValue = {
    // State
    processedData,
    dataSessionId, // Replace rawTweetsJsContent with dataSessionId
    rawTweetsJsContent: dataSessionId, // Provide backward compatibility
    timeframe,
    isPaidUser,
    paymentSessionId,
    dataSource,
    allAnalysesContent,
    
    // Functions
    updateProcessedDataAndSessionId, // New preferred method
    updateProcessedDataAndRawContent, // Legacy method for backward compatibility
    updateTimeframe,
    updatePaidStatus,
    updateDataSource,
    setFullAnalyses: setAllAnalysesContent,
    clearData,
    resetEverything
  };
  
  return (
    <TweetDataContext.Provider value={contextValue}>
      {children}
    </TweetDataContext.Provider>
  );
};

/**
 * Custom hook for consuming the tweet data context
 * @returns {Object} The tweet data context value
 */
export const useTweetData = () => {
  const context = useContext(TweetDataContext);
  
  if (context === null) {
    throw new Error('useTweetData must be used within a TweetDataProvider');
  }
  
  return context;
};

export default TweetDataContext;