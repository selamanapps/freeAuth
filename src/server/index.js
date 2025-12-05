/**
 * FreeAuth Express Server - Main Entry Point
 *
 * This is the main server file that sets up and starts the Express server.
 * It imports all middleware, routes, and services from their respective modules.
 */

require("dotenv").config();
const express = require("express");
const { Telegraf } = require("telegraf");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Import custom modules
const logger = require("./utils/logger");
const validationMiddleware = require("./middleware/validation");
const errorHandler = require("./middleware/errorHandler");
const rateLimitMiddleware = require("./middleware/rateLimit");
const authRoutes = require("./routes/auth");
const healthRoutes = require("./routes/health");
const telegramService = require("./services/telegram");
const sessionService = require("./services/session");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// ====================
// INITIALIZE SERVICES
// ====================

// Initialize Telegram bot
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  logger.error("BOT_TOKEN environment variable is required");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Initialize session storage
const storage = sessionService.initializeStorage();

// ====================
// MIDDLEWARE SETUP
// ====================

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);

// Request parsing
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
  });
  next();
});

// Rate limiting for API routes
app.use("/api/", rateLimitMiddleware);

// Input validation middleware
app.use(validationMiddleware);

// ====================
// ROUTES
// ====================

// Health check route
app.use("/health", healthRoutes);

// Authentication API routes
app.use("/api", authRoutes({ bot, storage }));

// ====================
// ERROR HANDLING
// ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use(errorHandler);

// ====================
// TELEGRAM BOT SETUP
// ====================

// Initialize Telegram bot handlers
telegramService.initializeBotHandlers(bot, storage);

// ====================
// GRACEFUL SHUTDOWN
// ====================

const shutdown = async (signal) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    await bot.stop(signal);
    logger.info("Bot stopped gracefully");

    // Close server
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error(
        "Could not close connections in time, forcefully shutting down"
      );
      process.exit(1);
    }, 10000);
  } catch (error) {
    logger.error("Error during shutdown:", error);
    process.exit(1);
  }
};

// ====================
// START SERVER
// ====================

const server = app.listen(PORT, async () => {
  logger.info(`🚀 FreeAuth server running on port ${PORT} in ${NODE_ENV} mode`);

  try {
    await bot.launch();
    const botInfo = await bot.telegram.getMe();
    logger.info(`🤖 Bot @${botInfo.username} is online`);
  } catch (error) {
    logger.error("Failed to start bot:", error);
    process.exit(1);
  }
});

// Handle shutdown signals
process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});

module.exports = { app, bot, storage, server };
