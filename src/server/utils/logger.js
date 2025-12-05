/**
 * Logger utility for structured logging
 * Uses Winston for production-ready logging
 */

const winston = require("winston");

const NODE_ENV = process.env.NODE_ENV || "development";

// Create logger instance
const logger = winston.createLogger({
  level: NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "freeauth-server" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Helper methods for different log levels
module.exports = {
  // Standard log levels
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),

  // Specialized loggers
  request: (req, res, duration) => {
    logger.info({
      type: "request",
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
  },

  auth: (action, token, meta = {}) => {
    logger.info({
      type: "auth",
      action,
      token,
      ...meta,
    });
  },

  bot: (action, chatId, meta = {}) => {
    logger.info({
      type: "bot",
      action,
      chatId,
      ...meta,
    });
  },

  errorWithContext: (error, context = {}) => {
    logger.error({
      type: "error",
      message: error.message,
      stack: error.stack,
      ...context,
    });
  },
};
