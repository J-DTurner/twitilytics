import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTweetData } from '../../context/TweetDataContext';
import { getFullScrapedAnalysis } from '../../services/analysisService';
import { apiRequest } from '../../utils/api';
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

const ReportPage = () => {
  const navigate = useNavigate();
  const { 
    processedData, 
    dataSessionId, // This is our internal analysis session ID for uploaded files
    isPaidUser, 
    updateTimeframe, 
    dataSource, 
    allAnalysesContent, 
    setFullAnalyses, 
    // paymentSessionId, // This is Polar's checkout ID, now part of dataSource for relevant type
    updateProcessedDataAndSessionId 
  } = useTweetData();

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  // Initialize currentTimeframe from dataSource if available, else from context's timeframe, or default
  const [currentTimeframe, setCurrentTimeframe] = useState(dataSource?.timeframe || useTweetData().timeframe || 'all');
  const [loading, setLoading] = useState(true); // Start with loading true
  const [pageError, setPageError] = useState(null);
  const reportContentRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setPageError(null);
    console.log("[ReportPage] useEffect triggered. DataSource:", dataSource);

    if (dataSource?.type === 'username') {
      console.log("[ReportPage] Scrape analysis detected.");
      if (dataSource.handle && dataSource.paymentSessionId && !isNaN(dataSource.blocks)) {
        // If allAnalysesContent is already present and matches current timeframe and handle/blocks, skip fetch.
        // This simplistic check might need refinement if allAnalysesContent could be stale for other reasons.
        if (allAnalysesContent && 
            allAnalysesContent.processedData?.timeframe === currentTimeframe &&
            allAnalysesContent.processedData?.twitterHandle === dataSource.handle && // Assuming processedData stores this
            allAnalysesContent.processedData?.numBlocks === dataSource.blocks // Assuming processedData stores this
            ) {
            console.log("[ReportPage] Scrape data already in context for current params.");
            setLoading(false);
            return;
        }

        console.log("[ReportPage] Fetching full scraped analysis...");
        getFullScrapedAnalysis(dataSource.handle, dataSource.paymentSessionId, currentTimeframe, dataSource.blocks)
          .then(res => {
            if (res.analyses) {
              console.log("[ReportPage] Scraped analysis fetched successfully.");
              setFullAnalyses(res.analyses);
              if (res.analyses.processedData) {
                 // The scrapeJobId is the unique identifier for this scrape instance
                 updateProcessedDataAndSessionId(res.analyses.processedData, dataSource.scrapeJobId, false); 
              }
            } else {
              console.error("[ReportPage] Failed to load scraped analysis data, no 'analyses' key in response:", res);
              setPageError(res.message || "Failed to load scraped analysis data.");
            }
          })
          .catch(err => {
            console.error("[ReportPage] Error fetching scraped analysis:", err);
            setPageError(`Failed to load report: ${err.message}`);
          })
          .finally(() => setLoading(false));
      } else {
         console.warn("[ReportPage] Missing required data for scrape analysis in dataSource:", dataSource);
         setPageError("Missing required data for scrape analysis.");
         setLoading(false);
      }
    } else if (dataSource?.type === 'file') {
      console.log("[ReportPage] File analysis detected.");
      if (dataSource.dataSessionId) {
        // Check if data in context matches the required session ID
        if (processedData && dataSessionId === dataSource.dataSessionId && processedData.timeframe === currentTimeframe) {
          console.log("[ReportPage] File data already in context for current session and timeframe.");
          setLoading(false);
        } else {
          console.log("[ReportPage] Fetching file session data from server for session:", dataSource.dataSessionId);
          // Fetch session data (which includes processedData) from the backend
          apiRequest('GET', `/analyze/session/${dataSource.dataSessionId}`)
            .then(resData => {
              if (resData.status === 'success' && resData.processedData) {
                console.log("[ReportPage] File session data fetched successfully.");
                updateProcessedDataAndSessionId(resData.processedData, dataSource.dataSessionId, true); // Persist metadata
                // If timeframe from session is different, update component state and context
                if (resData.timeframe && resData.timeframe !== currentTimeframe) {
                    setCurrentTimeframe(resData.timeframe);
                    updateTimeframe(resData.timeframe); // Update context timeframe
                }
              } else {
                throw new Error(resData.message || 'Failed to retrieve session data.');
              }
            })
            .catch(err => {
              console.error("[ReportPage] Error fetching file session data:", err);
              setPageError(`Failed to load your analysis session: ${err.message}. Please try re-uploading.`);
            })
            .finally(() => setLoading(false));
        }
      } else {
         console.warn("[ReportPage] File analysis type but dataSessionId is missing in dataSource:", dataSource);
         setPageError("Analysis session ID is missing for file. Please re-upload your file.");
         setLoading(false);
      }
    } else {
      console.warn("[ReportPage] No valid dataSource found or data is incomplete.");
      setPageError("No analysis data found. Please start by uploading a file or analyzing a username.");
      setLoading(false);
      // setTimeout(() => navigate('/'), 3000); // Avoid auto-redirect if user is trying to fix
    }
  }, [
      dataSource, 
      // paymentSessionId, // Now part of dataSource
      dataSessionId,    // From context, to compare with dataSource.dataSessionId
      processedData,    // From context
      allAnalysesContent, 
      currentTimeframe, 
      setFullAnalyses, 
      updateProcessedDataAndSessionId, 
      updateTimeframe, // Added updateTimeframe
      navigate
    ]);
  
  const handleTimeframeChange = (newTimeframe) => {
    console.log("[ReportPage] Timeframe changed to:", newTimeframe);
    setCurrentTimeframe(newTimeframe);
    updateTimeframe(newTimeframe); 
    // The main useEffect will re-run due to currentTimeframe change if dataSource is 'username',
    // or individual analysis sections will re-fetch because `timeframe` in context changes.
    // Forcing a reload if it's a username scrape:
    if (dataSource?.type === 'username' && dataSource.handle && dataSource.paymentSessionId && !isNaN(dataSource.blocks)) {
      setLoading(true);
      getFullScrapedAnalysis(dataSource.handle, dataSource.paymentSessionId, newTimeframe, dataSource.blocks)
        .then(res => {
            if (res.analyses) {
              setFullAnalyses(res.analyses);
              if (res.analyses.processedData) {
                 updateProcessedDataAndSessionId(res.analyses.processedData, dataSource.scrapeJobId, false);
              }
            } else {
               setPageError("Failed to reload analysis for new timeframe.");
            }
        })
        .catch(err => {
          console.error(`[ReportPage] Error reloading scrape for timeframe ${newTimeframe}:`, err);
          setPageError(`Failed to reload report for timeframe ${newTimeframe}: ${err.message}`);
        })
        .finally(() => setLoading(false));
    }
    // For file uploads, components like ExecutiveSummarySection will re-fetch using the new `timeframe` from context.
  };

  // ... (handleGeneratePDF remains mostly the same, ensure it uses `reportContentRef`) ...
  const handleGeneratePDF = async () => {
    if (!reportContentRef.current) return;
    if (!isPaidUser) {
        const upgradeElement = document.getElementById('upgrade-prompt-section') || document.getElementById('file-upload'); 
        if (upgradeElement) {
            upgradeElement.scrollIntoView({ behavior: 'smooth' });
             alert('PDF export is a premium feature. Please complete the payment to unlock.');
        } else {
            alert('PDF export is a premium feature. Please upgrade to access.');
        }
        return;
    }

    setIsGeneratingPDF(true);
    setPdfError(null);
    const element = reportContentRef.current;
    const sections = Array.from(element.querySelectorAll('.report-section'));
    const originalDisplayValues = sections.map(section => ({el: section, display: section.style.display}));
    sections.forEach(section => { section.style.display = 'block'; });

    const canvases = Array.from(element.querySelectorAll('canvas'));
    const imagesToRestore = [];
    canvases.forEach(canvas => {
        try {
            const img = document.createElement('img');
            img.src = canvas.toDataURL('image/png', 1.0); // Use PNG with high quality
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.display = 'block'; 
            img.style.margin = '10px auto'; // Add some margin for spacing in PDF
            canvas.parentNode.insertBefore(img, canvas);
            canvas.style.display = 'none'; 
            imagesToRestore.push({canvas, img});
        } catch (e) {
            console.warn("Could not convert canvas to image for PDF:", e);
        }
    });

    const filenameBase = dataSource?.type === 'username' ? dataSource.handle : (processedData?.fileName || 'TwitterAnalysis');
    const filename = `Twitilytics_Report_${filenameBase.replace('.js', '')}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    const options = {
      margin: [10, 8, 10, 8], 
      filename,
      image: { type: 'jpeg', quality: 0.98 }, // High quality JPEG
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        width: element.scrollWidth, 
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        removeContainer: true // Try to clean up proxy
       },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], after: '.report-section' } // Avoid 'avoid-all' which can be problematic
    };
    try {
      await html2pdf().from(element).set(options).save();
    } catch (err) {
      console.error('Error generating PDF:', err);
      setPdfError('Failed to generate PDF. Error: ' + err.message + '. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
      imagesToRestore.forEach(({canvas, img}) => {
          if (img.parentNode) { img.parentNode.removeChild(img); }
          canvas.style.display = '';
      });
      originalDisplayValues.forEach(item => { item.el.style.display = item.display; });
    }
  };


  if (loading) {
    return (
      <div className="report-placeholder" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh'}}>
        <div className="container" style={{textAlign: 'center'}}>
          <div className="placeholder-content">
            <h1>Generating Your Report</h1>
            <p>Please wait while we analyze the data...</p>
            <div className="spinner" style={{margin: '20px auto'}}></div>
          </div>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="report-placeholder" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh'}}>
        <div className="container" style={{textAlign: 'center'}}>
          <div className="placeholder-content error-container" style={{background: 'var(--error-lighter)', padding: '2rem', borderRadius: 'var(--border-radius)'}}>
            <h1 style={{color: 'var(--error-dark)'}}>Error Loading Report</h1>
            <p style={{color: 'var(--error-dark)'}}>{pageError}</p>
            <Link to="/" className="btn btn-primary btn-md mt-4">
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // Determine if we have the necessary data to render a report
  // For file, we need processedData AND the dataSessionId in context should match dataSource
  const canRenderFileReport = dataSource?.type === 'file' && 
                              processedData && 
                              dataSource.dataSessionId && 
                              dataSessionId === dataSource.dataSessionId;
  // For scrape, we need allAnalysesContent
  const canRenderScrapeReport = dataSource?.type === 'username' && allAnalysesContent;

  if (!canRenderFileReport && !canRenderScrapeReport) {
    return (
      <div className="report-placeholder" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh'}}>
        <div className="container" style={{textAlign: 'center'}}>
          <div className="placeholder-content">
            <h1>Report Data Not Ready</h1>
            <p>We are having trouble loading your report data. This might be due to a recent navigation or incomplete data loading. Please ensure you have completed the previous steps, or try starting over.</p>
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
        activeTab={'summary'} 
        onTabChange={(tabId) => console.log('Tab changed to:', tabId)} 
        timeframe={currentTimeframe}
        onTimeframeChange={handleTimeframeChange}
        onGeneratePDF={handleGeneratePDF}
        isGeneratingPDF={isGeneratingPDF}
        isPaidUser={isPaidUser}
      />
      
      <div ref={reportContentRef} className="report-content">
        <div className="container">
          <ExecutiveSummarySection />
          <ActivityAnalysisSection />
          <TwitterActivityChart /> 
          
          <TopicAnalysisSection />
          <EngagementAnalysisSection />
          
          {!isPaidUser && dataSource?.type === 'file' && ( // Show upgrade prompt only for file uploads if not paid
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