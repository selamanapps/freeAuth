# FreeAuth Cloudflare Worker (Free Tier)

A 100% free Cloudflare Worker for Telegram-based authentication with Firebase/Firestore integration. Optimized for free tier limits with no paid services.

## Features

- **Telegram Bot Integration**: Secure phone number verification via Telegram (Free)
- **Firestore Storage**: Session management with Google Firestore (Free Tier)
- **Security**: Input validation, security headers
- **Health Monitoring**: Built-in health check endpoint

## File Structure

```
workers/
├── index.js              # Main worker code
├── wrangler.toml         # Production configuration
├── SECURITY.md           # Security best practices
└── README.md            # This file
```

## Quick Start

### 1. Prerequisites (All Free)

- Cloudflare account (Free tier includes Workers)
- Telegram Bot Token from [@BotFather](https://t.me/BotFather) (Free)
- Firebase project with Firestore (Free tier: 1GB storage)
- Node.js and npm installed

### 2. Installation

```bash
# Login to Cloudflare
npx wrangler login
```

### 3. Configuration

#### Update `wrangler.toml`:

1. Set your Cloudflare account ID (get from dashboard):

   ```toml
   account_id = "YOUR_CLOUDFLARE_ACCOUNT_ID"
   ```

2. Optional: Add custom domain (free with Cloudflare):
   ```toml
   route = { pattern = "freeauth.yourdomain.com", zone_name = "yourdomain.com" }
   ```

**No KV namespaces needed** - This configuration is 100% free.

### 4. Set Environment Secrets

```bash
# Production environment (free tier)
wrangler secret put BOT_TOKEN --env production
wrangler secret put FIREBASE_SERVICE_ACCOUNT --env production
wrangler secret put BOT_USERNAME --env production
```

**Note**: For `FIREBASE_SERVICE_ACCOUNT`, paste the entire JSON content of your Firebase service account key.

### 5. Deployment

```bash
# Local development
wrangler dev

# Deploy to production (free *.workers.dev domain)
wrangler deploy
```

## API Endpoints

### 1. Initialize Session

```http
POST /api/init
Content-Type: application/json

{
  "phone": "+1234567890",
  "webhook_url": "https://your-app.com/webhook",
  "client_secret": "your-secret"
}
```

**Response:**

```json
{
  "token": "uuid-session-token",
  "bot_link": "https://t.me/YourBot?start=uuid-session-token",
  "expires_in": 3600
}
```

### 2. Check Session Status

```http
GET /api/check/{token}
```

**Response:**

```json
{
  "status": "pending|verified|expired",
  "expected_phone": "+1234567890",
  "created_at": "2025-12-05T08:50:23.000Z",
  "expires_at": "2025-12-05T09:50:23.000Z"
}
```

### 3. Telegram Webhook

```http
POST /webhook
```

Automatically handles Telegram bot updates.

### 4. Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "production"
}
```

### 5. Setup Webhook (One-time)

```http
GET /setup-webhook
```

Configures Telegram webhook URL.

## Security Features

### Input Validation

- Phone number format validation
- HTTPS URL validation for webhooks
- JSON schema validation

### Security Headers

All responses include:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Session Security

- Cryptographically secure UUID tokens
- Session expiration (default: 1 hour)
- Secure secret handling
- No sensitive data in responses
- Direct Firestore integration (no caching layers)

## Environment Variables

| Variable                   | Description                   | Required |
| -------------------------- | ----------------------------- | -------- |
| `BOT_TOKEN`                | Telegram Bot API token        | Yes      |
| `BOT_USERNAME`             | Telegram bot username         | Yes      |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON | Yes      |
| `ENVIRONMENT`              | Deployment environment        | No       |
| `VERSION`                  | Application version           | No       |
| `MAX_SESSION_AGE`          | Session TTL in seconds        | No       |

## Free Tier Limits & Monitoring

### Cloudflare Workers Free Tier

- 100,000 requests per day
- 10ms CPU time per request
- No KV namespaces or Durable Objects
- Free \*.workers.dev subdomain

### Firebase Firestore Free Tier

- 1GB storage
- 50,000 reads per day
- 20,000 writes per day
- 20,000 deletes per day

### Monitoring

- Enable Workers Logs in Cloudflare dashboard (free)
- Monitor `/health` endpoint
- Track usage to stay within free tier limits

## Troubleshooting

### Common Issues

1. **Worker fails to start**

   - Check environment variables are set
   - Verify Firebase service account JSON is valid
   - Ensure all required secrets are configured

2. **Telegram webhook not working**

   - Run `/setup-webhook` endpoint
   - Verify bot token is correct
   - Check Cloudflare Worker URL is accessible

3. **Hitting free tier limits**
   - Monitor usage in Cloudflare dashboard
   - Optimize Firestore queries
   - Consider upgrading if needed

### Debugging

```bash
# Local development
wrangler dev

# View production logs
wrangler tail

# Check deployment status
wrangler deployments list
```

## Upgrading

1. Update `compatibility_date` in `wrangler.toml`
2. Test in staging environment
3. Deploy to production with rollback plan
4. Monitor for issues after deployment

## Support

- **Documentation**: See `SECURITY.md` for security guidelines
- **Issues**: Check Cloudflare Workers dashboard for errors
- **Monitoring**: Set up alerts in Cloudflare dashboard

## License

Proprietary - See main project license.

---

**Last Updated**: December 5, 2025  
**Version**: 1.0.0
