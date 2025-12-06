import rateLimit from 'express-rate-limit';
import { config } from '../config/environment';

export const createRateLimit = () => {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: config.RATE_LIMIT_MAX_REQUESTS, // limit each IP to configured requests per windowMs
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      console.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: 'Too many requests from this IP, please try again later.',
      });
    },
  });
};
