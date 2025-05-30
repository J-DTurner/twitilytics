import { useState, useCallback } from 'react';

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
  formData.append('isPaidUser', isPaidUser.toString());

  const response = await fetch('/api/analyze/upload-and-process', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to upload file');
  }

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
  
  /**
   * Handle file selection and upload
   * @param {File} selectedFile - The selected file
   */
  const handleFileSelect = useCallback(async (selectedFile) => {
    if (!selectedFile) return;
    
    if (!selectedFile.name.endsWith('.js')) {
      setError('Invalid file type. Please upload a tweets.js file.');
      setFile(null);
      setFileName('');
      setSessionId(null);
      setProcessedData(null);
      setIsProcessed(false);
      return;
    }

    // Check file size on client side (rough check)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (selectedFile.size > maxSize) {
      setError('File too large. Please ensure your tweets.js file is under 100MB.');
      setFile(null);
      setFileName('');
      setSessionId(null);
      setProcessedData(null);
      setIsProcessed(false);
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
    setProgress(25);
    
    try {
      setProgress(50);
      const result = await uploadFileToServer(selectedFile, timeframe, isPaidUser);
      
      setProgress(75);
      setSessionId(result.sessionId);
      setProcessedData(result.processedData);
      setIsProcessed(true);
      setProgress(100);
      
      console.log(`[FileProcessor] File uploaded and processed: ${selectedFile.name}, sessionId: ${result.sessionId}, tweets: ${result.tweetCount}`);
    } catch (e) {
      console.error('Error uploading and processing file:', e);
      setError(`Failed to process file: ${e.message}`);
      setFile(null);
      setFileName('');
      setSessionId(null);
      setProcessedData(null);
    } finally {
      setIsProcessing(false);
    }
  }, [timeframe, isPaidUser]);
  
  /**
   * Handle file drop event
   * @param {DragEvent} event - The drop event
   */
  const handleFileDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      const dropped = event.dataTransfer.files[0];
      if (dropped) handleFileSelect(dropped);
    } catch (e) {
      console.error('Error handling drop:', e);
      setError('Failed to process the dropped file.');
    }
  }, [handleFileSelect]);
  
  /**
   * Update the selected timeframe and reprocess if needed
   * @param {string} newTimeframe - The new timeframe to use
   */
  const updateTimeframe = useCallback((newTf) => {
    setTimeframe(newTf);
    // If we have a file and session, we might want to reprocess with new timeframe
    // For now, we'll just update the timeframe - the user can re-upload if needed
  }, []);
  
  /**
   * Reset the processor state
   */
  const reset = useCallback(() => {
    setFile(null);
    setFileName('');
    setSessionId(null);
    setProcessedData(null);
    setIsProcessed(false);
    setError(null);
    setProgress(0);
  }, []);
  
  return {
    // State
    file,
    fileName,
    timeframe,
    sessionId, // New: session ID instead of raw content
    processedData, // New: processed data from server
    rawFileContent: sessionId, // Backward compatibility - return session ID
    isProcessing,
    isProcessed,
    error,
    progress,
    
    // Handlers
    handleFileSelect,
    handleFileDrop,
    updateTimeframe,
    reset
  };
};

export default useTweetFileProcessor;