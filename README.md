# FreeAuth

> 🚀 Production-ready Telegram-based authentication service for Ethiopia. Free SMS alternative for businesses and developers.

[![GitHub License](https://img.shields.io/github/license/selamanapps/freeAuth)](LICENSE)
[![Node.js](https://img.shields.io/node/v/freeAuth?color=%2338bdf8&label=node)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express)](https://expressjs.com)
[![Telegram](https://img.shields.io/badge/Telegram-4A90E2?logo=telegram)](https://core.telegram.org/bots/api)

A lightweight, secure, and self-hosted authentication system that leverages Telegram's native contact sharing feature to verify users. Built specifically for the Ethiopian tech ecosystem where SMS costs are high and Telegram adoption is widespread.

## 🎯 Key Features

- ✨ **Zero SMS Costs** - Completely free verification using Telegram contact sharing
- 🔒 **Cryptographic Security** - Cryptographically validates contacts to prevent spoofing and forward attacks
- 🚀 **Production Ready** - Battle-tested with rate limiting, logging, and error handling
- 🌍 **Telegram Native** - Built on Telegram's native authentication flow
- 💰 **Self-Hosted** - Complete control over your data and infrastructure
- 📊 **Webhooks** - Real-time verification status updates via REST API
- 📱 **Mobile Optimized** - Deep links and optimized bot interface
- 🏷️ **Branding Support** - Full customization through BotFather settings

## 📖 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Telegram Bot Token from [@BotFather](https://t.me/botfather)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/selamanapps/freeAuth.git
cd freeAuth
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment:

```bash
cp .env.example .env
```

4. Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=your_bot_username

# Verification Configuration
CLIENT_SECRET=your_secure_secret_key
WEBHOOK_URL=https://yourdomain.com/webhook

# Logging Configuration
LOG_LEVEL=info
```

5. Start the server:

```bash
npm start
```

### Quick Verification Flow

```bash
# 1. Initialize verification session
curl -X POST http://localhost:3000/api/init \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+251911234567",
    "client_secret": "your_secure_secret_key",
    "webhook_url": "https://yourapp.com/callback"
  }'

# Response: { "token": "uuid...", "bot_link": "https://t.me/Bot?start=uuid" }

# 2. Share the bot_link with your user
# User taps the link, starts the bot, shares contact
# 3. Check verification status
curl http://localhost:3000/api/check/{token}
```

## 📚 Documentation

- [API Documentation](docs/api.rest) - Complete API reference
- [Rebranding Guide](docs/rebranding_guide.html) - Customize your bot appearance
- [Deployment Guide](#deployment) - How to deploy to production

## 🔧 Configuration

### Environment Variables

| Variable                | Description                           | Default     | Required |
| ----------------------- | ------------------------------------- | ----------- | -------- |
| `PORT`                  | Server port                           | 3000        | No       |
| `NODE_ENV`              | Environment (development/production)  | development | No       |
| `TELEGRAM_BOT_TOKEN`    | Telegram bot token                    | -           | Yes      |
| `TELEGRAM_BOT_USERNAME` | Bot username                          | -           | Yes      |
| `CLIENT_SECRET`         | Client-side secret key for validation | -           | Yes      |
| `WEBHOOK_URL`           | Webhook callback URL                  | -           | Yes      |
| `LOG_LEVEL`             | Winston log level                     | info        | No       |

## 🌐 API Reference

### Initialize Verification

Start the verification process for a user.

**Endpoint:** `POST /api/init`

**Request Body:**

```json
{
  "phone": "+251911234567",
  "client_secret": "your_secure_key",
  "webhook_url": "https://yourapp.com/callback"
}
```

**Response:**

```json
{
  "token": "uuid-generated-verification-token",
  "bot_link": "https://t.me/Bot?start=uuid-generated-verification-token"
}
```

### Check Verification Status

Poll for verification status.

**Endpoint:** `GET /api/check/:token`

**Response:**

```json
{
  "token": "uuid",
  "status": "verified",
  "phone": "+251911234567",
  "telegram_id": 123456789,
  "verified_at": "2025-02-04T10:00:00Z"
}
```

## 🏗️ Architecture

```
freeAuth/
├── src/
│   ├── server/
│   │   ├── index.js          # Main server entry point
│   │   ├── bot.js            # Telegram bot setup and commands
│   │   ├── middleware/       # Express middleware
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   └── utils/            # Helper functions
│   └── config/
│       └── .env.example      # Environment configuration template
├── docs/
│   ├── api.rest              # API documentation
│   ├── rebranding_guide.html # Bot customization guide
│   └── REBRANDING_GUIDE.md   # BotFather commands reference
├── public/                   # Static assets (landing page)
│   └── index.html
├── .env.example              # Environment template
├── package.json
└── README.md
```

## 🚢 Deployment

### Docker

```bash
# Build image
docker build -t freeauth .

# Run container
docker run -p 3000:3000 --env-file .env freeauth
```

### PM2 (Production)

```bash
npm install -g pm2
pm2 start src/server/index.js --name freeAuth
pm2 save
pm2 startup
```

### Vercel / Netlify

1. Create a project on Vercel/Netlify
2. Connect your GitHub repository
3. Configure environment variables in the dashboard
4. Deploy (works with serverless functions)

## 🔒 Security Features

- **Rate Limiting** - Protects against abuse
- **CORS** - Configurable cross-origin settings
- **Helmet** - Security headers middleware
- **Cryptographic Validation** - Verifies contact ownership
- **Secret Keys** - Client-side validation
- **Logging** - Comprehensive audit trail

## 🧪 Development

```bash
# Run in development mode
npm run dev

# Lint code
npm run lint

# Format code
npm run format

# Run tests (placeholder - add test framework)
npm test
```

## 📦 Usage Examples

### Node.js

```javascript
const axios = require("axios");

const API_URL = "https://your-domain.com";

async function verifyUser(phoneNumber, clientSecret) {
  // Initialize session
  const response = await axios.post(`${API_URL}/api/init`, {
    phone: phoneNumber,
    client_secret: clientSecret,
    webhook_url: `${API_URL}/webhook`,
  });

  const { token, bot_link } = response.data;
  console.log("Share this link:", bot_link);

  // Poll for verification
  const checkInterval = setInterval(async () => {
    const checkResponse = await axios.get(`${API_URL}/api/check/${token}`);

    if (checkResponse.data.status === "verified") {
      clearInterval(checkInterval);
      console.log("Verified!", checkResponse.data);
    }
  }, 2000);
}

verifyUser("+251911234567", "your-secret");
```

### Python

```python
import requests

API_URL = 'https://your-domain.com'

def verify_user(phone_number, client_secret):
    # Initialize session
    response = requests.post(f'{API_URL}/api/init', json={
        'phone': phone_number,
        'client_secret': client_secret,
        'webhook_url': f'{API_URL}/webhook'
    })

    data = response.json()
    token = data['token']
    bot_link = data['bot_link']
    print(f'Share this link: {bot_link}')

    # Poll for verification
    while True:
        check_response = requests.get(f'{API_URL}/api/check/{token}')
        check_data = check_response.json()

        if check_data['status'] == 'verified':
            print('Verified!', check_data)
            break

        import time
        time.sleep(2)

verify_user('+251911234567', 'your-secret')
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Telegram Bot API for the authentication framework
- Open source community for inspiration and support
- Ethiopian tech ecosystem for adoption and feedback

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/selamanapps/freeAuth/issues)
- **Email:** support@example.com
- **Telegram:** [@your_support_username](https://t.me/your_support_username)

## ⭐ Star History

If you find this project useful, please consider giving it a star!

[![Star History Chart](https://api.star-history.com/svg?repos=selamanapps/freeAuth&type=Date)](https://star-history.com/#selamanapps/freeAuth&Date)

---

**Built with ❤️ for Ethiopia**
