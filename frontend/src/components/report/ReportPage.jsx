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

  // Add these new state variables:
  const [fileRawContent, setFileRawContent] = useState(null);
  const [lastFetchedDataSessionId, setLastFetchedDataSessionId] = useState(null);

useEffect(() => {
  setLoading(true);
  setPageError(null);
  // console.log("[ReportPage] useEffect Triggered. DataSource:", dataSource, "CurrentTimeframe:", currentTimeframe, "Context dataSessionId:", dataSessionId);

  const loadDataForFile = async () => {
    if (!dataSource.dataSessionId) {
      setPageError("Analysis session ID is missing for file. Please re-upload your file.");
      setLoading(false);
      return;
    }

    let currentProcessedData = processedData; // Use context's processedData

    // 1. Fetch/Update Processed Data (for charts, etc.)
    if (!currentProcessedData || dataSessionId !== dataSource.dataSessionId || (currentProcessedData.timeframe !== currentTimeframe && dataSource.dataSessionId === dataSessionId)) {
      try {
        const sessionRes = await apiRequest('GET', `/analyze/session/${dataSource.dataSessionId}`);
        if (sessionRes.status === 'success' && sessionRes.processedData) {
          updateProcessedDataAndSessionId(sessionRes.processedData, dataSource.dataSessionId, true);
          currentProcessedData = sessionRes.processedData;
          if (sessionRes.timeframe && sessionRes.timeframe !== currentTimeframe) {
            setCurrentTimeframe(sessionRes.timeframe);
            updateTimeframe(sessionRes.timeframe);
          }
        } else {
          throw new Error(sessionRes.message || 'Failed to retrieve session metadata.');
        }
      } catch (err) {
        console.error("[ReportPage] Error fetching processed data:", err);
        setPageError(`Failed to load analysis metadata: ${err.message}.`);
        setLoading(false);
        return;
      }
    }

    // 2. Fetch Raw Content (for AI analysis)
    if (!fileRawContent || lastFetchedDataSessionId !== dataSource.dataSessionId) {
      try {
        const rawResponse = await apiRequest('GET', `/analyze/session/${dataSource.dataSessionId}/raw`);
        if (rawResponse.status === 'success' && rawResponse.rawContent) {
          setFileRawContent(rawResponse.rawContent);
          setLastFetchedDataSessionId(dataSource.dataSessionId);
          if (rawResponse.timeframe && rawResponse.timeframe !== (currentProcessedData?.timeframe || currentTimeframe)) {
             updateTimeframe(rawResponse.timeframe);
             if(rawResponse.timeframe !== currentTimeframe) setCurrentTimeframe(rawResponse.timeframe);
          }
        } else {
          throw new Error(rawResponse.message || 'Failed to retrieve raw content.');
        }
      } catch (err) {
        console.error("[ReportPage] Error fetching raw content:", err);
        setPageError(`Failed to load raw data for analysis: ${err.message}.`);
        setFileRawContent(null);
        setLoading(false);
        return;
      }
    }
    setLoading(false);
  };

  const loadDataForScrape = async () => {
    if (!dataSource.handle || !dataSource.paymentSessionId || isNaN(dataSource.blocks) || !dataSource.scrapeJobId) {
      setPageError("Missing required data for scrape analysis.");
      setLoading(false);
      return;
    }

    if (
      allAnalysesContent &&
      allAnalysesContent.processedData?.scrapeJobId === dataSource.scrapeJobId &&
      allAnalysesContent.processedData?.timeframe === currentTimeframe
    ) {
      if (processedData?.scrapeJobId !== dataSource.scrapeJobId || dataSessionId !== dataSource.scrapeJobId) {
        updateProcessedDataAndSessionId(allAnalysesContent.processedData, dataSource.scrapeJobId, false);
      }
      setLoading(false);
      return;
    }

    try {
      const res = await getFullScrapedAnalysis(dataSource.handle, dataSource.paymentSessionId, currentTimeframe, dataSource.blocks);
      if (res.analyses) {
        setFullAnalyses(res.analyses);
        if (res.analyses.processedData) {
          updateProcessedDataAndSessionId(res.analyses.processedData, dataSource.scrapeJobId, false);
        }
      } else {
        throw new Error(res.message || "Scraped analysis data is malformed.");
      }
    } catch (err) {
      console.error("[ReportPage] Error fetching/processing scraped analysis:", err);
      setPageError(`Failed to load scraped report: ${err.message}`);
    }
    setLoading(false);
  };

  if (dataSource?.type === 'file') {
    loadDataForFile();
  } else if (dataSource?.type === 'username') {
    loadDataForScrape();
  } else {
    setPageError("No analysis data source identified. Please start over.");
    setLoading(false);
  }

}, [
    dataSource,
    currentTimeframe,
    dataSessionId, 
    updateProcessedDataAndSessionId, 
    updateTimeframe, 
    setFullAnalyses
]);
  
const handleTimeframeChange = (newTimeframe) => {
  console.log("[ReportPage] Timeframe changed to:", newTimeframe);
  setCurrentTimeframe(newTimeframe); // Update local state
  updateTimeframe(newTimeframe);     // Update global context

  // For file uploads, child components use new 'timeframe' from context with existing 'fileRawContent'.
  // For scrapes, the main useEffect will detect 'currentTimeframe' change and re-trigger 'loadDataForScrape'.
  if (dataSource?.type === 'username') {
    // Optional: To be absolutely sure of a refresh, you could clear allAnalysesContent
    // setFullAnalyses(null);
    // However, the existing useEffect logic should handle the re-fetch based on currentTimeframe change.
  }
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
  const canRenderFileReport = dataSource?.type === 'file' && 
                              processedData && 
                              fileRawContent && 
                              dataSource.dataSessionId && 
                              dataSessionId === dataSource.dataSessionId; // dataSessionId from context
  const canRenderScrapeReport = dataSource?.type === 'username' && 
                                allAnalysesContent && 
                                allAnalysesContent.processedData?.scrapeJobId === dataSource.scrapeJobId;

  if (!canRenderFileReport && !canRenderScrapeReport && !loading && !pageError) {
    return (
      <div className="report-placeholder" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh'}}>
        <div className="container" style={{textAlign: 'center'}}>
          <div className="placeholder-content">
            <h1>Report Data Not Fully Loaded</h1>
            <p>There was an issue preparing all parts of your report. Some data might be missing. You can try refreshing or starting over.</p>
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
          <ExecutiveSummarySection initialRawContent={dataSource?.type === 'file' ? fileRawContent : null} />
          <ActivityAnalysisSection initialRawContent={dataSource?.type === 'file' ? fileRawContent : null} />
          <TwitterActivityChart /> 
          
          <TopicAnalysisSection initialRawContent={dataSource?.type === 'file' ? fileRawContent : null} />
          <EngagementAnalysisSection initialRawContent={dataSource?.type === 'file' ? fileRawContent : null} />
          
          {!isPaidUser && dataSource?.type === 'file' && ( // Show upgrade prompt only for file uploads if not paid
            <div className="upgrade-section" id="upgrade-prompt-section">
              <UpgradePrompt />
            </div>
          )}
          
          <MediaAnalysisSection initialRawContent={dataSource?.type === 'file' ? fileRawContent : null} />
          <MonthlyAnalysisSection initialRawContent={dataSource?.type === 'file' ? fileRawContent : null} />
          <ContentRecommendationsSection initialRawContent={dataSource?.type === 'file' ? fileRawContent : null} />
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