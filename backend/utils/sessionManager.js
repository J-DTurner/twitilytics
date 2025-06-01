/**
 * Session Manager Utility
 * 
 * Handles server-side session storage, cleanup, and management for tweet data.
 * In production, this should be replaced with Redis or a proper database.
 */

const logger = require('./logger');

class SessionManager {
  constructor() {
    // Initialize global session storage if it doesn't exist
    if (!global.tweetSessions) {
      global.tweetSessions = new Map();
    }
    if (!global.paymentConfirmations) { // Add a new map for payment confirmations
      global.paymentConfirmations = new Map();
    }
    
    // Start cleanup interval (every hour)
    this.startCleanupInterval();
  }

  /**
   * Store session data
   * @param {string} sessionId - Unique session identifier
   * @param {Object} data - Session data to store
   * @param {string} data.rawContent - Raw tweet file content
   * @param {Object} data.processedData - Processed tweet data
   * @param {string} data.timeframe - Selected timeframe
   * @param {boolean} data.isPaidUser - Whether user is paid
   * @param {string} data.fileName - Original file name
   */
  storeSession(sessionId, data) {
    const sessionData = {
      ...data,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0
    };
    
    global.tweetSessions.set(sessionId, sessionData);
    
    logger.info('Session stored', { 
      sessionId, 
      fileName: data.fileName,
      tweetCount: data.processedData?.allTweets?.length || 0,
      timeframe: data.timeframe,
      isPaidUser: data.isPaidUser
    });
    
    // Trigger cleanup after storing new session
    this.cleanupExpiredSessions();
  }

  /**
   * Retrieve session data
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Session data or null if not found
   */
  getSession(sessionId) {
    const session = global.tweetSessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    // Update last accessed time and increment access count
    session.lastAccessed = new Date();
    session.accessCount = (session.accessCount || 0) + 1;
    
    return session;
  }

  /**
   * Check if session exists
   * @param {string} sessionId - Session identifier
   * @returns {boolean} Whether session exists
   */
  hasSession(sessionId) {
    return global.tweetSessions.has(sessionId);
  }

  /**
   * Delete a specific session
   * @param {string} sessionId - Session identifier
   * @returns {boolean} Whether session was deleted
   */
  deleteSession(sessionId) {
    const deleted = global.tweetSessions.delete(sessionId);
    
    if (deleted) {
      logger.info('Session deleted', { sessionId });
    }
    
    return deleted;
  }

  /**
   * Clean up expired sessions
   * @param {number} maxAgeHours - Maximum age in hours (default: 24)
   */
  cleanupExpiredSessions(maxAgeHours = 24) {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [sessionId, session] of global.tweetSessions.entries()) {
      if (session.createdAt < cutoffTime) {
        global.tweetSessions.delete(sessionId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info('Cleaned up expired sessions', { 
        cleanedCount, 
        remainingSessions: global.tweetSessions.size,
        maxAgeHours
      });
    }
    
    return cleanedCount;
  }

  /**
   * Clean up sessions that haven't been accessed recently
   * @param {number} maxIdleHours - Maximum idle time in hours (default: 6)
   */
  cleanupIdleSessions(maxIdleHours = 6) {
    const cutoffTime = new Date(Date.now() - maxIdleHours * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [sessionId, session] of global.tweetSessions.entries()) {
      const lastAccessed = session.lastAccessed || session.createdAt;
      if (lastAccessed < cutoffTime) {
        global.tweetSessions.delete(sessionId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info('Cleaned up idle sessions', { 
        cleanedCount, 
        remainingSessions: global.tweetSessions.size,
        maxIdleHours
      });
    }
    
    return cleanedCount;
  }

  /**
   * Get session statistics
   * @returns {Object} Session statistics
   */
  getStats() {
    const sessions = Array.from(global.tweetSessions.values());
    const now = new Date();
    
    const stats = {
      totalSessions: sessions.length,
      totalMemoryUsage: this.calculateMemoryUsage(),
      averageAge: 0,
      oldestSession: null,
      newestSession: null,
      mostAccessed: null,
      sessionsByTimeframe: {},
      paidUserSessions: 0
    };
    
    if (sessions.length === 0) {
      return stats;
    }
    
    let totalAge = 0;
    let oldestTime = now;
    let newestTime = new Date(0);
    let maxAccess = 0;
    
    sessions.forEach(session => {
      const age = now - session.createdAt;
      totalAge += age;
      
      if (session.createdAt < oldestTime) {
        oldestTime = session.createdAt;
        stats.oldestSession = session.createdAt;
      }
      
      if (session.createdAt > newestTime) {
        newestTime = session.createdAt;
        stats.newestSession = session.createdAt;
      }
      
      if (session.accessCount > maxAccess) {
        maxAccess = session.accessCount;
        stats.mostAccessed = session.accessCount;
      }
      
      // Count by timeframe
      const tf = session.timeframe || 'unknown';
      stats.sessionsByTimeframe[tf] = (stats.sessionsByTimeframe[tf] || 0) + 1;
      
      // Count paid users
      if (session.isPaidUser) {
        stats.paidUserSessions++;
      }
    });
    
    stats.averageAge = Math.round(totalAge / sessions.length / (1000 * 60)); // in minutes
    
    return stats;
  }

  /**
   * Confirm payment for a session ID (called by webhook handler)
   * @param {string} internalSessionId - Our dataSessionId or scrapeJobId
   * @param {string} polarCheckoutId - Polar's checkout ID
   * @param {object} paymentDetails - Details about the payment
   */
  confirmPayment(internalSessionId, polarCheckoutId, paymentDetails) {
    const confirmation = {
      polarCheckoutId,
      paidAt: new Date(),
      details: paymentDetails,
      status: 'paid'
    };
    global.paymentConfirmations.set(internalSessionId, confirmation);
    logger.info('Payment confirmed and stored for internal session ID', { 
      internalSessionId, 
      polarCheckoutId 
    });

    // Optionally, try to update the original tweetSession if it exists
    // This is good for linking but the paymentConfirmations map is the primary check
    if (global.tweetSessions.has(internalSessionId)) {
      const tweetSession = global.tweetSessions.get(internalSessionId);
      if (tweetSession) {
        tweetSession.isPaidUser = true; // Mark as paid
        tweetSession.paymentConfirmed = true;
        tweetSession.polarCheckoutId = polarCheckoutId;
        global.tweetSessions.set(internalSessionId, tweetSession);
        logger.info('Updated existing tweetSession with payment confirmation', { internalSessionId });
      }
    }
  }

  /**
   * Check if payment has been confirmed for an internal session ID
   * @param {string} internalSessionId - Our dataSessionId or scrapeJobId
   * @returns {Object|null} Confirmation details or null
   */
  getPaymentConfirmation(internalSessionId) {
    const confirmation = global.paymentConfirmations.get(internalSessionId);
    if (confirmation) {
      logger.info('Payment confirmation found for internal session ID', { internalSessionId });
      return confirmation;
    }
    logger.warn('No payment confirmation found for internal session ID', { internalSessionId });
    return null;
  }

  /**
   * Clean up expired payment confirmations
   * @param {number} maxAgeHours - Maximum age in hours (default: 24)
   */
  cleanupExpiredPaymentConfirmations(maxAgeHours = 24) {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [internalSessionId, confirmation] of global.paymentConfirmations.entries()) {
      if (confirmation.paidAt < cutoffTime) {
        global.paymentConfirmations.delete(internalSessionId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info('Cleaned up expired payment confirmations', { 
        cleanedCount, 
        remainingConfirmations: global.paymentConfirmations.size,
        maxAgeHours
      });
    }
    return cleanedCount;
  }

  /**
   * Calculate approximate memory usage of all sessions
   * @returns {Object} Memory usage information
   */
  calculateMemoryUsage() {
    let totalBytes = 0;
    let rawContentBytes = 0;
    let processedDataBytes = 0;
    
    for (const session of global.tweetSessions.values()) {
      if (session.rawContent) {
        const rawSize = Buffer.byteLength(session.rawContent, 'utf8');
        rawContentBytes += rawSize;
        totalBytes += rawSize;
      }
      
      if (session.processedData) {
        const processedSize = Buffer.byteLength(JSON.stringify(session.processedData), 'utf8');
        processedDataBytes += processedSize;
        totalBytes += processedSize;
      }
    }
    
    return {
      totalBytes,
      totalMB: Math.round(totalBytes / (1024 * 1024) * 100) / 100,
      rawContentBytes,
      rawContentMB: Math.round(rawContentBytes / (1024 * 1024) * 100) / 100,
      processedDataBytes,
      processedDataMB: Math.round(processedDataBytes / (1024 * 1024) * 100) / 100
    };
  }

  /**
   * Start automatic cleanup interval
   */
  startCleanupInterval() {
    // Clean up every hour
    setInterval(() => {
      this.cleanupExpiredSessions(24); // Remove sessions older than 24 hours
      this.cleanupIdleSessions(6);     // Remove sessions idle for more than 6 hours
      this.cleanupExpiredPaymentConfirmations(24); // Add this line
      
      // Log stats periodically
      const stats = this.getStats();
      if (stats.totalSessions > 0 || global.paymentConfirmations.size > 0) {
        logger.info('Session manager stats', {
            ...stats,
            totalPaymentConfirmations: global.paymentConfirmations.size
        });
      }
    }, 60 * 60 * 1000); // 1 hour
    
    logger.info('Session and Payment Confirmation cleanup interval started');
  }

  /**
   * Force cleanup of all sessions (for maintenance)
   */
  clearAllSessions() {
    const count = global.tweetSessions.size;
    global.tweetSessions.clear();
    
    logger.info('All sessions cleared', { clearedCount: count });
    
    return count;
  }

  /**
   * Generate a unique session ID
   * @returns {string} Unique session identifier
   */
  static generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
module.exports = new SessionManager(); 