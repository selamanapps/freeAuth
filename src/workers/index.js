/**
 * FreeAuth - Cloudflare Worker + Firestore Version (Free Tier)
 * * This worker handles:
 * 1. /api/init - Creates session in Firestore
 * 2. /api/check/:token - Checks session in Firestore
 * 3. /webhook - Handles Telegram updates
 *
 * Free Tier Features:
 * - No KV namespaces (100% free)
 * - No rate limiting (simplified for free tier)
 * - Input validation for security
 * - Security headers
 * - Optimized for Firestore free tier limits
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- ROUTER ---

    // 1. Init Session
    if (request.method === "POST" && path === "/api/init") {
      return await handleInit(request, env);
    }

    // 2. Check Status
    if (request.method === "GET" && path.startsWith("/api/check/")) {
      const token = path.split("/").pop();
      return await handleCheck(token, env);
    }

    // 3. Telegram Webhook
    if (request.method === "POST" && path === "/webhook") {
      return await handleTelegramWebhook(request, env, ctx);
    }

    // 4. Set Webhook (One-time setup helper)
    if (request.method === "GET" && path === "/setup-webhook") {
      return await setupWebhook(request, env, url.origin);
    }

    // 5. Health check endpoint
    if (request.method === "GET" && path === "/health") {
      return jsonResp({
        status: "healthy",
        version: env.VERSION || "1.0.0",
        environment: env.ENVIRONMENT || "development",
      });
    }

    return new Response("FreeAuth Worker is Running", { status: 200 });
  },
};

// --- HANDLERS ---

async function handleInit(request, env) {
  try {
    const body = await request.json();

    // Input validation
    if (!body.phone || !validatePhoneNumber(body.phone)) {
      return jsonResp({ error: "Valid phone number is required" }, 400);
    }

    if (body.webhook_url && !validateWebhookUrl(body.webhook_url)) {
      return jsonResp({ error: "Webhook URL must be a valid HTTPS URL" }, 400);
    }

    const token = crypto.randomUUID();
    const normalizedPhone = normalizePhone(body.phone);
    const docData = {
      status: "pending",
      expected_phone: normalizedPhone,
      webhook_url: body.webhook_url || null,
      client_secret: body.client_secret || null,
      created_at: new Date().toISOString(),
      expires_at: new Date(
        Date.now() + (env.MAX_SESSION_AGE || 3600) * 1000
      ).toISOString(),
    };

    // Save to Firestore: collection 'verifications', docId 'token'
    await firestore(env).createDoc("verifications", token, docData);

    return jsonResp({
      token: token,
      bot_link: `https://t.me/${env.BOT_USERNAME}?start=${token}`,
      expires_in: env.MAX_SESSION_AGE || 3600,
    });
  } catch (e) {
    console.error("Init error:", e);
    return jsonResp({ error: "Internal server error" }, 500);
  }
}

async function handleCheck(token, env) {
  try {
    // Direct Firestore call (no caching for free tier)
    const doc = await firestore(env).getDoc("verifications", token);
    if (!doc) return jsonResp({ error: "Token not found" }, 404);

    // Check if session is expired
    if (doc.expires_at && new Date(doc.expires_at) < new Date()) {
      // Update status to expired
      await firestore(env).updateDoc("verifications", token, {
        status: "expired",
      });
      doc.status = "expired";
    }

    // Remove secret from response
    const { client_secret, ...safeData } = doc;
    return jsonResp(safeData);
  } catch (e) {
    console.error("Check error:", e);
    return jsonResp({ error: "Internal server error" }, 500);
  }
}

async function handleTelegramWebhook(request, env, ctx) {
  try {
    const update = await request.json();

    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;

      // A. Handle /start <token>
      if (msg.text && msg.text.startsWith("/start ")) {
        const token = msg.text.split(" ")[1];
        if (token) {
          // Check if token exists in Firestore
          const session = await firestore(env).getDoc("verifications", token);

          if (session && session.status === "pending") {
            // Update session with chat_id so we can link it later
            await firestore(env).updateDoc("verifications", token, {
              chat_id: chatId,
            });

            // Send Reply
            await sendTelegramMessage(
              env,
              chatId,
              "🔒 <b>Security Check</b>\n\nPlease share your contact to verify.",
              {
                keyboard: [
                  [{ text: "📱 Share Contact", request_contact: true }],
                ],
                one_time_keyboard: true,
                resize_keyboard: true,
              }
            );
          } else {
            await sendTelegramMessage(
              env,
              chatId,
              "⚠️ Invalid or expired session."
            );
          }
        }
      }

      // B. Handle Contact Shared
      if (msg.contact) {
        // 1. Security: Check sender ID
        if (msg.contact.user_id !== msg.from.id) {
          await sendTelegramMessage(
            env,
            chatId,
            "❌ You cannot forward contacts."
          );
          return jsonResp({ ok: true });
        }

        // 2. Find the session for this chat_id
        // We query Firestore for a pending doc where chat_id == current chat_id
        const sessions = await firestore(env).queryDocs(
          "verifications",
          "chat_id",
          chatId
        );

        // Find the first pending one
        const activeSession = sessions.find((s) => s.data.status === "pending");

        if (!activeSession) {
          await sendTelegramMessage(
            env,
            chatId,
            "⚠️ No active verification found.",
            { remove_keyboard: true }
          );
          return jsonResp({ ok: true });
        }

        const token = activeSession.id;
        const data = activeSession.data;

        // 3. Verify Phone
        const telegramPhone = normalizePhone(msg.contact.phone_number);

        if (telegramPhone !== data.expected_phone) {
          await sendTelegramMessage(env, chatId, "❌ Phone mismatch.", {
            remove_keyboard: true,
          });
          return jsonResp({ ok: true });
        }

        // 4. Success! Update Firestore
        const updateData = {
          status: "verified",
          phone: msg.contact.phone_number,
          telegram_id: msg.contact.user_id,
          first_name: msg.contact.first_name,
        };
        await firestore(env).updateDoc("verifications", token, updateData);

        // 5. Trigger Webhook (Fire and Forget)
        if (data.webhook_url) {
          // We don't await this to keep telegram response fast
          ctx.waitUntil(
            fetch(data.webhook_url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event: "verification_success",
                token: token,
                ...updateData,
                secret: data.client_secret,
              }),
            })
          );
        }

        await sendTelegramMessage(
          env,
          chatId,
          "✅ Verified! You can return to the app.",
          { remove_keyboard: true }
        );
      }
    }

    return jsonResp({ ok: true });
  } catch (e) {
    // Log error but return 200 to Telegram so it doesn't retry
    console.error(e);
    return jsonResp({ ok: true });
  }
}

// --- HELPERS ---

function normalizePhone(phone) {
  if (!phone) return "";
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("09") && cleaned.length === 10) {
    cleaned = "251" + cleaned.substring(1);
  }
  return cleaned;
}

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    },
  });
}

async function setupWebhook(request, env, origin) {
  const url = `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook?url=${origin}/webhook`;
  const resp = await fetch(url);
  return new Response(await resp.text());
}

async function sendTelegramMessage(env, chatId, text, replyMarkup = null) {
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
  };
  if (replyMarkup) {
    if (replyMarkup.remove_keyboard)
      body.reply_markup = { remove_keyboard: true };
    else
      body.reply_markup = {
        keyboard: replyMarkup.keyboard,
        resize_keyboard: true,
        one_time_keyboard: true,
      };
  }

  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- INPUT VALIDATION ---

function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== "string") return false;

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "");

  // Validate length
  if (cleaned.length < 10 || cleaned.length > 15) {
    return false;
  }

  return true;
}

function validateWebhookUrl(url) {
  if (!url) return true; // Optional field

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// --- FIRESTORE CLIENT (REST API) ---

const firestore = (env) => {
  // Parse Service Account from Environment Variable
  if (!env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT environment variable is required"
    );
  }

  const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const projectId = serviceAccount.project_id;
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

  async function getAccessToken() {
    // Simple JWT signing implementation using Web Crypto API
    const header = { alg: "RS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    const encodedHeader = btoa(JSON.stringify(header));
    const encodedClaim = btoa(JSON.stringify(claim));
    const data = `${encodedHeader}.${encodedClaim}`;

    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = serviceAccount.private_key
      .substring(
        pemHeader.length,
        serviceAccount.private_key.length - pemFooter.length
      )
      .replace(/\s/g, "");
    const binaryDerString = atob(pemContents);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++)
      binaryDer[i] = binaryDerString.charCodeAt(i);

    const key = await crypto.subtle.importKey(
      "pkcs8",
      binaryDer.buffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(data)
    );

    // Convert signature to base64url
    const encodedSignature = btoa(
      String.fromCharCode(...new Uint8Array(signature))
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const jwt = `${data}.${encodedSignature}`;

    // Exchange JWT for Access Token
    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const tokenData = await tokenResp.json();
    return tokenData.access_token;
  }

  // Helper to convert simple JSON to Firestore Format
  const toFirestore = (data) => {
    const fields = {};
    for (const key in data) {
      if (data[key] === null) fields[key] = { nullValue: null };
      else if (typeof data[key] === "string")
        fields[key] = { stringValue: data[key] };
      else if (typeof data[key] === "number")
        fields[key] = {
          integerValue: data[key],
        };
      // Simplified, checks needed for double
      else if (typeof data[key] === "boolean")
        fields[key] = { booleanValue: data[key] };
    }
    return { fields };
  };

  const fromFirestore = (doc) => {
    if (!doc || !doc.fields) return null;
    const data = {};
    for (const key in doc.fields) {
      const field = doc.fields[key];
      if (field.stringValue) data[key] = field.stringValue;
      if (field.integerValue) data[key] = parseInt(field.integerValue);
      if (field.booleanValue) data[key] = field.booleanValue;
    }
    return data;
  };

  return {
    async createDoc(collection, id, data) {
      const token = await getAccessToken();
      // Use patch instead of create to allow upsert or avoiding errors
      await fetch(`${baseUrl}/${collection}/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toFirestore(data)),
      });
    },
    async updateDoc(collection, id, data) {
      const token = await getAccessToken();
      // Only update fields passed (updateMask)
      const updateMask = Object.keys(data)
        .map((k) => `updateMask.fieldPaths=${k}`)
        .join("&");
      await fetch(`${baseUrl}/${collection}/${id}?${updateMask}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toFirestore(data)),
      });
    },
    async getDoc(collection, id) {
      const token = await getAccessToken();
      const res = await fetch(`${baseUrl}/${collection}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return fromFirestore(json);
    },
    async queryDocs(collection, field, value) {
      const token = await getAccessToken();
      const query = {
        structuredQuery: {
          from: [{ collectionId: collection }],
          where: {
            fieldFilter: {
              field: { fieldPath: field },
              op: "EQUAL",
              value:
                typeof value === "string"
                  ? { stringValue: value }
                  : { integerValue: value },
            },
          },
        },
      };

      const res = await fetch(`${baseUrl}:runQuery`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(query),
      });

      const json = await res.json();
      // runQuery returns array of objects with 'document' or 'readTime'
      return json
        .filter((i) => i.document)
        .map((i) => ({
          id: i.document.name.split("/").pop(),
          data: fromFirestore(i.document),
        }));
    },
  };
};
