/**
 * Payment Service
 * 
 * This service handles communication with the backend payment API endpoints.
 */

/**
 * Create a Polar checkout session via backend
 * @param {Object} data - Checkout data
 * @param {string} data.email - User's email (optional)
 * @param {Object} data.metadata - Additional metadata
 * @returns {Promise<Object>} The checkout session details (sessionId, url)
 */
export const createCheckoutSession = async (data) => {
  try {
    const response = await fetch('/api/payment/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      let errorMessage = `Failed to create checkout session (Status: ${response.status})`; // Default message
      try {
        const errorData = await response.json();
        // Check for express-validator format first
        if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          errorMessage = errorData.errors.map(err => err.msg || 'Validation error').join('; ');
        } 
        // Then check for a single message from our backend (which might be a formatted Polar error)
        else if (errorData.message && typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        } 
        // Fallback for other Polar error structures if backend didn't format it (less likely now)
        else if (errorData.detail && typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (errorData.detail && Array.isArray(errorData.detail) && errorData.detail.length > 0) {
           errorMessage = errorData.detail.map(err => (err.msg || JSON.stringify(err))).join('; ');
        } else {
           // If parsing JSON works but no clear message field, try to stringify
           errorMessage = JSON.stringify(errorData);
        }
      } catch (parseError) {
        // If response is not JSON, try to get raw text
        try {
            const errorText = await response.text();
            if (errorText && errorText.length < 200) { // Avoid huge HTML error pages
                 errorMessage = errorText;
            }
        } catch (textParseError) {
            // Keep the default HTTP status error message
        }
      }
      throw new Error(errorMessage);
    }
    
    return await response.json(); // Expected: { status: 'success', sessionId: 'polar_session_id', url: 'polar_checkout_url' }
  } catch (error) {
    console.error('Create Premium Analysis Checkout error:', error);
    throw error;
  }
};

/**
 * Create a Polar checkout session for scraping via backend
 * @param {Object} data - Scrape checkout data
 * @param {string} data.email - User's email (optional)
 * @param {string} data.twitterHandle - Twitter handle to scrape
 * @param {number} data.numBlocks - This will now select a predefined package or be fixed.
 *                                  The backend /create-scrape-checkout no longer uses this for dynamic quantity.
 *                                  The frontend might send it for metadata or to help backend select a package.
 *                                  For this change, we assume backend defines the package.
 * @returns {Promise<Object>} The checkout session details (sessionId, url)
 */
export const createScrapeCheckoutSession = async (data) => {
  try {
    // Frontend might still send numBlocks for metadata or if backend logic is adapted to pick different packages.
    // The backend route `create-scrape-checkout` was simplified to use one fixed package.
    // If `numBlocks` is still sent, it will be part of `data.metadata` if backend puts it there.
    const response = await fetch('/api/payment/create-scrape-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data) // Sending { email, twitterHandle, (optionally numBlocks for metadata) }
    });
    
    if (!response.ok) {
      let errorMessage = `Failed to create checkout session (Status: ${response.status})`; // Default message
      try {
        const errorData = await response.json();
        // Check for express-validator format first
        if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          errorMessage = errorData.errors.map(err => err.msg || 'Validation error').join('; ');
        } 
        // Then check for a single message from our backend (which might be a formatted Polar error)
        else if (errorData.message && typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        } 
        // Fallback for other Polar error structures if backend didn't format it (less likely now)
        else if (errorData.detail && typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (errorData.detail && Array.isArray(errorData.detail) && errorData.detail.length > 0) {
           errorMessage = errorData.detail.map(err => (err.msg || JSON.stringify(err))).join('; ');
        } else {
           // If parsing JSON works but no clear message field, try to stringify
           errorMessage = JSON.stringify(errorData);
        }
      } catch (parseError) {
        // If response is not JSON, try to get raw text
        try {
            const errorText = await response.text();
            if (errorText && errorText.length < 200) { // Avoid huge HTML error pages
                 errorMessage = errorText;
            }
        } catch (textParseError) {
            // Keep the default HTTP status error message
        }
      }
      throw new Error(errorMessage);
    }
    
    return await response.json(); // Expected: { status: 'success', sessionId: 'polar_session_id', url: 'polar_checkout_url' }
  } catch (error) {
    console.error('Create Scrape Checkout error:', error);
    throw error;
  }
};

/**
 * Verify a payment status (Polar session via backend)
 * @param {string} sessionId - The Polar checkout session ID
 * @returns {Promise<Object>} The payment status details
 */
export const verifyPaymentStatus = async (sessionId) => {
  try {
    const response = await fetch(`/api/payment/status/${sessionId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to verify payment status');
    }
    
    // Expected from backend: { status: 'success', paid: boolean, paymentStatus: string, customer?: {email}, metadata?: {} }
    return await response.json(); 
  } catch (error) {
    console.error('Payment verification error:', error);
    throw error;
  }
};

/**
 * Validate a payment status (was validate-subscription)
 * @param {Object} data - Validation data
 * @param {string} data.sessionId - Session ID is now primary
 * @returns {Promise<Object>} The payment validation status
 */
export const validatePayment = async (data) => { // Renamed from validateSubscription
  try {
    // The backend route /api/payment/validate-payment now primarily uses sessionId.
    // userId might be part of a more complex setup not covered here.
    const response = await fetch('/api/payment/validate-payment', { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data) // Sending { sessionId }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to validate payment');
    }
    
    // Expected: { status: 'success', isPaid: boolean, validatedVia: 'session' | null }
    return await response.json(); 
  } catch (error) {
    console.error('Payment validation error:', error);
    throw error;
  }
};