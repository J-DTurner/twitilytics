const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { resolvePolarEnv } = require('../utils/polar/resolvePolarEnv');
const { getPolarClient } = require('../utils/polar/clientCache');
const { PolarError, PolarAPIError } = require('../utils/polar/errors');
const { Webhooks } = require('@polar-sh/express'); // Polar's official webhook middleware
const { makePolarConfig } = require('../utils/polar/polarConfig');
const sessionManager = require('../utils/sessionManager'); // Add this import


/**
 * Data validation middleware for checkout session
 */
const validateCheckout = [
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('If provided, email must be a valid email address'),
  body('metadata').optional({ checkFalsy: true }).isObject().withMessage('If provided, metadata must be an object'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        status: 'error', 
        errors: errors.array() 
      });
    }
    next();
  }
];

/**
 * @route POST /api/payment/create-checkout
 * @desc Create a Polar checkout session for Premium Analysis
 */
router.post('/create-checkout', validateCheckout, async (req, res) => {
  try {
    const { email, metadata = {} } = req.body;
    // Frontend should send its internal dataSessionId (from file upload) as customer_external_id for linking
    const customerExternalIdFromRequest = req.body.customer_external_id; // This IS the dataSessionId for file uploads
    const polarEnv = resolvePolarEnv(req);
    const polarClient = getPolarClient(polarEnv);
    const priceId = polarClient.config.priceIds.premiumAnalysis;

    logger.info('Creating Polar checkout session for Premium Analysis (File Upload)', { 
        email: email || 'anonymous', 
        polarEnv, 
        priceId,
        dataSessionId: customerExternalIdFromRequest 
    });

    if (!priceId) {
      logger.error('Premium Analysis Price ID not configured for env:', polarEnv);
      return res.status(500).json({ status: 'error', message: 'Payment service is not configured correctly (premium).' });
    }
    if (!customerExternalIdFromRequest) {
        logger.error('dataSessionId (as customer_external_id) is required for file upload checkout.');
        return res.status(400).json({ status: 'error', message: 'Analysis session identifier is missing.' });
    }

    const frontendBaseUrl = process.env.FRONTEND_URL;
    if (!frontendBaseUrl) {
      logger.error('CRITICAL: FRONTEND_URL environment variable is not set!');
      return res.status(500).json({ 
        status: 'error', 
        message: 'Payment service is misconfigured (URL). Please contact support.' 
      });
    }

    // For file uploads, pass dataSessionId in success_url to help frontend link if needed, though metadata is primary
    const successUrl = `${frontendBaseUrl}/payment/verify?session_id={CHECKOUT_SESSION_ID}&source=polar&type=file&data_session_id=${customerExternalIdFromRequest}`;
    const cancelUrl = `${frontendBaseUrl}/?payment_cancelled=true`;
    
    const polarCheckoutParams = {
      product_price_id: priceId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: (email && email.trim() !== '') ? email.trim() : undefined,
      customer_external_id: customerExternalIdFromRequest, // Our dataSessionId
      allow_discount_codes: true,
      metadata: {
        dataSessionId: customerExternalIdFromRequest, // Explicitly in metadata
        serviceType: 'premium_analysis_file_upload',
        ...(metadata.tweetCount && { tweetCount: metadata.tweetCount.toString() }),
        ...(metadata.timeframe && { timeframe: metadata.timeframe }),
        timestamp: new Date().toISOString(),
      }
    };

    logger.debug('Polar file checkout params:', polarCheckoutParams);
    const session = await polarClient.checkouts.create(polarCheckoutParams);

    logger.info('Polar file checkout session created', { 
      checkoutSessionId: session.id, // This is Polar's checkout session ID
      customerExternalId: polarCheckoutParams.customer_external_id 
    });

    res.json({
      status: 'success',
      sessionId: session.id, // Polar's checkout session ID
      url: session.url
    });
  } catch (error) {
    logger.error('Error creating Polar file checkout session:', { message: error.message, data: error.data, stack: error.stack });
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.data?.detail || error.message || 'Failed to create checkout session',
      error: process.env.NODE_ENV === 'development' ? { message: error.message, data: error.data } : undefined
    });
  }
});


const polarWebhookHandler = (polarEnv) => async (event, res) => {
  // The Webhooks middleware from @polar-sh/express handles signature verification
  // and parsing req.body to event.
  
  // ADD THIS LOG: Log the entire event object
  logger.info(`[Polar Webhook - ${polarEnv}] Received full event payload`, { 
    eventId: event.id, 
    eventType: event.type,
    fullEvent: JSON.parse(JSON.stringify(event)) // Deep clone to ensure full object is logged
  });
  // END OF ADDED LOG

  // Handle the event based on its type
  switch (event.type) {
    case 'order.paid': {
      const order = event.data;
      // Add checkout_id to log if available directly on order, or from order.checkout
      const checkoutId = order.checkout_id || order.checkout?.id;

      logger.info(`[Polar Webhook - ${polarEnv}] Order paid successfully.`, {
        orderId: order.id,
        checkoutId: checkoutId, // Log this
        polarCustomerId: order.customer_id, 
        customerEmail: order.customer?.email || order.checkout?.customer_email,
        // analysisSessionId is our internal ID for file uploads (customer_external_id)
        analysisSessionId: order.metadata?.dataSessionId || order.customer_external_id,
        // scrapeJobIdentifier is our internal ID for scrapes (customer_external_id)
        scrapeJobIdentifier: order.metadata?.scrapeJobId || order.customer_external_id,
        totalAmount: order.total_amount,
        currency: order.currency,
        paidAt: order.paid_at || new Date().toISOString(), 
        metadataFromOrder: order.metadata, 
        items: order.items?.map(item => ({ 
            product_id: item.product_id, 
            product_price_id: item.product_price_id, 
            label: item.label, 
            amount: item.amount 
        }))
      });

      const analysisSessionIdFromMeta = order.metadata?.dataSessionId;
      const scrapeJobIdentifierFromMeta = order.metadata?.scrapeJobId;
      // Polar's `customer_external_id` in the order payload is what we set during checkout creation.
      // This field is crucial for linking.
      const customerExternalId = order.customer_external_id; 
      let identifiedInternalId = null;
      let serviceType = order.metadata?.serviceType;

      // Prioritize specific metadata keys
      if (serviceType === 'scrape_analysis' && scrapeJobIdentifierFromMeta) {
          identifiedInternalId = scrapeJobIdentifierFromMeta;
          logger.info(`[Polar Webhook - ${polarEnv}] Identified via scrapeJobId in metadata: ${identifiedInternalId}`);
      } else if (serviceType === 'premium_analysis_file_upload' && analysisSessionIdFromMeta) {
          identifiedInternalId = analysisSessionIdFromMeta;
          logger.info(`[Polar Webhook - ${polarEnv}] Identified via dataSessionId in metadata: ${identifiedInternalId}`);
      } else if (customerExternalId) {
          // Fallback to customer_external_id if specific metadata keys are missing OR serviceType is ambiguous
          // This assumes customer_external_id was correctly set to either our dataSessionId or scrapeJobId
          identifiedInternalId = customerExternalId;
          logger.info(`[Polar Webhook - ${polarEnv}] Identified via customer_external_id: ${identifiedInternalId}. ServiceType from meta: ${serviceType}`);
          if (!serviceType) {
            // Attempt to infer serviceType if missing (e.g. if customer_external_id starts with 'scrape_')
            serviceType = identifiedInternalId.startsWith('scrape_') ? 'scrape_analysis' : 'premium_analysis_file_upload';
            logger.info(`[Polar Webhook - ${polarEnv}] Inferred serviceType based on customer_external_id format: ${serviceType}`);
          }
      }


      if (identifiedInternalId) {
        logger.info(`[Polar Webhook - ${polarEnv}] Payment confirmed for internal ID: ${identifiedInternalId}. Polar Order ID: ${order.id}. Polar Checkout ID: ${checkoutId}.`);
        // Store confirmation
        sessionManager.confirmPayment(identifiedInternalId, checkoutId, {
          orderId: order.id,
          amount: order.total_amount,
          currency: order.currency,
          customerEmail: order.customer?.email || order.checkout?.customer_email,
          serviceType: serviceType, // Store identified or inferred service type
          metadata: order.metadata // Store full metadata
        });
      } else {
        logger.warn(`[Polar Webhook - ${polarEnv}] Order ${order.id} paid, but could not identify internal session/job ID from metadata or customer_external_id. Checkout ID: ${checkoutId}. Manual reconciliation might be needed.`, {
            metadata: order.metadata,
            customerExternalId: order.customer_external_id
        });
      }
      break;
    }
    
    case 'order.refunded': {
      const order = event.data;
      logger.info(`[Polar Webhook - ${polarEnv}] Order refunded`, { 
          orderId: order.id, 
          customerExternalId: order.customer_external_id,
          metadata: order.metadata // Log metadata for refunds too
      });
      // Handle refund logic, e.g., revoke premium access
      break;
    }
    default:
      logger.debug(`[Polar Webhook - ${polarEnv}] Unhandled event type: ${event.type}`, { eventId: event.id });
  }
  // Send a 200 response to acknowledge receipt of the event
  // The @polar-sh/express middleware handles sending the response.
  // If not using middleware, you would do: res.status(200).json({ received: true });
};

/**
 * @route POST /api/payment/webhook/polar
 * @desc Handle Polar webhook events for production
 */
router.post('/webhook/polar', 
  // express.raw({ type: 'application/json' }) is often needed for webhook signature verification
  // if the library doesn't handle it. @polar-sh/express should.
  Webhooks({ 
    webhookSecret: makePolarConfig('production').webhookSecret,
    onOrderPaid: polarWebhookHandler('production'),
    onOrderRefunded: polarWebhookHandler('production'), // Add other handlers as needed
    onPayload: (event) => { 
      // MODIFY THIS LOG: Log the entire event object for generic payloads
      logger.debug(`[Polar Webhook - production] Generic payload received`, { 
        eventType: event.type,
        eventId: event.id,
        fullEvent: JSON.parse(JSON.stringify(event)) // Deep clone
      });
      // END OF MODIFIED LOG
    }
  })
);

/**
 * @route POST /api/payment/webhook/polar-sbx
 * @desc Handle Polar webhook events for sandbox
 */
router.post('/webhook/polar-sbx',
  Webhooks({ 
    webhookSecret: makePolarConfig('sandbox').webhookSecret,
    onOrderPaid: polarWebhookHandler('sandbox'),
    onOrderRefunded: polarWebhookHandler('sandbox'),
    onPayload: (event) => {
      // MODIFY THIS LOG: Log the entire event object for generic payloads
      logger.debug(`[Polar Webhook - sandbox] Generic payload received`, { 
        eventType: event.type,
        eventId: event.id,
        fullEvent: JSON.parse(JSON.stringify(event)) // Deep clone
      });
      // END OF MODIFIED LOG
    }
  })
);

const validateScrapeCheckout = [
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required'),
  body('numBlocks').isInt({ min: 1, max: 100 }).withMessage('Number of blocks must be an integer between 1 and 100'),
  body('twitterHandle').isString().notEmpty().withMessage('Twitter handle is required'),
  // customer_external_id is now generated by backend for scrapes
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        status: 'error', 
        errors: errors.array() 
      });
    }
    next();
  }
];

router.post('/create-scrape-checkout', validateScrapeCheckout, async (req, res) => {
  try {
    const { email, twitterHandle, numBlocks } = req.body; 
    const polarEnv = resolvePolarEnv(req);
    const polarClient = getPolarClient(polarEnv);
    
    // Determine Price ID based on numBlocks
    const priceIdKey = `scrape_${numBlocks}blocks`;
    let priceId = polarClient.config.priceIds[priceIdKey];

    if (!priceId) {
      logger.error(`Polar Price ID for scraping ${numBlocks} blocks not configured for env: ${polarEnv}. Key: ${priceIdKey}`);
      return res.status(500).json({ status: 'error', message: `Scraping service for ${numBlocks*1000} tweets is unavailable (config error).` });
    }
    
    const uniqueScrapeJobId = `scrape_${twitterHandle}_${numBlocks}_${Date.now()}`;

    logger.info('Creating Polar scrape checkout session', { email, twitterHandle, numBlocks, polarEnv, priceId, scrapeJobId: uniqueScrapeJobId });

    const frontendBaseUrl = process.env.FRONTEND_URL;
    if (!frontendBaseUrl) {
      logger.error('CRITICAL: FRONTEND_URL environment variable is not set for scrape checkout!');
      return res.status(500).json({ 
        status: 'error', 
        message: 'Scraping service payment is misconfigured (URL). Please contact support.' 
      });
    }

    // Pass scrapeJobId and other details in success_url for frontend context if needed, though metadata is primary
    const successUrl = `${frontendBaseUrl}/payment/verify?session_id={CHECKOUT_SESSION_ID}&source=polar&type=scrape&handle=${encodeURIComponent(twitterHandle)}&blocks=${numBlocks}&customer_external_id=${uniqueScrapeJobId}`;
    const cancelUrl = `${frontendBaseUrl}/?payment_cancelled=true`;

    const polarCheckoutParams = {
      product_price_id: priceId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: (email && email.trim() !== '') ? email.trim() : undefined,
      customer_external_id: uniqueScrapeJobId, 
      allow_discount_codes: true,
      metadata: { 
        serviceType: 'scrape_analysis', 
        twitterHandle, 
        numBlocks: Number(numBlocks), // Ensure it's a number
        scrapeJobId: uniqueScrapeJobId, // Store our unique ID
        timestamp: new Date().toISOString() 
      }
    };
    
    logger.debug('Polar scrape checkout params:', polarCheckoutParams);
    const session = await polarClient.checkouts.create(polarCheckoutParams);
    
    logger.info('Polar scrape checkout session created', { 
        checkoutSessionId: session.id, // Polar's checkout session ID
        scrapeJobId: uniqueScrapeJobId 
    });
    res.json({ 
        status: 'success', 
        sessionId: session.id, // Polar's checkout session ID
        url: session.url 
    });

  } catch (error) {
    logger.error('Error creating Polar scrape checkout session:', { message: error.message, data: error.data, stack: error.stack });
    res.status(error.statusCode || 500).json({ 
        status: 'error', 
        message: error.data?.detail || error.message || 'Failed to create scrape checkout session' 
    });
  }
});


router.get('/status/:sessionId', async (req, res) => {
  try {
    const { sessionId: polarCheckoutSessionId } = req.params; // This is Polar's checkout session ID
    const polarEnv = resolvePolarEnv(req);
    const polarClient = getPolarClient(polarEnv);
    
    // ADD THIS LOG:
    logger.info(`[Polar Status Check] Received request for session ID: '${polarCheckoutSessionId}'`, { 
      rawParam: req.params.sessionId, // Log the raw parameter as well
      polarEnv 
    });
    // END OF ADDED LOG

    if (!polarCheckoutSessionId || polarCheckoutSessionId === '{CHECKOUT_SESSION_ID}') { 
      logger.warn('[Polar Status Check] Invalid Polar Session ID received', { 
          polarCheckoutSessionId,
          message: "Session ID was either missing or the literal placeholder string."
      });
      return res.status(400).json({ 
        status: 'error', 
        message: 'Valid Polar Session ID is required. Received placeholder or invalid ID.' 
      });
    }
    
    logger.info('Checking Polar payment status with Polar API', { polarCheckoutSessionId, polarEnv });
    
    const polarSession = await polarClient.checkouts.get(polarCheckoutSessionId);
    
    res.json({
      status: 'success',
      paid: polarSession.status === 'succeeded',
      paymentStatus: polarSession.status,
      customerEmail: polarSession.customer_email, // Polar provides customer_email directly
      metadata: polarSession.metadata // Return all metadata from Polar
    });
  } catch (error) {
    logger.error('Error checking Polar payment status:', { 
        polarCheckoutSessionIdAttempted: req.params.sessionId, // Log the ID that caused the error
        message: error.message, 
        data: error.data, 
        stack: error.stack 
    });
    if (error instanceof PolarAPIError && error.statusCode === 404) {
      return res.status(404).json({ status: 'error', message: 'Polar checkout session not found' });
    }
    // Log the specific error data from Polar if it's a PolarAPIError and not a 404
    if (error instanceof PolarAPIError) {
        logger.error('[Polar Status Check] Polar API Error details', { polarErrorData: error.data, statusCode: error.statusCode });
    }
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.data?.detail || error.message || 'Failed to check payment status',
      error: process.env.NODE_ENV === 'development' ? { message: error.message, data: error.data } : undefined
    });
  }
});

/**
 * @route POST /api/payment/validate-payment 
 * @desc Validate a user's payment status (was validate-subscription)
 */
router.post('/validate-payment', [
  // body('userId').optional().isString(), // customer_external_id in Polar
  body('sessionId').notEmpty().isString().withMessage('Session ID is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        status: 'error', 
        errors: errors.array() 
      });
    }
    next();
  }
], async (req, res) => {
  try {
    const { sessionId } = req.body; // Assuming userId is not primary way for one-time payments
    const polarEnv = resolvePolarEnv(req);
    const polarClient = getPolarClient(polarEnv);
    
    logger.info('Validating Polar payment', { sessionId, polarEnv });
    
    let isPaid = false;
    
    if (sessionId) {
      try {
        const session = await polarClient.checkouts.get(sessionId);
        isPaid = session.status === 'succeeded';
        
        logger.debug('Polar session payment validation result', { 
          sessionId, 
          paymentStatus: session.status,
          isPaid
        });
      } catch (error) {
        if (error instanceof PolarAPIError && error.statusCode === 404) {
          logger.warn('Polar session not found during validation', { sessionId, error: error.message });
        } else {
          throw error; // Re-throw other errors
        }
      }
    }
    
    // If !isPaid and userId was provided, one could list orders for customer_external_id
    // but for one-time payments, sessionId check is primary.
    
    res.json({
      status: 'success',
      isPaid,
      validatedVia: isPaid ? 'session' : null // Only session validation for now
    });
  } catch (error) {
    logger.error('Error validating Polar payment:', { message: error.message, data: error.data, stack: error.stack });
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.data?.detail || error.message || 'Failed to validate payment',
      error: process.env.NODE_ENV === 'development' ? { message: error.message, data: error.data } : undefined
    });
  }
});

/**
 * @route GET /api/payment/internal-status/:internalSessionId
 * @desc Check payment status using an internal session ID (dataSessionId or scrapeJobId)
 *       This is used when the Polar checkout_session_id might be missing from the redirect URL.
 */
router.get('/internal-status/:internalSessionId', async (req, res) => {
  try {
    const { internalSessionId } = req.params;
    logger.info('[PaymentRouter] Checking internal payment status for ID:', { internalSessionId });

    if (!internalSessionId) {
      return res.status(400).json({ status: 'error', message: 'Internal Session ID is required.' });
    }

    const confirmation = sessionManager.getPaymentConfirmation(internalSessionId);

    if (confirmation && confirmation.status === 'paid') {
      logger.info('[PaymentRouter] Internal payment status confirmed as paid for ID:', { internalSessionId, confirmation });
      res.json({
        status: 'success',
        paid: true,
        paymentStatus: 'succeeded', // Mimic structure of /status/:sessionId response
        // Include relevant details from the stored confirmation
        polarCheckoutSessionId: confirmation.polarCheckoutId,
        customerEmail: confirmation.details?.customerEmail,
        metadata: confirmation.details?.metadata 
      });
    } else {
      logger.warn('[PaymentRouter] Internal payment status not confirmed or not paid for ID:', { internalSessionId, confirmation });
      res.status(200).json({ // Return 200 OK, but paid: false
        status: 'success', // API call itself was successful
        paid: false,
        paymentStatus: confirmation ? confirmation.status : 'pending_webhook',
        message: 'Payment confirmation not yet received or not paid.'
      });
    }
  } catch (error) {
    logger.error('Error checking internal payment status:', { 
      internalSessionIdAttempted: req.params.internalSessionId, 
      message: error.message, 
      stack: error.stack 
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to check internal payment status'
    });
  }
});

module.exports = router;