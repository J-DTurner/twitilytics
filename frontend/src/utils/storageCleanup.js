/**
 * Storage cleanup utility
 * 
 * This utility helps clean up old localStorage data that may be taking up
 * excessive space and provides migration helpers.
 */

/**
 * Get the size of localStorage in bytes
 * @returns {number} Size in bytes
 */
export function getLocalStorageSize() {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total;
}

/**
 * Get the size of localStorage in a human-readable format
 * @returns {string} Size in human-readable format
 */
export function getLocalStorageSizeFormatted() {
  const bytes = getLocalStorageSize();
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if localStorage has large tweet data that should be cleaned up
 * @returns {boolean} True if large data is found
 */
export function hasLargeTweetData() {
  const rawContent = localStorage.getItem('rawTweetsJsContent');
  const processedData = localStorage.getItem('currentProcessedData');
  
  // Check if either raw content or processed data is large (>1MB)
  const rawSize = rawContent ? rawContent.length : 0;
  const processedSize = processedData ? processedData.length : 0;
  const totalSize = rawSize + processedSize;
  
  return totalSize > 1024 * 1024; // 1MB threshold
}

/**
 * Clean up old tweet data from localStorage
 * @param {boolean} force - Force cleanup without confirmation
 * @returns {boolean} True if cleanup was performed
 */
export function cleanupOldTweetData(force = false) {
  const rawContent = localStorage.getItem('rawTweetsJsContent');
  const processedData = localStorage.getItem('currentProcessedData');
  
  if (!rawContent && !processedData) return false;
  
  const rawSize = rawContent ? rawContent.length : 0;
  const processedSize = processedData ? processedData.length : 0;
  const totalSize = rawSize + processedSize;
  const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  
  if (!force) {
    const confirmed = window.confirm(
      `Your browser is storing ${sizeMB}MB of tweet data locally. ` +
      `This has been moved to server-side processing for better performance. ` +
      `Would you like to clear this old data to free up space?`
    );
    
    if (!confirmed) return false;
  }
  
  // Remove old storage items
  if (rawContent) {
    localStorage.removeItem('rawTweetsJsContent');
  }
  if (processedData) {
    localStorage.removeItem('currentProcessedData');
  }
  
  console.log(`[StorageCleanup] Removed ${sizeMB}MB of old tweet data from localStorage`);
  return true;
}

/**
 * Perform automatic cleanup on app startup
 */
export function performStartupCleanup() {
  // Only cleanup if we have large data
  if (hasLargeTweetData()) {
    const sizeBefore = getLocalStorageSize();
    cleanupOldTweetData(true); // Force cleanup
    const sizeAfter = getLocalStorageSize();
    
    const savedBytes = sizeBefore - sizeAfter;
    const savedMB = (savedBytes / (1024 * 1024)).toFixed(2);
    
    if (savedMB > 1) {
      console.log(`[StorageCleanup] Automatically cleaned up ${savedMB}MB of old data`);
      
      // Show a non-intrusive notification
      setTimeout(() => {
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10000;
          font-size: 14px;
          max-width: 300px;
        `;
        notification.innerHTML = `
          <strong>Storage Optimized!</strong><br>
          Freed up ${savedMB}MB of space by moving to server-side processing.
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.remove();
        }, 5000);
      }, 1000);
    }
  }
}

/**
 * Get storage usage report
 * @returns {Object} Storage usage information
 */
export function getStorageReport() {
  const total = getLocalStorageSize();
  const rawContent = localStorage.getItem('rawTweetsJsContent');
  const processedData = localStorage.getItem('currentProcessedData');
  const metadata = localStorage.getItem('currentProcessedDataMetadata');
  
  return {
    totalSize: total,
    totalSizeFormatted: getLocalStorageSizeFormatted(),
    rawContentSize: rawContent ? rawContent.length : 0,
    processedDataSize: processedData ? processedData.length : 0,
    metadataSize: metadata ? metadata.length : 0,
    hasLargeData: hasLargeTweetData(),
    hasOldData: !!(rawContent || processedData),
    items: Object.keys(localStorage).map(key => ({
      key,
      size: localStorage[key].length,
      sizeFormatted: localStorage[key].length > 1024 
        ? `${(localStorage[key].length / 1024).toFixed(1)}KB` 
        : `${localStorage[key].length}B`
    })).sort((a, b) => b.size - a.size)
  };
} 