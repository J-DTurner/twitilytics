const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const logger = require('../utils/logger');

/**
 * Rate limiting middleware
 */
exports.apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // Default: 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // Default: 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 429,
    message: 'Too many requests, please try again after some time.'
  },
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded', { 
      ip: req.ip, 
      path: req.path 
    });
    res.status(options.statusCode).json(options.message);
  }
});

/**
 * Security headers middleware
 */
exports.securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Add additional CSP directives as needed
      scriptSrc: ["'self'", "https://js.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com"]
    }
  },
  crossOriginEmbedderPolicy: false, // Allow embedding from Stripe
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // Allow payment popup
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

/**
 * Error handling middleware
 */
exports.errorHandler = (err, req, res, next) => {
  logger.error(`${err.name}: ${err.message}`, { 
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' && statusCode === 500 
      ? 'Internal server error' 
      : message
  });
};

/**
 * Not found middleware
 */
exports.notFound = (req, res, next) => {
  logger.warn(`Route not found: ${req.originalUrl}`);
  
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
};

/**
 * Validate content type middleware
 */
exports.validateContentType = (req, res, next) => {
  // Skip for webhook endpoint which uses raw body
  if (req.path === '/api/payment/webhook') {
    return next();
  }
  
  // Check content type for POST, PUT, PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
    return res.status(415).json({
      status: 'error',
      message: 'Content-Type must be application/json'
    });
  }
  
  next();
};

/**
 * Track API usage middleware
 */
exports.trackApiUsage = (req, res, next) => {
  // Log API request
  logger.info('API Request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Track response time
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug('API Response', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
};