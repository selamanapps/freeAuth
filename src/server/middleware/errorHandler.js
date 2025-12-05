/**
 * Global error handling middleware
 */

const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  const NODE_ENV = process.env.NODE_ENV || "development";

  logger.errorWithContext(err, {
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Determine response based on environment
  const errorResponse = {
    error: NODE_ENV === "production" ? "Internal server error" : err.message,
  };

  // Include stack trace in development
  if (NODE_ENV !== "production") {
    errorResponse.stack = err.stack;
  }

  // Default to 500 if no status code
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
