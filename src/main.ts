import './config/apm';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import methodOverride from 'method-override';
import { config } from './config/environment';
import { createRateLimit } from './middleware/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import routes from './routes';
import verifyCoreToken from './middleware/auth.middleware';

// Initialize Express app
const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Replace with your production domain
    : true, // Allow all origins in development
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'traceparent', 'tracestate'],
  exposedHeaders: ['traceparent', 'tracestate'],
}));

// Method override middleware (for _method field)
app.use(methodOverride('_method'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve storage files only for authenticated users
app.use('/storage', verifyCoreToken, express.static('storage'));

// Rate limiting middleware
app.use(createRateLimit());

// API routes
app.use('/api', routes);


// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Service is healthy',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    version: '1.0.0',
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PTM BMUP Finance API',
    version: '1.0.0',
    environment: config.NODE_ENV,
    endpoints: {
      health: '/health',
      api: `api`,
      docs: '/api-docs',
    },
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server (skip in testing environment)
let server: any = null;
if (config.NODE_ENV !== 'testing') {
  const PORT = config.PORT;

  server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${config.NODE_ENV}`);
    console.log(`API Base URL: http://localhost:${PORT}api`);
    console.log(`Health Check: http://localhost:${PORT}/health`);
    console.log(`APM Server: ${config.APM_SERVER_URL}`);
  });
}

// Export server for testing cleanup
export { server };

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
