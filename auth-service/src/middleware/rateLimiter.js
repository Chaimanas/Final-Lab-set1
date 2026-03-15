const rateLimit = require('express-rate-limit');

// Simple in-memory rate limiter for login: 5 requests per minute per IP
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 5,                // 5 requests
  message: 'Too many login attempts, please try again later',
  standardHeaders: false,
  legacyHeaders: false,
});

// Rate limiter for general auth endpoints: 30 requests per minute
const authLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 30,               // 30 requests
  message: 'Too many auth requests, please try again later',
  standardHeaders: false,
  legacyHeaders: false,
});

module.exports = { loginLimiter, authLimiter };
