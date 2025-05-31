import { useState, useCallback } from 'react';

// Define API_BASE_URL - this ensures it's correctly picked up from environment variables by Vite
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Upload file to server and get session ID
 * @param {File} file - The file to upload
 * @param {string} timeframe - The timeframe for analysis
 * @param {boolean} isPaidUser - Whether the user is paid
 * @returns {Promise<Object>} Upload result with session ID
 */
async function uploadFileToServer(file, timeframe, isPaidUser) {
  const formData = new FormData();
  formData.append('tweetFile', file);
  formData.append('timeframe', timeframe);
  formData.append('isPaidUser', isPaidUser.toString()); // Server will parse 'true'/'false'

  const response = await fetch(`${API_BASE_URL}/analyze/upload-and-process`, {
    method: 'POST',
    body: formData
    // 'Content-Type' for FormData is set automatically by the browser
  });

  if (!response.ok) {
    let errorMessage = `Upload failed. Server responded with status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || JSON.stringify(errorData) || errorMessage;
    } catch (jsonError) {
      // If response is not JSON, try to read as text
      try {
        const errorText = await response.text();
        if (errorText) { // Ensure errorText is not empty before assigning
            errorMessage = errorText;
        }
      } catch (textError) {
        // If reading text also fails, stick with the status-based message
        console.error("Failed to parse error response as JSON or text:", textError);
      }
    }
    throw new Error(errorMessage);
  }

  // If response.ok is true, expect JSON
  return response.json();
}

/**
 * Custom hook for handling tweet file upload and processing
 * 
 * This hook abstracts the file upload and processing logic, providing
 * a clean interface for React components to interact with the server-side processing.
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.defaultTimeframe - Default timeframe to use
 * @param {boolean} options.isPaidUser - Whether the user has paid for the full analysis
 * @returns {Object} State and handlers for file processing
 */
const useTweetFileProcessor = ({
  defaultTimeframe = 'all',
  isPaidUser = false
} = {}) => {
  // State for file and processing
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [timeframe, setTimeframe] = useState(defaultTimeframe);
  const [sessionId, setSessionId] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  
  // Loading and error states
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  
  // Success state
  const [isProcessed, setIsProcessed] = useState(false);
  
  const handleFileSelect = useCallback(async (selectedFile) => {
    if (!selectedFile) return;
    
    if (!selectedFile.name.endsWith('.js')) {
      setError('Invalid file type. Please upload a tweets.js file.');
      setFile(null); setFileName(''); setSessionId(null); setProcessedData(null); setIsProcessed(false);
      return;
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (selectedFile.size > maxSize) {
      setError(`File too large (${(selectedFile.size / (1024*1024)).toFixed(2)}MB). Please ensure your tweets.js file is under 100MB.`);
      setFile(null); setFileName(''); setSessionId(null); setProcessedData(null); setIsProcessed(false);
      return;
    }
    
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setError(null);
    setIsProcessed(false);
    setProgress(0);
    setSessionId(null);
    setProcessedData(null);

    setIsProcessing(true);
    setProgress(25); // Initial progress: file selected
    
    try {
      setProgress(50); // Progress: about to call server
      const result = await uploadFileToServer(selectedFile, timeframe, isPaidUser);
      
      setProgress(75); // Progress: server call successful, processing result
      setSessionId(result.sessionId);
      setProcessedData(result.processedData);
      setFileName(result.fileName); // Server sends back filename
      setIsProcessed(true);
      setProgress(100); // Done
      
      console.log(`[FileProcessor] File uploaded & server processed: ${result.fileName}, Session ID: ${result.sessionId}, Tweets: ${result.tweetCount}`);
    } catch (e) {
      console.error('Error in handleFileSelect during upload/processing:', e);
      setError(e.message || 'Failed to process file. An unknown error occurred.');
      setFile(null); setFileName(''); setSessionId(null); setProcessedData(null);
      setProgress(0); // Reset progress on error
      setIsProcessed(false); // Ensure not marked as processed
    } finally {
      setIsProcessing(false);
    }
  }, [timeframe, isPaidUser]); // Dependencies: timeframe, isPaidUser
  
  const handleFileDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      const droppedFile = event.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    } catch (e) {
      console.error('Error handling file drop:', e);
      setError('Failed to process the dropped file.');
    }
  }, [handleFileSelect]); // Dependency: handleFileSelect
  
  const updateFileProcessorTimeframe = useCallback((newTf) => { // Renamed to avoid conflict with context's updateTimeframe
    setTimeframe(newTf);
    // Note: If a file is already processed, changing timeframe here doesn't automatically re-process.
    // The user would typically need to re-initiate the process or the UI would re-fetch analysis.
    // For this hook, it just updates the timeframe to be used for the *next* call to handleFileSelect.
  }, []);
  
  const reset = useCallback(() => {
    setFile(null);
    setFileName('');
    setSessionId(null);
    setProcessedData(null);
    setIsProcessed(false);
    setError(null);
    setProgress(0);
    setIsProcessing(false); // Reset processing state
  }, []);
  
  return {
    file,
    fileName,
    timeframe, // This is the hook's internal timeframe state
    sessionId,
    processedData,
    rawFileContent: sessionId, // Maintain for backward compatibility if anything uses it
    isProcessing,
    isProcessed,
    error,
    progress,
    handleFileSelect,
    handleFileDrop,
    updateTimeframe: updateFileProcessorTimeframe, // Expose the renamed function
    reset
  };
};

export default useTweetFileProcessor;