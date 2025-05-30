import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTweetData } from '../../context/TweetDataContext';
import { getFullScrapedAnalysis } from '../../services/analysisService';
import html2pdf from 'html2pdf.js';
import ReportHeader from './ReportHeader';
import ExecutiveSummarySection from './ExecutiveSummarySection';
import ActivityAnalysisSection from './ActivityAnalysisSection';
import TopicAnalysisSection from './TopicAnalysisSection';
import EngagementAnalysisSection from './EngagementAnalysisSection';
import MediaAnalysisSection from './MediaAnalysisSection';
import MonthlyAnalysisSection from './MonthlyAnalysisSection';
import ContentRecommendationsSection from './ContentRecommendationsSection';
import ImageAnalysisSection from './ImageAnalysisSection';
import TwitterActivityChart from './TwitterActivityChart';
import UpgradePrompt from './UpgradePrompt';
import ReportFooter from './ReportFooter';

/**
 * Report Page Component
 * 
 * This is the main report page that displays the Twitter analytics report.
 * It contains multiple sections that each provide different insights.
 */
const ReportPage = () => {
  const navigate = useNavigate();
  const { rawTweetsJsContent, isPaidUser, updateTimeframe, dataSource, allAnalysesContent, setFullAnalyses, paymentSessionId } = useTweetData();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [timeframe, setTimeframe] = useState('all');
  const [loading, setLoading] = useState(false);
  const reportContentRef = useRef(null);

  // Handle scraping data fetch
  useEffect(() => {
    if (dataSource?.type === 'username' && !allAnalysesContent) {
      setLoading(true);
      getFullScrapedAnalysis(dataSource.handle, paymentSessionId, timeframe || 'all', dataSource.blocks)
        .then(res => res.analyses && setFullAnalyses(res.analyses))
        .finally(() => setLoading(false));
    }
  }, [dataSource, allAnalysesContent, paymentSessionId, timeframe, setFullAnalyses]);

  // Check if data is available on component mount
  useEffect(() => {
    if (!rawTweetsJsContent && dataSource?.type !== 'username') {
      // No data available, redirect to landing page after a short delay
      const timer = setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [rawTweetsJsContent, dataSource, navigate]);

  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
    updateTimeframe(newTimeframe);
  };

  // Handle PDF generation
  const handleGeneratePDF = async () => {
    if (!reportContentRef.current || !isPaidUser) {
      if (!isPaidUser) alert('PDF export is a premium feature. Please upgrade.');
      return;
    }
    setIsGeneratingPDF(true);
    setPdfError(null);
    const element = reportContentRef.current;
    const filename = `Twitilytics_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    const options = {
      margin: [15,10,15,10],
      filename,
      image: { type:'jpeg', quality:0.95 },
      html2canvas: { scale:2, useCORS:true, logging:false, windowWidth:element.scrollWidth, windowHeight:element.scrollHeight },
      jsPDF: { unit:'mm', format:'a4', orientation:'portrait' },
      pagebreak: { mode:['avoid-all','css','legacy'] }
    };
    try {
      const canvases = element.querySelectorAll('canvas');
      canvases.forEach(canvas => {
        try {
          const img = document.createElement('img');
          img.src = canvas.toDataURL('image/png');
          img.style.maxWidth = '100%';
          canvas.parentNode.replaceChild(img, canvas);
        } catch {}
      });
      await html2pdf().from(element).set(options).save();
    } catch (err) {
      console.error('Error generating PDF:', err);
      setPdfError('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // If loading scraped data
  if (loading) {
    return (
      <div className="report-placeholder">
        <div className="container">
          <div className="placeholder-content">
            <h1>Generating Your Report</h1>
            <p>Retrieving and analyzing tweets for @{dataSource?.handle}...</p>
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  // If no data is available, show a message
  if (!rawTweetsJsContent && dataSource?.type !== 'scrape') {
    return (
      <div className="report-placeholder">
        <div className="container">
          <div className="placeholder-content">
            <h1>No Twitter Data Available</h1>
            <p>
              You need to upload your Twitter archive first to see your analysis report.
            </p>
            <p>Redirecting you to the upload page...</p>
            <Link to="/" className="primary-button">
              Go to Upload Page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="report-page">
      <ReportHeader 
        timeframe={timeframe}
        onTimeframeChange={handleTimeframeChange}
        onGeneratePDF={handleGeneratePDF}
        isGeneratingPDF={isGeneratingPDF}
        isPaidUser={isPaidUser}
      />
      
      <div ref={reportContentRef} className="report-content">
        <div className="container">
          <div id="summary-section" className="report-section">
            <ExecutiveSummarySection />
          </div>
          
          <div id="activity-section" className="report-section">
            <ActivityAnalysisSection />
          </div>
          
          <div id="charts-section" className="report-section">
            <TwitterActivityChart />
          </div>
          
          <div id="topics-section" className="report-section">
            <TopicAnalysisSection />
          </div>
          
          <div id="engagement-section" className="report-section">
            <EngagementAnalysisSection />
          </div>
          
          {!isPaidUser && (
            <div className="upgrade-section">
              <UpgradePrompt />
            </div>
          )}
          
          <div id="media-section" className="report-section">
            <MediaAnalysisSection />
          </div>
          
          <div id="monthly-section" className="report-section">
            <MonthlyAnalysisSection />
          </div>
          
          <div id="recommendations-section" className="report-section">
            <ContentRecommendationsSection />
          </div>
          
          <div id="image-section" className="report-section">
            <ImageAnalysisSection />
          </div>
        </div>
      </div>
      
      <ReportFooter 
        onGeneratePDF={handleGeneratePDF}
        isGeneratingPDF={isGeneratingPDF}
        pdfError={pdfError}
      />
    </div>
  );
};

export default ReportPage;