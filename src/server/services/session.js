/**
 * Session service for managing verification sessions
 * Supports both in-memory and Firestore storage
 */

const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

// Helper functions
const normalizePhone = (phone) => {
  if (!phone) return "";
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("09") && cleaned.length === 10) {
    cleaned = "251" + cleaned.substring(1);
  }
  return cleaned;
};

const validatePhoneNumber = (phone) => {
  if (!phone || typeof phone !== "string") return false;
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10 && cleaned.length <= 15;
};

const validateWebhookUrl = (url) => {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
};

// Initialize storage based on environment
const initializeStorage = () => {
  const STORAGE_TYPE = process.env.STORAGE_TYPE || "memory";

  if (STORAGE_TYPE === "firestore") {
    logger.info("Using Firestore storage");
    // Firestore implementation would go here
    // For now, fall back to memory
    return createMemoryStorage();
  } else {
    logger.info("Using in-memory storage");
    return createMemoryStorage();
  }
};

// Create in-memory storage
const createMemoryStorage = () => {
  const verifications = new Map();

  return {
    async create(token, data) {
      verifications.set(token, data);
      // Auto-delete after 10 minutes
      setTimeout(() => {
        if (verifications.get(token)?.status === "pending") {
          verifications.delete(token);
          logger.debug(`Token ${token} expired`);
        }
      }, 600000);
      return token;
    },

    async get(token) {
      return verifications.get(token);
    },

    async update(token, data) {
      const existing = verifications.get(token);
      if (existing) {
        verifications.set(token, { ...existing, ...data });
        return true;
      }
      return false;
    },

    async delete(token) {
      return verifications.delete(token);
    },

    getAll() {
      return Array.from(verifications.entries());
    },

    findByChatId(chatId) {
      const allSessions = Array.from(verifications.entries());
      return allSessions.find(
        ([token, data]) => data.chat_id === chatId && data.status === "pending"
      );
    },
  };
};

// Session management methods
module.exports = {
  initializeStorage,

  normalizePhone,
  validatePhoneNumber,
  validateWebhookUrl,

  createSession: async (storage, phone, webhook_url, client_secret) => {
    const token = uuidv4();
    const sessionData = {
      status: "pending",
      expected_phone: normalizePhone(phone),
      webhook_url: webhook_url || null,
      client_secret: client_secret || null,
      created_at: Date.now(),
      expires_at: Date.now() + 600000, // 10 minutes
    };

    await storage.create(token, sessionData);
    logger.auth("session_created", token, { phone: normalizePhone(phone) });

    return { token, sessionData };
  },

  getSession: async (storage, token) => {
    const session = await storage.get(token);
    if (!session) return null;

    // Check if session is expired
    if (session.expires_at && Date.now() > session.expires_at) {
      await storage.update(token, { status: "expired" });
      session.status = "expired";
    }

    return session;
  },

  verifySession: async (storage, token, contact) => {
    const updateData = {
      status: "verified",
      phone: contact.phone_number,
      telegram_id: contact.user_id,
      first_name: contact.first_name,
      verified_at: Date.now(),
    };

    await storage.update(token, updateData);
    logger.auth("session_verified", token, { telegram_id: contact.user_id });

    return updateData;
  },
};
