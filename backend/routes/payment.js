const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { resolvePolarEnv } = require('../utils/polar/resolvePolarEnv');
const { getPolarClient } = require('../utils/polar/clientCache');
const { PolarError, PolarAPIError } = require('../utils/polar/errors');
const { Webhooks } = require('@polar-sh/express'); // Polar's official webhook middleware
const { makePolarConfig } = require('../utils/polar/polarConfig');


/**
 * Data validation middleware for checkout session
 */
const validateCheckout = [
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object'),
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
    const polarEnv = resolvePolarEnv(req);
    const polarClient = getPolarClient(polarEnv);
    const priceId = polarEnv === 'sandbox' 
      ? process.env.POLAR_PRICE_ID_PREMIUM_ANALYSIS_SANDBOX
      : process.env.POLAR_PRICE_ID_PREMIUM_ANALYSIS_PROD;

    logger.info('Creating Polar checkout session for Premium Analysis', { email: email || 'anonymous', polarEnv, priceId });

    if (!priceId) {
      logger.error('Premium Analysis Price ID not configured for env:', polarEnv);
      return res.status(500).json({ status: 'error', message: 'Payment service is not configured correctly (premium).' });
    }

    // Create Polar checkout session
    const successUrl = `${process.env.FRONTEND_URL}/report?session_id={CHECKOUT_SESSION_ID}&source=polar`;
    const cancelUrl = `${process.env.FRONTEND_URL}/?payment_cancelled=true`;
    
    const polarCheckoutParams = {
      product_price_id: priceId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email || undefined, // Polar might require email or allow anonymous
      customer_external_id: metadata.userId || metadata.dataKey || undefined, // Link to your internal user/session
      metadata: {
        ...metadata,
        twitilyticsService: 'premium_analysis',
        timestamp: new Date().toISOString(),
      }
    };

    logger.debug('Polar checkout params:', polarCheckoutParams);
    const session = await polarClient.checkouts.create(polarCheckoutParams);

    logger.info('Polar checkout session created', { 
      sessionId: session.id,
      customerExternalId: polarCheckoutParams.customer_external_id || 'anonymous'
    });

    res.json({
      status: 'success',
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    logger.error('Error creating Polar checkout session:', { message: error.message, data: error.data, stack: error.stack });
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
  logger.info(`[Polar Webhook - ${polarEnv}] Received event type: ${event.type}`, { eventId: event.id });

  // Handle the event based on its type
  switch (event.type) {
    case 'order.paid': { // Equivalent to Stripe's checkout.session.completed
      const order = event.data; // Polar order payload
      logger.info(`[Polar Webhook - ${polarEnv}] Order paid`, { 
        orderId: order.id,
        customerEmail: order.customer_email || order.customer?.email,
        customerExternalId: order.customer_external_id || order.customer?.external_id,
        metadata: order.metadata
      });
      
      // Store in database that this user/session has paid
      // For now, we'll just log it as we don't have DB connected yet
      const customerExternalId = order.customer_external_id || order.customer?.external_id || order.metadata?.userId || order.metadata?.dataKey;
      if (customerExternalId) {
        // In a real implementation, update user record in database
        // await updateUserPremiumStatus(customerExternalId, true, order.id);
        logger.info(`[Polar Webhook - ${polarEnv}] User/Session marked as paid`, { customerExternalId: customerExternalId, polarOrderId: order.id });
      } else {
        // For anonymous users, this might be harder to track back without a persistent ID.
        // Checkout ID could be used if stored on frontend and sent back, but webhook is preferred.
        logger.warn(`[Polar Webhook - ${polarEnv}] Anonymous user order paid, but no customerExternalId found. Tracking by Polar Order ID.`, { polarOrderId: order.id });
      }
      break;
    }
    
    case 'order.refunded': {
      const order = event.data;
      logger.info(`[Polar Webhook - ${polarEnv}] Order refunded`, { orderId: order.id, customerExternalId: order.customer_external_id });
      // Handle refund logic, e.g., revoke premium access
      break;
    }
    default:
      logger.debug(`[Polar Webhook - ${polarEnv}] Unhandled event type: ${event.type}`);
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
    onPayload: (event) => { // Generic handler for logging or unhandled types
      logger.debug(`[Polar Webhook - production] Generic payload type: ${event.type}`);
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
      logger.debug(`[Polar Webhook - sandbox] Generic payload type: ${event.type}`);
    }
  })
);

/**
 * @route GET /api/payment/status/:sessionId
 * @desc Check payment status for a Polar checkout session
 */
router.get('/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const polarEnv = resolvePolarEnv(req); // Or determine from session ID prefix if Polar does that
    const polarClient = getPolarClient(polarEnv);
    
    if (!sessionId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Session ID is required' 
      });
    }
    
    logger.info('Checking Polar payment status', { sessionId, polarEnv });
    
    // Retrieve session from Polar
    const session = await polarClient.checkouts.get(sessionId);
    
    // Return payment status
    res.json({
      status: 'success',
      paid: session.status === 'succeeded',
      paymentStatus: session.status,
      customer: session.customer_email ? { // Polar provides customer_email directly on checkout
        email: session.customer_email,
        // name: session.customer_details.name, // Polar structure might differ
      } : null,
      metadata: session.metadata // Pass back metadata
    });
  } catch (error) {
    logger.error('Error checking Polar payment status:', { message: error.message, data: error.data, stack: error.stack });
    
    if (error instanceof PolarAPIError && error.statusCode === 404) {
      return res.status(404).json({
        status: 'error',
        message: 'Session not found'
      });
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
 * Validation for scrape checkout
 */
const validateScrapeCheckout = [
  body('email').optional().isEmail().withMessage('Valid email is required'),
  // numBlocks is now implicitly part of the scrape package defined by the Polar Price ID
  // body('numBlocks').isInt({ min: 1, max: 100 }).withMessage('Number of blocks must be an integer between 1 and 100'),
  body('twitterHandle').isString().notEmpty().withMessage('Twitter handle is required'),
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
 * @route POST /api/payment/create-scrape-checkout
 * @desc Create a Polar checkout session for a predefined scraping service package
 */
router.post('/create-scrape-checkout', validateScrapeCheckout, async (req, res) => {
  try {
    const { email, twitterHandle } = req.body; // numBlocks is removed from direct params
    const polarEnv = resolvePolarEnv(req);
    const polarClient = getPolarClient(polarEnv);
    const priceId = polarEnv === 'sandbox'
      ? process.env.POLAR_PRICE_ID_SCRAPE_PACKAGE_SANDBOX
      : process.env.POLAR_PRICE_ID_SCRAPE_PACKAGE_PROD;
    
    // The specific number of blocks/tweets this package offers should be known by the system,
    // e.g., from the product configuration or an internal mapping.
    // For simplicity, let's say this package is for 5000 tweets.
    const packageTweetLimit = 5000; // This should ideally come from config
    const numBlocksImpliedByPackage = Math.ceil(packageTweetLimit / 1000);

    if (!priceId) {
      logger.error('Polar Price ID for scraping package is not configured for env:', polarEnv);
      return res.status(500).json({ status: 'error', message: 'Scraping service is unavailable (config).' });
    }
    
    logger.info('Creating Polar scrape checkout session', { email, twitterHandle, polarEnv, priceId });

    const successUrl = `${process.env.FRONTEND_URL}/report?session_id={CHECKOUT_SESSION_ID}&type=scrape&handle=${encodeURIComponent(twitterHandle)}&blocks=${numBlocksImpliedByPackage}&source=polar`;
    const cancelUrl = `${process.env.FRONTEND_URL}/?payment_cancelled=true`;

    const polarCheckoutParams = {
      product_price_id: priceId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email || undefined,
      customer_external_id: `scrape_${twitterHandle}_${Date.now()}`, // Unique ID for this scrape job
      metadata: { 
        analysisType: 'scrape', 
        twitterHandle, 
        numBlocks: numBlocksImpliedByPackage, // Store what the package offers
        timestamp: new Date().toISOString() 
      }
    };
    
    logger.debug('Polar scrape checkout params:', polarCheckoutParams);
    const session = await polarClient.checkouts.create(polarCheckoutParams);
    
    logger.info('Polar scrape checkout session created', { sessionId: session.id });
    res.json({ status: 'success', sessionId: session.id, url: session.url });

  } catch (error) {
    logger.error('Error creating Polar scrape checkout session:', { message: error.message, data: error.data, stack: error.stack });
    res.status(error.statusCode || 500).json({ 
        status: 'error', 
        message: error.data?.detail || error.message || 'Failed to create scrape checkout session' 
    });
  }
});

module.exports = router;