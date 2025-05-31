import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useTweetFileProcessor from '../../hooks/useTweetFileProcessor';
import { useTweetData } from '../../context/TweetDataContext';
import usePaymentHandler from '../../hooks/usePaymentHandler';
import { apiRequest } from '../../utils/api';

/**
 * File Upload Section Component
 * 
 * This section allows users to upload their tweets.js file,
 * with drag-and-drop functionality and file processing.
 */
const FileUploadSection = () => {
  // const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const { updateProcessedDataAndSessionId, updateTimeframe, updateDataSource } = useTweetData();
  const { handleStandardPayment, handleScrapePayment, isProcessingPayment } = usePaymentHandler();
  
  const [email, setEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPaymentButton, setShowPaymentButton] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderError, setReminderError] = useState(null);
  const [uploadType, setUploadType] = useState('file'); // Default to 'file'
  const [twitterHandle, setTwitterHandle] = useState('');
  // For simplicity, let's assume the scrape package is fixed, e.g., 5 blocks (5000 tweets)
  const SCRAPE_PACKAGE_BLOCKS = 5; // Example: This package is for 5000 tweets
  const SCRAPE_PACKAGE_COST = 10.00; // Example: Cost for this 5k tweet package
  
  // Setup file processor hook
  const {
    file,
    fileName,
    timeframe,
    isProcessing,
    isProcessed,
    sessionId,
    processedData,
    error,
    progress,
    handleFileSelect,
    handleFileDrop,
    updateTimeframe: updateFileProcessorTimeframeHook,
    reset
  } = useTweetFileProcessor({
    defaultTimeframe: 'all',
    isPaidUser: false
  });
  
  // Add useEffect to handle pre-selection from location state
  useEffect(() => {
    const preselectMethod = location.state?.preselect;
    if (preselectMethod) {
      if (preselectMethod === 'file' || preselectMethod === 'username') {
        // Always set the uploadType if a preselect is provided via navigation state
        // This ensures that clicking a new pricing card link will update the selection
        setUploadType(preselectMethod);
      }
    }
    // If no preselectMethod, uploadType remains 'file' due to useState initialization
  }, [location.state]); // Only depend on location.state to re-trigger when it changes
  
  // Handle file input change
  const handleFileInputChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };
  
  // Handle browse button click
  const handleBrowseClick = () => {
    console.log('Browse button clicked');
    
    // Try to find the file input if ref is null
    if (!fileInputRef.current) {
      const fileInput = document.querySelector('.file-input');
      if (fileInput) {
        fileInput.click();
        return;
      }
    }
    
    if (fileInputRef.current) {
      try {
        fileInputRef.current.click();
      } catch (error) {
        console.error('Error clicking file input:', error);
      }
    } else {
      // Fallback: create a temporary file input
      const tempInput = document.createElement('input');
      tempInput.type = 'file';
      tempInput.accept = '.js';
      tempInput.style.display = 'none';
      tempInput.onchange = (e) => {
        if (e.target.files[0]) {
          handleFileSelect(e.target.files[0]);
        }
        document.body.removeChild(tempInput);
      };
      document.body.appendChild(tempInput);
      tempInput.click();
    }
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
    updateFileProcessorTimeframeHook(newTimeframe);
    updateTimeframe(newTimeframe);
  };
  
  // Handle email input change
  const handleEmailChange = (event) => {
    setEmail(event.target.value);
  };
  
  // Handle analyze button click
  const handleAnalyzeClick = () => {
    if (!sessionId) return;
    // Update context with session ID and processed data
    updateProcessedDataAndSessionId(processedData, sessionId);
    updateTimeframe(timeframe);
    setShowPaymentButton(true);
  };
  
  // Handle payment button click
  const handlePaymentClick = () => {
    handleStandardPayment({ email });
  };
  
  // Handle email reminder form submission
  const handleEmailReminderSubmit = async event => {
    event.preventDefault();
    setReminderError(null);
    setIsSendingReminder(true);
    try {
      const response = await apiRequest('POST', '/api/email/send-archive-instructions', { email });
      if (response.success) {
        alert(`We've sent instructions for downloading your Twitter archive to ${email}. Please check your inbox (and spam folder)!`);
        setShowEmailForm(false);
        setEmail('');
      } else {
        setReminderError(response.message || 'An unknown error occurred.');
        alert(`Failed to send instructions: ${response.message || 'Please try again.'}`);
      }
    } catch (error) {
      console.error("Error sending reminder email:", error);
      setReminderError(error.message || 'Failed to send email due to a network or server issue.');
      alert(`Error: ${error.message || 'Could not send instructions. Please try again later.'}`);
    } finally {
      setIsSendingReminder(false);
    }
  };
  
  // Toggle the email reminder form
  const toggleEmailForm = () => {
    setShowEmailForm(!showEmailForm);
  };

  // Handle scrape and pay
  const handleScrapeAndPay = () => {
    updateDataSource('username', { handle: twitterHandle, blocks: SCRAPE_PACKAGE_BLOCKS });
    handleScrapePayment({ email, twitterHandle, numBlocks: SCRAPE_PACKAGE_BLOCKS });
  };
  
  return (
    <section className="section file-upload-section file-upload-dark-theme" id="file-upload">
      <div className="container">
        <div className="analysis-choice-container">
          <div className={`analysis-choice-card ${uploadType === 'file' ? 'active-choice' : ''}`} onClick={() => setUploadType('file')}>
              <div className="choice-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <h3>Upload Twitter Archive</h3>
              <p>Analyze a tweets.js file for a comprehensive historical review. Ideal when your client provides their data.</p>
            </div>
          <div className={`analysis-choice-card ${uploadType === 'username' ? 'active-choice' : ''}`} onClick={() => setUploadType('username')}>
              <div className="choice-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <h3>Analyze by Username</h3>
              <p>Directly analyze recent tweets from any public Twitter profile. Great for quick insights or competitor analysis.</p>
            </div>
        </div>
        
        <div className={`file-upload-content-area ${uploadType ? 'active' : 'hidden'}`}>
          <div className="file-upload-container">
          {/* File Upload Section */}
          {uploadType === 'file' && (
            <>
              {/* File Upload Box */}
              <div 
                ref={dropZoneRef}
                className={`upload-box ${file ? 'has-file' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={file ? undefined : handleBrowseClick}
                role={file ? undefined : "button"}
                tabIndex={file ? undefined : "0"}
                onKeyPress={file ? undefined : (e) => e.key === 'Enter' && handleBrowseClick()}
                style={{ cursor: file ? 'default' : 'pointer' }}
              >
            {!file && (
              <div className="upload-empty-state">
                <div className="upload-icon-wrapper">
                  <div className="upload-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                  </div>
                </div>
                <div className="upload-content">
                  <h3 className="upload-text">
                    Drag and drop your tweets.js file here
                  </h3>
                  <p className="upload-or">
                    or <button 
                      type="button" 
                      className="btn-text upload-browse-btn" 
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent double-clicking
                        handleBrowseClick();
                      }}
                    >
                      browse your files
                    </button>
                  </p>
                </div>
                <p className="upload-security-note">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span>Your data is secure and never shared</span>
                </p>
              </div>
            )}
            
            {file && (
              <div className="file-uploaded-state">
                <div className="file-info">
                  <div className="file-icon-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <div className="file-check-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  </div>
                  <div className="file-details">
                    <h4 className="file-name">{fileName}</h4>
                    <p className="file-status">File ready for analysis</p>
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-ghost btn-sm file-remove-btn"
                    onClick={reset}
                    aria-label="Remove file"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                
                <div className="timeframe-selector">
                  <label htmlFor="timeframe" className="timeframe-label">
                    <span>Analyze tweets from:</span>
                  </label>
                  <select
                    id="timeframe"
                    value={timeframe}
                    onChange={handleTimeframeChange}
                    onClick={(e) => e.stopPropagation()}
                    disabled={isProcessing}
                    className="timeframe-select"
                  >
                    <option value="all">All time</option>
                    <option value="last-year">Last year</option>
                    <option value="last-6-months">Last 6 months</option>
                    <option value="last-3-months">Last 3 months</option>
                    <option value="last-month">Last month</option>
                  </select>
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
          
          {/* Error Message */}
          {error && (
            <div className="upload-error mt-4">
              <p>{error}</p>
            </div>
          )}
          
          {/* Progress Bar */}
          {progress > 0 && progress < 100 && (
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
              <span className="progress-text">{progress}%</span>
            </div>
          )}
          
          {/* Analyze Button */}
          {file && !showPaymentButton && (
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={handleAnalyzeClick}
              disabled={isProcessing || !isProcessed}
            >
              {isProcessing ? 'Processing...' : 'Next: Review & Unlock Full Report ($9)'}
            </button>
          )}
          
          {/* Payment Button */}
          {showPaymentButton && (
            <div className="payment-section mt-4">
              <h3>Ready for Your In-Depth Analysis</h3>
              <p>
                We've processed your tweets and are ready to generate your comprehensive report.
              </p>
              
              <div className="email-input mt-4">
                <label htmlFor="payment-email">Email (for your report):</label>
                <input
                  type="email"
                  id="payment-email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="your@email.com"
                />
              </div>
              
              <button
                type="button"
                className="btn btn-accent btn-lg mt-4"
                onClick={handlePaymentClick}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? 'Processing...' : 'Unlock My Full AI Report – Just $9'}
              </button>
              
              <p className="payment-note mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', marginRight: '4px', verticalAlign: 'middle', color: 'var(--success)'}}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <polyline points="9 12 12 15 16 10"></polyline>
                </svg>
                <strong>100% Money-Back Guarantee.</strong> Secure payment processing.
              </p>
              <p className="data-privacy-note">
                Your tweets.js file is processed for analysis and not stored permanently.
              </p>
            </div>
          )}
          
          {/* Email Reminder */}
          {!file && (
            <div className="reminder-section mt-8">
              <h3>Don't have your Twitter archive yet?</h3>
              <p>
                It can take a few hours for Twitter to prepare your archive. We can send you a reminder 
                with instructions when you're ready to analyze your tweets.
              </p>
              
              {!showEmailForm ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-md mt-4"
                  onClick={toggleEmailForm}
                >
                  Send Me Archive Instructions
                </button>
              ) : (
                <form onSubmit={handleEmailReminderSubmit} className="reminder-form mt-4">
                  <div className="form-group">
                    <input
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      placeholder="Your email address"
                      required
                      disabled={isSendingReminder}
                    />
                  </div>
                  
                  {reminderError && (
                    <div className="upload-error mt-2" style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>
                      <p>{reminderError}</p>
                    </div>
                  )}
                  
                  <div className="form-buttons mt-4">
                    <button
                      type="submit"
                      className="btn btn-secondary btn-md"
                      disabled={isSendingReminder}
                    >
                      {isSendingReminder ? 'Sending...' : 'Send Instructions'}
                    </button>
                    
                    <button
                      type="button"
                      className="btn btn-ghost btn-md"
                      onClick={toggleEmailForm}
                      disabled={isSendingReminder}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
              </>
          )}

          {/* Scrape Form Section */}
          {uploadType === 'username' && (
            <div className="scrape-form-container">
              <div className="scrape-form">
                <h3>Analyze Profile by Username</h3>
                <p>Enter a public Twitter username to analyze their recent tweets.</p>
                
                <div className="form-group">
                  <label htmlFor="twitter-handle">Twitter Username:</label>
                  <input
                    type="text"
                    id="twitter-handle"
                    value={twitterHandle}
                    onChange={(e) => setTwitterHandle(e.target.value.replace(/^@/, ''))}
                    placeholder="username (without @)"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Scrape Package:</label>
                  <p className="text-lg font-semibold">Standard Scrape ({(SCRAPE_PACKAGE_BLOCKS * 1000).toLocaleString()} tweets)</p>
                  <p className="text-sm text-gray-400">This package analyzes up to {(SCRAPE_PACKAGE_BLOCKS * 1000).toLocaleString()} recent tweets from the profile.</p>
                </div>
                
                <div className="form-group">
                  <label htmlFor="scrape-email">Email (for your report):</label>
                  <input
                    type="email"
                    id="scrape-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                
                <button
                  type="button"
                  className="btn btn-accent btn-lg mt-4"
                  onClick={handleScrapeAndPay}
                  disabled={isProcessingPayment || !twitterHandle || !email}
                >
                  {isProcessingPayment ? 'Processing...' : `Unlock Profile Report – $${SCRAPE_PACKAGE_COST.toFixed(2)}`}
                </button>
                
                <p className="payment-note mt-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', marginRight: '4px', verticalAlign: 'middle', color: 'var(--success)'}}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <polyline points="9 12 12 15 16 10"></polyline>
                  </svg>
                  <strong>100% Money-Back Guarantee.</strong> Secure payment processing.
                </p>
                <p className="data-privacy-note">
                  Profile data is analyzed in real-time and not stored permanently.
                </p>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FileUploadSection;