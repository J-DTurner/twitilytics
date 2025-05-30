import React, { useEffect, useState } from 'react';
import { useTweetData } from '../../context/TweetDataContext';
import { getImageAnalysis as fetchImageAnalysis } from '../../services/analysisService';

/**
 * Image Analysis Section Component
 * 
 * This component displays AI-powered analysis of the user's most engaging
 * images from their tweets, providing insights about what visual content
 * performs best.
 * It's a premium feature that requires a paid account.
 */
const ImageAnalysisSection = () => {
  const { processedData, isPaidUser } = useTweetData();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisHtml, setAnalysisHtml] = useState('');
  const [currentImage, setCurrentImage] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  
  useEffect(() => {
    const images = processedData?.topImages || [];
    if (!images.length) return;
    const img = images[0];
    setCurrentImage(img);
    setLoading(true); setError(null); setIsLocked(false);
    fetchImageAnalysis(img.url, img.text, isPaidUser)
      .then(res => {
        if (res.requiresUpgrade) { setIsLocked(true); setAnalysisHtml(res.analysis); }
        else setAnalysisHtml(res.analysis);
      })
      .catch(e => setError(e.message || 'Failed to analyze image'))
      .finally(() => setLoading(false));
  }, [processedData, isPaidUser]);
  
  const handleImageSelect = (image) => {
    if (!isPaidUser) return;
    setCurrentImage(image); setLoading(true); setError(null); setIsLocked(false);
    fetchImageAnalysis(image.url, image.text, isPaidUser)
      .then(res => {
        if (res.requiresUpgrade) { setIsLocked(true); setAnalysisHtml(res.analysis); }
        else setAnalysisHtml(res.analysis);
      })
      .catch(e => setError(e.message || 'Failed to analyze image'))
      .finally(() => setLoading(false));
  };
  
  const handleRetry = () => {
    if (!isPaidUser || !currentImage) return;
    setLoading(true); setError(null); setIsLocked(false);
    fetchImageAnalysis(currentImage.url, currentImage.text, isPaidUser)
      .then(res => {
        if (res.requiresUpgrade) { setIsLocked(true); setAnalysisHtml(res.analysis); }
        else setAnalysisHtml(res.analysis);
      })
      .catch(e => setError(e.message || 'Failed to analyze image'))
      .finally(() => setLoading(false));
  };
  
  if (!processedData) return null;
  
  const images = processedData.topImages || [];
  if (!images.length) return <section className="report-section image-analysis"><p>No images found to analyze.</p></section>;
  
  return (
    <section className="report-section image-analysis">
      {loading ? <p>Analyzing your image with AI...</p> :
        error ? <div><p>{error}</p><button onClick={handleRetry}>Retry</button></div> :
        isLocked ? <div className="locked-container"><p>This analysis is locked. Upgrade to access more insights.</p></div> : (
          currentImage && (
            <>
              <img src={currentImage.url} alt="" />
              <div dangerouslySetInnerHTML={{ __html: analysisHtml }} />
            </>
          )
        )}
      {images.length > 1 && (
        <div className="image-selector">
          {images.map((img, i) => (
            <img key={i} src={img.url} className={img===currentImage?'active':''} onClick={()=>handleImageSelect(img)} alt="" />
          ))}
        </div>
      )}
    </section>
  );
};

export default ImageAnalysisSection;