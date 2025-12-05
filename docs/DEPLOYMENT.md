# Deployment Guide

This guide covers deployment options for both Express.js server and Cloudflare Worker implementations.

## 🚀 Express.js Server Deployment

### **Option 1: Railway.app (Recommended for Free Tier)**

1. **Create Railway Account**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   railway login
   ```

2. **Deploy from GitHub**
   ```bash
   railway init
   railway up
   ```

3. **Set Environment Variables**
   ```bash
   railway variables set BOT_TOKEN=your_bot_token
   railway variables set NODE_ENV=production
   ```

4. **Monitor Deployment**
   ```bash
   railway logs
   railway open
   ```

### **Option 2: Render.com**

1. **Create New Web Service**
   - Connect GitHub repository
   - Select Node.js environment
   - Set build command: `npm install`
   - Set start command: `npm start`

2. **Environment Variables**
   ```
   BOT_TOKEN=your_bot_token
   NODE_ENV=production
   PORT=10000
   ```

3. **Free Tier Limits**
   - 750 hours/month
   - 512MB RAM
   - Automatic HTTPS

### **Option 3: Fly.io**

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```

2. **Create Fly.toml**
   ```toml
   app = "freeauth"
   primary_region = "iad"
   
   [build]
   
   [http_service]
     internal_port = 3000
     force_https = true
   
   [[vm]]
     cpu_kind = "shared"
     cpus = 1
     memory_mb = 256
   ```

3. **Deploy**
   ```bash
   fly launch
   fly secrets set BOT_TOKEN=your_bot_token
   fly deploy
   ```

### **Option 4: Docker Deployment**

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 3000
   CMD ["node", "src/server/index.js"]
   ```

2. **Build and Run**
   ```bash
   docker build -t freeauth .
   docker run -p 3000:3000 --env-file .env freeauth
   ```

3. **Docker Compose**
   ```yaml
   version: '3.8'
   services:
     freeauth:
       build: .
       ports:
         - "3000:3000"
       environment:
         - BOT_TOKEN=${BOT_TOKEN}
         - NODE_ENV=production
       restart: unless-stopped
   ```

## ⚡ Cloudflare Worker Deployment

### **Prerequisites**
1. Cloudflare account
2. Wrangler CLI installed
3. Telegram Bot Token

### **Deployment Steps**

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. **Configure Worker**
   ```bash
   cd src/workers
   cp ../../config/wrangler.toml .
   ```

3. **Set Secrets**
   ```bash
   wrangler secret put BOT_TOKEN
   wrangler secret put FIREBASE_SERVICE_ACCOUNT
   wrangler secret put BOT_USERNAME
   ```

4. **Deploy**
   ```bash
   wrangler deploy
   ```

5. **Test Deployment**
   ```bash
   curl https://freeauth.your-subdomain.workers.dev/health
   ```

### **Free Tier Limits**
- 100,000 requests/day
- 10ms CPU time per request
- 128MB memory per request
- No KV namespaces (use Firestore)

## 🔧 Environment Configuration

### **Production Environment (.env.production)**
```bash
# Required
BOT_TOKEN=your_production_bot_token

# Server Configuration
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com

# Storage
STORAGE_TYPE=firestore  # or "memory" for development

# Security
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### **Staging Environment (.env.staging)**
```bash
BOT_TOKEN=your_staging_bot_token
NODE_ENV=staging
CORS_ORIGIN=https://staging.your-domain.com
STORAGE_TYPE=memory
LOG_LEVEL=debug
```

## 📊 Monitoring & Maintenance

### **Health Checks**
```bash
# Test health endpoint
curl https://your-server.com/health

# Expected response:
{
  "status": "healthy",
  "service": "freeauth-server",
  "environment": "production",
  "timestamp": "2024-12-05T09:28:33.000Z",
  "uptime": 3600.5
}
```

### **Logging**
- **Development**: Colored console output
- **Production**: JSON format with timestamps
- **Log levels**: error, warn, info, debug

### **Performance Monitoring**
1. **Response Times**: Monitor `/health` endpoint
2. **Error Rates**: Track 4xx/5xx responses
3. **Rate Limiting**: Monitor 429 responses
4. **Bot Status**: Check bot connectivity

## 🔄 CI/CD Pipeline

### **GitHub Actions Example**
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install Dependencies
        run: npm ci
        
      - name: Run Tests
        run: npm test
        
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway up --service freeauth
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## 🚨 Troubleshooting

### **Common Issues**

1. **Bot Not Responding**
   ```bash
   # Test bot token
   curl "https://api.telegram.org/bot$BOT_TOKEN/getMe"
   ```

2. **Server Not Starting**
   ```bash
   # Check logs
   npm run dev
   
   # Check port availability
   netstat -tulpn | grep :3000
   ```

3. **CORS Errors**
   - Set `CORS_ORIGIN` to your frontend domain
   - Ensure correct protocol (http/https)

4. **Firestore Connection Issues**
   - Verify service account JSON
   - Check Firestore database rules
   - Ensure proper project configuration

### **Debug Mode**
```bash
# Enable debug logging
export LOG_LEVEL=debug
npm run dev
```

## 📈 Scaling Considerations

### **Express Server Scaling**
1. **Vertical Scaling**: Increase server resources
2. **Horizontal Scaling**: Add more instances behind load balancer
3. **Database**: Switch from memory to Firestore
4. **Caching**: Implement Redis for session caching

### **Cloudflare Worker Scaling**
1. **Automatic**: Workers scale automatically
2. **Global**: Deploy to multiple regions
3. **Cost**: Monitor usage to stay within free tier

## 🔐 Security Updates

### **Regular Maintenance**
1. **Dependencies**: Run `npm audit` weekly
2. **Secrets**: Rotate BOT_TOKEN quarterly
3. **Logs**: Review logs for suspicious activity
4. **Backups**: Backup environment variables

### **Security Scanning**
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Run security scan
npx snyk test
```

## 🌐 Vercel Deployment (Landing Page)

### **Prerequisites**
1. Vercel account (free tier available)
2. GitHub repository connected
3. Landing page files in `/public` directory

### **Deployment Steps**

1. **Connect Repository to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect the `vercel.json` configuration

2. **Automatic Deployment**
   - Vercel will deploy automatically on every push to `main` branch
   - Preview deployments created for pull requests
   - Custom domain can be added in project settings

3. **Manual Deployment via CLI**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login and deploy
   vercel login
   vercel
   
   # Deploy to production
   vercel --prod
   ```

4. **Environment Configuration**
   - No environment variables needed for static landing page
   - For analytics or tracking, add in Vercel project settings

### **Configuration Details**
- **Build Command**: None required (static files)
- **Output Directory**: `public`
- **Framework Preset**: Static
- **Routes**: Configured in `vercel.json` for SPA-like behavior

### **Free Tier Limits**
- 100GB bandwidth/month
- Unlimited deployments
- Automatic SSL certificates
- Custom domains
- 99.9% uptime SLA

### **Testing Deployment**
```bash
# Test locally with Vercel CLI
vercel dev

# Open in browser
open http://localhost:3000
```

## 📞 Support

For deployment issues:
1. Check logs for error messages
2. Verify environment variables
3. Test locally before deploying
4. Consult documentation

**Emergency Contact**: devops@example.com
