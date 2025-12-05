/**
 * Input validation middleware
 */

const logger = require("../utils/logger");

const validationMiddleware = (req, res, next) => {
  // Basic request validation
  if (req.method === "POST" && req.is("application/json") === false) {
    return res
      .status(400)
      .json({ error: "Content-Type must be application/json" });
  }

  // Additional validation can be added here
  next();
};

module.exports = validationMiddleware;
