require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createLogger, format, transports } = require('winston');
const path = require('path');

// Import routes
const analysisRoutes = require('./routes/analysis');
const paymentRoutes = require('./routes/payment');
const emailRoutes = require('./routes/emailRoutes');
// const userRoutes = require('./routes/user'); // REMOVE or comment out

// Create Express app
const app = express();

// Trust proxy - important for rate limiting and security when behind a proxy
app.set('trust proxy', 1);

// Create Winston logger
const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'twitilytics-api' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...rest }) => {
          return `${timestamp} ${level}: ${message} ${Object.keys(rest).length ? JSON.stringify(rest) : ''}`;
        })
      )
    }),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' })
  ]
});

// Configure global middleware
app.use(helmet()); // Set security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev')); // HTTP request logger
app.use(express.json({ limit: '2mb' })); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true, limit: '2mb' })); // Parse URL-encoded bodies
app.use(compression()); // Compress responses

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Configure rate limiting
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 429,
    message: 'Too many requests, please try again after some time.'
  }
});

// Apply rate limiting to all routes
app.use(apiLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Twitilytics API is up and running',
    timestamp: new Date().toISOString()
  });
});

// Register routes
app.use('/api/analyze', analysisRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/email', emailRoutes);
// app.use('/api/user', userRoutes); // REMOVE or comment out

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// 404 handler (Now this will only catch if /frontend/dist/index.html itself is missing or for non-GET requests not handled by API routes)
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({
      status: 'error',
      message: `API Route ${req.originalUrl} not found`
    });
  }
  // For non-API routes not caught by static serving or the '*', let the browser handle or send index.html again if appropriate.
  // However, the catch-all `app.get('*', ...)` should prevent most of these scenarios for GET requests.
  // If a non-GET request hits this, it's an unhandled route.
  if (req.method !== 'GET') {
    return res.status(404).json({
      status: 'error',
      message: `Route ${req.method} ${req.originalUrl} not found`
    });
  }
  // Fallback to serving index.html for any other GET case (though '*' should cover it)
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
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
});

// Start the server
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  logger.info(`Server running on ${HOST}:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', err);
  console.error('UNHANDLED REJECTION!', err);
  
  // Gracefully shutdown
  process.exit(1);
});

module.exports = app; // Export for testing