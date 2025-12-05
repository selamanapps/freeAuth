/**
 * Authentication API routes
 */

const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");
const sessionService = require("../services/session");

module.exports = ({ bot, storage }) => {
  // Initialize session
  router.post("/init", async (req, res) => {
    try {
      const { phone, webhook_url, client_secret } = req.body;

      // Input validation
      if (!phone || !sessionService.validatePhoneNumber(phone)) {
        return res.status(400).json({
          error: "Valid phone number is required (10-15 digits)",
        });
      }

      if (webhook_url && !sessionService.validateWebhookUrl(webhook_url)) {
        return res.status(400).json({
          error: "Webhook URL must be a valid HTTPS URL",
        });
      }

      // Get bot username
      let botUsername = bot.botInfo?.username;
      if (!botUsername) {
        try {
          const me = await bot.telegram.getMe();
          botUsername = me.username;
        } catch (error) {
          logger.error("Failed to get bot info:", error);
          return res.status(500).json({ error: "Bot service unavailable" });
        }
      }

      // Create session
      const { token, sessionData } = await sessionService.createSession(
        storage,
        phone,
        webhook_url,
        client_secret
      );

      res.status(201).json({
        token: token,
        bot_link: `https://t.me/${botUsername}?start=${token}`,
        expires_in: 600,
      });
    } catch (error) {
      logger.errorWithContext(error, { route: "/api/init" });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Check session status
  router.get("/check/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const session = await sessionService.getSession(storage, token);

      if (!session) {
        return res.status(404).json({ error: "Token not found" });
      }

      // Remove sensitive data from response
      const { client_secret, ...safeSession } = session;
      res.json(safeSession);
    } catch (error) {
      logger.errorWithContext(error, { route: "/api/check" });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
};
