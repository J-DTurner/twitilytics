import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTweetData } from '../../context/TweetDataContext';
import { getFullScrapedAnalysis } from '../../services/analysisService'; // Assuming this exists
import { apiRequest } from '../../utils/api'; // For fetching session data
import html2pdf from 'html2pdf.js';
// ... other imports
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


const ReportPage = () => {
  const navigate = useNavigate();
  const { 
    processedData, // This is the data from the file upload process
    dataSessionId, // This is the server-side session ID for the uploaded file's data
    isPaidUser, 
    updateTimeframe, 
    dataSource, 
    allAnalysesContent, 
    setFullAnalyses, 
    paymentSessionId, // This is Polar's checkout session ID
    updateProcessedDataAndSessionId // Function to update context
  } = useTweetData();

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [currentTimeframe, setCurrentTimeframe] = useState(dataSource?.timeframe || 'all');
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState(null);
  const reportContentRef = useRef(null);

  // Handle data loading based on dataSource
  useEffect(() => {
    setLoading(true);
    setPageError(null);

    if (dataSource?.type === 'username') {
      // This is for scrape-and-analyze flow
      if (!allAnalysesContent && dataSource.handle && paymentSessionId) {
        getFullScrapedAnalysis(dataSource.handle, paymentSessionId, currentTimeframe, dataSource.blocks)
          .then(res => {
            if (res.analyses) {
              setFullAnalyses(res.analyses);
              // If processTweetData was part of scrape analysis, update processedData
              if (res.analyses.processedData) {
                 updateProcessedDataAndSessionId(res.analyses.processedData, dataSource.scrapeJobId || paymentSessionId, false);
              }
            } else {
              setPageError("Failed to load scraped analysis data.");
            }
          })
          .catch(err => {
            console.error("Error fetching scraped analysis:", err);
            setPageError(`Failed to load report: ${err.message}`);
          })
          .finally(() => setLoading(false));
      } else if (allAnalysesContent) {
        setLoading(false); // Already have content
      } else {
         setPageError("Missing required data for scrape analysis.");
         setLoading(false);
      }
    } else if (dataSource?.type === 'file') {
      // This is for file upload flow
      if (dataSource.dataSessionId && (!processedData || dataSessionId !== dataSource.dataSessionId)) {
        // If context's dataSessionId (from previous upload) doesn't match dataSource.dataSessionId (from payment verification),
        // or if processedData is missing, fetch it from server using the session ID.
        apiRequest('GET', `/analyze/session/${dataSource.dataSessionId}`)
          .then(resData => { // resData is already parsed JSON if apiRequest handles it
            if (resData.status === 'success' && resData.processedData) {
              updateProcessedDataAndSessionId(resData.processedData, dataSource.dataSessionId, true);
              setCurrentTimeframe(resData.timeframe || 'all'); // Sync timeframe
            } else {
              throw new Error(resData.message || 'Failed to retrieve session data.');
            }
          })
          .catch(err => {
            console.error("Error fetching file session data:", err);
            setPageError(`Failed to load your analysis session: ${err.message}. Please try re-uploading.`);
          })
          .finally(() => setLoading(false));
      } else if (processedData && dataSessionId === dataSource.dataSessionId) {
        setLoading(false); // Data is already in context and matches
      } else {
         // This case means dataSource.type is 'file' but dataSource.dataSessionId is missing,
         // or processedData is missing and no dataSessionId to fetch.
         setPageError("Analysis session ID is missing. Please re-upload your file.");
         setLoading(false);
      }
    } else {
      // No valid dataSource or data
      setPageError("No analysis data found. Please start by uploading a file or analyzing a username.");
      setLoading(false);
      setTimeout(() => navigate('/'), 3000);
    }
  }, [
      dataSource, 
      paymentSessionId, // Polar's checkout ID
      dataSessionId, // Twitilytics's internal analysis session ID for files
      processedData, 
      allAnalysesContent, 
      currentTimeframe, 
      setFullAnalyses, 
      updateProcessedDataAndSessionId, 
      navigate
    ]);
  
  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe) => {
    setCurrentTimeframe(newTimeframe);
    updateTimeframe(newTimeframe); // Update context, which might trigger re-processing or re-fetching in other components
    // If it's a scrape, re-fetch full analysis for new timeframe
    if (dataSource?.type === 'username' && dataSource.handle && paymentSessionId) {
      setLoading(true);
      getFullScrapedAnalysis(dataSource.handle, paymentSessionId, newTimeframe, dataSource.blocks)
        .then(res => {
            if (res.analyses) {
              setFullAnalyses(res.analyses);
              if (res.analyses.processedData) {
                 updateProcessedDataAndSessionId(res.analyses.processedData, dataSource.scrapeJobId || paymentSessionId, false);
              }
            } else {
               setPageError("Failed to reload analysis for new timeframe.");
            }
        })
        .catch(err => setPageError(`Failed to reload report for timeframe ${newTimeframe}: ${err.message}`))
        .finally(() => setLoading(false));
    }
    // For file uploads, analysis components re-fetch their data based on timeframe & rawTweetsJsContent (dataSessionId)
  };

  // Handle PDF generation (content unchanged)
  const handleGeneratePDF = async () => {
    if (!reportContentRef.current) return;
    if (!isPaidUser) {
        // Find the upgrade prompt section or button
        const upgradeElement = document.getElementById('file-upload'); // Or a more specific ID if UpgradePrompt is always rendered
        if (upgradeElement) {
            upgradeElement.scrollIntoView({ behavior: 'smooth' });
            // Optionally, highlight the upgrade section or show a toast
             alert('PDF export is a premium feature. Please complete the payment to unlock.');
        } else {
            alert('PDF export is a premium feature. Please upgrade to access.');
        }
        return;
    }

    setIsGeneratingPDF(true);
    setPdfError(null);
    const element = reportContentRef.current;
    // Temporarily make all report sections visible for PDF generation
    const sections = element.querySelectorAll('.report-section');
    const originalDisplayValues = [];
    sections.forEach(section => {
        originalDisplayValues.push({el: section, display: section.style.display});
        section.style.display = 'block'; // Or appropriate display value
    });

    // Ensure charts are rendered as images
    const canvases = element.querySelectorAll('canvas');
    const imagesToRestore = [];
    canvases.forEach(canvas => {
        try {
            const img = document.createElement('img');
            img.src = canvas.toDataURL('image/png');
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.display = 'block'; // Ensure img takes up space
            img.style.margin = '0 auto'; // Center if needed
            canvas.parentNode.insertBefore(img, canvas);
            canvas.style.display = 'none'; // Hide original canvas
            imagesToRestore.push({canvas, img});
        } catch (e) {
            console.warn("Could not convert canvas to image for PDF:", e);
        }
    });


    const filename = `Twitilytics_Report_${dataSource?.handle || dataSource?.fileName || 'Twitter'}_${new Date().toISOString().split('T')[0]}.pdf`;
    const options = {
      margin: [10, 5, 10, 5], // Reduced margin [top, left, bottom, right] in mm
      filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        // Try to capture full page content dynamically
        width: element.scrollWidth, 
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
       },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'], after: '.report-section' }
    };
    try {
      await html2pdf().from(element).set(options).save();
    } catch (err) {
      console.error('Error generating PDF:', err);
      setPdfError('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
      // Restore original canvas and remove temp images
      imagesToRestore.forEach(({canvas, img}) => {
          if (img.parentNode) {
            img.parentNode.removeChild(img);
          }
          canvas.style.display = '';
      });
      // Restore original display values for sections if they were changed
      originalDisplayValues.forEach(item => {
        item.el.style.display = item.display;
      });
    }
  };

  if (loading) {
    return (
      <div className="report-placeholder">
        <div className="container">
          <div className="placeholder-content">
            <h1>Generating Your Report</h1>
            <p>Please wait while we analyze the data...</p>
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="report-placeholder">
        <div className="container">
          <div className="placeholder-content error-container">
            <h1>Error Loading Report</h1>
            <p>{pageError}</p>
            <Link to="/" className="btn btn-primary btn-md mt-4">
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // Determine if we have the necessary data to render a report
  const canRenderReport = (dataSource?.type === 'username' && allAnalysesContent) || 
                          (dataSource?.type === 'file' && processedData && dataSessionId === dataSource.dataSessionId);

  if (!canRenderReport) {
     // This case should ideally be caught by the loading/error states above,
     // but as a fallback if dataSource is somehow invalid or data mismatch occurs.
    return (
      <div className="report-placeholder">
        <div className="container">
          <div className="placeholder-content">
            <h1>Preparing Report</h1>
            <p>Loading analysis data. If this persists, please try starting over.</p>
            <Link to="/" className="btn btn-primary btn-md mt-4">
              Start Over
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="report-page">
      <ReportHeader 
        activeTab={'summary'} /* This needs to be dynamic if tabs are implemented */
        onTabChange={(tabId) => console.log('Tab changed to:', tabId)} /* Placeholder */
        timeframe={currentTimeframe}
        onTimeframeChange={handleTimeframeChange}
        onGeneratePDF={handleGeneratePDF}
        isGeneratingPDF={isGeneratingPDF}
        isPaidUser={isPaidUser}
      />
      
      <div ref={reportContentRef} className="report-content">
        <div className="container">
          {/* Render sections; they internally use useTweetData to get relevant content */}
          <ExecutiveSummarySection />
          <ActivityAnalysisSection />
          <TwitterActivityChart /> {/* This uses processedData from context */}
          
          {/* Premium features might show locked state based on isPaidUser */}
          <TopicAnalysisSection />
          <EngagementAnalysisSection />
          
          {!isPaidUser && (
            <div className="upgrade-section" id="upgrade-prompt-section">
              <UpgradePrompt />
            </div>
          )}
          
          <MediaAnalysisSection />
          <MonthlyAnalysisSection />
          <ContentRecommendationsSection />
          <ImageAnalysisSection />
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