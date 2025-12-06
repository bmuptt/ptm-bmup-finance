import apm from 'elastic-apm-node';
import { config } from './environment';

let apmAgent: any = null;

// Skip APM in testing environment
if (config.NODE_ENV === 'testing') {
  console.log('🚫 APM disabled in testing environment');
} else {
  // Initialize APM
  // IMPORTANT: APM must be started before Express to properly instrument HTTP requests
  // Mengikuti konfigurasi dari be-app-management yang sudah terbukti bekerja
  apmAgent = apm.start({
    serviceName: 'ptm-bmup-finance',
    apiKey: config.APM_API_KEY_FINANCE,
    serverUrl: config.APM_SERVER_URL,
    environment: config.NODE_ENV,
    logLevel: 'info',
    captureBody: 'all', // Capture request/response body
    captureHeaders: true, // Capture headers
    captureExceptions: true,
    captureSpanStackTraces: true,
    transactionSampleRate: 1.0, // 100% sampling
  });

  // Log APM status
  if (apmAgent.isStarted()) {
    console.log('✅ APM Agent started successfully');
    console.log(`📊 APM Server: ${config.APM_SERVER_URL}`);
    console.log(`🌍 Environment: ${config.NODE_ENV}`);
  } else {
    console.log('⚠️ APM Agent not started (no secret token or disabled)');
  }
}

export default apmAgent;
