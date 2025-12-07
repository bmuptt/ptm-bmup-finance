import apm from 'elastic-apm-node';
import { config } from './environment';

let apmAgent: any = null;

const shouldStartAPM = config.APP_APM_ACTIVE && config.NODE_ENV !== 'testing';

if (shouldStartAPM) {
  apmAgent = apm.start({
    serviceName: 'ptm-bmup-finance',
    apiKey: config.APM_API_KEY_FINANCE,
    serverUrl: config.APM_SERVER_URL,
    environment: config.NODE_ENV,
    logLevel: 'info',
    captureBody: 'all',
    captureHeaders: true,
    captureExceptions: true,
    captureSpanStackTraces: true,
    transactionSampleRate: 1.0,
  });

  if (apmAgent.isStarted()) {
    console.log('✅ APM Agent started successfully');
    console.log(`📊 APM Server: ${config.APM_SERVER_URL}`);
    console.log(`🌍 Environment: ${config.NODE_ENV}`);
  } else {
    console.log('⚠️ APM Agent not started (no secret token or disabled)');
  }
}

export default apmAgent;
