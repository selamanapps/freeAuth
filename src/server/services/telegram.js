/**
 * Telegram bot service
 */

const { Markup } = require("telegraf");
const axios = require("axios");
const logger = require("../utils/logger");

// Asset URLs
const ASSETS = {
  WELCOME_BANNER:
    process.env.WELCOME_BANNER_URL ||
    "https://imgbox.com/V4MRsLQ0",
  SUCCESS_BANNER:
    process.env.SUCCESS_BANNER_URL ||
    "https://imgbox.com/PJxcmEJp",
};

// Helper function
const normalizePhone = (phone) => {
  if (!phone) return "";
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("09") && cleaned.length === 10) {
    cleaned = "251" + cleaned.substring(1);
  }
  return cleaned;
};

// Initialize bot handlers
const initializeBotHandlers = (bot, storage) => {
  // Start command handler
  bot.start(async (ctx) => {
    const args = ctx.message.text.split(" ");
    const token = args[1];

    // Generic welcome (no token provided)
    if (!token) {
      return ctx.replyWithPhoto(ASSETS.WELCOME_BANNER, {
        caption: `<b>👋 Welcome to FreeAuth</b>\n\nI am a security bot that helps verification services ensure you are who you say you are.\n\n<i>This bot works automatically when triggered by an app.</i>`,
        parse_mode: "HTML",
      });
    }

    try {
      const session = await storage.get(token);

      if (!session) {
        return ctx.reply(
          "⚠️ <b>Invalid Session</b>\n\nThis verification link has expired or is invalid.",
          {
            parse_mode: "HTML",
          }
        );
      }

      if (session.status === "verified") {
        return ctx.reply(
          "✅ <b>Already Verified</b>\n\nYou have already verified this session.",
          { parse_mode: "HTML" }
        );
      }

      // Update session with chat ID
      await storage.update(token, { chat_id: ctx.chat.id });
      logger.bot("session_linked", ctx.chat.id, { token });

      // Send verification request
      await ctx.replyWithPhoto(ASSETS.WELCOME_BANNER, {
        caption: `🔒 <b>Security Check Required</b>\n\nTo continue, we need to verify that your Telegram account matches the phone number you provided.\n\nPlease tap the button below to securely share your contact card.\n\n<i>We do not share your data with 3rd parties.</i>`,
        parse_mode: "HTML",
        ...Markup.keyboard([
          Markup.button.contactRequest("📱 Share My Contact"),
        ])
          .resize()
          .oneTime(),
      });
    } catch (error) {
      logger.errorWithContext(error, { handler: "bot_start" });
      ctx.reply("❌ <b>Service Error</b>\n\nPlease try again later.", {
        parse_mode: "HTML",
      });
    }
  });

  // Contact handler
  bot.on("contact", async (ctx) => {
    const contact = ctx.message.contact;

    // Security check
    if (contact.user_id !== ctx.from.id) {
      return ctx.reply(
        "❌ <b>Security Error</b>\n\nYou cannot verify using a forwarded contact.",
        { parse_mode: "HTML" }
      );
    }

    try {
      // Find session by chat ID
      const found = storage.findByChatId(ctx.chat.id);
      if (!found) {
        return ctx.reply(
          "⚠️ Session expired. Please try again from the app.",
          Markup.removeKeyboard()
        );
      }

      const [foundToken, session] = found;
      const telegramPhone = normalizePhone(contact.phone_number);
      const expectedPhone = session.expected_phone;

      // Phone verification
      if (telegramPhone !== expectedPhone) {
        return ctx.reply(
          `❌ <b>Verification Failed</b>\n\nThe phone number does not match the expected account.`,
          { parse_mode: "HTML", ...Markup.removeKeyboard() }
        );
      }

      // Update session as verified
      const updateData = {
        status: "verified",
        phone: contact.phone_number,
        telegram_id: contact.user_id,
        first_name: contact.first_name,
        verified_at: Date.now(),
      };

      await storage.update(foundToken, updateData);
      logger.bot("verification_success", ctx.chat.id, {
        token: foundToken,
        telegram_id: contact.user_id,
      });

      // Trigger webhook if configured
      if (session.webhook_url) {
        try {
          await axios.post(session.webhook_url, {
            event: "verification_success",
            token: foundToken,
            ...updateData,
            secret: session.client_secret,
          });
          logger.info(`Webhook sent to: ${session.webhook_url}`);
        } catch (error) {
          logger.error("Webhook error:", error.message);
        }
      }

      // Send success message
      await ctx.replyWithPhoto(ASSETS.SUCCESS_BANNER, {
        caption: `✅ <b>Verification Complete!</b>\n\nThanks, ${contact.first_name}. You have been successfully verified.\n\n<b>You can now return to your app.</b>`,
        parse_mode: "HTML",
        ...Markup.removeKeyboard(),
      });
    } catch (error) {
      logger.errorWithContext(error, { handler: "bot_contact" });
      ctx.reply("❌ <b>Service Error</b>\n\nPlease try again later.", {
        parse_mode: "HTML",
      });
    }
  });
};

module.exports = {
  initializeBotHandlers,
  ASSETS,
  normalizePhone,
};
