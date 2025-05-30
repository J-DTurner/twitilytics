import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Report Header Component
 * 
 * This component displays the header of the report page with navigation tabs,
 * timeframe selector, and PDF export button.
 * 
 * @param {Object} props - Component props
 * @param {string} props.activeTab - The currently active tab
 * @param {function} props.onTabChange - Function to handle tab changes
 * @param {string} props.timeframe - Current selected timeframe
 * @param {function} props.onTimeframeChange - Function to handle timeframe changes
 * @param {function} props.onGeneratePDF - Function to handle PDF generation
 * @param {boolean} props.isGeneratingPDF - Whether PDF is currently being generated
 * @param {boolean} props.isPaidUser - Whether the user has paid for the premium report
 */
const ReportHeader = ({ 
  activeTab, 
  onTabChange, 
  timeframe, 
  onTimeframeChange, 
  onGeneratePDF, 
  isGeneratingPDF,
  isPaidUser
}) => {
  // Handle timeframe change
  const handleTimeframeChange = (e) => {
    onTimeframeChange(e.target.value);
  };

  // Navigation tabs configuration
  const tabs = [
    { id: 'summary', label: 'Executive Summary' },
    { id: 'activity', label: 'Activity Analysis' },
    { id: 'charts', label: 'Analytics Charts' },
    { id: 'topics', label: 'Topic Analysis' },
    { id: 'engagement', label: 'Engagement Analysis' },
    { id: 'media', label: 'Media Analysis' },
    { id: 'monthly', label: 'Monthly Analysis' },
    { id: 'recommendations', label: 'Recommendations' },
    { id: 'image', label: 'Image Analysis' }
  ];

  return (
    <header className="report-header">
      <div className="report-header-container">
        <div className="report-header-logo">
          <Link to="/">
            <img 
              src="/images/twitilytics-logo.png" 
              alt="Twitilytics Logo" 
            />
          </Link>
          <h1>Twitter Analysis Report</h1>
        </div>
        
        <div className="report-controls">
          <div className="timeframe-selector">
            <label htmlFor="timeframe">Timeframe:</label>
            <select 
              id="timeframe" 
              value={timeframe}
              onChange={handleTimeframeChange}
            >
              <option value="all">All Time</option>
              <option value="last-year">Last Year</option>
              <option value="last-6-months">Last 6 Months</option>
              <option value="last-3-months">Last 3 Months</option>
              <option value="last-month">Last Month</option>
            </select>
          </div>
          
          <button 
            className="pdf-button" 
            onClick={onGeneratePDF}
            disabled={isGeneratingPDF || !isPaidUser}
            title={!isPaidUser ? "Upgrade to export PDF" : "Export as PDF"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            {isGeneratingPDF ? 'Generating...' : 'Export PDF'}
          </button>
        </div>
      </div>
      
      <nav className="report-tabs">
        <div className="report-tabs-container">
          {tabs.map(tab => (
            <div 
              key={tab.id}
              className={`report-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </div>
          ))}
        </div>
      </nav>
    </header>
  );
};

export default ReportHeader;