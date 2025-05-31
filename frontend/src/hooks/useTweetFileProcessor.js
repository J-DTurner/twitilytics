import { useState, useCallback } from 'react';

// Define API_BASE_URL - this ensures it's correctly picked up from environment variables by Vite
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const UPLOAD_TIMEOUT_MS = 180000; // 3 minutes timeout for upload

/**
 * Upload file to server and get session ID
 * @param {File} file - The file to upload
 * @param {string} timeframe - The timeframe for analysis
 * @param {boolean} isPaidUser - Whether the user is paid
 * @returns {Promise<Object>} Upload result with session ID
 */
async function uploadFileToServer(file, timeframe, isPaidUser) {
  console.log('[uploadFileToServer] Starting file upload to server...');
  const formData = new FormData();
  formData.append('tweetFile', file);
  formData.append('timeframe', timeframe);
  formData.append('isPaidUser', isPaidUser.toString());

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`[uploadFileToServer] Upload timed out after ${UPLOAD_TIMEOUT_MS / 1000}s`);
    controller.abort();
  }, UPLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/analyze/upload-and-process`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId); // Clear timeout if fetch completes

    console.log(`[uploadFileToServer] Server responded with status: ${response.status}`);

    if (!response.ok) {
      let errorMessage = `Upload failed. Server responded with status: ${response.status}`;
      try {
        const errorData = await response.json();
        console.error('[uploadFileToServer] Error data from server:', errorData);
        errorMessage = errorData.message || JSON.stringify(errorData) || errorMessage;
      } catch (jsonError) {
        console.error('[uploadFileToServer] Failed to parse error response as JSON:', jsonError);
        try {
          const errorText = await response.text();
          console.error('[uploadFileToServer] Error text from server:', errorText);
          if (errorText) {
            errorMessage = errorText;
          }
        } catch (textError) {
          console.error("[uploadFileToServer] Failed to parse error response as JSON or text:", textError);
        }
      }
      throw new Error(errorMessage);
    }

    console.log('[uploadFileToServer] Parsing server response as JSON...');
    const result = await response.json();
    console.log('[uploadFileToServer] Successfully parsed server response:', result);
    return result;

  } catch (error) {
    clearTimeout(timeoutId); // Clear timeout if fetch itself throws an error (e.g., network error, abort)
    if (error.name === 'AbortError') {
      console.error('[uploadFileToServer] Fetch aborted (likely due to timeout).');
      throw new Error(`File upload timed out after ${UPLOAD_TIMEOUT_MS / 1000} seconds. Please try again.`);
    }
    console.error('[uploadFileToServer] Error during fetch operation:', error);
    throw error; // Re-throw the error to be caught by the caller
  }
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
    console.log('[handleFileSelect] File selected:', selectedFile ? selectedFile.name : 'null');
    if (!selectedFile) return;
    
    if (!selectedFile.name.endsWith('.js')) {
      console.warn('[handleFileSelect] Invalid file type.');
      setError('Invalid file type. Please upload a tweets.js file.');
      setFile(null); setFileName(''); setSessionId(null); setProcessedData(null); setIsProcessed(false);
      return;
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (selectedFile.size > maxSize) {
      console.warn('[handleFileSelect] File too large.');
      setError(`File too large (${(selectedFile.size / (1024*1024)).toFixed(2)}MB). Please ensure your tweets.js file is under 100MB.`);
      setFile(null); setFileName(''); setSessionId(null); setProcessedData(null); setIsProcessed(false);
      return;
    }
    
    console.log('[handleFileSelect] Initializing state for new file processing...');
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setError(null);
    setIsProcessed(false);
    setProgress(0);
    setSessionId(null);
    setProcessedData(null);

    setIsProcessing(true);
    setProgress(25); 
    console.log('[handleFileSelect] State updated: isProcessing=true, progress=25');
    
    try {
      setProgress(50); 
      console.log('[handleFileSelect] Progress updated to 50. Calling uploadFileToServer...');
      const result = await uploadFileToServer(selectedFile, timeframe, isPaidUser);
      console.log('[handleFileSelect] uploadFileToServer returned:', result);
      
      if (result && result.status === 'success') {
        console.log('[handleFileSelect] Server result is success. Updating state...');
        setProgress(75); 
        setSessionId(result.sessionId);
        setProcessedData(result.processedData);
        setFileName(result.fileName || selectedFile.name); // Fallback to selectedFile.name if server doesn't send it
        setIsProcessed(true);
        setProgress(100);
        console.log(`[FileProcessor] File uploaded & server processed: ${result.fileName || selectedFile.name}, Session ID: ${result.sessionId}, Tweets: ${result.tweetCount}`);
        console.log('[handleFileSelect] State updated: isProcessed=true, progress=100');
      } else {
        // Handle cases where result.status might not be 'success' or result is unexpected
        console.error('[handleFileSelect] Server response was not successful or malformed:', result);
        throw new Error(result?.message || 'Received an unexpected response from the server.');
      }
    } catch (e) {
      console.error('[handleFileSelect] Error during file processing pipeline:', e);
      setError(e.message || 'Failed to process file. An unknown error occurred.');
      setFile(null); setFileName(''); setSessionId(null); setProcessedData(null);
      setProgress(0); 
      setIsProcessed(false); 
      console.log('[handleFileSelect] State reset due to error.');
    } finally {
      setIsProcessing(false);
      console.log('[handleFileSelect] State updated: isProcessing=false (finally block).');
    }
  }, [timeframe, isPaidUser]); 
  
  const handleFileDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('[handleFileDrop] File dropped.');
    try {
      const droppedFile = event.dataTransfer.files[0];
      if (droppedFile) {
        console.log('[handleFileDrop] Processing dropped file:', droppedFile.name);
        handleFileSelect(droppedFile);
      } else {
        console.warn('[handleFileDrop] No file found in drop event.');
      }
    } catch (e) {
      console.error('[handleFileDrop] Error handling file drop:', e);
      setError('Failed to process the dropped file.');
    }
  }, [handleFileSelect]); 
  
  const updateFileProcessorTimeframe = useCallback((newTf) => { 
    console.log('[updateFileProcessorTimeframe] Timeframe updated to:', newTf);
    setTimeframe(newTf);
  }, []);
  
  const reset = useCallback(() => {
    console.log('[reset] Resetting file processor state.');
    setFile(null);
    setFileName('');
    setSessionId(null);
    setProcessedData(null);
    setIsProcessed(false);
    setError(null);
    setProgress(0);
    setIsProcessing(false); 
  }, []);
  
  return {
    file,
    fileName,
    timeframe, 
    sessionId,
    processedData,
    rawFileContent: sessionId, 
    isProcessing,
    isProcessed,
    error,
    progress,
    handleFileSelect,
    handleFileDrop,
    updateTimeframe: updateFileProcessorTimeframe, 
    reset
  };
};

export default useTweetFileProcessor;