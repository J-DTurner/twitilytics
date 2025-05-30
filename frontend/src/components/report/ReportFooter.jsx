import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Report Footer Component
 * 
 * This component displays the footer of the report page with actions like
 * exporting to PDF and analyzing another Twitter archive.
 * 
 * @param {Object} props - Component props
 * @param {function} props.onGeneratePDF - Function to handle PDF generation
 * @param {boolean} props.isGeneratingPDF - Whether PDF is currently being generated
 * @param {string|null} props.pdfError - Error message if PDF generation failed, null otherwise
 */
const ReportFooter = ({ onGeneratePDF, isGeneratingPDF, pdfError }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="report-footer">
      <div className="report-footer-container">
        <div className="report-actions">
          <Link 
            to="/" 
            className="footer-button analyze-another-button"
          >
            Analyze Another Twitter Archive
          </Link>
          
          <button 
            className="footer-button export-pdf-button"
            onClick={onGeneratePDF}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? 'Generating PDF...' : 'Export as PDF'}
          </button>
        </div>
        
        {pdfError && (
          <div className="pdf-error error-message">
            {pdfError}
          </div>
        )}
        
        <div className="report-footer-logo">
          <img 
            src="/images/twitilytics-logo.png" 
            alt="Twitilytics Logo" 
            height="32"
          />
        </div>
        
        <div className="report-footer-text">
          <p>
            © {currentYear} Twitilytics. All rights reserved.
          </p>
          <p>
            Twitilytics is not affiliated with Twitter, Inc. Twitter is a registered trademark of Twitter, Inc.
          </p>
          <p>
            <Link to="/privacy">Privacy Policy</Link> | <Link to="/terms">Terms of Service</Link>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default ReportFooter;