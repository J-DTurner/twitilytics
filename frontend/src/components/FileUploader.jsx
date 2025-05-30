import React, { useRef, useState } from 'react';
import { useTweetData } from '../context/TweetDataContext';
import useTweetFileProcessor from '../hooks/useTweetFileProcessor';

/**
 * File uploader component for tweets.js files
 * 
 * This component handles file uploads, drag and drop, and processing
 * of the tweets.js file using our integration hooks.
 */
const FileUploader = () => {
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  
  const { updateProcessedData, updateTimeframe, isPaidUser } = useTweetData();
  
  const [email, setEmail] = useState('');
  const [remindMeChecked, setRemindMeChecked] = useState(false);
  
  // Setup the file processor hook
  const {
    file,
    fileName,
    timeframe,
    isUploading,
    isProcessing,
    isProcessed,
    error,
    progress,
    handleFileSelect,
    handleFileDrop,
    processFile,
    updateTimeframe: updateFileTimeframe,
    reset
  } = useTweetFileProcessor({
    defaultTimeframe: 'all',
    isPaidUser
  });
  
  // Handle file input change
  const handleFileInputChange = (event) => {
    handleFileSelect(event.target.files[0]);
  };
  
  // Handle browse button click
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };
  
  // Handle drag events
  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropZoneRef.current?.classList.add('drag-over');
  };
  
  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropZoneRef.current?.classList.remove('drag-over');
  };
  
  const handleDrop = (event) => {
    handleDragLeave(event);
    handleFileDrop(event);
  };
  
  // Handle timeframe change
  const handleTimeframeChange = (event) => {
    const newTimeframe = event.target.value;
    updateFileTimeframe(newTimeframe);
    updateTimeframe(newTimeframe);
  };
  
  // Handle email input change
  const handleEmailChange = (event) => {
    setEmail(event.target.value);
  };
  
  // Handle reminder checkbox change
  const handleRemindMeChange = (event) => {
    setRemindMeChecked(event.target.checked);
  };
  
  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Process the file
    const data = await processFile();
    
    if (data) {
      // Update the global state with the processed data
      updateProcessedData(data);
      updateTimeframe(timeframe);
    }
  };
  
  // Handle email reminder submission
  const handleEmailReminder = (event) => {
    event.preventDefault();
    
    // Check if email is valid
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    
    // TODO: Send email reminder using firebaseConfig.js functions
    
    // Show confirmation
    alert(`We'll remind you at ${email} to get your Twitter archive!`);
    
    // Reset form
    setEmail('');
    setRemindMeChecked(false);
  };
  
  return (
    <div className="file-uploader">
      <div className="upload-container">
        <div 
          ref={dropZoneRef}
          className={`drop-zone ${file ? 'has-file' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!file && (
            <>
              <div className="drop-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="drop-text">
                <strong>Drop your tweets.js file here</strong> or
                <button type="button" className="browse-button" onClick={handleBrowseClick}>
                  browse
                </button>
              </p>
              <p className="file-help">
                Need help getting your Twitter archive?{' '}
                <a href="#how-to-get-archive">See instructions below</a>
              </p>
            </>
          )}
          
          {file && (
            <div className="file-info">
              <div className="file-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <line x1="10" y1="9" x2="8" y2="9" />
                </svg>
              </div>
              <div className="file-details">
                <p className="file-name">{fileName}</p>
                <button type="button" className="remove-file" onClick={reset}>
                  Remove
                </button>
              </div>
            </div>
          )}
          
          <input
            type="file"
            ref={fileInputRef}
            className="file-input"
            accept=".js"
            onChange={handleFileInputChange}
          />
        </div>
        
        {file && (
          <div className="timeframe-selector">
            <label htmlFor="timeframe">Analyze tweets from:</label>
            <select
              id="timeframe"
              value={timeframe}
              onChange={handleTimeframeChange}
              disabled={isProcessing}
            >
              <option value="all">All time</option>
              <option value="last-year">Last year</option>
              <option value="last-6-months">Last 6 months</option>
              <option value="last-3-months">Last 3 months</option>
              <option value="last-month">Last month</option>
            </select>
          </div>
        )}
        
        {error && (
          <div className="upload-error">
            <p>{error}</p>
          </div>
        )}
        
        {progress > 0 && progress < 100 && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            <span className="progress-text">{progress}%</span>
          </div>
        )}
        
        <button
          type="button"
          className="analyze-button"
          disabled={!file || isProcessing}
          onClick={handleSubmit}
        >
          {isProcessing ? 'Processing...' : (isProcessed ? 'Analyze Again' : 'Analyze My Tweets')}
        </button>
      </div>
      
      <div className="reminder-form">
        <h3>Don't have your Twitter archive yet?</h3>
        <p>We'll send you a reminder email with instructions to download it.</p>
        
        <form onSubmit={handleEmailReminder}>
          <div className="form-group">
            <input
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="Your email address"
              required
            />
          </div>
          
          <div className="form-group checkbox">
            <input
              type="checkbox"
              id="remindMe"
              checked={remindMeChecked}
              onChange={handleRemindMeChange}
              required
            />
            <label htmlFor="remindMe">
              I agree to receive a one-time email reminder
            </label>
          </div>
          
          <button type="submit" className="remind-button">
            Send Me a Reminder
          </button>
        </form>
      </div>
    </div>
  );
};

export default FileUploader;