import React, { useState, useEffect } from 'react';
import { 
  getStorageReport, 
  cleanupOldTweetData, 
  getLocalStorageSizeFormatted 
} from '../../utils/storageCleanup';

/**
 * Storage Dashboard Component
 * 
 * Admin component for monitoring and managing storage usage.
 * Shows localStorage statistics and allows manual cleanup.
 */
const StorageDashboard = () => {
  const [storageReport, setStorageReport] = useState(null);
  const [serverStats, setServerStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch storage data
  const fetchStorageData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get client-side storage report
      const clientReport = getStorageReport();
      setStorageReport(clientReport);
      
      // Get server-side session stats
      try {
        const response = await fetch('/api/analyze/session/stats');
        if (response.ok) {
          const data = await response.json();
          setServerStats(data.stats);
        }
      } catch (serverError) {
        console.warn('Could not fetch server stats:', serverError);
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchStorageData();
  }, []);

  // Handle manual cleanup
  const handleCleanup = () => {
    const cleaned = cleanupOldTweetData(false); // Show confirmation
    if (cleaned) {
      fetchStorageData(); // Refresh data
    }
  };

  // Handle force cleanup
  const handleForceCleanup = () => {
    const confirmed = window.confirm(
      'This will remove ALL old tweet data from localStorage. Are you sure?'
    );
    
    if (confirmed) {
      cleanupOldTweetData(true); // Force cleanup
      fetchStorageData(); // Refresh data
    }
  };

  if (isLoading) {
    return (
      <div className="storage-dashboard loading">
        <h3>Loading Storage Dashboard...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="storage-dashboard error">
        <h3>Storage Dashboard Error</h3>
        <p>{error}</p>
        <button onClick={fetchStorageData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="storage-dashboard">
      <h3>Storage Dashboard</h3>
      
      {/* Client-side Storage */}
      <div className="storage-section">
        <h4>Client-side Storage (localStorage)</h4>
        <div className="storage-stats">
          <div className="stat-item">
            <span className="stat-label">Total Size:</span>
            <span className="stat-value">{storageReport.totalSizeFormatted}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Has Large Data:</span>
            <span className={`stat-value ${storageReport.hasLargeData ? 'warning' : 'good'}`}>
              {storageReport.hasLargeData ? 'Yes' : 'No'}
            </span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Items Count:</span>
            <span className="stat-value">{storageReport.items.length}</span>
          </div>
        </div>
        
        {/* Storage Items */}
        <div className="storage-items">
          <h5>Storage Items:</h5>
          <div className="items-list">
            {storageReport.items.map((item, index) => (
              <div key={index} className="storage-item">
                <span className="item-key">{item.key}</span>
                <span className="item-size">{item.sizeFormatted}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Cleanup Actions */}
        <div className="cleanup-actions">
          <button 
            onClick={handleCleanup}
            className="cleanup-btn"
            disabled={!storageReport.hasLargeData}
          >
            Clean Up Old Data
          </button>
          
          <button 
            onClick={handleForceCleanup}
            className="cleanup-btn force"
          >
            Force Clean All
          </button>
          
          <button 
            onClick={fetchStorageData}
            className="refresh-btn"
          >
            Refresh
          </button>
        </div>
      </div>
      
      {/* Server-side Storage */}
      {serverStats && (
        <div className="storage-section">
          <h4>Server-side Storage (Sessions)</h4>
          <div className="storage-stats">
            <div className="stat-item">
              <span className="stat-label">Active Sessions:</span>
              <span className="stat-value">{serverStats.totalSessions}</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Memory Usage:</span>
              <span className="stat-value">{serverStats.totalMemoryUsage.totalMB} MB</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Average Age:</span>
              <span className="stat-value">{serverStats.averageAge} minutes</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Paid Users:</span>
              <span className="stat-value">{serverStats.paidUserSessions}</span>
            </div>
          </div>
          
          {/* Memory Breakdown */}
          <div className="memory-breakdown">
            <h5>Memory Breakdown:</h5>
            <div className="breakdown-item">
              <span>Raw Content: {serverStats.totalMemoryUsage.rawContentMB} MB</span>
            </div>
            <div className="breakdown-item">
              <span>Processed Data: {serverStats.totalMemoryUsage.processedDataMB} MB</span>
            </div>
          </div>
          
          {/* Sessions by Timeframe */}
          {Object.keys(serverStats.sessionsByTimeframe).length > 0 && (
            <div className="timeframe-breakdown">
              <h5>Sessions by Timeframe:</h5>
              {Object.entries(serverStats.sessionsByTimeframe).map(([timeframe, count]) => (
                <div key={timeframe} className="breakdown-item">
                  <span>{timeframe}: {count} sessions</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <style jsx>{`
        .storage-dashboard {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .storage-section {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          border: 1px solid #e9ecef;
        }
        
        .storage-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .stat-item {
          display: flex;
          justify-content: space-between;
          padding: 10px;
          background: white;
          border-radius: 4px;
          border: 1px solid #dee2e6;
        }
        
        .stat-label {
          font-weight: 500;
          color: #495057;
        }
        
        .stat-value {
          font-weight: 600;
        }
        
        .stat-value.warning {
          color: #dc3545;
        }
        
        .stat-value.good {
          color: #28a745;
        }
        
        .storage-items {
          margin-bottom: 20px;
        }
        
        .items-list {
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          background: white;
        }
        
        .storage-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 12px;
          border-bottom: 1px solid #f1f3f4;
        }
        
        .storage-item:last-child {
          border-bottom: none;
        }
        
        .item-key {
          font-family: monospace;
          color: #495057;
        }
        
        .item-size {
          font-weight: 500;
          color: #6c757d;
        }
        
        .cleanup-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .cleanup-btn, .refresh-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }
        
        .cleanup-btn {
          background: #007bff;
          color: white;
        }
        
        .cleanup-btn:hover:not(:disabled) {
          background: #0056b3;
        }
        
        .cleanup-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
        
        .cleanup-btn.force {
          background: #dc3545;
        }
        
        .cleanup-btn.force:hover {
          background: #c82333;
        }
        
        .refresh-btn {
          background: #28a745;
          color: white;
        }
        
        .refresh-btn:hover {
          background: #218838;
        }
        
        .memory-breakdown, .timeframe-breakdown {
          margin-top: 15px;
        }
        
        .breakdown-item {
          padding: 5px 0;
          color: #495057;
        }
        
        .loading, .error {
          text-align: center;
          padding: 40px;
        }
        
        .error {
          color: #dc3545;
        }
        
        h3, h4, h5 {
          margin-top: 0;
          color: #212529;
        }
      `}</style>
    </div>
  );
};

export default StorageDashboard; 